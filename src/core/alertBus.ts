import type { AlertPayload } from '../widgets/types.js';

type Listener = (alert: AlertPayload) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function publish(alert: AlertPayload): void {
	listeners.forEach((fn) => fn(alert));
}
