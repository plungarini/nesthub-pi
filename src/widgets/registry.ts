import type { WidgetDefinition } from './types.js';

const widgets: Map<string, WidgetDefinition> = new Map();

export function registerWidget(def: WidgetDefinition) {
	widgets.set(def.id, def);
}

export function getWidget(id: string): WidgetDefinition | undefined {
	return widgets.get(id);
}

export function getAllWidgets(): WidgetDefinition[] {
	return Array.from(widgets.values());
}

// Register all built-in widgets here
import { clockWidget } from '../api/routes/widgets/clock.js';
import { calendarWidget } from '../api/routes/widgets/calendar.js';
import { loggerWidget } from '../api/routes/widgets/logger.js';
import { redditWidget } from '../api/routes/widgets/reddit.js';
import { medicalWidget } from '../api/routes/widgets/medical.js';

[clockWidget, calendarWidget, loggerWidget, redditWidget, medicalWidget].forEach(registerWidget);
