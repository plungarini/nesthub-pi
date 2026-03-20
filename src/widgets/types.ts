export interface WidgetDefinition {
	id: string; // unique kebab-case, e.g. 'logger-pi'
	name: string; // display name, e.g. 'Logger'
	description: string;
	defaultSize: 'small' | 'medium' | 'large' | 'full'; // height hint
	defaultTint?: string; // CSS class e.g. 'glass-blue'
	dataEndpoint?: string; // relative path, e.g. '/api/widgets/logger/data'
	pollInterval?: number; // ms, default 5000
	hasActions?: boolean; // exposes POST /api/widgets/:id/action
	defaultConfig?: Record<string, unknown>;
}

export interface WidgetInstance {
	instanceId: string; // uuid
	widgetId: string; // references WidgetDefinition.id
	config: Record<string, unknown>;
	column: 'left' | 'right';
	order: number;
}

export interface LayoutConfig {
	columns: {
		left: WidgetInstance[];
		right: WidgetInstance[];
	};
}

export interface AlertPayload {
	id: string;
	source: string; // e.g. 'reddit-pi', 'medical-pi'
	title: string;
	message: string;
	level: 'info' | 'warning' | 'error' | 'success';
	durationMs?: number; // ms to display, default 5000
	timestamp: number;
}
