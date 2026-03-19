const darkAnsiColors = {
  black: '#1e1e2e',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#cba6f7',
  cyan: '#94e2d5',
  white: '#cdd6f4',
  brightBlack: '#585b70',
  brightRed: '#f38ba8',
  brightGreen: '#a6e3a1',
  brightYellow: '#f9e2af',
  brightBlue: '#89b4fa',
  brightMagenta: '#cba6f7',
  brightCyan: '#94e2d5',
  brightWhite: '#ffffff',
};

const lightAnsiColors = {
  black: '#4c4f69',
  red: '#d20f39',
  green: '#40a02b',
  yellow: '#df8e1d',
  blue: '#1e66f5',
  magenta: '#8839ef',
  cyan: '#179299',
  white: '#eff1f5',
  brightBlack: '#6c6f85',
  brightRed: '#d20f39',
  brightGreen: '#40a02b',
  brightYellow: '#df8e1d',
  brightBlue: '#1e66f5',
  brightMagenta: '#8839ef',
  brightCyan: '#179299',
  brightWhite: '#ffffff',
};

export function getTerminalTheme(appTheme) {
  const root = document.documentElement;
  const style = getComputedStyle(root);

  const bg = style.getPropertyValue('--editor-bg').trim() || (appTheme === 'dark' ? '#1e1e2e' : '#ffffff');
  const fg = style.getPropertyValue('--editor-text').trim() || (appTheme === 'dark' ? '#cdd6f4' : '#4c4f69');
  const accent = style.getPropertyValue('--accent-color').trim() || '#007aff';
  const selection = style.getPropertyValue('--editor-selection').trim() || 'rgba(0,122,255,0.3)';

  const ansi = appTheme === 'dark' ? darkAnsiColors : lightAnsiColors;

  return {
    background: bg,
    foreground: fg,
    cursor: accent,
    cursorAccent: bg,
    selectionBackground: selection,
    selectionForeground: undefined,
    ...ansi,
  };
}
