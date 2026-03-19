/**
 * ToastManager — fixed overlay toast container.
 * Connects to SSE /api/alerts/stream and renders alerts as toasts.
 * Toasts appear top-center, stack downward, auto-dismiss after ttl.
 */
import type { AlertPayload } from '../../../src/widgets/types.js';

export class ToastManager extends HTMLElement {
	private es: EventSource | null = null;

	connectedCallback() {
		this.className = 'fixed top-[0.875rem] left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[9999] pointer-events-none w-[80%]';
		this.connectSSE();
	}

	disconnectedCallback() {
		this.es?.close();
	}

	private connectSSE() {
		this.es = new EventSource('/api/alerts/stream');
		this.es.onmessage = (e) => {
			try {
				const alert: AlertPayload = JSON.parse(e.data);
				this.showToast(alert);
			} catch {}
		};
		this.es.onerror = () => {
			// Retry after 3s
			this.es?.close();
			setTimeout(() => this.connectSSE(), 3000);
		};
	}

	private showToast(alert: AlertPayload) {
		const el = document.createElement('div');
		const colorMap: Record<string, string> = {
			info: 'glass-blue',
			success: 'glass-green',
			warning: 'glass-amber',
			error: 'glass-red',
		};
		el.className = `glass-heavy ${colorMap[alert.level] ?? ''} drop-shadow-2xl flex flex-col gap-1 py-4 px-5 rounded-[1.25rem] text-2xl pointer-events-auto border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]`;
		el.style.animation = 'toastIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards';
		el.innerHTML = `
      <div class="flex gap-2 items-center">
        <span class="w-2 h-2 rounded-full ${alert.level === 'error' ? 'bg-red-400' : 'bg-white/40'}"></span>
        <span class="font-extrabold text-(--text-primary) uppercase tracking-[0.05em] text-base">${alert.title}</span>
      </div>
      <span class="text-(--text-secondary) font-medium leading-[1.4]">${alert.message}</span>
    `;
		this.appendChild(el);

		const ttl = alert.ttl ?? 5000;
		setTimeout(() => {
			el.style.animation = 'toastOut 250ms cubic-bezier(0.7, 0, 0.84, 0) forwards';
			setTimeout(() => el.remove(), 250);
		}, ttl);
	}
}
customElements.define('toast-manager', ToastManager);
