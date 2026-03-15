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
    const body = req.body as CastStatePayload;
    castState.visible = body.visible;
    castState.reason = body.reason ?? 'unknown';
    castState.lastUpdate = body.ts ?? Date.now();
    return { ok: true };
  });

  // Receiver sends heartbeat on every content poll (while alive and visible)
  fastify.post('/api/cast/heartbeat', async () => {
    castState.lastHeartbeat = Date.now();
    castState.visible = true;
    castState.reason = 'heartbeat';
    castState.lastUpdate = Date.now();
    return { ok: true };
  });

  // Watchdog reads this
  fastify.get('/api/cast/state', async () => {
    return castState;
  });
}
