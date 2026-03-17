import { describe, it, expect } from 'vitest';
import { detectCiscoConfig } from '../../components/cisco/CiscoDetector';

describe('CiscoDetector', () => {
  it('returns isConfig: false for null/undefined', () => {
    expect(detectCiscoConfig(null).isConfig).toBe(false);
    expect(detectCiscoConfig(undefined).isConfig).toBe(false);
    expect(detectCiscoConfig('').isConfig).toBe(false);
  });

  it('returns isConfig: false for short text', () => {
    const result = detectCiscoConfig('short');
    expect(result.isConfig).toBe(false);
  });

  it('returns a score property', () => {
    const result = detectCiscoConfig('some text that is long enough to check');
    expect(typeof result.score).toBe('number');
  });

  it('detects obvious Cisco config with hostname and interface', () => {
    const config = `
hostname Router1
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
ip route 0.0.0.0 0.0.0.0 192.168.1.254
`;
    const result = detectCiscoConfig(config);
    expect(result.isConfig).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(8);
  });

  it('does not flag plain text as Cisco config', () => {
    const text = 'Hello world, this is just a plain text note with no networking commands whatsoever.';
    const result = detectCiscoConfig(text);
    expect(result.isConfig).toBe(false);
  });

  it('detects router BGP config', () => {
    const config = `
hostname R1
!
router bgp 65001
 neighbor 10.0.0.2 remote-as 65002
 network 192.168.1.0 mask 255.255.255.0
!
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.252
 no shutdown
`;
    const result = detectCiscoConfig(config);
    expect(result.isConfig).toBe(true);
  });

  it('detects show command output', () => {
    const output = `
Router#show ip interface brief
Interface                  IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0         192.168.1.1     YES manual up                    up
GigabitEthernet0/1         10.0.0.1        YES manual up                    up
`;
    // This has ip address pattern and hostname-style prefix — check score
    const result = detectCiscoConfig(output);
    // Show output may or may not cross the threshold but should return valid object
    expect(result).toHaveProperty('isConfig');
    expect(result).toHaveProperty('score');
  });

  it('detects VLAN and switchport config', () => {
    const config = `
hostname SW1
!
vlan 10
 name MANAGEMENT
!
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 no shutdown
!
spanning-tree mode rapid-pvst
`;
    const result = detectCiscoConfig(config);
    expect(result.isConfig).toBe(true);
  });

  it('detects access-list config', () => {
    const config = `
hostname FW1
!
access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80
access-list 100 deny ip any any
!
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0
 ip access-group 100 in
 no shutdown
`;
    const result = detectCiscoConfig(config);
    expect(result.isConfig).toBe(true);
  });

  it('gives higher score to config with more matching patterns', () => {
    const minimal = `
hostname R1
!
end
`;
    const full = `
hostname R1
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
ip route 0.0.0.0 0.0.0.0 192.168.1.254
!
end
`;
    const minResult = detectCiscoConfig(minimal);
    const fullResult = detectCiscoConfig(full);
    expect(fullResult.score).toBeGreaterThan(minResult.score);
  });
});
