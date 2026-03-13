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
export async function discoverDevices(timeoutMs = 10000): Promise<CastDevice[]> {
  try {
    const devices = await dnsSd.discover({
      name: '_googlecast._tcp.local',
      timeout: timeoutMs
    });

    return devices.map((d: any) => {
      // Find friendly name in TXT record if possible
      let friendlyName = d.name;
      const txt = d.packet?.additionals?.find((a: any) => a.type === 'TXT');
      if (txt?.rdata) {
        // rdata is often an object for node-dns-sd
        friendlyName = txt.rdata.fn || txt.rdata.friendlyName || friendlyName;
      }
      
      return {
        name: d.model || d.name,
        host: d.address,
        port: 8009,
        friendlyName: friendlyName
      };
    });
  } catch (err) {
    console.error('mDNS discovery error:', err);
    return [];
  }
}
