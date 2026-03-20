import { BaseWidget } from '../_base/BaseWidget.js';

/**
 * CalendarWidget — Refined for Phase 11.
 * Focuses on high-legibility and minimal crowing.
 */
export class CalendarWidget extends BaseWidget {
	static readonly widgetId = 'calendar-widget';
	static readonly pollInterval = 60000;
	static readonly dataEndpoint = '/api/widgets/calendar/data';

	protected render(): string {
		// Only show top 3 events for clarity
		const events = Array.isArray(this.data) ? this.data.slice(0, 3) : [];

		return `
      <div class="flex items-center justify-between mb-6 px-2">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Calendar</span>
        <div class="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[0.625rem] font-bold tracking-widest rounded-full border border-purple-400/20">NEXT UP</div>
      </div>
      
      <div class="flex-1 flex flex-col justify-center gap-5 mt-2">
        ${
					events.length > 0
						? events
								.map((event: any) => {
									const date = new Date(event.start);
									const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
									const isToday = new Date().toDateString() === date.toDateString();

									return `
            <div class="flex gap-5 items-center">
              <div class="w-14 flex flex-col items-center shrink-0">
                <div class="text-[0.5625rem] font-bold uppercase tracking-widest ${isToday ? 'text-blue-400' : 'text-white/20'} mb-1">${isToday ? 'TODAY' : 'DATE'}</div>
                <div class="text-lg font-bold text-white leading-none tracking-tighter">${timeStr}</div>
              </div>
              <div class="flex-1 overflow-hidden">
                <div class="text-lg font-bold text-white/95 line-clamp-1 tracking-tight leading-tight">${event.title}</div>
                <div class="text-[0.6875rem] font-bold text-white/30 truncate uppercase tracking-widest mt-0.5">
                  ${event.location || 'No Location Specified'}
                </div>
              </div>
            </div>
          `;
								})
								.join('')
						: `<div class="flex-1 flex items-center justify-center text-white/20 italic text-sm font-bold uppercase tracking-widest">No upcoming events</div>`
				}
      </div>
    `;
	}
}
customElements.define('calendar-widget', CalendarWidget);
