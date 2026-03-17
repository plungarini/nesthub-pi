import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { publish, subscribe } from '../../core/alertBus.js';
import type { AlertPayload } from '../../widgets/types.js';

export default async function alertRoutes(fastify: FastifyInstance) {
	// Pi ecosystem services POST here to push alerts
	fastify.post('/api/alerts', async (req, reply) => {
		const body = req.body as Omit<AlertPayload, 'id' | 'timestamp'>;
		const alert: AlertPayload = {
			...body,
			id: randomUUID(),
			timestamp: Date.now(),
		};
		publish(alert);
		return { ok: true, id: alert.id };
	});

	// Display SPA subscribes here via SSE
	fastify.get('/api/alerts/stream', async (req, reply) => {
		reply.raw.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
		});

		const send = (alert: AlertPayload) => {
			reply.raw.write(`data: ${JSON.stringify(alert)}\n\n`);
		};

		const unsub = subscribe(send);

		// Keepalive ping every 25s
		const ping = setInterval(() => {
			reply.raw.write(': ping\n\n');
		}, 25000);

		req.raw.on('close', () => {
			clearInterval(ping);
			unsub();
		});
	});
}
