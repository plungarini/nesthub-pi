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
    connectedAt: null
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

        const connection = this.client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.connection', 'JSON');
        const heartbeat = this.client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.heartbeat', 'JSON');

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

    receiver.send({ type: 'LAUNCH', appId, requestId: Date.now() });

    receiver.on('message', (data: any) => {
      if (data.type === 'RECEIVER_STATUS') {
        const app = data.status?.applications?.find((a: any) => a.appId === appId);
        if (app) {
          this.status.state = 'live';
          this.status.connectedAt = new Date().toISOString();
          logger.info(`Cast app ${appId} is LIVE`);
        }
      }
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
      connectedAt: null
    };
  }

  public getStatus(): CastStatus {
    return { ...this.status };
  }
}

export const castSender = new CastSender();
