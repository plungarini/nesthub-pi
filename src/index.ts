import 'dotenv/config';
import { server, initServer } from './api/server.js';
import { logger } from './core/logger.js';
import { startTunnel } from './core/tunnel.js';
import { castSender } from './core/castSender.js';

const PORT = Number(process.env.PORT) || 3000;

async function autocast() {
  const ip = process.env.CAST_DEVICE_IP;
  const appId = process.env.CAST_APP_ID;
  const reconnectDelay = Number(process.env.CAST_RECONNECT_DELAY_MS) || 5000;

  if (!ip || !appId) {
    logger.warn('CAST_DEVICE_IP or CAST_APP_ID not set, skipping auto-cast. Use manual connect via UI.');
    return;
  }

  const attemptConnect = async () => {
    try {
      await castSender.connect(ip);
      await castSender.launch(appId);
    } catch (err: any) {
      logger.error('Auto-cast failed, retrying in ' + (reconnectDelay / 1000) + 's...');
      setTimeout(attemptConnect, reconnectDelay);
    }
  };

  await attemptConnect();
}

async function main() {
  try {
    await initServer();
    await server.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Server listening on port ${PORT}`);

    if (process.env.CF_TUNNEL_TOKEN) {
      startTunnel().catch(err => logger.error('Tunnel startup failed: ' + err.message));
    } else {
      logger.warn('CF_TUNNEL_TOKEN not set, tunnel will not start.');
    }

    await autocast();
  } catch (err: any) {
    logger.error('Startup failed: ' + err.message);
    process.exit(1);
  }
}

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  castSender.disconnect();
  // tunnel process is killed via stopTunnel or process termination
  await logger.close();
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
