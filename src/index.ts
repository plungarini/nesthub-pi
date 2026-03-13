import 'dotenv/config';
import { server, initServer } from './api/server.js';
import { logger } from './core/logger.js';
import { discoverDevices } from './core/castDiscovery.js';
import { castSender } from './core/castSender.js';
import { ensureFunnel } from './core/funnel.js';

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

    // 3. Tailscale Funnel Setup
    const publicUrl = await ensureFunnel(PORT);
    if (publicUrl) {
      if (process.env.TUNNEL_PUBLIC_URL !== publicUrl) {
        logger.info(`📝 New Tunnel URL discovered: ${publicUrl}. Updating .env...`);
        // We'll use a simple strategy to update .env: read, replace/append, write
        try {
          const fs = await import('node:fs/promises');
          const path = await import('node:path');
          const envPath = path.resolve(process.cwd(), '.env');
          let envContent = await fs.readFile(envPath, 'utf8').catch(() => '');
          
          if (envContent.includes('TUNNEL_PUBLIC_URL=')) {
            envContent = envContent.replace(/TUNNEL_PUBLIC_URL=.*/, `TUNNEL_PUBLIC_URL=${publicUrl}`);
          } else {
            envContent += `\nTUNNEL_PUBLIC_URL=${publicUrl}\n`;
          }
          await fs.writeFile(envPath, envContent.trim() + '\n');
        } catch (err) {
          logger.error('Failed to update .env with new Tunnel URL');
        }
      }
      process.env.TUNNEL_PUBLIC_URL = publicUrl;
      logger.info(`Tunnel URL active: ${publicUrl}`);
    } else {
      logger.warn('Failed to ensure Tailscale Funnel. Receiver may not work correctly.');
    }

    // 4. Device Discovery & Validation
    const TARGET_IP = process.env.CAST_DEVICE_IP;
    const CAST_APP_ID = process.env.CAST_APP_ID || 'CC1AD845';

    if (TARGET_IP) {
      logger.info(`🔍 Scanning network for ${TARGET_IP}...`);
      const devices = await discoverDevices(2000); // 2s scan
      const targetFound = devices.find(d => d.host === TARGET_IP);
      
      if (targetFound) {
        logger.info(`✅ Found device: ${targetFound.friendlyName}`);
      } else {
        logger.debug('📡 mDNS discovery missed the device (common on some networks).');
      }

      logger.info(`🔌 Attempting direct connection to ${TARGET_IP}...`);
      await castSender.connect(TARGET_IP);
      await castSender.launch(CAST_APP_ID);
    } else {
      logger.warn('CAST_DEVICE_IP not set. Skipping Cast connection.');
    }
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
