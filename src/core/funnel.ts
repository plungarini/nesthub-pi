import { execSync } from 'node:child_process';
import { logger } from './logger.js';

export interface FunnelStatus {
	active: boolean;
	publicUrl: string | null;
}

export const SEPARATOR = '\n--------------------------------------------------\n';

/**
 * Checks if Tailscale is logged in and connected.
 */
function checkTailscaleStatus(): boolean {
	try {
		const output = execSync('tailscale status --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
		if (!output) return false;

		const jsonMatch = output.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return false;

		const status = JSON.parse(jsonMatch[0]);
		if (status.BackendState === 'NoState' || status.BackendState === 'NeedsLogin' || !status.Self?.HostName) {
			return false;
		}
		return true;
	} catch (err) {
		return false;
	}
}

export function getFunnelStatus(port?: number, path = '/'): FunnelStatus {
	// Try serve status JSON first
	try {
		const output = execSync('tailscale serve status --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
		if (output && output.trim() !== '{}' && !output.includes('No serve config')) {
			const jsonMatch = output.match(/\{[\s\S]*\}/);
			const status = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

			if (status?.Web) {
				for (const [hostPort, config] of Object.entries(status.Web)) {
					// Check if the specific path maps to our desired local port
					const handlers = (config as any)?.Handlers;
					if (handlers) {
						const pathConfig = handlers[path];
						const proxyTarget = pathConfig?.Proxy;
						
						// If we're looking for a specific port and path
						if (port && proxyTarget === `http://127.0.0.1:${port}`) {
							return { active: true, publicUrl: `https://${hostPort.split(':')[0]}${path === '/' ? '' : path}` };
						}
						
						// If no port specified, but we found the path
						if (!port && proxyTarget) {
							return { active: true, publicUrl: `https://${hostPort.split(':')[0]}${path === '/' ? '' : path}` };
						}
					}
				}
			}
		}
	} catch (err) { /* ignore */ }

	// Fallback to text status ONLY if no port specified OR if we are looking for root
	if (!port && path === '/') {
		try {
			const output = execSync('tailscale funnel status', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
			const urlMatch = output.match(/https:\/\/[^\s\(\/]+/);
			if (urlMatch) {
				return { active: true, publicUrl: urlMatch[0] };
			}
		} catch (err) { /* ignore */ }
	}

	return { active: false, publicUrl: null };
}

export async function ensureFunnel(port: number, path = '/'): Promise<string | null> {
	if (!checkTailscaleStatus()) {
		logger.error(`${SEPARATOR}❌ Tailscale is NOT logged in.${SEPARATOR}Please run "tailscale login" first.`);
		return null;
	}

	const status = getFunnelStatus(port, path);
	if (status.active && status.publicUrl) {
		logger.info(`${SEPARATOR}✅ Tailscale Funnel already active at: ${status.publicUrl}${SEPARATOR}`);
		return status.publicUrl;
	}

	logger.info(`${SEPARATOR}🚀 Starting Tailscale Funnel in background on port ${port} (path: ${path})...${SEPARATOR}`);
	try {
		if (path !== '/') {
			execSync(`tailscale funnel --bg --set-path=${path} ${port}`, { stdio: 'inherit' });
		} else {
			execSync(`tailscale funnel --bg ${port}`, { stdio: 'inherit' });
		}

		logger.info(`⏳ Waiting for Tailscale Funnel to initialize ${path} (30s max)...`);
		for (let i = 0; i < 15; i++) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			const newStatus = getFunnelStatus(port, path);
			if (newStatus.active && newStatus.publicUrl) {
				logger.info(`${SEPARATOR}✅ Tailscale Funnel started successfully: ${newStatus.publicUrl}${SEPARATOR}`);
				return newStatus.publicUrl;
			}
			if (i % 3 === 0) logger.debug(`... still waiting (attempt ${i + 1}/15)`);
		}
		logger.warn(`${SEPARATOR}⚠️ Funnel initialization timed out.${SEPARATOR}Please check "tailscale funnel status" manually.`);
	} catch (err: any) {
		logger.error(`${SEPARATOR}❌ Failed to start Tailscale Funnel: ${err.message}${SEPARATOR}`);
	}

	return null;
}
