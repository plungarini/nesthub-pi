/**
 * BaseWidget — abstract class all widgets must extend.
 *
 * Lifecycle:
 *   constructor() → connectedCallback() → [pollInterval ticks] → disconnectedCallback()
 *
 * Subclasses must implement:
 *   - render(): string  — returns inner HTML string, called on every data update
 *   - Optional: onData(data: unknown): void — called with fresh API data
 *   - Optional: onAction(type: string, payload: unknown): void — called on touch actions
 */
export abstract class BaseWidget extends HTMLElement {
	protected data: any = null;
	protected loading = true;
	protected error: string | null = null;
	private _pollTimer: ReturnType<typeof setInterval> | null = null;
	private _abortController: AbortController | null = null;
	private _observer: IntersectionObserver | null = null;
	private _isVisible = false;
	private _scrollStates: Record<string, number> = {};

	// Subclass declares these
	static readonly widgetId: string;
	static readonly pollInterval: number = 5000;
	static readonly dataEndpoint: string | null = null;

	connectedCallback() {
		this.className = 'flex overflow-hidden relative flex-col px-2 py-4 h-full transition-all duration-300 glass ease';
		this.style.borderRadius = 'var(--radius-glass)';

		this._setupVisibilityObserver();
		this._update();
	}

	private _setupVisibilityObserver() {
		this._observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				this._isVisible = entry.isIntersecting;
				if (this._isVisible) {
					this._startPolling();
				} else {
					this._stopPolling();
				}
			},
			{ threshold: 0.1 }
		);
		this._observer.observe(this);
	}

	disconnectedCallback() {
		this._stopPolling();
		this._abortController?.abort();
		this._observer?.disconnect();
	}

	protected async fetchData(signal: AbortSignal): Promise<any> {
		const endpoint = (this.constructor as typeof BaseWidget).dataEndpoint;
		if (endpoint) {
			const res = await fetch(endpoint, { signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return await res.json();
		}
		throw new Error('No dataEndpoint or fetchData implementation provided');
	}

	private _startPolling() {
		if (this._pollTimer || !this._isVisible) return;

		const endpoint = (this.constructor as typeof BaseWidget).dataEndpoint;
		const interval = (this.constructor as typeof BaseWidget).pollInterval;

		// Check if the subclass actually wants to fetch data.
		const hasFetchDataOverride = this.fetchData !== BaseWidget.prototype.fetchData;
		if (!endpoint && !hasFetchDataOverride) {
			this.loading = false;
			this._update();
			return;
		}

		const poll = async () => {
			this._abortController = new AbortController();
			try {
				const data = await this.fetchData(this._abortController.signal);
				this.data = data;
				this.loading = false;
				this.error = null;
				this.onData?.(data);
			} catch (e: unknown) {
				if ((e as Error).name === 'AbortError') return;
				this.error = (e as Error).message;
				this.loading = false;
			}
			this._update();
		};

		poll();
		this._pollTimer = setInterval(poll, interval);
	}

	private _stopPolling() {
		if (this._pollTimer) {
			clearInterval(this._pollTimer);
			this._pollTimer = null;
		}
	}

	protected _update() {
		this._saveScroll();

		if (this.loading) {
			this.innerHTML = this._renderLoading();
			return;
		}
		this.innerHTML = this.error ? this._renderError(this.error) : this.render();

		this._restoreScroll();
	}

	private _saveScroll() {
		this._scrollStates = {};
		const scrollables = this.querySelectorAll('[data-preserve-scroll]');
		scrollables.forEach((el, idx) => {
			const key = el.id || `scroll-idx-${idx}`;
			this._scrollStates[key] = el.scrollTop;
		});
	}

	private _restoreScroll() {
		Object.entries(this._scrollStates).forEach(([key, top]) => {
			let el: Element | null = null;
			if (key.startsWith('scroll-idx-')) {
				const idx = Number.parseInt(key.replace('scroll-idx-', ''));
				el = this.querySelectorAll('[data-preserve-scroll]')[idx];
			} else {
				el = this.querySelector(`#${key}`);
			}
			if (el) el.scrollTop = top;
		});
	}

	protected _renderLoading(): string {
		return `<div class="flex flex-1 justify-center items-center"><div class="w-8 h-8 rounded-full border-4 animate-spin border-tint-blue/30 border-t-tint-blue"></div></div>`;
	}

	protected _renderError(msg: string): string {
		return `
      <div class="flex flex-col flex-1 gap-8 justify-center items-center p-12 text-center select-none group">
        <div class="flex justify-center items-center w-20 h-20 rounded-full border shadow-2xl transition-transform duration-700 bg-white/10 border-white/10 text-white/30 group-hover:scale-110">
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round opacity-60"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="space-y-2">
          <div class="text-[11px] font-bold uppercase tracking-[0.3em] text-white/80">System Component Fault</div>
          <div class="text-[15px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">${msg}</div>
        </div>
      </div>
    `;
	}

	// Subclasses implement this
	protected abstract render(): string;
	protected onData?(data: any): void;
	protected onAction?(type: string, payload: any): void;

	// Helper for dispatching actions back to the API
	protected async dispatchAction(type: string, payload: any = {}) {
		const id = (this.constructor as typeof BaseWidget).widgetId;
		await fetch(`/api/widgets/${id}/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type, payload }),
		});
		// Trigger immediate re-poll after action
		this._stopPolling();
		this._startPolling();
	}
}
