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
	// Data endpoint for the widget
	fastify.get('/api/widgets/reddit-widget/data', async (req, reply) => {
		try {
			const redditBaseUrl = process.env.REDDIT_PI_URL || 'http://127.0.0.1:3000';
			const res = await fetch(`${redditBaseUrl}/api/current-batch`);

			if (!res.ok) {
				return reply.status(res.status).send({ error: `Reddit API error: ${res.statusText}` });
			}

			const data = (await res.json()) as any;
			return data.posts || [];
		} catch (err: any) {
			fastify.log.error(err);
			return reply.status(500).send({ error: 'Failed to fetch from reddit-pi' });
		}
	});

	// Action endpoint for the widget (likes/dislikes)
	fastify.post('/api/widgets/reddit-widget/action', async (req, reply) => {
		const { type, payload } = req.body as { type: string; payload: { id: string } };
		const redditBaseUrl = process.env.REDDIT_PI_URL || 'http://127.0.0.1:3000';

		if (type !== 'like' && type !== 'dislike') {
			return reply.status(400).send({ error: 'Invalid action type' });
		}

		try {
			const actionUrl = `${redditBaseUrl}/api/posts/${payload.id}/${type}`;
			const res = await fetch(actionUrl, { method: 'POST' });

			if (!res.ok) {
				return reply.status(res.status).send({ error: `Reddit Action error: ${res.statusText}` });
			}

			return { ok: true };
		} catch (err: any) {
			fastify.log.error(err);
			return reply.status(500).send({ error: 'Failed to proxy action to reddit-pi' });
		}
	});
}
