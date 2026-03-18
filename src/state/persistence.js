import { STORAGE_KEYS } from '../utils/constants';
import defaultRulesJson from '../../net_os_cli_rules.json';

export const DEFAULT_KEYWORD_RULES = defaultRulesJson.rules.map((rule, i) => ({
  ...rule,
  id: `default-rule-${i}`,
  backgroundColor: rule.backgroundColor || '',
}));

function sanitizeSshTabsForSave(node) {
  if (!node) return node;
  if (node.type === 'pane') {
    return {
      ...node,
      tabs: node.tabs.map(tab => {
        if (tab.type === 'ssh') {
          return {
            ...tab,
            sshSessionId: null,
            sshStatus: 'disconnected',
            sshError: null,
          };
        }
        return tab;
      }),
    };
  }
  if (node.type === 'split') {
    return {
      ...node,
      children: node.children.map(child => sanitizeSshTabsForSave(child)),
    };
  }
  return node;
}

export function saveState(layout, settings) {
  try {
    const sanitizedLayout = layout ? {
      ...layout,
      root: sanitizeSshTabsForSave(layout.root),
    } : layout;
    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(sanitizedLayout));
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
    if (str) return JSON.parse(str);
    return DEFAULT_KEYWORD_RULES;
  } catch (e) {
    return DEFAULT_KEYWORD_RULES;
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

export function saveSshProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEYS.SSH_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Failed to save SSH profiles:', e);
  }
}

export function loadSshProfiles() {
  try {
    const str = localStorage.getItem(STORAGE_KEYS.SSH_PROFILES);
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
