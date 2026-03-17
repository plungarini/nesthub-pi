import { api } from '../api.js';
import type { LayoutConfig, WidgetDefinition, WidgetInstance } from '../../../src/widgets/types.js';

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
			this.style.display = 'flex';
			await this.loadData();
			this.render();
		} else if (name === 'open') {
			this.style.display = 'none';
		}
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
		this.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(var(--glass-blur-heavy));
      -webkit-backdrop-filter: blur(var(--glass-blur-heavy));
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
    `;
	}

	private render() {
		if (!this.layout) return;

		this.innerHTML = `
      <div class="glass config-container">
        <div class="config-header">
          <h2 style="font-family:var(--font-display); font-size:24px; font-weight:700;">Edit Layout</h2>
          <div style="display:flex; gap:12px;">
            <button id="save-config" class="glass config-btn" style="background:var(--tint-blue); color:white;">Save Changes</button>
            <button id="close-config" class="glass config-btn">Cancel</button>
          </div>
        </div>

        <div class="config-layout">
          <div class="config-column" data-col="left">
            <div class="widget-title">Left Column</div>
            <div class="items-list">${this.renderItems(this.layout.columns.left)}</div>
            <button class="glass config-btn add-widget" data-col="left" style="margin-top:auto; background:rgba(255,255,255,0.05);">+ Add Widget</button>
          </div>
          <div class="config-column" data-col="right">
            <div class="widget-title">Right Column</div>
            <div class="items-list">${this.renderItems(this.layout.columns.right)}</div>
            <button class="glass config-btn add-widget" data-col="right" style="margin-top:auto; background:rgba(255,255,255,0.05);">+ Add Widget</button>
          </div>
        </div>

        <!-- Widget Picker Modal (Internal) -->
        <div id="widget-picker" class="glass-heavy" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:300px; padding:20px; z-index:1100; flex-direction:column; gap:15px;">
           <h3 style="font-size:16px;">Add Widget</h3>
           <div class="picker-list" style="display:flex; flex-direction:column; gap:8px;">
             ${this.availableWidgets.map(w => `<button class="glass config-btn pick-item" data-id="${w.id}">${w.name}</button>`).join('')}
           </div>
           <button class="glass config-btn close-picker">Cancel</button>
        </div>
      </div>
    `;

		this.setupEventListeners();
	}

	private renderItems(items: WidgetInstance[]) {
		return items.map(item => {
			const def = this.availableWidgets.find(w => w.id === item.widgetId);
			return `
        <div class="config-item" data-id="${item.instanceId}" data-widget="${item.widgetId}">
          <div style="display:flex; align-items:center;">
            <span class="drag-handle">☰</span>
            <span style="font-weight:600;">${def?.name || item.widgetId}</span>
          </div>
          <button class="glass config-btn remove-item" style="padding:4px 8px; font-size:10px; color:var(--text-tertiary);">✕</button>
        </div>
      `;
		}).join('');
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
		this.querySelectorAll('.remove-item').forEach(btn => {
			btn.addEventListener('click', (_e) => {
				const id = (btn.closest('.config-item') as HTMLElement).dataset.id;
				this.removeItem(id!);
			});
		});

		// Add Widget Dialog
		const picker = this.querySelector('#widget-picker') as HTMLElement;
		let targetCol: 'left' | 'right' = 'left';

		this.querySelectorAll('.add-widget').forEach(btn => {
			btn.addEventListener('click', () => {
				targetCol = (btn as HTMLElement).dataset.col as 'left' | 'right';
				picker.style.display = 'flex';
			});
		});

		this.querySelectorAll('.pick-item').forEach(btn => {
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
		this.querySelectorAll('.config-item').forEach(item => {
			item.addEventListener('touchstart', (e) => this.handleDragStart(e as TouchEvent), { passive: false });
		});
	}

	private removeItem(instanceId: string) {
		if (!this.layout) return;
		this.layout.columns.left = this.layout.columns.left.filter(i => i.instanceId !== instanceId);
		this.layout.columns.right = this.layout.columns.right.filter(i => i.instanceId !== instanceId);
		this.render();
	}

	private addWidget(widgetId: string, col: 'left' | 'right') {
		if (!this.layout) return;
		const newItem: WidgetInstance = {
			instanceId: Math.random().toString(36).slice(2, 11),
			widgetId,
			config: {},
			column: col,
			order: this.layout.columns[col].length
		};
		this.layout.columns[col].push(newItem);
		this.render();
	}

	// --- Drag & Drop Logic ---

	private handleDragStart(e: TouchEvent) {
		const target = (e.target as HTMLElement).closest('.config-item') as HTMLElement;
		if (!target) return;

		this.draggingElement = target;
		this.draggingElement.classList.add('dragging');

		const touch = e.touches[0];
		
		// Setup Ghost for visual feedback
		this.ghostElement = target.cloneNode(true) as HTMLElement;
		this.ghostElement.style.position = 'fixed';
		this.ghostElement.style.width = `${target.offsetWidth}px`;
		this.ghostElement.style.opacity = '0.8';
		this.ghostElement.style.pointerEvents = 'none';
		this.ghostElement.style.zIndex = '3000';
		this.updateGhostPosition(touch.clientX, touch.clientY);
		document.body.appendChild(this.ghostElement);

		const onMove = (me: TouchEvent) => {
			me.preventDefault(); // Prevent scrolling while dragging
			const t = me.touches[0];
			this.updateGhostPosition(t.clientX, t.clientY);
			this.handleDragOver(t.clientX, t.clientY);
		};

		const onEnd = () => {
			this.handleDrop();
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onEnd);
		};

		document.addEventListener('touchmove', onMove, { passive: false });
		document.addEventListener('touchend', onEnd);
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
		this.draggingElement.classList.remove('dragging');
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

		const leftItems = Array.from(this.querySelectorAll('.config-column[data-col="left"] .config-item')) as HTMLElement[];
		const rightItems = Array.from(this.querySelectorAll('.config-column[data-col="right"] .config-item')) as HTMLElement[];

		const mapItem = (el: HTMLElement, idx: number, col: 'left' | 'right'): WidgetInstance => ({
			instanceId: el.dataset.id!,
			widgetId: el.dataset.widget!,
			config: {},
			column: col,
			order: idx
		});

		this.layout.columns.left = leftItems.map((el, i) => mapItem(el, i, 'left'));
		this.layout.columns.right = rightItems.map((el, i) => mapItem(el, i, 'right'));
	}
}

customElements.define('config-panel', ConfigPanel);
