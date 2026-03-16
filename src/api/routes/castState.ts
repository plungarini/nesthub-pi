import type { FastifyInstance } from 'fastify';

interface CastStatePayload {
	visible: boolean;
	reason: string;
	ts: number;
}

// Module-level state — single source of truth for cast visibility
let castState: {
	visible: boolean;
	reason: string;
	lastUpdate: number;
	lastHeartbeat: number;
} = {
	visible: false,
	reason: 'init',
	lastUpdate: 0,
	lastHeartbeat: 0,
};

export function getCastState() {
	return { ...castState };
}

export function resetCastState() {
	castState.visible = true;
	castState.reason = 'relaunch';
	castState.lastUpdate = Date.now();
	castState.lastHeartbeat = Date.now();
}

export default async function castStateRoutes(fastify: FastifyInstance) {
	// Sidecar calls this immediately on error detection — don't wait for poll cycle
	fastify.post('/api/cast/notify-error', async () => {
		const { castSender } = await import('../../core/castSender.js');
		castSender.triggerRelaunch();
		return { ok: true };
	});

	fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
		try {
			done(null, JSON.parse(body as string));
		} catch (e) {
			done(null, {});
		}
	});

	// Receiver reports visibility events (sendBeacon POSTs here)
	fastify.post('/api/cast/state', async (req) => {
		const body = req.body as CastStatePayload;
		castState.visible = body.visible;
		castState.reason = body.reason ?? 'unknown';
		castState.lastUpdate = body.ts ?? Date.now();
		return { ok: true };
	});

	// Receiver sends heartbeat on every content poll (while alive and visible)
	fastify.post('/api/cast/heartbeat', async (req) => {
		castState.lastHeartbeat = Date.now();
		castState.lastUpdate = Date.now();
		// Do NOT touch castState.visible — only the receiver controls that
		return { ok: true };
	});

	// Watchdog reads this
	fastify.get('/api/cast/state', async () => {
		return castState;
	});
}
