# Widget Implementation Guidelines

All widgets in the `nesthub-pi` display must adhere to these standards to ensure consistency, performance, and compatibility with the Nest Hub display.

## Core Principles

1.  **Framework-Free**: Use Vanilla TypeScript and Web Components (`BaseWidget`).
2.  **ESM Only**: Use `.js` extensions in all imports.
3.  **Responsive**: Design for 1024x600 resolution. Use glassmorphism design tokens from `glass.css`.
4.  **Touch-First**: Ensure all interactive elements have at least a 44x44px hit target.
5.  **Polled Updates**: Prefer individual polling or SSE over full page refreshes.

## Lifecycle (`BaseWidget`)

- `connectedCallback()`: UI initialization and polling start.
- `render()`: Must return an HTML string representing the widget content.
- `onData(data)`: Optional hook for processing raw API data before render.
- `onAction(type, payload)`: Optional hook for handling widget-specific interactions.

## Design Tokens

Use these CSS variables from `glass.css`:
- `var(--glass-bg)`: Standard container background.
- `var(--text-primary)`: Content text.
- `var(--tint-[color])`: Subtle background tints for hierarchy.

## Example Structure

```typescript
import { BaseWidget } from '../_base/BaseWidget.js';

export class MyWidget extends BaseWidget {
  public static readonly widgetId = 'my-widget';
  public static readonly pollInterval = 5000;
  public static readonly dataEndpoint = '/api/widgets/my/data';

  protected render(): string {
    return \`
      <div class="widget-header">
        <span class="widget-title">My Widget</span>
      </div>
      <div class="content">
        \${this.data?.value || 'Loading...'}
      </div>
    \`;
  }
}
customElements.define('my-widget', MyWidget);
```
