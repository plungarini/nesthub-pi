import json
import os
import signal
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer

import pychromecast

# Global state
cast_device = None
app_id = os.environ.get("CAST_APP_ID")
device_ip = os.environ.get("CAST_DEVICE_IP")
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
    """Receives push updates from the Nest Hub whenever app state changes."""

    def new_cast_status(self, cast_status):
        global cast_device, svc_status, relaunch_attempted, is_shutting_down

        if is_shutting_down or svc_status["state"] != "live":
            return

        current_app = cast_status.app_id if cast_status else None
        log(f"Status update received — app_id: {current_app}")

        if current_app != app_id:
            log(f"App '{app_id}' not running (current: {current_app}).")
            if not relaunch_attempted and cast_device:
                log("Attempting relaunch...")
                try:
                    cast_device.start_app(app_id)
                    relaunch_attempted = True
                except Exception as e:
                    error(f"Relaunch failed: {e}")
                    svc_status["state"] = "error"
            else:
                log("Relaunch already attempted. Setting state to error.")
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
    """Lightweight thread — only checks if the socket is still alive."""
    while True:
        time.sleep(30)
        if not is_shutting_down and svc_status["state"] == "live" and cast_device:
            try:
                if not cast_device.socket_client.is_connected:
                    error("Socket disconnected. Setting state to error.")
                    svc_status["state"] = "error"
            except Exception as e:
                error(f"Watchdog check failed: {e}")


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
                log(f"Attempting to connect to host {device_ip}...")
                connect_and_launch()
                log(
                    f"Connected to {cast_device.name if cast_device else 'unknown'}. Launching app '{app_id}'..."
                )
                cast_device.start_app(app_id)
                svc_status["state"] = "live"
                relaunch_attempted = False
                is_shutting_down = False
                self._send_json({"status": "ok"})
            except Exception as e:
                error(f"Launch process failed: {str(e)}", exc_info=True)
                svc_status["state"] = "error"
                self._send_json(
                    {"status": "error", "message": f"Launch failed: {str(e)}"}, 500
                )

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
        global is_shutting_down
        log("Shutting down...")
        is_shutting_down = True
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
