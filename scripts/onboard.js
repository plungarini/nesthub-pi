import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { discoverDevices } from '../src/core/castDiscovery.js';
import { ensureFunnel } from '../src/core/funnel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

async function main() {
  console.log('🚀 Starting nesthub-pi interactive onboarding...\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let existingEnv = {};
  if (fs.existsSync(envPath)) {
    const currentContent = fs.readFileSync(envPath, 'utf8');
    currentContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...rest] = trimmed.split('=');
        if (k) existingEnv[k.trim()] = rest.join('=').trim();
      }
    });
  }

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example not found! Please create it first.');
    process.exit(1);
  }

  const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const lines = exampleContent.split('\n');

  const saveProgress = () => {
    let out = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        out += line + '\n';
        continue;
      }
      const [key] = trimmed.split('=');
      const val = existingEnv[key.trim()] !== undefined ? existingEnv[key.trim()] : '';
      out += `${key.trim()}=${val}\n`;
    }
    fs.writeFileSync(envPath, out.trim() + '\n');
  };

  rl.on('SIGINT', () => {
    console.log('\n\n🛑 Onboarding interrupted. Saving progress...');
    saveProgress();
    console.log('💾 Progress saved to .env\n');
    process.exit(0);
  });

  console.log("📝 Let's configure your environment variables.");
  console.log('Hit [Enter] to use the suggested default.\n');

  // We'll iterate through keys found in .env.example to prompt the user
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [key, ...rest] = trimmed.split('=');
    const exampleValue = rest.join('=').trim();
    const defaultValue = existingEnv[key.trim()] !== undefined ? existingEnv[key.trim()] : exampleValue;

    // Special handling for Tailscale Funnel
    if (key.trim() === 'TUNNEL_PUBLIC_URL') {
      console.log('\n--- Tailscale Funnel Setup ---');
      const port = Number(existingEnv['PORT']) || 3004;
      const publicUrl = await ensureFunnel(port);
      
      if (publicUrl) {
        console.log(`✅ Tailscale Funnel detected/started: ${publicUrl}`);
        if (publicUrl !== defaultValue) {
          console.log('📝 Saving new funnel URL to .env...');
        }
        existingEnv[key.trim()] = publicUrl;
      } else {
        console.log('⚠️ Could not automatically start Tailscale Funnel.');
        const answer = await rl.question(`${key.trim()} [${defaultValue}]: `);
        existingEnv[key.trim()] = answer.trim() !== '' ? answer : defaultValue;
      }
      continue;
    }

    // Special handling for Cast devices
    if (key.trim() === 'CAST_DEVICE_IP') {
      console.log('\nScanning for Google Cast devices on LAN...');
      try {
        const devices = await discoverDevices(5000);
        if (devices.length === 0) {
          console.log('No devices found via mDNS.');
          const answer = await rl.question(`${key.trim()} [${defaultValue}]: `);
          existingEnv[key.trim()] = answer.trim() !== '' ? answer : defaultValue;
        } else {
          console.log('Found devices:');
          devices.forEach((d, i) => {
            console.log(`[${i + 1}] ${d.friendlyName} (${d.host})`);
          });
          const choice = await rl.question('Select device number [1]: ') || '1';
          const selected = devices[Number.parseInt(choice, 10) - 1] || devices[0];
          existingEnv['CAST_DEVICE_IP'] = selected.host;
          existingEnv['CAST_DEVICE_NAME'] = selected.friendlyName;
          console.log(`Selected: ${selected.friendlyName}`);
        }
      } catch (err) {
        console.log('Discovery failed. Please enter IP manually.');
        const answer = await rl.question(`${key.trim()} [${defaultValue}]: `);
        existingEnv[key.trim()] = answer.trim() !== '' ? answer : defaultValue;
      }
      continue;
    }

    // Skip CAST_DEVICE_NAME if it's set by discovery
    if (key.trim() === 'CAST_DEVICE_NAME' && existingEnv['CAST_DEVICE_NAME']) {
       continue;
    }

    const answer = await rl.question(`${key.trim()} [${defaultValue}]: `);
    existingEnv[key.trim()] = answer.trim() !== '' ? answer : defaultValue;
  }

  saveProgress();
  console.log(`\n✅ Config saved to ${envPath}`);
  console.log('\nOnboarding complete!');
  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
