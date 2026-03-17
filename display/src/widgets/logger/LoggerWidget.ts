import { BaseWidget } from '../_base/BaseWidget.js';

/**
 * LoggerWidget — live system logs.
 */
export class LoggerWidget extends BaseWidget {
	static readonly widgetId = 'logger-widget';
	static readonly pollInterval = 5000;
	static readonly dataEndpoint = '/api/widgets/logger/data';

	protected render(): string {
		const logs = Array.isArray(this.data) ? this.data.slice(-20).reverse() : [];

		return `
      <div class="widget-header">
        <span class="widget-title">System Logs</span>
        <span class="text-base-extra font-black text-blue-400 px-4 py-1 bg-white/5 rounded-full border border-blue-400/20">LIVE FEED</span>
      </div>
      <div class="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar font-mono">
        ${
					logs.length > 0
						? logs
								.map((log: any) => {
									const colorClass = this._getLevelColorClass(log.level);
									return `
            <div class="flex gap-4 items-center group py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-3 rounded-xl">
              <span class="${colorClass} font-black text-sm-extra w-10 shrink-0 tracking-tighter text-center">${(log.level || 'INFO').substring(0, 3)}</span>
              <span class="text-white/20 font-black text-sm-extra w-24 shrink-0 uppercase truncate decoration-white/10 decoration-1 underline-offset-4">[${log.projectId || 'sys'}]</span>
              <span class="text-white font-medium text-base-extra line-clamp-1 flex-1">${log.message || log.msg || ''}</span>
            </div>
          `;
								})
								.join('')
						: `<div class="text-white/30 text-center py-10 italic text-lg-extra">No logs available</div>`
				}
      </div>
    `;
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
