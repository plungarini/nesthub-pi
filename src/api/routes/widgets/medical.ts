import type { FastifyInstance } from 'fastify';
import type { WidgetDefinition } from '../../../widgets/types.js';

export const medicalWidget: WidgetDefinition = {
	id: 'medical-widget',
	name: 'Health Profile',
	description: 'Breathing profile and health score from medical-pi',
	defaultSize: 'small',
	defaultTint: 'glass-green',
	dataEndpoint: '/api/widgets/medical/data',
	pollInterval: 10000,
};

export default async function medicalRoutes(fastify: FastifyInstance) {
	fastify.get('/api/widgets/medical/data', async (req, reply) => {
		try {
			const medicalUrl = process.env.MEDICAL_PI_URL || 'http://127.0.0.1:3003/api/profile';
			const res = await fetch(medicalUrl);
			if (!res.ok) throw new Error(`Medical-pi returned ${res.status}`);
			const data = await res.json();
			return data;
		} catch (err) {
			fastify.log.error(err);
			return reply.status(502).send({ error: 'Failed to fetch profile from medical-pi' });
		}
	});
}
