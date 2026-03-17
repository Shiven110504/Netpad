export const STORAGE_KEYS = {
  LAYOUT: 'netpad_layout_v1',
  SETTINGS: 'netpad_settings_v1',
  KEYWORDS: 'netpad_keywords_v1',
  TODOS: 'netpad_todos_v1',
  WIDGETS: 'netpad_widgets_v1',
};

export const DEFAULT_SETTINGS = {
  theme: 'light',
  fontSize: 14,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  showLineNumbers: true,
  wordWrap: true,
  autoSaveInterval: 1500,
  tabSize: 2,
  weatherUnit: 'celsius',
  weatherLocation: null,
};

export const FONT_FAMILIES = [
  { label: 'System Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Monospace', value: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

export const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];

export const MAX_PANES = 4;
