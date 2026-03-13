import json
import os
import signal
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import pychromecast

# Global state
cast_device = None
cast_browser = None
app_id = os.environ.get("CAST_APP_ID")
device_ip = os.environ.get("CAST_DEVICE_IP")
status = {"state": "disconnected", "deviceIp": device_ip, "appId": app_id}
relaunch_attempted = False


def log(msg):
    print(f"[cast-sidecar] {msg}", flush=True)


def error(msg):
    print(f"[cast-sidecar] ERROR: {msg}", file=sys.stderr, flush=True)


def connect_and_launch():
    global cast_device, cast_browser

    cast = pychromecast.get_chromecast_from_host((device_ip, 8009, None, None, None))
    cast.wait(timeout=30)
    cast_browser = None  # no browser/discovery to clean up
    cast_device = cast


def cleanup():
    global cast_device, cast_browser
    try:
        if cast_device:
            cast_device.quit_app()
            cast_device.disconnect()
            cast_device = None
    except Exception as e:
        error(f"Cleanup failed: {e}")
    cast_browser = None


class CastStatusHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress default HTTP request logs

    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        if self.path == "/health":
            self._send_json({"ok": True})
        elif self.path == "/status":
            self._send_json(status)
        else:
            self._send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        global cast_device, cast_browser, status, relaunch_attempted
        if self.path == "/launch":
            try:
                log(f"Attempting to connect to {device_ip}...")
                connect_and_launch()
                log(f"Connected. Launching app {app_id}...")
                cast_device.start_app(app_id)
                status["state"] = "live"
                relaunch_attempted = False
                self._send_json({"status": "ok"})
            except Exception as e:
                error(f"Launch failed: {str(e)}")
                status["state"] = "error"
                self._send_json({"status": "error", "message": str(e)}, 500)
        elif self.path == "/disconnect":
            try:
                cleanup()
                status["state"] = "disconnected"
                self._send_json({"status": "ok"})
            except Exception as e:
                error(f"Disconnect failed: {str(e)}")
                self._send_json({"status": "error", "message": str(e)}, 500)
        else:
            self._send_json({"error": "Not Found"}, 404)


def poll_status():
    global cast_device, status, relaunch_attempted
    while True:
        time.sleep(30)
        if status["state"] == "live" and cast_device:
            try:
                current_app = cast_device.status.app_id if cast_device.status else None
                if current_app != app_id:
                    log(f"App {app_id} not running (current: {current_app}).")
                    if not relaunch_attempted:
                        log("Attempting relaunch...")
                        cast_device.start_app(app_id)
                        relaunch_attempted = True
                    else:
                        log("Relaunch already attempted. Setting state to error.")
                        status["state"] = "error"
                else:
                    relaunch_attempted = False
            except Exception as e:
                error(f"Poll check failed: {str(e)}")


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

    monitor_thread = threading.Thread(target=poll_status, daemon=True)
    monitor_thread.start()

    run_server()
