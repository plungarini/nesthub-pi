import type { FastifyInstance } from 'fastify';

interface CastStatePayload {
  visible: boolean;
  reason: string;
  ts: number;
}

// Module-level state — single source of truth for cast visibility
let castState: {
  visible: boolean;
  reason: string;
  lastUpdate: number;
  lastHeartbeat: number;
} = {
  visible: false,
  reason: 'init',
  lastUpdate: 0,
  lastHeartbeat: 0,
};

export function getCastState() {
  return { ...castState };
}

export default async function castStateRoutes(fastify: FastifyInstance) {
  // Receiver reports visibility events (sendBeacon POSTs here)
  fastify.post('/api/cast/state', async (req) => {
    console.log(`[CAST-STATE] POST /api/cast/state — origin: ${req.headers.origin}, content-type: ${req.headers['content-type']}, body: ${JSON.stringify(req.body)}`);
    const body = req.body as CastStatePayload;
    castState.visible = body.visible;
    castState.reason = body.reason ?? 'unknown';
    castState.lastUpdate = body.ts ?? Date.now();
    return { ok: true };
  });

  // Receiver sends heartbeat on every content poll (while alive and visible)
  fastify.post('/api/cast/heartbeat', async (req) => {
    console.log(`[CAST-HEARTBEAT] POST /api/cast/heartbeat — origin: ${req.headers.origin}`);
    castState.lastHeartbeat = Date.now();
    castState.lastUpdate = Date.now();
    // Do NOT touch castState.visible — only the receiver controls that
    return { ok: true };
  });

  // Watchdog reads this
  fastify.get('/api/cast/state', async () => {
    return castState;
  });
}
