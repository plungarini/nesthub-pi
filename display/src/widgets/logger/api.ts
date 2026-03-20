import type { LogEntry } from './types.js';

export async function fetchLogs(signal?: AbortSignal): Promise<LogEntry[]> {
	const res = await fetch('/api/widgets/logger/data', { signal });
	if (!res.ok) {
		throw new Error(`Failed to fetch logs: HTTP ${res.status}`);
	}
	const data = await res.json();
	// Depending on logger-pi response format, it might be an array directly or an object with logs
	return Array.isArray(data) ? data : (data.logs || []);
}
