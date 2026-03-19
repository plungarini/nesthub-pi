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
			'h-full px-4 py-4 glass-heavy !border-white/5 !overflow-visible flex flex-col gap-8 items-center shrink-0';

		this.render();
	}

	private render() {
		this.innerHTML = `
      <div class="flex flex-col items-center">
        <div id="sb-time" class="mb-1 text-lg font-bold tracking-tight text-white"></div>
        <div class="w-1 h-1 rounded-full bg-white/40"></div>
      </div>
      
      <div class="flex flex-col flex-1 justify-center items-center">
        <button id="sb-config" class="w-16 h-16 rounded-[28px] bg-white/5 border border-white/5 flex items-center justify-center active:scale-95 active:bg-white/10 transition-all cursor-pointer shadow-2xl group overflow-hidden relative">
          <div class="absolute inset-0 to-transparent opacity-0 transition-opacity bg-linear-to-tr from-white/10 group-active:opacity-100"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-md">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
      </div>

      <div class="mt-auto opacity-30">
         <span class="text-[9px] font-bold tracking-[0.4em] uppercase">NEST</span>
      </div>
    `;
		this.updateTime();
		setInterval(() => this.updateTime(), 1000);

		// Handle config trigger
		this.querySelector('#sb-config')?.addEventListener('click', () => {
			const panel = document.querySelector('config-panel');
			if (panel) panel.toggleAttribute('open');
		});
	}

	private updateTime() {
		const el = this.querySelector('#sb-time');
		if (el) {
			const now = new Date();
			el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
		}
	}
}
customElements.define('nest-sidebar', Sidebar);
