import { BaseWidget } from '../_base/BaseWidget.js';

/**
 * RedditWidget — top recommendations from reddit-pi.
 */
export class RedditWidget extends BaseWidget {
	static readonly widgetId = 'reddit-widget';
	static readonly pollInterval = 30000;
	static readonly dataEndpoint = '/api/widgets/reddit/data';

	protected render(): string {
		const items = Array.isArray(this.data) ? this.data : [];

		return `
      <div class="flex items-center justify-between mb-6 px-2">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Reddit Intelligence</span>
        <div class="px-2.5 py-0.5 bg-amber-500/10 text-amber-500/80 text-[0.625rem] font-bold tracking-widest rounded-full border border-amber-500/20 shadow-md">HOT 5</div>
      </div>
      <div class="flex-1 flex flex-col gap-4 overflow-hidden mt-2 overflow-y-auto no-scrollbar pr-1">
        ${
					items.length > 0
						? items
								.map(
									(item: any) => `
            <div class="glass-heavy border border-white/5 p-5 rounded-[1.375rem] group active:scale-[0.98] transition-all shadow-lg shadow-black/10">
              <div class="text-lg font-bold text-white/95 line-clamp-2 leading-snug mb-4 tracking-tight">
                ${item.title}
              </div>
              <div class="flex items-center justify-start gap-4">
                <button class="reddit-action w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-2xl active:scale-95 active:bg-green-500/20 transition-all cursor-pointer shadow-sm" data-id="${item.id}" data-type="like">👍</button>
                <button class="reddit-action w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-2xl active:scale-95 active:bg-red-500/20 transition-all cursor-pointer shadow-sm" data-id="${item.id}" data-type="dislike">👎</button>
              </div>
            </div>
          `,
								)
								.join('')
						: `<div class="flex-1 flex items-center justify-center text-white/20 italic text-sm font-bold uppercase tracking-widest">No recommendations</div>`
				}
      </div>
    `;
	}

	protected onData() {
		// Re-attach listeners after render
		setTimeout(() => {
			this.querySelectorAll('.reddit-action').forEach((btn) => {
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					const id = (btn as HTMLElement).dataset.id;
					const type = (btn as HTMLElement).dataset.type;
					if (id && type) {
						this.dispatchAction(type, { id });
						(btn as HTMLElement).classList.add(type === 'like' ? 'bg-green-500/40' : 'bg-red-500/40');
					}
				});
			});
		}, 0);
	}
}
customElements.define('reddit-widget', RedditWidget);
