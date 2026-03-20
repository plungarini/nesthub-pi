import { readFileSync, writeFileSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { getAllWidgets } from '../../widgets/registry.js';
import type { LayoutConfig } from '../../widgets/types.js';

const LAYOUT_PATH = 'data/layout.json';

export default async function layoutRoutes(fastify: FastifyInstance) {
	fastify.get('/api/layout', async () => {
		const layout: LayoutConfig = JSON.parse(readFileSync(LAYOUT_PATH, 'utf-8'));
		return layout;
	});

	fastify.post('/api/layout', async (req, reply) => {
		const layout = req.body as LayoutConfig;
		writeFileSync(LAYOUT_PATH, JSON.stringify(layout, null, 2));
		return { ok: true };
	});

	// Returns all registered widget definitions (for the config panel)
	fastify.get('/api/widgets', async () => {
		return getAllWidgets();
	});
}
