import { RedditData } from './types.js';

/**
 * Fetches the current batch of recommended Reddit posts from the nesthub-pi backend proxy.
 */
export async function fetchRedditData(signal?: AbortSignal): Promise<RedditData> {
	const res = await fetch('/api/widgets/reddit-widget/data', { signal });
	if (!res.ok) {
		throw new Error(`Failed to fetch reddit data: ${res.status}`);
	}
	return await res.json();
}
