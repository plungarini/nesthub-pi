import { BaseWidget } from '../_base/BaseWidget.js';

/**
 * ClockWidget — Balanced for Phase 11.
 * Ensures the title isn't cropped and spacing is premium.
 */
export class ClockWidget extends BaseWidget {
	static readonly widgetId = 'clock-widget';
	static readonly pollInterval = 1000;

	private _timer: ReturnType<typeof setInterval> | null = null;

	connectedCallback() {
		super.connectedCallback();
		this._timer = setInterval(() => this._update(), 1000);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		if (this._timer) clearInterval(this._timer);
	}

	protected render(): string {
		const now = new Date();
		const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
		const day = now.toLocaleDateString([], { weekday: 'long' }).toUpperCase();
		const date = now.toLocaleDateString(['it-IT'], { month: 'short', day: 'numeric' }).toUpperCase();

		return `
      <div class="flex items-center justify-between px-2 py-1">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Clock</span>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <h1 class="text-7xl font-bold text-white leading-none mb-4">
          ${time}
        </h1>
        <div class="flex items-center gap-3">
          <div class="text-sm font-bold text-white/90 tracking-[0.25em]">
            ${day}
          </div>
          <div class="text-sm font-bold text-white/40 tracking-widest">
            ${date}
          </div>
        </div>
      </div>
    `;
	}
}
customElements.define('clock-widget', ClockWidget);
