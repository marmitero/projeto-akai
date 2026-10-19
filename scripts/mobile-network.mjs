import { networkInterfaces } from 'node:os';
import { isIPv4 } from 'node:net';

export function isPrivateIpv4(ip) {
  if (!isIPv4(ip)) return false;
  const [a,b] = ip.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
export function lanAddresses(interfaces = networkInterfaces()) {
  return Object.entries(interfaces).flatMap(([name, entries]) => (entries ?? [])
    .filter(i => !i.internal && i.family === 'IPv4' && isPrivateIpv4(i.address))
    .map(i => ({ name, address: i.address, score: /wi-?fi|wireless|wlan/i.test(name) ? 3 : /ethernet|^eth|^en\d/i.test(name) ? 2 : 1 })))
    .filter(i => !/docker|veth|virtual|vmware|wsl|vpn|tailscale|wireguard|\btun|\btap|loopback|bridge/i.test(i.name))
    .sort((a,b) => b.score-a.score || a.name.localeCompare(b.name));
}
export function chooseLanAddress(requested, interfaces = networkInterfaces()) {
  const candidates = lanAddresses(interfaces);
  if (requested) {
    // Explicit choices may include a virtual interface, but must still be a local RFC1918 address.
    const found = Object.values(interfaces).flat().some(i => i && !i.internal && i.family === 'IPv4' && i.address === requested);
    if (!isPrivateIpv4(requested) || !found) throw Error('LanIp deve ser um IPv4 privado desta maquina (ex.:192.168.1.20).');
    return requested;
  }
  if (!candidates.length) throw Error('Nenhum IPv4 de rede local encontrado. Conecte o PC ao Wi-Fi/Ethernet e tente novamente.');
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) throw Error(`Mais de uma rede encontrada: ${candidates.map(c => `${c.name}: ${c.address}`).join(', ')}. Use celular.bat -LanIp ENDERECO.`);
  return candidates[0].address;
}
export function mobileRequestAllowed(request, origin) {
  const ip = request.socket.remoteAddress?.replace(/^::ffff:/, '');
  return (isPrivateIpv4(ip) || ip === '127.0.0.1' || ip === '::1') && request.headers.host === new URL(origin).host &&
    (!request.headers.origin || request.headers.origin === origin);
}
