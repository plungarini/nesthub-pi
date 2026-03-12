import { FastifyInstance } from 'fastify';
import { castSender } from '../../core/castSender.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      cast: castSender.getStatus()
    };
  });
}
