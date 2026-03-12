import spawn from 'cross-spawn';
import { ChildProcess } from 'child_process';
import { logger } from './logger.js';

let tunnelProcess: ChildProcess | null = null;

export async function startTunnel(): Promise<ChildProcess> {
  const token = process.env.CF_TUNNEL_TOKEN;
  if (!token) {
    throw new Error('CF_TUNNEL_TOKEN is not set in environment');
  }

  logger.info('Starting Cloudflare tunnel...');

  // cloudflared npm package installs the binary if missing
  // we just need to call it via cross-spawn
  tunnelProcess = spawn('npx', ['cloudflared', 'tunnel', 'run', '--token', token]);

  tunnelProcess.stderr?.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Registered tunnel')) {
      logger.info('Cloudflare tunnel registered and active');
    } else if (msg.toLowerCase().includes('error')) {
      logger.error('Tunnel error: ' + msg);
    }
  });

  tunnelProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      logger.error(`Cloudflare tunnel exited with code ${code}`);
    } else {
      logger.info('Cloudflare tunnel stopped');
    }
  });

  return tunnelProcess;
}

export function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
  }
}
