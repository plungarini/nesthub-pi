# nesthub-pi

Custom display for Google Nest Hub. Serves dynamic HTML content via the Cast protocol and Cloudflare tunnels.

## Features
- **Auto-Cast**: Automatically connects to your Nest Hub and launches the receiver app on startup.
- **Cloudflare Tunnel**: Provides a stable public HTTPS URL for the receiver to poll content from restricted local networks.
- **Dynamic Content**: Edit `src/api/routes/content.ts` and see changes on your Nest Hub in seconds.
- **Control Panel**: Web UI for monitoring status and manual connect/disconnect.
- **mDNS Discovery**: Onboarding script automatically finds Nest Hubs on your network.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Onboarding**:
   Run the interactive setup to configure your tunnel token and discover your Nest Hub:
   ```bash
   npm run onboard
   ```

3. **Deploy Receiver**:
   - Host `receiver/index.html` on GitHub Pages.
   - Update the `CLOUDFLARE_TUNNEL_URL` constant in that file once your tunnel is active.

4. **Register Cast App**:
   - Go to the [Google Cast Developer Console](https://cast.google.com/publish/).
   - Register a "Custom Receiver" pointing to your GitHub Pages URL.
   - Use the resulting App ID in your `.env` file.

5. **Start**:
   ```bash
   npm start
   ```

## Local Access
Access the control panel at `http://nesthub.pi` (if Caddy is configured) or `http://localhost:3000`.

## Architecture
- **Fastify**: Serves the API and UI.
- **CastV2**: Pure JavaScript implementation of the Google Cast protocol.
- **node-dns-sd**: mDNS discovery for finding devices on the LAN.
- **cloudflared**: Manages the secure tunnel for receiver polling.
