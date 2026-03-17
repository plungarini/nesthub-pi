import type { FastifyInstance } from 'fastify';
import type { WidgetDefinition } from '../../../widgets/types.js';

export const redditWidget: WidgetDefinition = {
	id: 'reddit-widget',
	name: 'Reddit Feed',
	description: 'Top AI-scored recommendations from reddit-pi',
	defaultSize: 'large',
	defaultTint: 'glass-amber',
	dataEndpoint: '/api/widgets/reddit/data',
	pollInterval: 30000, // Reddit data updates slowly
	hasActions: true,
};

export default async function redditRoutes(fastify: FastifyInstance) {
	fastify.get('/api/widgets/reddit/data', async (req, reply) => {
		try {
			const redditUrl = process.env.REDDIT_PI_URL || 'http://127.0.0.1:3000/api/recommendations';
			const res = await fetch(redditUrl);
			if (!res.ok) throw new Error(`Reddit-pi returned ${res.status}`);
			const data = await res.json();
			// We only want the top few recommendations for the widget
			return Array.isArray(data) ? data.slice(0, 5) : [];
		} catch (err) {
			fastify.log.error(err);
			return reply.status(502).send({ error: 'Failed to fetch recommendations from reddit-pi' });
		}
	});

	fastify.post('/api/widgets/reddit/action', async (req, reply) => {
		const { type, payload } = req.body as { type: string; payload: any };

		try {
			const redditUrl = process.env.REDDIT_PI_URL || 'http://127.0.0.1:3000';
			const actionUrl = `${redditUrl}/api/recommendations/${payload.id}/${type}`;

			const res = await fetch(actionUrl, { method: 'POST' });
			if (!res.ok) throw new Error(`Reddit-pi action failed: ${res.status}`);

			return { ok: true };
		} catch (err) {
			fastify.log.error(err);
			return reply.status(502).send({ error: 'Failed to perform action on reddit-pi' });
		}
	});
}
