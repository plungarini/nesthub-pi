import json
import os
import signal
import sys
import threading
import time
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

import pychromecast

# Global state
cast_device = None
app_id = os.environ.get("CAST_APP_ID")
device_ip = os.environ.get("CAST_DEVICE_IP")
svc_port = os.environ.get("PORT", "3004")  # Primary service port
svc_status = {"state": "disconnected", "deviceIp": device_ip, "appId": app_id}
relaunch_attempted = False
is_shutting_down = False


def log(msg):
    print(f"[cast-sidecar] {msg}", flush=True)


def error(msg, exc_info=False):
    print(f"[cast-sidecar] ERROR: {msg}", file=sys.stderr, flush=True)
    if exc_info:
        traceback.print_exc(file=sys.stderr)


class CastStatusListener:
    def new_cast_status(self, cast_status):
        global svc_status, relaunch_attempted

        if is_shutting_down or svc_status["state"] != "live":
            return

        current_app = cast_status.app_id if cast_status else None
        log(f"Push update — app_id: {current_app}")

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
    global cast_device

    cast = pychromecast.get_chromecast_from_host((device_ip, 8009, None, None, None))
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
                    f"last update {int(update_age_ms or 0)}ms ago) → marking error"
                )
                svc_status["state"] = "error"
                startup_time = None
                continue

            # Check 2: heartbeat gone stale (JS frozen, receiver not polling)
            if heartbeat_age_ms is not None and heartbeat_age_ms > HEARTBEAT_STALE_MS:
                error(
                    f"Watchdog: heartbeat stale ({int(heartbeat_age_ms)}ms) → marking error"
                )
                svc_status["state"] = "error"
                startup_time = None
                continue

            # Check 3: no state update at all for a long time
            if update_age_ms is not None and update_age_ms > STATE_STALE_MS:
                error(
                    f"Watchdog: no state update for {int(update_age_ms)}ms → marking error"
                )
                svc_status["state"] = "error"
                startup_time = None
                continue

            log(
                f"Watchdog: alive ✓ "
                f"(visible={visible}, "
                f"heartbeat {int(heartbeat_age_ms or 0)}ms ago, "
                f"reason={reason})"
            )

        except Exception as e:
            error(f"Watchdog: state check failed: {e}")
            svc_status["state"] = "error"
            startup_time = None


def keep_alive_ping():
    """Play a 1x1 transparent PNG via the media controller every 9 minutes.
    This puts the Cast session into PLAYING state, preventing Fuchsia from
    triggering ambient mode after 10 minutes of IDLE state."""
    KEEP_ALIVE_URL = f"http://127.0.0.1:{svc_port}/api/keepalive.png"
    while True:
        time.sleep(9 * 60)
        if is_shutting_down or svc_status["state"] != "live" or not cast_device:
            continue
        try:
            cast_device.media_controller.play_media(KEEP_ALIVE_URL, "image/png")
            log("Keep-alive ping sent ✓")
        except Exception as e:
            error(f"Keep-alive ping failed: {e}")


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
                log(f"Connecting to {device_ip}...")
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
    if not device_ip or not app_id:
        error("CAST_DEVICE_IP and CAST_APP_ID must be set")
        sys.exit(1)

    threading.Thread(target=watchdog, daemon=True).start()
    threading.Thread(target=keep_alive_ping, daemon=True).start()  # ← add this
    run_server()
