# nesthub-pi — Coding Spec

**Port:** `3000`
**Local domain:** `http://nesthub.pi` — add to existing Caddyfile, no extra setup
**Public URL:** `https://nesthub-pi.<your-domain>.com` — fixed Cloudflare named tunnel
**Platforms:** Windows (dev) + Linux ARM64 (Raspberry Pi OS, production)

---

## What it does

Serves a custom display on a Google Nest Hub. On `npm start`:
1. Fastify server starts on `:3000`
2. Cloudflare tunnel connects (gives the receiver a stable public HTTPS URL to poll)
3. `castSender.ts` connects directly to the saved device IP, launches the Cast app

The Nest Hub loads the receiver from GitHub Pages (deployed once, never touched again).
The receiver polls `GET /content` every 5s and injects the response HTML into the display.
All display logic lives in `src/api/routes/content.ts` — edit, save, see it on screen.

---

## Architecture

```
[ npm start ]
    ├── Fastify :3000
    ├── cloudflared tunnel → fixed public HTTPS URL
    └── castSender → connects to CAST_DEVICE_IP:8009 → LAUNCH app (CAST_APP_ID)

[ Google Nest Hub ]
    └── loads receiver from GitHub Pages (static, permanent)
            └── polls GET https://nesthub-pi.<domain>.com/content every 5s
                            └── Fastify :3000 → HTML fragment

[ Local access ]
    └── Caddy already handles nesthub.pi → localhost:3000
        (just add a reverse_proxy block to your existing Caddyfile)
```

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js + TypeScript ESM | `"moduleResolution": "NodeNext"`, `"target": "ES2022"` |
| Framework | Fastify | |
| Cast protocol | `castv2` | Raw TLS + protobuf, pure JS, no native deps |
| Cast discovery | `node-dns-sd` | Pure JS mDNS, no native deps, promise-based |
| Tunnel | `cloudflared` npm package | Auto-downloads correct binary per platform |
| Cross-platform scripts | `cross-env` + `cross-spawn` | Windows + Linux ARM compat |
| Logging | logger-pi (`src/core/logger.ts`) | Guidelines §3 |

**Why `castv2` not `castv2-client`:** `castv2-client` is 9 years old and wraps the DefaultMediaReceiver. For launching a custom receiver app we only need raw CASTV2 — `connect → CONNECT → LAUNCH appId → heartbeat`. Less surface area, no abstraction mismatch.

**Why `node-dns-sd` not `mdns-js` / `mdns`:** `mdns` requires `libavahi-compat-libdnssd-dev` on Linux (native dep, breaks guidelines §5). `mdns-js` is 7 years abandoned. `node-dns-sd` is pure JS, promise-based, discovers by service type (`_googlecast._tcp.local`), works on both Windows and Linux ARM.

---

## Repo Structure

```
nesthub-pi/
  receiver/
    index.html             ← deployed to GitHub Pages once, never touched again
  src/
    core/
      logger.ts            ← logger-pi integration (guidelines §3)
      tunnel.ts            ← spawns cloudflared via cross-spawn
      castSender.ts        ← castv2 client: connect, LAUNCH, heartbeat, reconnect
      castDiscovery.ts     ← node-dns-sd: scan LAN for _googlecast._tcp.local devices
    api/
      server.ts            ← Fastify instance + plugin registration
      routes/
        content.ts         ← GET /content → HTML fragment (the display logic)
        cast.ts            ← GET /cast/status, POST /cast/connect, POST /cast/disconnect
        health.ts          ← GET /health
    plugins/
      cors.ts              ← allow GITHUB_PAGES_ORIGIN only
    tests/
      castSender.test.ts
      castDiscovery.test.ts
      content.test.ts
    index.ts               ← entry: server + tunnel + auto-cast in parallel
  ui/
    index.html             ← minimal control panel (cast status, manual connect/disconnect)
  scripts/
    onboard.js             ← interactive setup with LAN device discovery
  .env.example
  tsconfig.json
  vitest.config.ts
  package.json
  README.md
```

---

## Auto-Cast on Startup (`src/index.ts`)

```typescript
// Startup sequence (all parallel where possible):
async function main() {
  await server.listen({ port: PORT, host: '0.0.0.0' });
  startTunnel();       // fire-and-forget, logs connection status
  await autocast();    // connect to CAST_DEVICE_IP and launch app
}

// autocast():
//   1. if CAST_DEVICE_IP or CAST_APP_ID not set → log WARN, skip (manual only)
//   2. castSender.connect(CAST_DEVICE_IP)
//   3. castSender.launch(CAST_APP_ID)
//   4. start heartbeat loop
//   5. on disconnect: wait CAST_RECONNECT_DELAY_MS, retry (indefinite)
```

---

## Cast Sender (`src/core/castSender.ts`)

Implements the minimum CASTV2 protocol needed to connect and launch a custom app.

```typescript
// State: 'disconnected' | 'connecting' | 'connected' | 'launching' | 'live'
// Exported:
//   connect(host: string): Promise<void>
//   launch(appId: string): Promise<void>
//   disconnect(): void
//   getStatus(): CastStatus

// Protocol sequence:
//   client.connect(host, 8009)  ← TLS socket via castv2.Client
//   connection.send({ type: 'CONNECT' })                    ← virtual connection
//   receiver.send({ type: 'LAUNCH', appId, requestId: 1 }) ← launch app
//   receiver.on('message') → watch for RECEIVER_STATUS with app running
//   setInterval(() => heartbeat.send({ type: 'PING' }), 5000) ← keep alive
//   on socket error/close → emit 'disconnected', index.ts handles reconnect

// Channels used:
//   connection: urn:x-cast:com.google.cast.tp.connection
//   heartbeat:  urn:x-cast:com.google.cast.tp.heartbeat
//   receiver:   urn:x-cast:com.google.cast.receiver

interface CastStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'launching' | 'live';
  deviceIp: string | null;
  appId: string | null;
  connectedAt: string | null;
}
```

---

## Cast Discovery (`src/core/castDiscovery.ts`)

Used **only during onboarding** to let the user pick a device. Not used at runtime.

```typescript
// discoverDevices(timeoutMs = 5000): Promise<CastDevice[]>
//   uses node-dns-sd to query _googlecast._tcp.local
//   returns: [{ name, host, port, friendlyName }]

interface CastDevice {
  name: string;         // mDNS service name
  host: string;         // IP address — this is what gets saved to .env
  port: number;         // always 8009
  friendlyName: string; // display name from TXT record (e.g. "Living Room Display")
}
```

---

## Tunnel (`src/core/tunnel.ts`)

```typescript
// Uses `cloudflared` npm package (auto-downloads correct binary for platform)
// Uses cross-spawn instead of child_process.spawn for Windows compat
//
// startTunnel(): ChildProcess
//   1. if binary missing: await install(bin)
//   2. cross-spawn(bin, ['tunnel', 'run', '--token', CF_TUNNEL_TOKEN])
//   3. pipe stderr: log 'Registered tunnel' → INFO, 'error' → ERROR
//   4. on exit code !== 0: log ERROR
//   5. return ChildProcess (killed in graceful shutdown)
// Throws if CF_TUNNEL_TOKEN not set
```

---

## API Routes

```
GET  /content                → text/html fragment (the Nest Hub display — edit freely)
GET  /health                 → { status: 'ok', uptime, cast: CastStatus }
GET  /cast/status            → CastStatus
POST /cast/connect           → connect to saved device and launch app → CastStatus
POST /cast/disconnect        → disconnect current session → CastStatus
```

`/cast/*` routes power the control panel UI. The `POST /cast/connect` is also useful
if the auto-cast on startup fails and you want to retry without restarting the service.

---

## Control Panel UI (`ui/index.html`)

Minimal single-file HTML page served by Fastify at `/`. No framework.

Sections:
- **Cast status badge** — live, connecting, disconnected (polls `GET /cast/status` every 3s)
- **Connect / Disconnect buttons** — call `POST /cast/connect` or `POST /cast/disconnect`
- **Content preview** — iframe showing `GET /content` live

This is the manual fallback when auto-cast fails. No build step — plain HTML + fetch.

---

## Onboarding Script (`scripts/onboard.js`)

Pure Node.js, no extra deps beyond what's in `package.json`. Works on Windows and Linux.

```
Flow:
1. Read existing .env (if present), use as defaults
2. Display welcome banner
3. Prompt: CF_TUNNEL_TOKEN
4. Prompt: GITHUB_PAGES_ORIGIN
5. Prompt: CAST_APP_ID

6. Discover Cast devices on LAN:
   - Run castDiscovery.discoverDevices(5000)
   - If none found: warn, allow manual IP entry
   - If found: display numbered list with friendly names
     e.g.  [1] Living Room Display  (192.168.1.42)
            [2] Kitchen Hub         (192.168.1.55)
   - User picks number → CAST_DEVICE_IP saved to .env
   - Also save CAST_DEVICE_NAME for display purposes

7. Test cloudflared binary (attempt install if missing via cloudflared npm)
8. Save .env
9. Print Caddyfile snippet for nesthub.pi local domain
10. SIGINT handler: save progress to .env and exit cleanly
11. vitest run
```

> Caddy snippet printed (not automated — user pastes into their existing Caddyfile):
> ```
> nesthub.pi {
>   reverse_proxy localhost:3000
> }
> ```

---

## Cross-Platform Notes

| Concern | Solution |
|---|---|
| npm scripts with env vars | `cross-env` |
| Child process spawning (tunnel) | `cross-spawn` |
| File paths | `path.join()` everywhere, no hardcoded `/` or `\` |
| cloudflared binary | `cloudflared` npm package handles platform detection (win32, linux-arm64) |
| mDNS discovery | `node-dns-sd` — pure JS, no native deps, works on both |
| Cast protocol | `castv2` — pure JS TLS, works on both |
| No systemd | Service management is manual on both platforms (`npm start`) |
| Line endings | `.gitattributes` with `* text=auto` |

---

## Environment Variables (`.env.example`)

```env
PORT=3000

# Cloudflare tunnel token (dashboard → Tunnels → your tunnel → token)
CF_TUNNEL_TOKEN=

# GitHub Pages origin for CORS
GITHUB_PAGES_ORIGIN=https://<username>.github.io

# Cast device (set by onboarding via LAN discovery)
CAST_DEVICE_IP=
CAST_DEVICE_NAME=
CAST_APP_ID=

# Cast reconnect delay on disconnect (ms)
CAST_RECONNECT_DELAY_MS=5000

# logger-pi
LOGGER_PI_URL=http://127.0.0.1:4000
LOGGER_PI_SERVICE_NAME=nesthub-pi
```

---

## npm Scripts (`package.json`)

```json
{
  "scripts": {
    "dev":     "cross-env NODE_ENV=development tsx watch src/index.ts",
    "build":   "tsc",
    "start":   "npm run build && cross-env NODE_ENV=production node dist/index.js",
    "test":    "vitest run",
    "onboard": "node scripts/onboard.js"
  }
}
```

---

## Graceful Shutdown (`src/index.ts`)

Per guidelines §4:

```typescript
const shutdown = async (signal: string) => {
  castSender.disconnect();
  tunnelProcess?.kill();
  await logger.close();
  await server.close();
  process.exit(0);
};
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

---

## `receiver/index.html`

Deployed to GitHub Pages once. **Never touched again after initial deploy.**

Contains:
- Cast Web Receiver SDK initialization
- `CLOUDFLARE_TUNNEL_URL` hardcoded (set once after tunnel created)
- `CAST_APP_ID` hardcoded (set once after Cast console registration)
- `disableIdleTimeout: true` in receiver options
- `setInterval(() => fetch(CLOUDFLARE_TUNNEL_URL + '/content') → inject into DOM`, 5000)

---

## Dependencies

```json
{
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/static": "^7.0.0",
    "castv2": "^1.1.0",
    "node-dns-sd": "^0.4.4",
    "cloudflared": "^0.3.0",
    "cross-spawn": "^7.0.3",
    "cross-env": "^7.0.3",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/cross-spawn": "^6.0.6",
    "vitest": "^1.0.0"
  }
}
```

---

## Constraints

| Constraint | Detail |
|---|---|
| Domain required | Named Cloudflare tunnels need a domain on Cloudflare. `trycloudflare.com` quick tunnels change URL on restart — unusable for a hardcoded receiver |
| Cast idle timeout | `disableIdleTimeout: true` required or Cast tears down session after inactivity |
| CORS | Only `GITHUB_PAGES_ORIGIN` allowed on `/content` |
| GitHub Pages URL permanent | Renaming the receiver repo breaks Cast console registration |
| $5 Cast fee | One-time, unlocks Cast developer console permanently |
| Auto-cast requires LAN | `CAST_DEVICE_IP` must be reachable. Pi and Nest Hub must be on same network |
| Reconnect loop | On Nest Hub reboot / network blip, castSender auto-reconnects after `CAST_RECONNECT_DELAY_MS` |

---

## Build Phases

### Phase 1 — Server + Tunnel
- [ ] Fastify with `/content`, `/health`, `/cast/status` routes
- [ ] `tunnel.ts` with `cross-spawn`, connection logging
- [ ] CORS plugin scoped to `GITHUB_PAGES_ORIGIN`
- [ ] `logger.ts` + graceful shutdown
- [ ] Cross-platform npm scripts with `cross-env`

**Gate:** `npm start` → tunnel connects → `GET https://nesthub-pi.<domain>.com/content` returns HTML.

### Phase 2 — Auto-Cast
- [ ] `castSender.ts` — connect, LAUNCH, heartbeat, disconnect
- [ ] `castDiscovery.ts` — mDNS scan returning `CastDevice[]`
- [ ] Auto-cast on startup in `index.ts`
- [ ] Reconnect loop on disconnect
- [ ] `/cast/connect` + `/cast/disconnect` routes

**Gate:** `npm start` → Cast app launches on Nest Hub automatically within 3s.

### Phase 3 — Control Panel + Onboarding
- [ ] `ui/index.html` — status badge + manual connect/disconnect + content preview
- [ ] Onboarding script with LAN discovery, device picker, .env save
- [ ] `receiver/index.html` complete, deployed to GitHub Pages
- [ ] Tests in `src/tests/`
- [ ] `.gitattributes` for line endings

**Gate:** `npm install && npm run onboard && npm start` — full setup on both Windows and Pi.
