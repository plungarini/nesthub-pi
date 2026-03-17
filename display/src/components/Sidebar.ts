/**
 * Sidebar — right-edge glass panel (64px wide, full height).
 * Contains: time indicator, config trigger button, system status dot.
 * More items can be added later.
 *
 * Tapping the config button opens ConfigPanel.
 */
export class Sidebar extends HTMLElement {
	connectedCallback() {
		this.className =
			'w-[4.5rem] h-full flex flex-col items-center py-6 border-r border-white/5 bg-black/40 backdrop-blur-3xl shrink-0 z-[100]';
		this.render();
		this.addEventListener('click', this.onClick.bind(this));
	}

	private render() {
		this.innerHTML = `
      <div class="flex flex-col items-center gap-1 mb-8">
        <div id="sb-time" class="text-base-extra font-black text-white px-2"></div>
        <div class="flex gap-1 opacity-40 scale-75">
          <span>📶</span>
          <span>5G</span>
        </div>
      </div>
      
      <div class="flex-1 flex flex-col items-center gap-8">
        <button id="nav-logger" class="nav-icon bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]" title="Logs">📊</button>
        <button id="nav-medical" class="nav-icon bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]" title="Medical">💊</button>
        <button id="nav-calendar" class="nav-icon bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]" title="Calendar">📅</button>
      </div>

      <div class="mt-auto flex flex-col items-center gap-6">
        <button id="nav-home" class="w-12 h-12 rounded-xl glass-heavy border border-white/20 flex items-center justify-center text-2xl active:scale-90 transition-all cursor-pointer">🔳</button>
        <button id="sb-config" class="text-2xl opacity-20 active:opacity-100 active:rotate-90 transition-all cursor-pointer">⚙️</button>
      </div>
      
      <style>
        .nav-icon { 
          @apply w-12 h-12 rounded-xl flex items-center justify-center text-3xl active:scale-90 transition-all cursor-pointer border border-white/10;
        }
      </style>
    `;
		this.updateTime();
		setInterval(() => this.updateTime(), 1000);

		// Handle navigation
		this.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			const btn = target.closest('button');
			if (!btn) return;

			if (btn.id === 'nav-home') {
				document.querySelectorAll('vertical-column').forEach((col) => col.scrollTo({ top: 0, behavior: 'smooth' }));
				return;
			}

			let widgetTag = '';
			if (btn.id === 'nav-logger') widgetTag = 'logger-widget';
			if (btn.id === 'nav-medical') widgetTag = 'medical-widget';
			if (btn.id === 'nav-calendar') widgetTag = 'calendar-widget';

			if (widgetTag) {
				const el = document.querySelector(widgetTag);
				if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		});
	}

	private updateTime() {
		const el = this.querySelector('#sb-time');
		if (el) {
			const now = new Date();
			el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
		}
	}

	private onClick(e: Event) {
		const target = (e.target as HTMLElement).closest('#sb-config');
		if (target) {
			const panel = document.querySelector('config-panel');
			if (panel) panel.toggleAttribute('open');
		}
	}
}
customElements.define('nest-sidebar', Sidebar);
