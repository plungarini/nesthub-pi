import json
import os
import signal
import sys
import threading
import time
import traceback
import urllib.request
import subprocess
import re
import platform
from http.server import BaseHTTPRequestHandler, HTTPServer

import pychromecast

# Global state
cast_device = None
app_id = os.environ.get("CAST_APP_ID")
device_mac = os.environ.get("CAST_DEVICE_MAC", "").strip().lower()
svc_port = os.environ.get("PORT", "3004")  # Primary service port
svc_status = {"state": "disconnected", "deviceMac": device_mac, "appId": app_id}
relaunch_attempted = False
is_shutting_down = False

_last_resolved_ip = None


def log(msg):
    print(f"[cast-sidecar] {msg}", flush=True)


def error(msg, exc_info=False):
    print(f"[cast-sidecar] ERROR: {msg}", file=sys.stderr, flush=True)
    if exc_info:
        traceback.print_exc(file=sys.stderr)


def get_ip_from_mac(mac: str) -> str | None:
    """
    Resolve the current IP of a device from its MAC address
    using the system ARP table. Cross-platform: Linux + Windows.
    """
    mac_colon = mac.lower().replace("-", ":")
    mac_dash = mac_colon.replace(":", "-")

    try:
        # On Windows, 'arp -a' can sometimes be slow or return truncated output
        # if the adapter is busy, but it's the standard way.
        result = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)
        for line in result.stdout.splitlines():
            line_lower = line.lower()
            if mac_colon in line_lower or mac_dash in line_lower:
                # Find the IP pattern in the line
                match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line)
                if match:
                    return match.group(1)
    except Exception as e:
        error(f"ARP lookup failed: {e}")

    return None


def ping_to_refresh_arp(ip: str) -> None:
    """Ping a host to ensure its ARP entry is fresh. Best-effort."""
    try:
        flag = (
            ["-n", "1"]
            if platform.system().lower() == "windows"
            else ["-c", "1", "-W", "1"]
        )
        subprocess.run(["ping"] + flag + [ip], capture_output=True, timeout=3)
    except Exception:
        pass


class CastStatusListener:
    def new_cast_status(self, cast_status):
        global svc_status, relaunch_attempted

        if is_shutting_down or svc_status["state"] != "live":
            return

        current_app = cast_status.app_id if cast_status else None
        log(f"Push update - app_id: {current_app}")

        if current_app != app_id:
            if not relaunch_attempted and cast_device:
                log("App gone via push, attempting relaunch...")
                try:
                    cast_device.start_app(app_id)
                    relaunch_attempted = True
                except Exception as e:
                    error(f"Relaunch failed: {e}")
                    svc_status["state"] = "error"
            else:
                log("Relaunch already attempted, marking error.")
                svc_status["state"] = "error"
        else:
            relaunch_attempted = False


_status_listener = CastStatusListener()


def connect_and_launch():
    global cast_device, _last_resolved_ip

    if not device_mac:
        raise Exception("CAST_DEVICE_MAC is not set in .env")

    # Ping last known IP to refresh ARP cache before lookup
    if _last_resolved_ip:
        log(f"Pinging last known IP {_last_resolved_ip} to refresh ARP...")
        ping_to_refresh_arp(_last_resolved_ip)

    log(f"Resolving IP from MAC: {device_mac}")
    ip = get_ip_from_mac(device_mac)

    if not ip:
        raise Exception(
            f"Could not resolve IP for MAC {device_mac}. "
            "Device may be offline or not in ARP cache."
        )

    log(f"Resolved IP: {ip}")
    _last_resolved_ip = ip

    cast = pychromecast.get_chromecast_from_host((ip, 8009, None, None, None))
    cast.wait(timeout=30)

    if cast.status is None:
        raise Exception("Device not ready after wait (status is None)")

    cast.register_status_listener(_status_listener)
    cast_device = cast


def cleanup():
    global cast_device, is_shutting_down
    is_shutting_down = True
    try:
        if cast_device:
            cast_device.quit_app()
            cast_device.disconnect()
            cast_device = None
    except Exception as e:
        error(f"Cleanup failed: {e}")


def watchdog():
    port = int(os.environ.get("PORT", 3004))
    STATE_URL = f"http://127.0.0.1:{port}/api/cast/state"

    # How long to wait after launch before watchdog starts checking.
    # Gives the receiver time to load and send first heartbeat/state report.
    STARTUP_GRACE_PERIOD = 30  # seconds
    startup_time = None

    # Thresholds
    HEARTBEAT_STALE_MS = 25_000  # 5s poll interval × 4 + margin
    STATE_STALE_MS = 60_000  # if no state update at all for 60s, something is wrong

    while True:
        time.sleep(10)

        if is_shutting_down or svc_status["state"] != "live":
            startup_time = None
            continue

        # Record when we first entered "live" state
        if startup_time is None:
            startup_time = time.time()

        # Don't check during grace period
        if time.time() - startup_time < STARTUP_GRACE_PERIOD:
            log("Watchdog: in startup grace period, skipping check")
            continue

        try:
            resp = urllib.request.urlopen(STATE_URL, timeout=3)
            data = json.loads(resp.read())

            visible = data.get("visible", True)
            last_heartbeat = data.get("lastHeartbeat", 0)
            last_update = data.get("lastUpdate", 0)
            reason = data.get("reason", "unknown")
            now_ms = time.time() * 1000

            heartbeat_age_ms = now_ms - last_heartbeat if last_heartbeat > 0 else None
            update_age_ms = now_ms - last_update if last_update > 0 else None

            # Check 1: receiver explicitly reported not visible
            if not visible:
                error(
                    f"Watchdog: receiver not visible (reason: {reason}, "
                    f"last update {int(update_age_ms or 0)}ms ago) -> marking error"
                )
                svc_status["state"] = "error"
                notify_error()
                startup_time = None
                continue

            # Check 2: heartbeat gone stale (JS frozen, receiver not polling)
            if heartbeat_age_ms is not None and heartbeat_age_ms > HEARTBEAT_STALE_MS:
                error(
                    f"Watchdog: heartbeat stale ({int(heartbeat_age_ms)}ms) -> marking error"
                )
                svc_status["state"] = "error"
                notify_error()
                startup_time = None
                continue

            # Check 3: no state update at all for a long time
            if update_age_ms is not None and update_age_ms > STATE_STALE_MS:
                error(
                    f"Watchdog: no state update for {int(update_age_ms)}ms -> marking error"
                )
                svc_status["state"] = "error"
                notify_error()
                startup_time = None
                continue

            log(
                f"Watchdog: alive OK "
                f"(visible={visible}, "
                f"heartbeat {int(heartbeat_age_ms or 0)}ms ago, "
                f"reason={reason})"
            )

        except Exception as e:
            error(f"Watchdog: state check failed: {e}")
            svc_status["state"] = "error"
            notify_error()
            startup_time = None


def notify_error():
    """Immediately notify the Node.js server that cast state is error,
    so it can trigger relaunch without waiting for the next poll cycle."""
    try:
        port = int(os.environ.get("PORT", 3004))
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/cast/notify-error",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2)
    except Exception:
        pass  # best-effort, the poll loop will catch it anyway


class CastStatusHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        if self.path == "/health":
            self._send_json({"ok": True})
        elif self.path == "/status":
            self._send_json(svc_status)
        else:
            self._send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        global svc_status, relaunch_attempted, is_shutting_down

        if self.path == "/launch":
            try:
                connect_and_launch()
                log(f"Launching app '{app_id}'...")
                cast_device.start_app(app_id)
                svc_status["state"] = "live"
                relaunch_attempted = False
                is_shutting_down = False
                self._send_json({"status": "ok"})
            except Exception as e:
                error(f"Launch failed: {str(e)}", exc_info=True)
                svc_status["state"] = "error"
                self._send_json({"status": "error", "message": str(e)}, 500)

        elif self.path == "/disconnect":
            try:
                cleanup()
                svc_status["state"] = "disconnected"
                self._send_json({"status": "ok"})
            except Exception as e:
                error(f"Disconnect failed: {str(e)}", exc_info=True)
                self._send_json({"status": "error", "message": str(e)}, 500)

        else:
            self._send_json({"error": "Not Found"}, 404)


def run_server():
    port = int(os.environ.get("CAST_SIDECAR_PORT", 4004))
    server = HTTPServer(("127.0.0.1", port), CastStatusHandler)
    log(f"Starting HTTP server on port {port}")

    def signal_handler(sig, frame):
        log("Shutting down...")
        cleanup()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    server.serve_forever()


if __name__ == "__main__":
    if not device_mac or not app_id:
        error("CAST_DEVICE_MAC and CAST_APP_ID must be set")
        sys.exit(1)

    threading.Thread(target=watchdog, daemon=True).start()
    run_server()
