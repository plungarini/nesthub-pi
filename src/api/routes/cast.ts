import { FastifyInstance } from 'fastify';
import { castSender } from '../../core/castSender.js';

export default async function castRoutes(fastify: FastifyInstance) {
  fastify.get('/cast/status', async function getCastStatus() {
    return castSender.getStatus();
  });

  fastify.post('/cast/connect', async function connectCast(request, reply) {
    const mac = process.env.CAST_DEVICE_MAC;
    const appId = process.env.CAST_APP_ID;

    if (!mac || !appId) {
      reply.status(400).send({ error: 'CAST_DEVICE_MAC or CAST_APP_ID not set' });
      return;
    }

    try {
      await castSender.connectAndLaunch(appId);
      return castSender.getStatus();
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  fastify.post('/cast/disconnect', async function disconnectCast() {
    castSender.disconnect();
    return castSender.getStatus();
  });
}
