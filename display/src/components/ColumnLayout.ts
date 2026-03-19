/**
 * ColumnLayout — two-column grid.
 * Contains two vertical columns (left and right).
 */
export class ColumnLayout extends HTMLElement {
	connectedCallback() {
		this.className = 'grid grid-cols-2 px-4 gap-4 grid-rows-1 w-full h-full';
	}
}
customElements.define('column-layout', ColumnLayout);
