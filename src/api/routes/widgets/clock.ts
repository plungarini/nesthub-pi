import type { WidgetDefinition } from '../../../widgets/types.js';

export const clockWidget: WidgetDefinition = {
	id: 'clock-widget',
	name: 'Clock',
	description: 'Digital clock with date and time',
	defaultSize: 'small',
	defaultTint: 'glass-blue',
	pollInterval: 1000,
};
