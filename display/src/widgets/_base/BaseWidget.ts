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

	// Subclass declares these
	static readonly widgetId: string;
	static readonly pollInterval: number = 5000;
	static readonly dataEndpoint: string | null = null;

	connectedCallback() {
		this.className = 'glass widget-shell';
		this._startPolling();
		this._update();
	}

	disconnectedCallback() {
		this._stopPolling();
		this._abortController?.abort();
	}

	private _startPolling() {
		const endpoint = (this.constructor as typeof BaseWidget).dataEndpoint;
		const interval = (this.constructor as typeof BaseWidget).pollInterval;
		if (!endpoint) {
			this.loading = false;
			this._update();
			return;
		}

		const poll = async () => {
			this._abortController = new AbortController();
			try {
				const res = await fetch(endpoint, { signal: this._abortController.signal });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
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
		if (this._pollTimer) clearInterval(this._pollTimer);
	}

	protected _update() {
		if (this.loading) {
			this.innerHTML = this._renderLoading();
			return;
		}
		this.innerHTML = this.error ? this._renderError(this.error) : this.render();
	}

	protected _renderLoading(): string {
		return `<div class="flex-1 flex items-center justify-center"><div class="animate-spin w-8 h-8 border-4 border-tint-blue/30 border-t-tint-blue rounded-full"></div></div>`;
	}

	protected _renderError(msg: string): string {
		return `<div class="flex-1 flex flex-col items-center justify-center text-tint-red gap-4 animate-pulse">
      <span class="text-5xl">⚠</span>
      <p class="text-sm-extra font-bold text-center opacity-80 max-w-[80%]">${msg}</p>
    </div>`;
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
