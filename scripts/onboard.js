import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { discoverDevices } from '../src/core/castDiscovery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n--- nesthub-pi Onboarding ---\n');

  let config = {};
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    existing.split('\n').forEach(line => {
      const [key, val] = line.split('=');
      if (key && val) config[key.trim()] = val.trim();
    });
  } else if (fs.existsSync(envExamplePath)) {
    const example = fs.readFileSync(envExamplePath, 'utf8');
    example.split('\n').forEach(line => {
      const [key, val] = line.split('=');
      if (key && val) config[key.trim()] = val.trim();
    });
  }

  config.CF_TUNNEL_TOKEN = await question(`Cloudflare Tunnel Token [${config.CF_TUNNEL_TOKEN || ''}]: `) || config.CF_TUNNEL_TOKEN;
  config.GITHUB_PAGES_ORIGIN = await question(`GitHub Pages Origin [${config.GITHUB_PAGES_ORIGIN || ''}]: `) || config.GITHUB_PAGES_ORIGIN;
  config.CAST_APP_ID = await question(`Cast App ID [${config.CAST_APP_ID || ''}]: `) || config.CAST_APP_ID;

  console.log('\nScanning for Google Cast devices on LAN...');
  try {
    const devices = await discoverDevices(5000);
    if (devices.length === 0) {
      console.log('No devices found via mDNS.');
      config.CAST_DEVICE_IP = await question(`Enter Cast Device IP manually [${config.CAST_DEVICE_IP || ''}]: `) || config.CAST_DEVICE_IP;
    } else {
      console.log('Found devices:');
      devices.forEach((d, i) => {
        console.log(`[${i + 1}] ${d.friendlyName} (${d.host})`);
      });
      const choice = await question('Select device number [1]: ') || '1';
      const selected = devices[parseInt(choice) - 1] || devices[0];
      config.CAST_DEVICE_IP = selected.host;
      config.CAST_DEVICE_NAME = selected.friendlyName;
      console.log(`Selected: ${selected.friendlyName}`);
    }
  } catch (err) {
    console.log('Discovery failed. Please enter IP manually.');
    config.CAST_DEVICE_IP = await question(`Cast Device IP [${config.CAST_DEVICE_IP || ''}]: `) || config.CAST_DEVICE_IP;
  }

  const envContent = Object.entries(config)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  console.log(`\nConfig saved to ${envPath}`);

  console.log('\nNext steps:');
  console.log('1. Deploy receiver/index.html to your GitHub Pages repo.');
  console.log('2. Update receiver/index.html with your Cloudflare Tunnel URL.');
  console.log('3. Register your App ID in the Google Cast Developer Console.');
  console.log('4. Add this snippet to your Caddyfile:');
  console.log(`
nesthub.pi {
  reverse_proxy localhost:${config.PORT || 3000}
}
  `);

  console.log('\nOnboarding complete!');
  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});
