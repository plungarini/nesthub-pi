import './styles/tailwind.css';
import './styles/main.css';
import './components/VerticalColumn.js';
import './components/ColumnLayout.js';
import './components/Sidebar.js';
import './components/ScrollDots.js';
import './components/ToastManager.js';
import './components/ConfigPanel.js';

// Register widget custom elements
import './widgets/clock/ClockWidget.js';
import './widgets/logger/LoggerWidget.js';
import './widgets/reddit/RedditWidget.js';
import './widgets/medical/MedicalWidget.js';
import './widgets/calendar/CalendarWidget.js';

import { api } from './api.js';

async function boot() {
	try {
		const layout = await api.getLayout();
		const app = document.getElementById('app')!;

		app.innerHTML = `
      <nest-sidebar></nest-sidebar>
      <div class="flex-1 flex flex-col overflow-hidden relative">
        <column-layout id="widget-scroller">
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
				fallback.className = 'glass p-6 flex flex-col items-center justify-center text-center gap-3 widget-shell';
				fallback.innerHTML = `
          <span class="text-3xl">🧩</span>
          <div class="text-label-caps text-white/30 truncate">${instance.widgetId}</div>
          <p class="text-xs-extra text-white/20">Widget implementation pending</p>
        `;
				container.appendChild(fallback);
			} else {
				el.setAttribute('instance-id', instance.instanceId);
				el.setAttribute('widget-config', JSON.stringify(instance.config));
				container.appendChild(el);
			}
		};

		[...layout.columns.left].sort((a, b) => a.order - b.order).forEach(w => renderWidget(w, colLeft));
		[...layout.columns.right].sort((a, b) => a.order - b.order).forEach(w => renderWidget(w, colRight));
	} catch (err) {
		console.error('Boot failed:', err);
		document.body.innerHTML = `
      <div class="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a10] text-tint-red gap-6 p-10 text-center">
        <h1 class="text-4xl font-black uppercase tracking-tighter">System Error</h1>
        <p class="text-sm-extra text-white/60 font-mono max-w-md">${(err as Error).message}</p>
        <button onclick="location.reload()" class="mt-4 px-10 py-4 bg-white/10 border border-white/20 rounded-full text-white font-bold active:scale-95 transition-transform text-lg-extra">Retry System</button>
      </div>
    `;
	}
}

boot();
