export class ScrollDots extends HTMLElement {
	static readonly observedAttributes = ['total', 'current', 'side', 'visible'];

	attributeChangedCallback() {
		this.render();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		const side = this.getAttribute('side') || 'right';
		const isVisible = this.hasAttribute('visible');
		const sideClass = side === 'left' ? 'left-1' : 'right-1';

		this.className = `absolute ${sideClass} top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-[200] pointer-events-none transition-all duration-500 ${
			isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
		}`;

		const total = Number.parseInt(this.getAttribute('total') || '1');
		const current = Number.parseInt(this.getAttribute('current') || '0');
		if (total <= 1) {
			this.innerHTML = '';
			return;
		}

		this.innerHTML = Array.from(
			{ length: total },
			(_, i) => `
      <div class="rounded-full transition-all duration-300 ${
				i === current ? 'w-2 h-5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'w-1.5 h-1.5 bg-white/20'
			}"></div>
    `,
		).join('');
	}
}
customElements.define('scroll-dots', ScrollDots);
