import { BaseWidget } from '../_base/BaseWidget.js';

/**
 * MedicalWidget — High-visibility medical assistant.
 */
export class MedicalWidget extends BaseWidget {
	static readonly widgetId = 'medical-widget';
	static readonly pollInterval = 10000;
	static readonly dataEndpoint = '/api/widgets/medical/data';

	protected render(): string {
		if (!this.data) return '';
		const { profile, activeBreathing } = this.data;

		return `
      <div class="flex items-center justify-between mb-6 px-2">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Medical Assistant</span>
        <div class="flex items-center gap-2">
           <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
           <span class="text-[0.625rem] font-bold tracking-widest text-blue-400/80">LIVE</span>
        </div>
      </div>
      
      <div class="flex-1 flex flex-col justify-center gap-6">
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 rounded-2xl glass-heavy flex items-center justify-center text-3xl shadow-lg border border-white/5">👤</div>
          <div>
            <div class="text-2xl font-bold text-white tracking-tight leading-tight">${profile.name}</div>
            <div class="text-sm font-bold text-white/40 tracking-wide uppercase">${profile.condition}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="glass-heavy p-5 rounded-3xl border border-white/5 shadow-black/20 shadow-lg">
            <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest mb-1.5">Breathing</div>
            <div class="text-xl font-bold text-white tracking-tight">${activeBreathing || 'NORMAL'}</div>
          </div>
          <div class="glass-heavy p-5 rounded-3xl border border-white/5 shadow-black/20 shadow-lg">
            <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest mb-1.5">Status</div>
            <div class="text-xl font-bold text-green-400/90 tracking-tight">STABLE</div>
          </div>
        </div>
      </div>
    `;
	}
}
customElements.define('medical-widget', MedicalWidget);
