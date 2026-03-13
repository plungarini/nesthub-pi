import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
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

    // Standard prompting for everything else
    const answer = await rl.question(`${key.trim()} [${defaultValue}]: `);
    existingEnv[key.trim()] = answer.trim() !== '' ? answer : defaultValue;
  }

  // --- Python Sidecar Setup ---
  console.log('\n--- Python Sidecar Setup ---');
  const { execSync } = await import('node:child_process');
  let pythonCmd = 'python3';
  try {
    execSync('python3 --version', { stdio: 'ignore' });
  } catch (e) {
    try {
      execSync('python --version', { stdio: 'ignore' });
      pythonCmd = 'python';
    } catch (e2) {
      console.error('❌ Python 3 not found. Please install Python 3.8+ to use the Cast sidecar.');
      process.exit(1);
    }
  }

  const venvPath = path.join(projectRoot, 'python', 'venv');
  if (!fs.existsSync(venvPath)) {
    console.log(`Creating virtual environment with ${pythonCmd}...`);
    try {
      execSync(`${pythonCmd} -m venv "${venvPath}"`, { stdio: 'inherit' });
    } catch (e) {
      if (process.platform !== 'win32') {
        console.error('\n❌ Virtual environment creation failed.');
        console.error('Try installing the venv package: sudo apt install python3-venv');
      }
      throw e;
    }
  }

  const isWindows = process.platform === 'win32';
  const pipPath = isWindows 
    ? path.join(venvPath, 'Scripts', 'pip.exe')
    : path.join(venvPath, 'bin', 'pip');
  const reqPath = path.join(projectRoot, 'python', 'requirements.txt');

  console.log('Installing Python dependencies...');
  execSync(`"${pipPath}" install -r "${reqPath}"`, { stdio: 'inherit' });
  console.log('✅ Python venv ready at python/venv');

  saveProgress();
  console.log(`\n✅ Config saved to ${envPath}`);
  console.log('\nOnboarding complete!');
  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
