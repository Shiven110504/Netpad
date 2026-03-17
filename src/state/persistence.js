import { STORAGE_KEYS } from '../utils/constants';

export function saveState(layout, settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(layout));
    if (settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

export function loadState() {
  try {
    const layoutStr = localStorage.getItem(STORAGE_KEYS.LAYOUT);
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return {
      layout: layoutStr ? JSON.parse(layoutStr) : null,
      settings: settingsStr ? JSON.parse(settingsStr) : null,
    };
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
    return { layout: null, settings: null };
  }
}

export function saveKeywordRules(rules) {
  try {
    localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(rules));
  } catch (e) {
    console.warn('Failed to save keyword rules:', e);
  }
}

export function loadKeywordRules() {
  try {
    const str = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
    return str ? JSON.parse(str) : [];
  } catch (e) {
    return [];
  }
}

export function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
  } catch (e) {
    console.warn('Failed to save todos:', e);
  }
}

export function loadTodos() {
  try {
    const str = localStorage.getItem(STORAGE_KEYS.TODOS);
    return str ? JSON.parse(str) : [];
  } catch (e) {
    return [];
  }
}

export function getStorageUsage() {
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += localStorage.getItem(key).length * 2; // UTF-16
    }
  }
  return total;
}
