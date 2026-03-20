import { BaseWidget } from '../_base/BaseWidget.js';
import { fetchLogs } from './api.js';

/**
 * LoggerWidget — live system logs.
 */
export class LoggerWidget extends BaseWidget {
	static readonly widgetId = 'logger-widget';
	static readonly pollInterval = 5000;

	protected async fetchData(signal: AbortSignal): Promise<any> {
		return await fetchLogs(signal);
	}

	protected render(): string {
		const logs = Array.isArray(this.data) ? this.data.slice(-20).reverse() : [];

		return `
      <div class="flex items-center justify-between px-2 py-1">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">System Logs</span>
      </div>
      <div id="log-container" data-preserve-scroll class="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar font-mono mt-2">
        ${
					logs.length > 0
						? logs
								.map((log: any) => {
									const colorClass = this._getLevelColorClass(log.level);
									const timeDiff = this._getTimeDiff(log.timestamp);
									return `
            				<div class="flex flex-col gap-1 items-start py-2 border border-white/3 last:border-0 bg-white/3 transition-colors px-2 rounded-lg">
											<div class="flex items-center w-full justify-between gap-2">
												<div class="flex-1 flex items-center gap-2">
													<span class="${colorClass} font-bold text-[0.75rem] tracking-tighter text-center shrink-0">${log.level || 'INFO'}</span>
													<span class="text-white/50 font-bold text-[0.75rem] uppercase truncate shrink-0">[${log.projectId || 'sys'}]</span>
												</div>

												<span class="text-white/50 text-[0.625rem] truncate shrink-0">${timeDiff}</span>
											</div>
											<span class="text-white/80 font-medium text-[0.85rem] line-clamp-3 flex-1 tracking-tight">${log.message || log.msg || ''}</span>
										</div>
										`;
								})
								.join('')
						: `<div class="flex-1 flex items-center justify-center text-white/20 italic text-sm font-bold uppercase tracking-widest">No logs available</div>`
				}
      </div>
    `;
	}

	private _getTimeDiff(timestamp: string): string {
		const now = new Date();
		const logTime = new Date(timestamp);
		const diff = now.getTime() - logTime.getTime();
		if (diff < 1000) return 'now';
		if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ${Math.floor(diff / 1000) % 60}s ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ${Math.floor(diff / 60000) % 60}m ago`;
		return `${Math.floor(diff / 86400000)}d ${Math.floor(diff / 3600000) % 24}h ago`;
	}

	private _getLevelColorClass(level: string): string {
		const l = (level || '').toLowerCase();
		if (l.includes('err') || l.includes('fatal')) return 'text-red-400';
		if (l.includes('warn')) return 'text-amber-400';
		if (l.includes('info')) return 'text-blue-400';
		if (l.includes('succ')) return 'text-green-400';
		return 'text-white/40';
	}
}
customElements.define('logger-widget', LoggerWidget);
