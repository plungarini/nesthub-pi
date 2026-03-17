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
      <div class="widget-header">
        <span class="widget-title">Calendar</span>
        <span class="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs-extra font-black rounded-full border border-purple-400/20">NEXT UP</span>
      </div>
      
      <div class="flex-1 flex flex-col justify-center gap-6">
        ${
					events.length > 0
						? events
								.map((event: any) => {
									const date = new Date(event.start);
									const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
									const isToday = new Date().toDateString() === date.toDateString();

									return `
            <div class="flex gap-6 items-start">
              <div class="w-16 flex flex-col items-center shrink-0 mt-1">
                <div class="text-[0.7rem] font-black uppercase tracking-widest ${isToday ? 'text-blue-400' : 'text-white/20'} mb-1">${isToday ? 'TODAY' : 'DATE'}</div>
                <div class="text-xl-extra font-black text-white leading-none">${timeStr}</div>
              </div>
              <div class="flex-1 overflow-hidden">
                <div class="text-xl-extra font-black text-white line-clamp-1 tracking-tight leading-tight mb-1">${event.title}</div>
                <div class="text-base-extra font-bold text-white/30 truncate uppercase tracking-wide">
                  ${event.location || 'No Location Specified'}
                </div>
              </div>
            </div>
          `;
								})
								.join('')
						: `<div class="text-white/20 text-center py-10 italic text-xl-extra font-bold">No upcoming events</div>`
				}
      </div>
    `;
	}
}
customElements.define('calendar-widget', CalendarWidget);
