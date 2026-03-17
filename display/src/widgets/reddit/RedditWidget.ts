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
      <div class="widget-header">
        <span class="widget-title">Reddit Intelligence</span>
        <span class="text-base-extra font-black text-amber-500 px-4 py-1 bg-white/5 rounded-full border border-amber-500/20 shadow-lg">TOP 5</span>
      </div>
      <div class="flex-1 flex flex-col gap-6 overflow-hidden justify-center overflow-y-auto pr-2 no-scrollbar">
        ${
					items.length > 0
						? items
								.map(
									(item: any) => `
            <div class="glass-heavy border border-white/5 p-6 rounded-3xl group active:bg-white/[0.06] transition-all shadow-glass">
              <div class="text-xl-extra font-black text-white/90 line-clamp-2 leading-tight mb-4 group-active:text-white tracking-tight">
                ${item.title}
              </div>
              <div class="flex items-center justify-between mt-auto">
                <div class="flex gap-6">
                  <button class="reddit-action w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-4xl active:scale-90 active:bg-green-500/20 transition-all cursor-pointer" data-id="${item.id}" data-type="like">👍</button>
                  <button class="reddit-action w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-4xl active:scale-90 active:bg-red-500/20 transition-all cursor-pointer" data-id="${item.id}" data-type="dislike">👎</button>
                </div>
              </div>
            </div>
          `,
								)
								.join('')
						: `<div class="text-white/30 text-center py-10 italic text-xl-extra font-bold">No recommendations</div>`
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
