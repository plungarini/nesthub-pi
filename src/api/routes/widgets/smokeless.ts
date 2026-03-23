import type { FastifyInstance } from 'fastify';
import type { WidgetDefinition } from '../../../widgets/types.js';
import { getFirebaseAdmin } from '../../../core/firebaseAdmin.js';

export const smokelessWidget: WidgetDefinition = {
	id: 'smokeless-widget',
	name: 'Smokeless',
	description: 'Live smoking habit tracker',
	defaultSize: 'medium',
	defaultTint: 'glass-green',
};

/**
 * GET /api/widgets/smokeless/token
 *
 * Returns a Firebase custom token for the configured smokeless UID.
 * The display frontend uses this to call signInWithCustomToken(), establishing
 * a persistent session in the Cast browser's IndexedDB — no OAuth popup needed.
 *
 * Required env vars (root .env):
 *   FIREBASE_SMOKELESS_UID          — the Firebase Auth UID to sign in as
 *   FIREBASE_SERVICE_ACCOUNT_JSON   — service account JSON (single-line escaped string)
 */
export default async function smokelessRoutes(fastify: FastifyInstance) {
	fastify.get('/api/widgets/smokeless/token', async (_req, reply) => {
		const uid = process.env.FIREBASE_SMOKELESS_UID;
		if (!uid) {
			return reply.code(503).send({ error: 'FIREBASE_SMOKELESS_UID not configured' });
		}
		try {
			const admin = getFirebaseAdmin();
			const token = await admin.auth().createCustomToken(uid);
			return { token };
		} catch (err: any) {
			return reply.code(500).send({ error: err.message });
		}
	});
}
