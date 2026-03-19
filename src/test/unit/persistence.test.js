import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState, saveKeywordRules, loadKeywordRules } from '../../state/persistence';
import { STORAGE_KEYS } from '../../utils/constants';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

describe('persistence', () => {
  beforeEach(() => localStorageMock.clear());

  describe('saveState / loadState', () => {
    it('round-trips layout and settings', () => {
      const mockLayout = {
        root: { type: 'pane', id: 'test', tabs: [], activeTabId: null },
        activePaneId: 'test',
      };
      const mockSettings = { theme: 'dark', fontSize: 14 };
      saveState(mockLayout, mockSettings);
      const loaded = loadState();
      expect(loaded.layout).toEqual(mockLayout);
      expect(loaded.settings).toEqual(mockSettings);
    });

    it('loadState returns null layout when nothing is saved', () => {
      const loaded = loadState();
      expect(loaded.layout).toBeNull();
    });

    it('loadState returns null settings when nothing is saved', () => {
      const loaded = loadState();
      expect(loaded.settings).toBeNull();
    });

    it('handles corrupted layout JSON gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.LAYOUT, 'INVALID_JSON{{{');
      const loaded = loadState();
      expect(loaded).toBeDefined();
      expect(loaded.layout).toBeNull();
    });

    it('handles corrupted settings JSON gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.SETTINGS, 'INVALID_JSON{{{');
      const loaded = loadState();
      expect(loaded).toBeDefined();
    });

    it('saves layout without settings when settings is null', () => {
      const mockLayout = { root: { type: 'pane', id: 'abc', tabs: [], activeTabId: null }, activePaneId: 'abc' };
      saveState(mockLayout, null);
      const loaded = loadState();
      expect(loaded.layout).toEqual(mockLayout);
    });
  });

  describe('SSH credential sanitization', () => {
    it('strips password and passphrase from SSH tabs on save', () => {
      const layout = {
        root: {
          type: 'pane',
          id: 'p1',
          tabs: [
            {
              id: 't1',
              type: 'ssh',
              sshSessionId: 'active-session',
              sshStatus: 'connected',
              sshError: null,
              sshConfig: {
                host: '10.0.0.1',
                port: 22,
                username: 'root',
                authMethod: 'password',
                password: 'supersecret',
                passphrase: 'keypass',
                sessionName: 'test',
                keyFilePath: null,
              },
            },
          ],
          activeTabId: 't1',
        },
        activePaneId: 'p1',
      };
      saveState(layout, null);
      const loaded = loadState();
      const savedTab = loaded.layout.root.tabs[0];

      // Session state should be reset
      expect(savedTab.sshSessionId).toBeNull();
      expect(savedTab.sshStatus).toBe('disconnected');

      // Credentials must be stripped
      expect(savedTab.sshConfig.password).toBeUndefined();
      expect(savedTab.sshConfig.passphrase).toBeUndefined();

      // Non-sensitive config should remain
      expect(savedTab.sshConfig.host).toBe('10.0.0.1');
      expect(savedTab.sshConfig.username).toBe('root');
    });
  });

  describe('saveKeywordRules / loadKeywordRules', () => {
    it('round-trips keyword rules', () => {
      const rules = [
        { id: '1', pattern: 'error', color: '#ff0000', enabled: true },
        { id: '2', pattern: 'warning', color: '#ffaa00', enabled: false },
      ];
      saveKeywordRules(rules);
      const loaded = loadKeywordRules();
      expect(loaded).toEqual(rules);
    });

    it('returns default rules when nothing is saved', () => {
      const loaded = loadKeywordRules();
      // Default Cisco rules are loaded from net_os_cli_rules.json when nothing is saved
      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBeGreaterThan(0);
    });

    it('handles corrupted keyword rules JSON gracefully (returns defaults)', () => {
      localStorageMock.setItem(STORAGE_KEYS.KEYWORDS, '{{INVALID}}');
      const loaded = loadKeywordRules();
      // On corrupt data, returns default rules (not empty array)
      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBeGreaterThan(0);
    });

    it('saves and loads an empty rules array', () => {
      saveKeywordRules([]);
      const loaded = loadKeywordRules();
      expect(loaded).toEqual([]);
    });
  });
});
