import { FastifyInstance } from 'fastify';
import { castSender } from '../../core/castSender.js';

export default async function (fastify: FastifyInstance) {
	fastify.get('/health', async () => {
		return {
			status: 'ok',
			uptime: process.uptime(),
			cast: castSender.getStatus(),
		};
	});

	// Keep-alive endpoint for Fuchsia OS to prevent ambient mode
	fastify.get('/api/keepalive.png', async (request, reply) => {
		const base64Image =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
		const buffer = Buffer.from(base64Image, 'base64');

		reply.type('image/png').header('Cache-Control', 'no-cache').send(buffer);
	});
}
