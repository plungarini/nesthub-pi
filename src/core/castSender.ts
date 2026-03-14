import { logger } from './logger.js';
import { updateHeartbeat } from './heartbeat.js';

export type CastState = 'disconnected' | 'connecting' | 'live' | 'error';

export interface CastStatus {
	state: CastState;
	deviceIp: string | null;
	appId: string | null;
	connectedAt: string | null;
}

class CastSender {
	private status: CastStatus = {
		state: 'disconnected',
		deviceIp: null,
		appId: null,
		connectedAt: null,
	};
	private sidecarBase: string;

	constructor() {
		const port = parseInt(process.env.PORT ?? '3004', 10);
		this.sidecarBase = `http://127.0.0.1:${port + 1000}`;
	}

	public getStatus(): CastStatus {
		return { ...this.status };
	}

	public async connectAndLaunch(host: string, appId: string): Promise<void> {
		this.status.deviceIp = host;
		this.status.appId = appId;
		this.status.state = 'connecting';

		logger.info(`🚀 [Sidecar] Requesting launch of ${appId} at ${host}...`);

		try {
			const res = await fetch(`${this.sidecarBase}/launch`, { 
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const data = await res.json() as any;

			if (res.ok && data.status === 'ok') {
				this.status.state = 'live';
				this.status.connectedAt = new Date().toISOString();
				updateHeartbeat();
				logger.info(`✅ [Sidecar] App ${appId} launched successfully`);
			} else {
				this.status.state = 'error';
				throw new Error(data.message || `Launch failed with status ${res.status}`);
			}
		} catch (err: any) {
			this.status.state = 'error';
			logger.error(`❌ [Sidecar] Launch failed: ${err.message}`);
			throw err;
		}
	}

	public async syncStatus(): Promise<void> {
		try {
			const res = await fetch(`${this.sidecarBase}/status`);
			if (res.ok) {
				const data = await res.json() as any;
				this.status.state = data.state;
			}
		} catch (e) {
			// Ignore sync errors
		}
	}

	public disconnect(): void {
		logger.info('🛑 [Sidecar] Requesting disconnect...');
		fetch(`${this.sidecarBase}/disconnect`, { method: 'POST' }).catch(err => {
			logger.error(`[Sidecar] Disconnect failed: ${err.message}`);
		});

		this.status.state = 'disconnected';
		this.status.connectedAt = null;
	}
}

export const castSender = new CastSender();
