import './components/ColumnLayout.js';
import './components/ConfigPanel.js';
import './components/ScrollDots.js';
import './components/Sidebar.js';
import './components/ToastManager.js';
import './components/VerticalColumn.js';
import './styles/main.css';
import './styles/tailwind.css';

// Register widget custom elements
import './widgets/calendar/CalendarWidget.js';
import './widgets/clock/ClockWidget.js';
import './widgets/logger/LoggerWidget.js';
import './widgets/medical/MedicalWidget.js';
import './widgets/reddit/RedditWidget.js';
import './widgets/smokeless/SmokelessWidget.js';

import { api } from './api.js';

async function boot() {
	try {
		const layout = await api.getLayout();
		const app = document.getElementById('app')!;

		app.className = 'flex relative flex-1 p-4';

		app.innerHTML = `
      <nest-sidebar class="shrink-0"></nest-sidebar>
      <div class="flex relative flex-col flex-1">
        <column-layout id="widget-scroller" class="flex-1">
          <vertical-column id="col-left"></vertical-column>
          <vertical-column id="col-right"></vertical-column>
        </column-layout>
        <toast-manager></toast-manager>
        <config-panel></config-panel>
      </div>
    `;

		const colLeft = document.getElementById('col-left')!;
		const colRight = document.getElementById('col-right')!;

		const renderWidget = (instance: any, container: HTMLElement) => {
			const tagName = instance.widgetId;
			const el = document.createElement(tagName);

			if (el instanceof HTMLUnknownElement && !customElements.get(tagName)) {
				const fallback = document.createElement('div');
				fallback.className =
					'flex flex-col gap-3 justify-center items-center p-6 text-center glass border-[0.5px] border-white/5';
				fallback.innerHTML = `
          <span class="text-3xl">🧩</span>
          <div class="truncate text-label-caps text-white/30">${instance.widgetId}</div>
          <p class="text-xs-extra text-white/20">Widget implementation pending</p>
        `;
				container.appendChild(fallback);
			} else {
				el.setAttribute('instance-id', instance.instanceId);
				el.setAttribute('widget-config', JSON.stringify(instance.config));
				container.appendChild(el);
			}
		};

		[...layout.columns.left].sort((a, b) => a.order - b.order).forEach((w) => renderWidget(w, colLeft));
		[...layout.columns.right].sort((a, b) => a.order - b.order).forEach((w) => renderWidget(w, colRight));
	} catch (err) {
		console.error('Boot failed:', err);
		document.body.innerHTML = `
      <div class="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a10] text-tint-red gap-6 p-10 text-center">
        <h1 class="text-4xl font-bold tracking-tighter uppercase">System Error</h1>
        <p class="max-w-md font-mono text-sm-extra text-white/60">${(err as Error).message}</p>
        <button onclick="location.reload()" class="px-10 py-4 mt-4 font-bold text-white rounded-full border transition-transform bg-white/10 border-white/20 active:scale-95 text-lg-extra">Retry System</button>
      </div>
    `;
	}
}

boot().catch((err) => {
	console.error('System boot failed:', err);
});
