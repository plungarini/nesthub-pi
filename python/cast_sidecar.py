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
    while True:
        time.sleep(10)
        if is_shutting_down or svc_status["state"] != "live":
            continue
        try:
            # Check heartbeat from Node.js server
            url = f"http://127.0.0.1:{svc_port}/api/heartbeat/last"
            with urllib.request.urlopen(url, timeout=3) as response:
                data = json.loads(response.read().decode("utf-8"))
                last_heartbeat = data.get("lastHeartbeat", 0)

            age = (time.time() * 1000) - last_heartbeat

            if last_heartbeat == 0 or age > 20000:
                error(f"Watchdog: heartbeat timeout (age: {int(age)}ms, last: {last_heartbeat})")
                svc_status["state"] = "error"
            else:
                log(f"Watchdog: heartbeat ok ({int(age)}ms ago)")
        except Exception as e:
            error(f"Watchdog error: {e}")
            svc_status["state"] = "error"


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
    run_server()
