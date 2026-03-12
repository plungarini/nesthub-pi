import dnsSd from 'node-dns-sd';

export interface CastDevice {
  name: string;         // mDNS service name
  host: string;         // IP address
  port: number;         // always 8009
  friendlyName: string; // display name (friendlyName in TXT)
}

/**
 * Scans the local network for Google Cast devices using mDNS.
 * Used during onboarding.
 */
export async function discoverDevices(timeoutMs = 5000): Promise<CastDevice[]> {
  const devices = await dnsSd.discover({
    service: '_googlecast._tcp.local'
  });

  return devices.map((d: any) => ({
    name: d.model || d.name,
    host: d.address,
    port: 8009,
    friendlyName: d.packet.answers[0]?.name || d.name
  }));
}
