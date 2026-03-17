import { logger } from './logger.js';

export type CastState = 'disconnected' | 'connecting' | 'live' | 'error';

export interface CastStatus {
	state: CastState;
	appId: string | null;
	connectedAt: string | null;
}

class CastSender {
	private readonly status: CastStatus = {
		state: 'disconnected',
		appId: null,
		connectedAt: null,
	};
	private readonly sidecarBase: string;
	private pollInterval: NodeJS.Timeout | null = null;
	private retryCount = 0;
	private readonly MAX_RETRIES = 5;

	constructor() {
		const port = Number.parseInt(process.env.PORT ?? '3004', 10);
		this.sidecarBase = `http://127.0.0.1:${port + 1000}`;
	}

	public getStatus(): CastStatus {
		return { ...this.status };
	}

	/**
	 * Extracts the core launch logic to be reused by both initial connect
	 * and auto-relaunch polling.
	 */
	public async launchCast(): Promise<boolean> {
		const { appId } = this.status;
		if (!appId) {
			logger.error('❌ [Sidecar] Cannot launch: missing appId');
			return false;
		}

		logger.info(`🚀 [Sidecar] Requesting launch of ${appId}...`);

		try {
			const res = await fetch(`${this.sidecarBase}/launch`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const data = await res.json();

			if (res.ok && data.status === 'ok') {
				this.status.state = 'live';
				this.status.connectedAt = new Date().toISOString();
				logger.info(`✅ [Sidecar] App ${appId} launched successfully`);
				
				// Bug 3 Fix: Reset castState visibility immediately on success
				const { resetCastState } = await import('../api/routes/castState.js');
				resetCastState();
				
				return true;
			} else {
				this.status.state = 'error';
				logger.error(`❌ [Sidecar] Launch failed: ${data.message || res.statusText}`);
				return false;
			}
		} catch (err: any) {
			this.status.state = 'error';
			logger.error(`❌ [Sidecar] Launch error: ${err.message}`);
			return false;
		}
	}

	public async connectAndLaunch(appId: string): Promise<void> {
		this.status.appId = appId;
		this.status.state = 'connecting';

		const success = await this.launchCast();
		if (success) {
			this.startPolling();
		} else {
			throw new Error('Initial launch failed');
		}
	}

	public startPolling(): void {
		if (this.pollInterval) return;

		logger.info('🔄 [Sidecar] Starting status polling loop (15s base interval)');
		this.pollInterval = setTimeout(() => this.checkAndRelaunch(), 15000);
	}

	public stopPolling(): void {
		if (this.pollInterval) {
			logger.info('🛑 [Sidecar] Stopping status polling loop');
			clearTimeout(this.pollInterval);
			this.pollInterval = null;
		}
	}

	/**
	 * Immediately trigger a status check and potential relaunch.
	 * Called by notify-error endpoint for instant recovery.
	 */
	public triggerRelaunch(): void {
		if (this.status.state === 'error' ) {
			logger.info('⚡ [Sidecar] Relaunch triggered by push notification');
			// Clear existing timeout if any, and run immediately
			if (this.pollInterval) {
				clearTimeout(this.pollInterval);
				this.pollInterval = null;
			}
			this.checkAndRelaunch();
		}
	}

	private async checkAndRelaunch(): Promise<void> {
		let nextInterval = 15000;

		try {
			const res = await fetch(`${this.sidecarBase}/status`);
			if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

			const data = await res.json();
			this.status.state = data.state;

			if (this.status.state === 'error') {
				if (this.retryCount >= this.MAX_RETRIES) {
					logger.error(`❌ [Sidecar] Max retries (${this.MAX_RETRIES}) reached. Giving up.`);
					return; // Stop polling by not scheduling next timeout
				}

				this.retryCount++;
				logger.warn(
					`⚠️ [Sidecar] Cast session lost (state=error). Relaunching (attempt ${this.retryCount}/${this.MAX_RETRIES})...`,
				);

				// Wait 3 seconds for device to settle as per requirements
				await new Promise((resolve) => setTimeout(resolve, 3000));

				const success = await this.launchCast();
				if (success) {
					this.retryCount = 0;
					logger.info('✅ [Sidecar] Auto-relaunch successful');
				} else {
					logger.error('❌ [Sidecar] Auto-relaunch failed, will retry in 30s');
					nextInterval = 30000;
				}
			} else if (this.status.state === 'live') {
				if (this.retryCount > 0) {
					logger.info('✅ [Sidecar] Connection restored, resetting retry counter');
				}
				this.retryCount = 0;
			}
		} catch (e: any) {
			// Silent catch for network errors during polling
		} finally {
			// Schedule next check only if we haven't stopped or reached max retries
			if (this.pollInterval && (this.status.state !== 'error' || this.retryCount < this.MAX_RETRIES)) {
				this.pollInterval = setTimeout(() => this.checkAndRelaunch(), nextInterval);
			}
		}
	}

	public async syncStatus(): Promise<void> {
		try {
			const res = await fetch(`${this.sidecarBase}/status`);
			if (res.ok) {
				const data = await res.json();
				this.status.state = data.state;
			}
		} catch (e) {
			// Ignore sync errors
		}
	}

	public disconnect(): void {
		this.stopPolling();
		logger.info('🛑 [Sidecar] Requesting disconnect...');
		fetch(`${this.sidecarBase}/disconnect`, { method: 'POST' }).catch((err) => {
			logger.error(`[Sidecar] Disconnect failed: ${err.message}`);
		});

		this.status.state = 'disconnected';
		this.status.connectedAt = null;
	}
}

export const castSender = new CastSender();
