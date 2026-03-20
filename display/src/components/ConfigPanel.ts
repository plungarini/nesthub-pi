import type { LayoutConfig, WidgetDefinition, WidgetInstance } from '../../../src/widgets/types.js';
import { api } from '../api.js';

export class ConfigPanel extends HTMLElement {
	private layout: LayoutConfig | null = null;
	private availableWidgets: WidgetDefinition[] = [];
	private draggingElement: HTMLElement | null = null;
	private ghostElement: HTMLElement | null = null;

	static get observedAttributes() {
		return ['open'];
	}

	async attributeChangedCallback(name: string, _oldValue: string, _newValue: string) {
		if (name === 'open' && this.hasAttribute('open')) {
			await this.loadData();
			this.render();
		}

		this.changeClasses();
	}

	private changeClasses() {
		const visibilityClasses = this.hasAttribute('open')
			? 'opacity-100 pointer-events-auto'
			: 'opacity-0 pointer-events-none';
		this.className = `${visibilityClasses} fixed inset-0 transition-all flex flex-row bg-black/60 p-4 backdrop-blur-[var(--blur-glass-heavy)] z-[1000] items-center justify-center`;
	}

	private async loadData() {
		try {
			const [layout, widgets] = await Promise.all([api.getLayout(), api.getWidgets()]);
			this.layout = layout;
			this.availableWidgets = widgets;
		} catch (err) {
			console.error('Failed to load config data', err);
		}
	}

	connectedCallback() {
		this.render();
		this.changeClasses();
	}

	private render() {
		if (!this.layout) return;

		this.innerHTML = `
      <div class="glass-heavy config-container border-white/10! flex flex-col shadow-2xl! h-full p-4 flex-1 bg-[#0a0a10]/80!">
        <div class="config-header border-white/5! mb-6 flex justify-between">
          <h2 class="text-[1.75rem] font-bold tracking-[-0.03em] text-white">System Layout</h2>
          <div class="flex gap-4">
            <button id="save-config" class="config-btn rounded-2xl! px-8! py-3! bg-blue-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest text-[0.625rem]">Commit Changes</button>
            <button id="close-config" class="config-btn rounded-2xl! px-8! py-3! bg-white/5 border border-white/10 text-white font-bold active:scale-95 transition-all uppercase tracking-widest text-[0.625rem]">Dismiss</button>
          </div>
        </div>

        <div class="config-layout flex flex-row flex-1 min-h-0 gap-4!">
          <div class="config-column bg-transparent! p-0! flex flex-col flex-1 h-full min-h-0" data-col="left">
            <div class="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/20 mb-4 px-2 shrink-0">Primary Storage</div>
            <div class="items-list flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-2">${this.renderItems(this.layout.columns.left)}</div>
            <button class="add-widget shrink-0 mt-6 w-full py-6 rounded-3xl border-2 border-dashed border-white/5 text-white/20 font-bold uppercase tracking-widest text-[0.6875rem] hover:border-white/10 hover:text-white/40 transition-all active:scale-[0.98]" data-col="left">+ Add Widget</button>
          </div>
          <div class="config-column bg-transparent! p-0! flex flex-col flex-1 h-full min-h-0" data-col="right">
            <div class="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/20 mb-4 px-2 shrink-0">Secondary Storage</div>
            <div class="items-list flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-2">${this.renderItems(this.layout.columns.right)}</div>
            <button class="add-widget shrink-0 mt-6 w-full py-6 rounded-3xl border-2 border-dashed border-white/5 text-white/20 font-bold uppercase tracking-widest text-[0.6875rem] hover:border-white/10 hover:text-white/40 transition-all active:scale-[0.98]" data-col="right">+ Add Widget</button>
          </div>
        </div>

        <!-- Widget Picker Modal (Internal) -->
        <div id="widget-picker" class="glass-heavy max-h-[90%] bg-[#101015]! border-white/10! shadow-2xl! hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-90 p-8 z-1100 flex-col gap-6 rounded-4xl">
           <h3 class="text-xl font-bold tracking-[-0.02em] text-white">Component Registry</h3>
           <div class="picker-list flex flex-col gap-3 overflow-y-auto">
             ${this.availableWidgets.map((w) => `<button class="pick-item w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/5 text-white font-bold text-left hover:bg-white/10 transition-all flex items-center justify-between" data-id="${w.id}"><span>${w.name}</span><span class="opacity-20">＋</span></button>`).join('')}
           </div>
           <button class="close-picker w-full py-4 text-white/40 font-bold uppercase tracking-widest text-[0.625rem] active:text-white transition-colors">Abort</button>
        </div>
      </div>
    `;

		this.setupEventListeners();
	}

	private renderItems(items: WidgetInstance[]) {
		return items
			.map((item) => {
				const def = this.availableWidgets.find((w) => w.id === item.widgetId);
				return `
        <div class="config-item bg-white/5! border-white/5! p-5! rounded-3xl! flex flex-row justify-between" data-id="${item.instanceId}" data-widget="${item.widgetId}">
          <div class="flex items-center">
            <span class="drag-handle mr-4 opacity-20 text-xl">☰</span>
            <span class="font-extrabold text-[0.9375rem] text-white tracking-[-0.01em]">${def?.name || item.widgetId}</span>
          </div>
          <button class="remove-item w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-90">✕</button>
        </div>
      `;
			})
			.join('');
	}

	private setupEventListeners() {
		this.querySelector('#close-config')?.addEventListener('click', () => this.removeAttribute('open'));

		this.querySelector('#save-config')?.addEventListener('click', async () => {
			if (this.layout) {
				await api.saveLayout(this.layout);
				location.reload(); // Quickest way to sync all widgets
			}
		});

		// Remove Item
		this.querySelectorAll('.remove-item').forEach((btn) => {
			btn.addEventListener('click', (_e) => {
				const id = (btn.closest('.config-item') as HTMLElement).dataset.id;
				this.removeItem(id!);
			});
		});

		// Add Widget Dialog
		const picker = this.querySelector('#widget-picker') as HTMLElement;
		let targetCol: 'left' | 'right' = 'left';

		this.querySelectorAll('.add-widget').forEach((btn) => {
			btn.addEventListener('click', () => {
				targetCol = (btn as HTMLElement).dataset.col as 'left' | 'right';
				picker.style.display = 'flex';
			});
		});

		this.querySelectorAll('.pick-item').forEach((btn) => {
			btn.addEventListener('click', () => {
				const widgetId = (btn as HTMLElement).dataset.id;
				this.addWidget(widgetId!, targetCol);
				picker.style.display = 'none';
			});
		});

		this.querySelector('.close-picker')?.addEventListener('click', () => {
			picker.style.display = 'none';
		});

		// Drag & Drop
		this.querySelectorAll('.drag-handle').forEach((handle) => {
			const el = handle as HTMLElement;
			el.style.cursor = 'grab';
			el.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
			el.addEventListener('mousedown', (e) => {
				e.preventDefault(); // Prevent text selection
				this.handleDragStart(e);
			});
		});
	}

	private removeItem(instanceId: string) {
		if (!this.layout) return;
		this.layout.columns.left = this.layout.columns.left.filter((i) => i.instanceId !== instanceId);
		this.layout.columns.right = this.layout.columns.right.filter((i) => i.instanceId !== instanceId);
		this.render();
	}

	private addWidget(widgetId: string, col: 'left' | 'right') {
		if (!this.layout) return;
		const newItem: WidgetInstance = {
			instanceId: Math.random().toString(36).slice(2, 11),
			widgetId,
			config: {},
			column: col,
			order: this.layout.columns[col].length,
		};
		this.layout.columns[col].push(newItem);
		this.render();
	}

	// --- Drag & Drop Logic ---

	private handleDragStart(e: Event) {
		const target = (e.target as HTMLElement).closest('.config-item') as HTMLElement;
		if (!target) return;

		this.draggingElement = target;
		this.draggingElement.classList.add('opacity-30', 'scale-95');

		const isTouch = 'touches' in e;
		const startX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
		const startY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

		// Setup Ghost for visual feedback
		this.ghostElement = target.cloneNode(true) as HTMLElement;
		this.ghostElement.classList.remove('opacity-30', 'scale-95');
		this.ghostElement.className +=
			' fixed pointer-events-none z-[3000] scale-105 shadow-2xl! shadow-black/50 transition-none!';
		this.ghostElement.style.width = `${target.offsetWidth}px`;
		this.updateGhostPosition(startX, startY);
		document.body.appendChild(this.ghostElement);

		// Disable pointer events on all iframes or deeply nested stuff to prevent intercepting mouse
		document.body.style.userSelect = 'none';

		const onMove = (me: Event) => {
			me.preventDefault(); // Prevent scrolling while dragging
			const isTouchMove = 'touches' in me;
			const cx = isTouchMove ? (me as TouchEvent).touches[0].clientX : (me as MouseEvent).clientX;
			const cy = isTouchMove ? (me as TouchEvent).touches[0].clientY : (me as MouseEvent).clientY;

			this.updateGhostPosition(cx, cy);
			this.handleDragOver(cx, cy);
		};

		const onEnd = () => {
			this.handleDrop();
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onEnd);
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onEnd);
			document.body.style.userSelect = '';
		};

		if (isTouch) {
			document.addEventListener('touchmove', onMove, { passive: false });
			document.addEventListener('touchend', onEnd);
		} else {
			document.addEventListener('mousemove', onMove, { passive: false });
			document.addEventListener('mouseup', onEnd);
		}
	}

	private updateGhostPosition(x: number, y: number) {
		if (this.ghostElement) {
			this.ghostElement.style.left = `${x - 20}px`;
			this.ghostElement.style.top = `${y - 20}px`;
		}
	}

	private handleDragOver(x: number, y: number) {
		const itemOver = document.elementFromPoint(x, y)?.closest('.config-item') as HTMLElement;
		const colOver = document.elementFromPoint(x, y)?.closest('.config-column') as HTMLElement;

		if (itemOver && itemOver !== this.draggingElement) {
			const list = itemOver.parentElement!;
			const items = Array.from(list.children);
			const indexOver = items.indexOf(itemOver);
			const indexDrag = items.indexOf(this.draggingElement!);

			if (indexDrag < indexOver) {
				list.insertBefore(this.draggingElement!, itemOver.nextSibling);
			} else {
				list.insertBefore(this.draggingElement!, itemOver);
			}
		} else if (colOver) {
			const list = colOver.querySelector('.items-list')!;
			if (this.draggingElement && !list.contains(this.draggingElement)) {
				list.appendChild(this.draggingElement);
			}
		}
	}

	private handleDrop() {
		if (!this.draggingElement) return;
		this.draggingElement.classList.remove('opacity-30', 'scale-95');
		this.draggingElement = null;
		if (this.ghostElement) {
			this.ghostElement.remove();
			this.ghostElement = null;
		}

		// Re-sync this.layout with DOM structure
		this.syncLayoutFromDOM();
	}

	private syncLayoutFromDOM() {
		if (!this.layout) return;

		const leftItems = Array.from(
			this.querySelectorAll('.config-column[data-col="left"] .config-item'),
		) as HTMLElement[];
		const rightItems = Array.from(
			this.querySelectorAll('.config-column[data-col="right"] .config-item'),
		) as HTMLElement[];

		const mapItem = (el: HTMLElement, idx: number, col: 'left' | 'right'): WidgetInstance => ({
			instanceId: el.dataset.id!,
			widgetId: el.dataset.widget!,
			config: {},
			column: col,
			order: idx,
		});

		this.layout.columns.left = leftItems.map((el, i) => mapItem(el, i, 'left'));
		this.layout.columns.right = rightItems.map((el, i) => mapItem(el, i, 'right'));
	}
}

customElements.define('config-panel', ConfigPanel);
