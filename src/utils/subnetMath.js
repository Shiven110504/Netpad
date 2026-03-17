export function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function longToIp(long) {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join('.');
}

export function cidrToMask(cidr) {
  if (cidr === 0) return 0;
  return (~0 << (32 - cidr)) >>> 0;
}

export function maskToCidr(mask) {
  let cidr = 0;
  let m = mask;
  while (m & 0x80000000) {
    cidr++;
    m = (m << 1) >>> 0;
  }
  return cidr;
}

export function calculateSubnet(ipStr, cidr) {
  const ip = ipToLong(ipStr);
  const mask = cidrToMask(cidr);
  const wildcard = (~mask) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalHosts = Math.pow(2, 32 - cidr);
  const usableHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : totalHosts - 2;
  const firstHost = cidr >= 31 ? network : (network + 1) >>> 0;
  const lastHost = cidr >= 31 ? broadcast : (broadcast - 1) >>> 0;

  return {
    network: longToIp(network),
    broadcast: longToIp(broadcast),
    firstHost: longToIp(firstHost),
    lastHost: longToIp(lastHost),
    subnetMask: longToIp(mask),
    wildcardMask: longToIp(wildcard),
    cidr,
    totalHosts,
    usableHosts,
    networkBinary: ip.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1.').slice(0, -1),
  };
}

export function isValidIp(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}
