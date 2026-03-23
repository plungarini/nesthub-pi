import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../core/logger.js';
import castRoutes from './routes/cast.js';
import contentRoutes from './routes/content.js';
import healthRoutes from './routes/health.js';
import heartbeatRoutes from './routes/heartbeat.js';

import alertRoutes from './routes/alerts.js';
import castStateRoutes from './routes/castState.js';
import layoutRoutes from './routes/layout.js';
import calendarRoutes from './routes/widgets/calendar.js';
import loggerRoutes from './routes/widgets/logger.js';
import medicalRoutes from './routes/widgets/medical.js';
import redditRoutes from './routes/widgets/reddit.js';
import smokelessRoutes from './routes/widgets/smokeless.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const server = Fastify({
	logger: false, // handled by our global logger
	forceCloseConnections: true,
});

export async function initServer() {
	await server.register(cors, {
		origin: [
			'https://plungarini.github.io', // receiver on GitHub Pages
			'https://aurora.tail1bdae0.ts.net',
			'https://mini-gaming-g1.tail1bdae0.ts.net',
			'http://localhost:3004',
			'http://127.0.0.1:3004',
		],
		methods: ['GET', 'POST'],
	});

	// Serve Dashboard static files
	await server.register(fastifyStatic, {
		root: path.join(__dirname, '../../ui'),
		prefix: '/ui/',
		// decorateReply is true by default here
	});

	if (process.env.NODE_ENV !== 'production') {
		// In development, proxy `/display` to the Vite dev server
		const proxy = await import('@fastify/http-proxy');
		await server.register(proxy.default, {
			upstream: 'http://127.0.0.1:5173',
			prefix: '/display',
			rewritePrefix: '/display',
			websocket: true,
		});
	} else {
		// Serve Vite-built display SPA
		await server.register(fastifyStatic, {
			root: path.join(__dirname, '../../dist/display'),
			prefix: '/display/',
			decorateReply: false,
		});
	}

	// Root route serves dashboard
	server.get('/', async (request, reply) => {
		return reply.sendFile('index.html', path.join(__dirname, '../../ui'));
	});

	// SPA fallback — all /display/* routes serve index.html
	server.setNotFoundHandler((request, reply) => {
		if (process.env.NODE_ENV === 'production' && request.url.startsWith('/display/')) {
			return reply.sendFile('index.html', path.join(__dirname, '../../dist/display'));
		}
		reply.code(404).send({ error: 'Not Found' });
	});

	await server.register(castStateRoutes);
	await server.register(alertRoutes);
	await server.register(layoutRoutes);
	await server.register(calendarRoutes);
	await server.register(loggerRoutes);
	await server.register(redditRoutes);
	await server.register(medicalRoutes);
	await server.register(smokelessRoutes);
	await server.register(contentRoutes);
	await server.register(healthRoutes);
	await server.register(castRoutes);
	await server.register(heartbeatRoutes);

	logger.info('API server initialized');
}
