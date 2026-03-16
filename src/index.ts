import 'dotenv/config';
import { server, initServer } from './api/server.js';
import { logger } from './core/logger.js';
import { castSender } from './core/castSender.js';
import { ensureFunnel } from './core/funnel.js';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3004;
const SIDECAR_PORT = PORT + 1000;
let sidecarProcess: ChildProcess | null = null;

async function waitHealthy(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      // Ignore errors during poll
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function main() {
  try {
    // 1. Spawn Python Sidecar
    const isWindows = process.platform === 'win32';
    const venvPython = isWindows
      ? path.resolve('python/venv/Scripts/python.exe')
      : path.resolve('python/venv/bin/python');

    logger.info(`🐍 Spawning cast-sidecar on port ${SIDECAR_PORT}...`);
    sidecarProcess = spawn(venvPython, ['python/cast_sidecar.py'], {
      env: { ...process.env, CAST_SIDECAR_PORT: String(SIDECAR_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    sidecarProcess.stdout?.on('data', (data) => logger.info(data.toString().trim()));
    sidecarProcess.stderr?.on('data', (data) => logger.error(data.toString().trim()));
    sidecarProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`❌ cast-sidecar exited with code ${code}`);
      }
    });

    // 2. Wait for Sidecar Health
    const healthy = await waitHealthy(`http://127.0.0.1:${SIDECAR_PORT}/health`, 15000);
    if (!healthy) {
      throw new Error('cast-sidecar failed to become healthy within 15s');
    }
    logger.info('✅ cast-sidecar healthy');

    await initServer();
    await server.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Server listening on port ${PORT}`);
    console.info(`\n📊 Dashboard available at: http://localhost:${PORT}`);

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
      logger.info(`🔌 Attempting direct connection to ${TARGET_IP}...`);
      await castSender.connectAndLaunch(TARGET_IP, CAST_APP_ID);
    } else {
      logger.warn('CAST_DEVICE_IP not set. Skipping Cast connection.');
    }
  } catch (err: any) {
    logger.error('Startup failed: ' + err.message);
    process.exit(1);
  }
}

/**
 * Graceful shutdown sequence
 */
const shutdown = async (signal: string) => {
  console.info(`\nReceived ${signal}, shutting down gracefully...`);
  logger.info(`Received ${signal}, shutting down gracefully...`);

  if (sidecarProcess) {
    castSender.stopPolling();
    try {
      // 1. Request sidecar to disconnect (polite disconnect)
      console.info('🛑 Requesting sidecar to disconnect from device...');
      const disconnectUrl = `http://127.0.0.1:${SIDECAR_PORT}/disconnect`;
      
      const disconnectPromise = fetch(disconnectUrl, { method: 'POST' })
        .then(res => {
          if (res.ok) {
            console.info('✅ Sidecar disconnect request accepted');
            logger.info('Sidecar disconnect request accepted');
          } else {
            console.warn(`⚠️ Sidecar disconnect returned ${res.status}`);
            logger.warn(`Sidecar disconnect returned ${res.status}`);
          }
        })
        .catch(err => {
          console.warn(`⚠️ Sidecar disconnect request failed: ${err.message}`);
          logger.warn(`Sidecar disconnect request failed: ${err.message}`);
        });

      // Use a shorter timeout for the polite disconnect to keep shutdown snappy
      const disconnectTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));

      await Promise.race([disconnectPromise, disconnectTimeout]).catch(() => {
        console.warn('⚠️ Sidecar disconnect request timed out after 3s');
      });

      // 2. Kill sidecar process
      console.info('🐍 Sending SIGTERM to sidecar...');
      sidecarProcess.kill('SIGTERM');

      // 3. Wait for exit
      console.info('⏳ Waiting for sidecar to exit...');
      const exitPromise = new Promise<void>((resolve) => {
        sidecarProcess?.on('exit', () => resolve());
      });

      const exitTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));

      await Promise.race([exitPromise, exitTimeout]).catch(() => {
        console.warn('⚠️ Sidecar failed to exit after 3s, sending SIGKILL...');
        sidecarProcess?.kill('SIGKILL');
      });
      
      console.info('✅ Sidecar cleanup complete');
    } catch (err: any) {
      console.error(`❌ Error during sidecar shutdown: ${err.message}`);
      logger.error(`Error during sidecar shutdown: ${err.message}`);
    }
  }

  // 4. Cleanup Node.js resources
  try {
    await logger.close();
    await server.close();
    console.info('👋 Graceful shutdown complete');
  } catch (err: any) {
    console.error('❌ Error during server/logger cleanup:', err.message);
  }
  
  process.exit(0);
};

// --- Windows SIGINT Fix ---
if (process.platform === 'win32') {
  import('node:readline').then(rl => {
    const read = rl.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    read.on('SIGINT', () => {
      process.emit('SIGINT');
    });
  });
}

process.on('SIGINT', () => { 
  console.info('Handling SIGINT...');
  void shutdown('SIGINT'); 
});
process.on('SIGTERM', () => { 
  void shutdown('SIGTERM'); 
});

// Ensure the process stays alive to receive signals
process.stdin.resume();

await main();
