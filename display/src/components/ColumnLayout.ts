/**
 * ColumnLayout — two-column grid.
 * Contains two vertical columns (left and right).
 */
export class ColumnLayout extends HTMLElement {
	connectedCallback() {
		this.className = 'grid grid-cols-2 grid-rows-1 h-full w-full gap-5';
	}
}
customElements.define('column-layout', ColumnLayout);
