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
		const date = now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

		return `
      <div class="widget-header">
        <span class="widget-title">Clock</span>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center text-center mt-[-1rem]">
        <div class="text-display-lg font-bold tracking-tighter text-white leading-none mb-4 pb-2">
          ${time}
        </div>
        <div class="text-2xl-extra font-black text-white/90 tracking-[0.2em] mb-2 pl-2">
          ${day}
        </div>
        <div class="text-lg-extra font-medium text-white/30 tracking-wide">
          ${date}
        </div>
      </div>
    `;
	}
}
customElements.define('clock-widget', ClockWidget);
