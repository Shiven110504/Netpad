import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../../utils/constants';

describe('DEFAULT_SETTINGS', () => {
  it('includes ciscoHighlighting set to true', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('ciscoHighlighting', true);
  });

  it('has expected default keys', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('theme');
    expect(DEFAULT_SETTINGS).toHaveProperty('fontSize');
    expect(DEFAULT_SETTINGS).toHaveProperty('fontFamily');
    expect(DEFAULT_SETTINGS).toHaveProperty('showLineNumbers');
    expect(DEFAULT_SETTINGS).toHaveProperty('wordWrap');
    expect(DEFAULT_SETTINGS).toHaveProperty('autoSaveInterval');
    expect(DEFAULT_SETTINGS).toHaveProperty('tabSize');
  });
});
