import { FastifyInstance } from 'fastify';
import { castSender } from '../../core/castSender.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/cast/status', async () => {
    return castSender.getStatus();
  });

  fastify.post('/cast/connect', async (request, reply) => {
    const ip = process.env.CAST_DEVICE_IP;
    const appId = process.env.CAST_APP_ID;

    if (!ip || !appId) {
      reply.status(400).send({ error: 'CAST_DEVICE_IP or CAST_APP_ID not set' });
      return;
    }

    try {
      await castSender.connectAndLaunch(ip, appId);
      return castSender.getStatus();
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  fastify.post('/cast/disconnect', async () => {
    castSender.disconnect();
    return castSender.getStatus();
  });
}
