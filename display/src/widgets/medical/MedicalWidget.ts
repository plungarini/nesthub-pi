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
      <div class="widget-header">
        <span class="widget-title">Medical Assistant</span>
        <span class="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs-extra font-black rounded-full border border-blue-400/20 shadow-lg">LIVE</span>
      </div>
      
      <div class="flex-1 flex flex-col justify-center space-y-8">
        <div class="flex items-center gap-6">
          <div class="w-20 h-20 rounded-[1.5rem] glass-heavy flex items-center justify-center text-5xl shadow-glass border border-white/5">👤</div>
          <div>
            <div class="text-3xl-extra font-black text-white tracking-tight mb-1">${profile.name}</div>
            <div class="text-xl-extra text-white/40 font-bold">${profile.condition}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div class="glass-heavy p-8 rounded-[2rem] border border-white/5 shadow-glass">
            <div class="text-base-extra text-white/30 uppercase font-black tracking-widest mb-3">Breathing</div>
            <div class="text-2xl-extra font-black text-white">${activeBreathing || 'NORMAL'}</div>
          </div>
          <div class="glass-heavy p-8 rounded-[2rem] border border-white/5 shadow-glass">
            <div class="text-base-extra text-white/30 uppercase font-black tracking-widest mb-3">Status</div>
            <div class="text-2xl-extra font-black text-green-400">STABLE</div>
          </div>
        </div>
      </div>
    `;
	}
}
customElements.define('medical-widget', MedicalWidget);
