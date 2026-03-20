import { MedicalData } from './types.js';

/**
 * Fetches the medical profile from the nesthub-pi backend proxy.
 */
export async function fetchMedicalData(signal?: AbortSignal): Promise<MedicalData> {
	const res = await fetch('/api/widgets/medical/data', { signal });
	if (!res.ok) {
		throw new Error(`Failed to fetch medical data: ${res.status}`);
	}
	return await res.json();
}
