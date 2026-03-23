# Widget Implementation Guidelines

All widgets in the `nesthub-pi` display must adhere to these standards to ensure consistency, performance, and compatibility with the Nest Hub display.

## Core Principles

1.  **Framework-Free**: Use Vanilla TypeScript and Web Components (`BaseWidget`).
2.  **ESM Only**: Use `.js` extensions in all imports.
3.  **Modular Structure**: Each widget must be in its own directory with:
    - `WidgetName.ts`: Core logic and rendering.
    - `api.ts`: Data fetching functions (using native `fetch`).
    - `types.ts`: TypeScript interfaces for API responses and internal state.
4.  **Responsive**: Design for 1024x600 resolution.
5.  **Touch-First**: High-contrast, large-hit targets (min 44x44px).
6.  **Polled Updates**: Use `pollInterval` for regular data refreshes.
7.  **Visibility-Aware**: `BaseWidget` handles `IntersectionObserver` to pause polling when the widget is off-screen.

## Lifecycle (`BaseWidget`)

- `connectedCallback()`: Must call `super.connectedCallback()` to initialize default styles and observers.
- `fetchData(signal)`: Override this to call your `api.ts` functions. Includes an `AbortSignal`.
- `render()`: Must return a template literal HTML string.
- `onData(data)`: Hook called after data update. Best for re-attaching event listeners using `setTimeout(..., 0)`.
- `onAction(type, payload)`: Optional hook for handling internal logic before/after server actions.

## State & UI Patterns

### Scroll Preservation

Use the `data-preserve-scroll` attribute on any scrollable container. `BaseWidget` automatically saves and restores the `scrollTop` position during re-renders.

```html
<div id="my-container" data-preserve-scroll class="overflow-y-auto">...</div>
```

### Server Actions

Use `dispatchAction(type, payload)` to send POST requests back to the widget's API endpoint. This automatically triggers a data re-poll for immediate UI feedback.

### Premium Styling

- **Glassmorphism**: Use `glass` or `glass-heavy` classes.
- **Borders**: Standard `border-white/5` or `border-white/10` for subtle separation.
- **Typography**:
  - Headers: `text-[0.8125rem]` with `uppercase font-bold tracking-[0.12em]`.
  - Secondary: `text-[0.625rem]` for status labels or metadata.
- **Scrolling**: Use `snap-y snap-mandatory` on containers and `snap-start` on child cards for smooth navigation.
- Prefer inline tailwindcss classes over custom ones.

## Example Structure

```typescript
// widgets/my/MyWidget.ts
import { BaseWidget } from '../_base/BaseWidget.js';
import { fetchMyData } from './api.js';
import { MyData } from './types.js';

export class MyWidget extends BaseWidget {
	public static readonly widgetId = 'my-widget';
	public static readonly pollInterval = 10000;

	protected async fetchData(signal: AbortSignal): Promise<MyData> {
		return await fetchMyData(signal);
	}

	protected render(): string {
		const data = this.data as MyData;
		return `
      <div class="flex items-center px-2 py-1">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold tracking-[0.12em]">My Widget</span>
      </div>
      <div id="my-scroll-area" data-preserve-scroll class="flex-1 overflow-y-auto snap-y snap-mandatory mt-4">
        ${this.renderItems(data)}
      </div>
    `;
	}

	protected onData() {
		setTimeout(() => this.attachListeners(), 0);
	}

	private attachListeners() {
		this.querySelectorAll('.btn-click').forEach((btn) => {
			btn.addEventListener('click', () => this.dispatchAction('click', { id: btn.id }));
		});
	}
}
customElements.define('my-widget', MyWidget);
```
