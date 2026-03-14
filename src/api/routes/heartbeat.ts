import { FastifyInstance } from 'fastify';

let lastHeartbeat = 0;

export function updateHeartbeat() {
  lastHeartbeat = Date.now();
}

export function getLastHeartbeat() {
  return lastHeartbeat;
}

export default async function heartbeatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/heartbeat', async (request, reply) => {
    updateHeartbeat();
    return { ok: true };
  });

  fastify.get('/api/heartbeat/last', async (request, reply) => {
    return { lastHeartbeat };
  });
}
