import { FastifyInstance } from 'fastify';
import { updateHeartbeat, getLastHeartbeat } from '../../core/heartbeat.js';

export default async function heartbeatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/heartbeat', async (request, reply) => {
    updateHeartbeat();
    return { ok: true };
  });

  fastify.get('/api/heartbeat/last', async (request, reply) => {
    return { lastHeartbeat: getLastHeartbeat() };
  });
}
