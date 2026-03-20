import { BaseWidget } from '../_base/BaseWidget.js';
import { fetchMedicalData } from './api.js';
import { MedicalData } from './types.js';

/**
 * MedicalWidget — High-visibility premium medical assistant.
 * Displays telemetry, medications, and clinical alerts.
 */
export class MedicalWidget extends BaseWidget {
	static readonly widgetId = 'medical-widget';
	static readonly pollInterval = 15000;

	protected async fetchData(signal: AbortSignal): Promise<any> {
		return await fetchMedicalData(signal);
	}

	protected render(): string {
		const profile = this.data as MedicalData;
		if (!profile) return '';

		if (profile.status === 'not_onboarded') {
			return this.renderNotOnboarded();
		}

		const { bmi, bmiStatus } = this.calculateBMI(profile.demographics);
		const heartRate = this.getHeartRate(profile.vitals);

		return `
      ${this.renderHeader()}
      
      <div id="medical-container" data-preserve-scroll class="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar font-sans pr-1 pb-6 snap-y snap-mandatory">
        ${this.renderStatusCard(profile)}
        ${this.renderBiometricsGrid(profile, heartRate)}
        ${this.renderMedications(profile)}
        ${this.renderAllergies(profile)}
        ${this.renderStatureCard(profile, bmi, bmiStatus)}
      </div>
    `;
	}

	private renderNotOnboarded(): string {
		return `
      <div class="flex items-center justify-between mb-5 px-2 text-red-400">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold tracking-[0.12em]">Medical Profile</span>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
        <div class="text-4xl text-red-400 shadow-[0_0_20px_rgba(248,113,113,0.3)]">⚠️</div>
        <div class="text-sm font-bold text-white/60 tracking-tight uppercase">Profile Not Found</div>
        <p class="text-xs text-white/30 leading-relaxed">Please complete your onboarding at <br/> <span class="text-blue-400/50">http://medical.pi</span></p>
      </div>
    `;
	}

	private renderHeader(): string {
		return `
      <div class="flex items-center justify-between mb-4 px-2 shrink-0">
        <div class="flex flex-col">
          <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Medical Profile</span>
          <span class="text-[0.625rem] text-white/20 uppercase font-medium mt-1 uppercase tracking-wider">Telemetric Intelligence</span>
        </div>
        <div class="flex items-center gap-2 px-2.5 py-1 glass-heavy rounded-full border border-blue-500/10 shadow-lg">
           <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
           <span class="text-[0.625rem] font-bold tracking-widest text-blue-400/80 uppercase">Protected</span>
        </div>
      </div>
    `;
	}

	private renderStatusCard(profile: MedicalData): string {
		const conditions = profile.currentConditions || [];
		const mainCondition = conditions.length > 0 ? conditions[0].condition : 'General Health';
		const bloodType = profile.demographics?.bloodType || '--';

		return `
      <div class="glass-heavy border snap-start border-white/5 p-4 rounded-3xl shadow-xl flex items-center gap-4 shrink-0 transition-all active:scale-[0.98]">
        <div class="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl shadow-inner border border-white/5 ring-1 ring-white/5">⚕️</div>
        <div class="flex flex-col">
          <div class="text-[0.625rem] text-white/20 font-bold uppercase tracking-[0.15em] mb-0.5">Primary Status</div>
          <div class="text-lg font-bold text-white tracking-tight leading-none truncate max-w-[170px]">${mainCondition}</div>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-[0.625rem] font-bold text-green-400/90 tracking-widest uppercase bg-green-400/5 px-2 py-0.5 rounded-full border border-green-400/10">Stable</span>
            <span class="text-[0.625rem] font-bold text-white/20 tracking-widest uppercase text-white/30">Type ${bloodType}</span>
          </div>
        </div>
      </div>
    `;
	}

	private renderBiometricsGrid(profile: MedicalData, heartRate: string | null): string {
		const weight = profile.demographics?.weight || '--';

		return `
      <div class="grid grid-cols-2 gap-3 shrink-0 snap-start">
        <div class="glass-heavy p-4 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-between aspect-square lg:aspect-auto">
          <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest mb-1">Weight</div>
          <div class="flex items-baseline gap-1 mt-auto">
            <span class="text-2xl font-bold text-white tracking-tight">${weight}</span>
            <span class="text-[0.625rem] font-medium text-white/20 uppercase">kg</span>
          </div>
        </div>
        <div class="glass-heavy p-4 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-between aspect-square lg:aspect-auto">
          <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest mb-1">Heart Rate</div>
          <div class="flex items-baseline gap-1 mt-auto">
            <span class="text-2xl font-bold ${heartRate ? 'text-red-400' : 'text-white/10'} tracking-tight">${heartRate || '--'}</span>
            <span class="text-[0.625rem] font-medium text-white/20 uppercase">bpm</span>
          </div>
        </div>
      </div>
    `;
	}

	private renderMedications(profile: MedicalData): string {
		const medications = profile.medications || [];
		if (medications.length === 0) return '';

		return `
      <div class="glass-heavy border snap-start border-white/5 p-4 rounded-3xl shadow-xl flex flex-col gap-3 shrink-0">
        <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest mb-1">Active Medications</div>
        <div class="flex flex-col gap-2">
          ${medications.slice(0, 3).map(med => `
            <div class="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 font-sans">
              <div class="text-xs">💊</div>
              <div class="flex flex-col">
                <span class="text-xs font-bold text-white/90 leading-none">${med.name}</span>
                <span class="text-[10px] text-white/30 mt-1 uppercase font-bold tracking-wider">${med.dosage || ''} ${med.frequency ? '• ' + med.frequency : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
	}

	private renderAllergies(profile: MedicalData): string {
		const allergies = profile.allergies || [];
		if (allergies.length === 0) return '';

		return `
      <div class="snap-start flex flex-col gap-2 p-2">
        <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest px-1">Allergies & Risks</div>
        <div class="flex flex-wrap gap-2">
          ${allergies.map(a => `
            <div class="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>
              <span class="text-[0.625rem] font-bold text-red-100/80 uppercase tracking-widest">${a.substance}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
	}

	private renderStatureCard(profile: MedicalData, bmi: string | null, bmiStatus: string): string {
		const height = profile.demographics?.height || '--';

		return `
      <div class="glass-heavy p-4 rounded-3xl border border-white/5 shadow-lg flex items-center justify-between shrink-0 snap-start">
        <div class="flex flex-col">
          <div class="text-[0.625rem] text-white/30 uppercase font-bold tracking-widest mb-1">Stature</div>
          <div class="flex items-baseline gap-1">
            <span class="text-lg font-bold text-white tracking-tight">${height}</span>
            <span class="text-[0.625rem] font-medium text-white/20 uppercase">cm</span>
          </div>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/5">
           <div class="text-[10px] text-white/30 uppercase font-black">${bmi ?? '---'}</div>
           <span class="text-[0.625rem] font-bold ${bmiStatus === 'Optimal' ? 'text-green-400/90' : 'text-amber-400/90'} tracking-wide uppercase">${bmiStatus}</span>
        </div>
      </div>
    `;
	}

	private calculateBMI(demographics: MedicalData['demographics']): { bmi: string | null; bmiStatus: string } {
		let bmi: string | null = null;
		let bmiStatus = '---';

		if (demographics?.weight && demographics?.height) {
			const w = Number.parseFloat(demographics.weight);
			const h = Number.parseFloat(demographics.height) / 100;
			if (!Number.isNaN(w) && !Number.isNaN(h) && h > 0) {
				const val = w / (h * h);
				bmi = val.toFixed(1);
				if (val < 18.5) bmiStatus = 'Underweight';
				else if (val < 25) bmiStatus = 'Optimal';
				else if (val < 30) bmiStatus = 'Overweight';
				else bmiStatus = 'Obese';
			}
		}

		return { bmi, bmiStatus };
	}

	private getHeartRate(vitals: MedicalData['vitals']): string | null {
		const heartRateReading = vitals?.find(v => 
			v.type.toLowerCase().includes('heart') || v.type.toLowerCase() === 'bpm'
		);
		return heartRateReading ? heartRateReading.value : null;
	}
}
customElements.define('medical-widget', MedicalWidget);
