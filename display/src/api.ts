import type { LayoutConfig, WidgetDefinition } from '../../src/widgets/types.js';

export const api = {
	async getLayout(): Promise<LayoutConfig> {
		const res = await fetch('/api/layout');
		if (!res.ok) throw new Error('Failed to fetch layout');
		return res.json();
	},

	async saveLayout(layout: LayoutConfig): Promise<void> {
		await fetch('/api/layout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(layout),
		});
	},

	async getWidgets(): Promise<WidgetDefinition[]> {
		const res = await fetch('/api/widgets');
		if (!res.ok) throw new Error('Failed to fetch widgets');
		return res.json();
	},
};
