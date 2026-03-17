export class VerticalColumn extends HTMLElement {
	private dots: HTMLElement | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;

	connectedCallback() {
		this.className =
			'relative flex flex-col flex-1 h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar gap-widget-gap pb-column-gap';
		this.style.scrollBehavior = 'smooth';

		// Inject ScrollDots
		this.dots = document.createElement('scroll-dots');

		// If first column, put dots on left, else right
		const isFirst = this.parentElement?.firstElementChild === this;
		this.dots.setAttribute('side', isFirst ? 'left' : 'right');

		this.parentElement?.appendChild(this.dots);

		this.addEventListener('scroll', () => {
			this.updateDots();
			this.showDots();
		});

		// Initial dot sync
		setTimeout(() => this.updateDots(), 100);

		// Style scrollbars
		const style = document.createElement('style');
		style.textContent = `
      #${this.id}::-webkit-scrollbar { display: none; }
      #${this.id} > *:not(style) {
        flex: 0 0 100%;
        height: 100%;
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }
    `;
		this.appendChild(style);
	}

	private showDots() {
		if (!this.dots) return;
		this.dots.toggleAttribute('visible', true);
		if (this.hideTimer) clearTimeout(this.hideTimer);
		this.hideTimer = setTimeout(() => {
			this.dots?.removeAttribute('visible');
		}, 2000);
	}

	private updateDots() {
		if (!this.dots) return;
		const children = Array.from(this.children).filter((c) => c.tagName !== 'STYLE' && c.tagName !== 'SCROLL-DOTS');
		const total = children.length;
		const current = Math.round(this.scrollTop / this.offsetHeight);

		this.dots.setAttribute('total', total.toString());
		this.dots.setAttribute('current', current.toString());
	}
}
customElements.define('vertical-column', VerticalColumn);
