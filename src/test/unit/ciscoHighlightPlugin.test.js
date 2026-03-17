import { describe, it, expect } from 'vitest';
import { ciscoKey, CiscoHighlight } from '../../components/cisco/CiscoHighlightPlugin';

describe('CiscoHighlightPlugin', () => {
  it('exports ciscoKey as a PluginKey', () => {
    expect(ciscoKey).toBeDefined();
    expect(typeof ciscoKey.key).toBe('string');
    expect(ciscoKey.key).toContain('ciscoHighlight');
  });

  it('exports CiscoHighlight extension', () => {
    expect(CiscoHighlight).toBeDefined();
    expect(CiscoHighlight.name).toBe('ciscoHighlight');
  });

  it('has default option enabled set to false', () => {
    const configured = CiscoHighlight.configure({});
    expect(configured.options.enabled).toBe(false);
  });

  it('accepts enabled: true via configure', () => {
    const configured = CiscoHighlight.configure({ enabled: true });
    expect(configured.options.enabled).toBe(true);
  });

  it('is exported as default export', async () => {
    const mod = await import('../../components/cisco/CiscoHighlightPlugin');
    expect(mod.default).toBe(CiscoHighlight);
  });
});
