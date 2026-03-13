import { Client } from 'castv2';
import { logger } from './logger.js';

export interface CastStatus {
	state: 'disconnected' | 'connecting' | 'connected' | 'launching' | 'live';
	deviceIp: string | null;
	appId: string | null;
	connectedAt: string | null;
}

class CastSender {
	private client: any = null;
	private status: CastStatus = {
		state: 'disconnected',
		deviceIp: null,
		appId: null,
		connectedAt: null,
	};
	private heartbeatInterval: NodeJS.Timeout | null = null;

	public async connect(host: string): Promise<void> {
		if (this.status.state !== 'disconnected') {
			this.disconnect();
		}

		this.status.state = 'connecting';
		this.status.deviceIp = host;
		logger.info(`Connecting to Cast device at ${host}...`);

		return new Promise((resolve, reject) => {
			this.client = new Client();

			this.client.connect(host, () => {
				this.status.state = 'connected';
				logger.info('Connected to Cast device (TLS socket)');

				const connection = this.client.createChannel(
					'sender-0',
					'receiver-0',
					'urn:x-cast:com.google.cast.tp.connection',
					'JSON',
				);
				const heartbeat = this.client.createChannel(
					'sender-0',
					'receiver-0',
					'urn:x-cast:com.google.cast.tp.heartbeat',
					'JSON',
				);

				connection.send({ type: 'CONNECT' });

				this.heartbeatInterval = setInterval(() => {
					heartbeat.send({ type: 'PING' });
				}, 5000);

				resolve();
			});

			this.client.on('error', (err: any) => {
				logger.error('Cast connection error: ' + err.message);
				this.disconnect();
				reject(err);
			});

			this.client.on('close', () => {
				logger.warn('Cast connection closed');
				this.disconnect();
			});
		});
	}

	public async launch(appId: string): Promise<void> {
		if (!this.client || this.status.state !== 'connected') {
			throw new Error('Must be connected before launching app');
		}

		this.status.state = 'launching';
		this.status.appId = appId;

		logger.info(`Launching Cast app ${appId}...`);
		const receiver = this.client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.receiver', 'JSON');

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				if (this.status.state === 'launching') {
					logger.error(`❌ Launch TIMEOUT for ${appId} after 15s`);
					this.status.state = 'connected';
					reject(new Error('Launch timeout'));
				}
			}, 15000);

			receiver.send({
				type: 'LAUNCH',
				appId,
				requestId: Date.now(),
			});

			receiver.on('message', (data: any) => {
				logger.debug('Cast Receiver Message: ' + JSON.stringify(data, null, 2));

				if (data.type === 'RECEIVER_STATUS') {
					const app = data.status?.applications?.find((a: any) => a.appId === appId);
					if (app) {
						clearTimeout(timeout);
						this.status.state = 'live';
						this.status.connectedAt = new Date().toISOString();
						logger.info(`✅ Cast app ${appId} is LIVE`);
						resolve();
					} else if (data.status?.applications?.length > 0) {
						const otherApps = data.status.applications.map((a: any) => a.appId).join(', ');
						logger.warn(`⚠️ Target app ${appId} not found in status. Other apps active: ${otherApps}`);
					}
				} else if (data.type === 'LAUNCH_ERROR') {
					clearTimeout(timeout);
					logger.error(`❌ Launch Error: ${data.reason || 'Unknown reason'}`);
					this.status.state = 'connected';
					reject(new Error(`Launch error: ${data.reason}`));
				} else if (data.type === 'INVALID_REQUEST') {
					logger.error(`❌ Invalid Request: ${data.reason || 'Unknown reason'}`);
				}
			});

			receiver.on('error', (err: any) => {
				clearTimeout(timeout);
				logger.error('Cast Receiver Channel Error: ' + err.message);
				this.status.state = 'connected';
				reject(err);
			});
		});
	}

	public disconnect(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
		if (this.client) {
			this.client.close();
			this.client = null;
		}
		this.status = {
			state: 'disconnected',
			deviceIp: null,
			appId: null,
			connectedAt: null,
		};
	}

	public getStatus(): CastStatus {
		return { ...this.status };
	}
}

export const castSender = new CastSender();
