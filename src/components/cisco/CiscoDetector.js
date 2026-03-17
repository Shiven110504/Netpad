const STRONG_PATTERNS = [
  /^hostname\s+\S+/m,
  /^interface\s+(GigabitEthernet|FastEthernet|Ethernet|Serial|Loopback|Vlan|Tunnel|Port-channel)/mi,
  /^router\s+(ospf|bgp|eigrp|rip|isis)/mi,
  /^access-list\s+\d+/m,
  /^line\s+(vty|con|aux)/m,
  /^banner\s+(motd|login|exec)/m,
  /^ip\s+route\s+/m,
  /^snmp-server\s+/m,
];

const MEDIUM_PATTERNS = [
  /^\s*switchport\s+/m,
  /^spanning-tree\s+/m,
  /^vlan\s+\d+/m,
  /^\s*ip\s+address\s+\d/m,
  /^\s*no\s+shutdown/m,
  /^\s*shutdown$/m,
  /^enable\s+(secret|password)/m,
  /^service\s+timestamps/m,
  /^crypto\s+/m,
];

const WEAK_PATTERNS = [
  /^!$/m,                                          // Cisco comment line
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,      // IP address
  /^end$/m,                                         // Config end marker
];

export function detectCiscoConfig(text) {
  if (!text || text.length < 20) return { isConfig: false, score: 0 };

  let score = 0;

  for (const pattern of STRONG_PATTERNS) {
    if (pattern.test(text)) score += 3;
  }

  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(text)) score += 2;
  }

  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(text)) score += 1;
  }

  return {
    isConfig: score >= 8,
    score,
  };
}
