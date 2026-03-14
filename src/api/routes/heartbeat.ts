import { FastifyInstance } from 'fastify';

let lastHeartbeat = 0;

export function getLastHeartbeat() {
  return lastHeartbeat;
}

export default async function heartbeatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/heartbeat', async (request, reply) => {
    lastHeartbeat = Date.now();
    return { ok: true };
  });

  fastify.get('/api/heartbeat/last', async (request, reply) => {
    return { lastHeartbeat };
  });
}
