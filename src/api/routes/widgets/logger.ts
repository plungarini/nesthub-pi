import type { FastifyInstance } from 'fastify';
import type { WidgetDefinition } from '../../../widgets/types.js';

export const loggerWidget: WidgetDefinition = {
	id: 'logger-widget',
	name: 'System Logs',
	description: 'Live tail of logger-pi ecosystem logs',
	defaultSize: 'medium',
	defaultTint: 'glass-blue',
	dataEndpoint: '/api/widgets/logger/data',
	pollInterval: 5000,
};

export default async function loggerRoutes(fastify: FastifyInstance) {
	fastify.get('/api/widgets/logger/data', async (req, reply) => {
		try {
			// Proxy request to logger-pi
			// In production on the Pi, it's at http://127.0.0.1:4000/logs
			const loggerUrl = process.env.LOGGER_PI_URL || 'http://127.0.0.1:4000/logs';
			const res = await fetch(loggerUrl);
			if (!res.ok) throw new Error(`Logger-pi returned ${res.status}`);
			const data = await res.json();
			return data;
		} catch (err) {
			fastify.log.error(err);
			return reply.status(502).send({ error: 'Failed to fetch logs from logger-pi' });
		}
	});
}
