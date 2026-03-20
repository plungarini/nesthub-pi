import type { FastifyInstance } from 'fastify';
import type { WidgetDefinition } from '../../../widgets/types.js';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export const medicalWidget: WidgetDefinition = {
	id: 'medical-widget',
	name: 'Health Profile',
	description: 'Breathing profile and health score from medical-pi',
	defaultSize: 'small',
	defaultTint: 'glass-green',
	dataEndpoint: '/api/widgets/medical/data',
	pollInterval: 10000,
};

// Lazy initialization of the database to avoid startup issues if the file doesn't exist yet
let db: Database.Database | null = null;

function getDb() {
	if (db) return db;
	
	// Try to locate the medical-pi database
	// Relative from services/nesthub-pi
	const dbPaths = [
		path.join(process.cwd(), '../medical-pi/data/medical.db'),
		path.join(process.cwd(), 'services/medical-pi/data/medical.db'), // If running from mono-repo root
		'./data/medical.db'
	];

	for (const p of dbPaths) {
		if (fs.existsSync(p)) {
			console.log(`[MedicalWidget] Connected to database at ${p}`);
			db = new Database(p, { readonly: true });
			return db;
		}
	}
	
	return null;
}

export default async function medicalRoutes(fastify: FastifyInstance) {
	fastify.get('/api/widgets/medical/data', async (req, reply) => {
		try {
			const database = getDb();
			if (!database) {
				return reply.status(503).send({ error: 'Medical database not found' });
			}

			// Get the latest profile
			const row = database.prepare('SELECT profile FROM medical_profiles LIMIT 1').get() as { profile: string } | undefined;
			
			if (!row) {
				// Return a special status instead of 404 to help the frontend show a better message
				return { status: 'not_onboarded' };
			}

			const profile = JSON.parse(row.profile);
			return { ...profile, status: 'active' };
		} catch (err) {
			fastify.log.error(err);
			return reply.status(500).send({ error: 'Internal error reading medical database' });
		}
	});
}
