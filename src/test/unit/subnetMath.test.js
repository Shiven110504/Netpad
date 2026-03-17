import { describe, it, expect } from 'vitest';
import {
  calculateSubnet,
  ipToLong,
  longToIp,
  cidrToMask,
  maskToCidr,
  isValidIp,
} from '../../utils/subnetMath';

describe('subnetMath', () => {
  describe('ipToLong / longToIp roundtrip', () => {
    it('converts 192.168.1.1 to long and back', () => {
      const ip = '192.168.1.1';
      expect(longToIp(ipToLong(ip))).toBe(ip);
    });

    it('converts 0.0.0.0 correctly', () => {
      expect(ipToLong('0.0.0.0')).toBe(0);
      expect(longToIp(0)).toBe('0.0.0.0');
    });

    it('converts 255.255.255.255 correctly', () => {
      expect(ipToLong('255.255.255.255')).toBe(4294967295);
    });
  });

  describe('cidrToMask / maskToCidr', () => {
    it('converts /24 to mask', () => {
      expect(longToIp(cidrToMask(24))).toBe('255.255.255.0');
    });

    it('converts /16 to mask', () => {
      expect(longToIp(cidrToMask(16))).toBe('255.255.0.0');
    });

    it('converts /8 to mask', () => {
      expect(longToIp(cidrToMask(8))).toBe('255.0.0.0');
    });

    it('round-trips cidr to mask and back', () => {
      expect(maskToCidr(cidrToMask(24))).toBe(24);
      expect(maskToCidr(cidrToMask(16))).toBe(16);
      expect(maskToCidr(cidrToMask(30))).toBe(30);
    });
  });

  describe('calculateSubnet', () => {
    it('calculates /24 subnet correctly', () => {
      const result = calculateSubnet('192.168.1.0', 24);
      expect(result.network).toBe('192.168.1.0');
      expect(result.broadcast).toBe('192.168.1.255');
      expect(result.totalHosts).toBe(256);
      expect(result.usableHosts).toBe(254);
      expect(result.subnetMask).toBe('255.255.255.0');
    });

    it('calculates /30 subnet (point-to-point)', () => {
      const result = calculateSubnet('10.0.0.0', 30);
      expect(result.network).toBe('10.0.0.0');
      expect(result.broadcast).toBe('10.0.0.3');
      expect(result.usableHosts).toBe(2);
    });

    it('handles host IP within subnet (masks to network)', () => {
      const result = calculateSubnet('192.168.1.100', 24);
      expect(result.network).toBe('192.168.1.0');
    });

    it('calculates /16 subnet', () => {
      const result = calculateSubnet('172.16.0.0', 16);
      expect(result.totalHosts).toBe(65536);
      expect(result.usableHosts).toBe(65534);
    });

    it('calculates /8 subnet', () => {
      const result = calculateSubnet('10.0.0.0', 8);
      expect(result.network).toBe('10.0.0.0');
      expect(result.broadcast).toBe('10.255.255.255');
      expect(result.subnetMask).toBe('255.0.0.0');
    });

    it('calculates first and last host', () => {
      const result = calculateSubnet('192.168.1.0', 24);
      expect(result.firstHost).toBe('192.168.1.1');
      expect(result.lastHost).toBe('192.168.1.254');
    });

    it('calculates wildcard mask', () => {
      const result = calculateSubnet('192.168.1.0', 24);
      expect(result.wildcardMask).toBe('0.0.0.255');
    });

    it('includes cidr in result', () => {
      const result = calculateSubnet('10.0.0.0', 30);
      expect(result.cidr).toBe(30);
    });

    it('handles /31 (point-to-point link)', () => {
      const result = calculateSubnet('10.0.0.0', 31);
      expect(result.usableHosts).toBe(2);
    });

    it('handles /32 (host route)', () => {
      const result = calculateSubnet('10.0.0.1', 32);
      expect(result.usableHosts).toBe(1);
    });

    it('includes networkBinary in result', () => {
      const result = calculateSubnet('192.168.1.0', 24);
      expect(result.networkBinary).toBeDefined();
      expect(typeof result.networkBinary).toBe('string');
    });
  });

  describe('isValidIp', () => {
    it('accepts valid IPs', () => {
      expect(isValidIp('192.168.1.1')).toBe(true);
      expect(isValidIp('0.0.0.0')).toBe(true);
      expect(isValidIp('255.255.255.255')).toBe(true);
      expect(isValidIp('10.0.0.1')).toBe(true);
    });

    it('rejects invalid IPs', () => {
      expect(isValidIp('invalid')).toBe(false);
      expect(isValidIp('256.0.0.1')).toBe(false);
      expect(isValidIp('192.168.1')).toBe(false);
      expect(isValidIp('192.168.1.1.1')).toBe(false);
      expect(isValidIp('')).toBe(false);
    });

    it('rejects IPs with leading zeros', () => {
      expect(isValidIp('01.0.0.1')).toBe(false);
    });
  });
});
