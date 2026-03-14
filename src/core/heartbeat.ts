let lastHeartbeat = 0;

export function updateHeartbeat() {
  lastHeartbeat = Date.now();
  console.log(`[HEARTBEAT] Updated to ${lastHeartbeat}`);
}

export function getLastHeartbeat() {
  return lastHeartbeat;
}
