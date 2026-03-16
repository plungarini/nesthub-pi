import { FastifyInstance } from 'fastify';

export default async function keepaliveRoutes(fastify: FastifyInstance) {
	fastify.get('/api/keepalive.png', async (req, reply) => {
		const png = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
			'base64',
		);
		reply.header('Content-Type', 'image/png');
		reply.header('Cache-Control', 'no-cache');
		return reply.send(png);
	});
}
