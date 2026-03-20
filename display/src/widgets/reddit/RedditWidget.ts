import { BaseWidget } from '../_base/BaseWidget.js';
import { fetchRedditData } from './api.js';
import { RedditPost } from './types.js';

/**
 * RedditWidget — top recommendations from reddit-pi.
 */
export class RedditWidget extends BaseWidget {
	static readonly widgetId = 'reddit-widget';
	static readonly pollInterval = 60000; // Reddit updates are slow

	protected async fetchData(signal: AbortSignal): Promise<any> {
		return await fetchRedditData(signal);
	}

	protected render(): string {
		const items = ((Array.isArray(this.data) ? this.data : []) as RedditPost[]).filter((i) => !i.interaction);

		if (items.length === 0) {
			return `
        <div class="flex items-center justify-between px-2 py-1">
					<span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Reddit AI</span>
				</div>
        <div class="flex-1 flex items-center justify-center text-white/20 italic text-sm font-bold uppercase tracking-widest">No recommendations</div>
      `;
		}

		const postsHtml = items.map((item) => this.renderPost(item)).join('');

		return `
			<div class="flex items-center justify-between px-2 py-1">
				<span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Reddit AI</span>
			</div>
      <div id="reddit-container" data-preserve-scroll class="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar font-sans mt-4 pr-1 pb-4 snap-y snap-mandatory">
        ${postsHtml}
      </div>
    `;
	}

	private renderPost(item: RedditPost): string {
		const aiScore = Math.round((item.ourScore || 0) * 100);
		let scoreColor = 'text-white/40';
		if (aiScore > 80) scoreColor = 'text-green-400';
		else if (aiScore > 60) scoreColor = 'text-amber-400';

		return `
      <div class="glass-heavy border shrink-0 h-fit snap-start border-white/5 p-4 rounded-3xl group transition-all shadow-lg shadow-black/10 flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.625rem] text-white/30 font-bold uppercase tracking-wider truncate">r/${item.subreddit}</span>
          <span class="${scoreColor} text-[0.625rem] font-black tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/5">${aiScore}% MATCH</span>
        </div>
        
        <div class="text-[1.25rem] font-bold text-white/95 line-clamp-3 leading-tight tracking-tight">
          ${item.title}
        </div>
        
        <div class="text-[1.25rem] text-white/50 leading-tight line-clamp-6 tracking-tight">
          ${item.llmSummary}
        </div>

        <div class="flex items-center justify-between mt-1">
					<div class="flex flex-col gap-1 text-[0.85rem] text-white/70 font-bold tracking-tighter">
						<div><span>${item.score}</span> <span class="opacity-50">upvotes</span></div>
						<div><span>${item.numComments}</span> <span class="opacity-50">comments</span></div>
					</div>
          <div class="flex items-center gap-1.5">
             <button class="reddit-action size-14 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-lg active:scale-90 active:bg-green-500/20 transition-all cursor-pointer" data-id="${item.id}" data-type="like">👍</button>
             <button class="reddit-action size-14 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-lg active:scale-90 active:bg-red-500/20 transition-all cursor-pointer" data-id="${item.id}" data-type="dislike">👎</button>
          </div>
        </div>
      </div>
    `;
	}

	protected onData() {
		// Re-attach listeners after render
		setTimeout(() => {
			this.attachListeners();
		}, 0);
	}

	private attachListeners() {
		this.querySelectorAll('.reddit-action').forEach((btn) => {
			btn.addEventListener('click', (e) => this.handleActionClick(e, btn as HTMLElement));
		});
	}

	private handleActionClick(e: Event, btn: HTMLElement) {
		e.stopPropagation();
		const { id, type } = btn.dataset;
		if (!id || !type) return;

		this.dispatchAction(type, { id });

		// Visual feedback
		const parent = btn.closest('.glass-heavy');
		if (parent) {
			(parent as HTMLElement).classList.add('opacity-50', 'scale-95');
			setTimeout(() => parent.remove(), 300);
		}
	}
}
customElements.define('reddit-widget', RedditWidget);
