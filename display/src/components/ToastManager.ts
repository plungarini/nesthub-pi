/**
 * ToastManager — fixed overlay toast container.
 * Connects to SSE /api/alerts/stream and renders alerts as toasts.
 * Toasts appear top-center, stack downward, auto-dismiss after ttl.
 */
import type { AlertPayload } from '../../../src/widgets/types.js';

export class ToastManager extends HTMLElement {
	private es: EventSource | null = null;

	connectedCallback() {
		this.style.cssText = `
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 9999;
      pointer-events: none;
      width: 360px;
    `;
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
		el.className = `glass ${colorMap[alert.level] ?? ''}`;
		el.style.cssText = `
      padding: 10px 14px;
      border-radius: var(--glass-radius-sm);
      font-size: 13px;
      pointer-events: auto;
      animation: toastIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: var(--glass-shadow);
    `;
		el.innerHTML = `
      <span style="font-weight:600;color:var(--text-primary)">${alert.title}</span>
      <span style="color:var(--text-secondary);font-size:12px">${alert.message}</span>
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
