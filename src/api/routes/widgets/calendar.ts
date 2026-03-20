import type { FastifyInstance } from 'fastify';
import type { WidgetDefinition } from '../../../widgets/types.js';

export const calendarWidget: WidgetDefinition = {
	id: 'calendar-widget',
	name: 'Calendar',
	description: 'Upcoming events from Google Calendar',
	defaultSize: 'medium',
	defaultTint: 'glass-blue',
	dataEndpoint: '/api/widgets/calendar/data',
	pollInterval: 60000,
};

export default async function calendarRoutes(fastify: FastifyInstance) {
	fastify.get('/api/widgets/calendar/data', async () => {
		// Mock data for now as the existing service was not found
		return [
			{
				id: '1',
				title: 'Project Refactor Sync',
				start: new Date(Date.now() + 3600000).toISOString(),
				location: 'Video Call',
			},
			{
				id: '2',
				title: 'Lunch with Team',
				start: new Date(Date.now() + 7200000).toISOString(),
				location: 'Kitchen',
			},
			{
				id: '3',
				title: 'Gym Session',
				start: new Date(Date.now() + 86400000).toISOString(),
				location: 'Local Gym',
			},
		];
	});
}
