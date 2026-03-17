import React, { createContext, useContext, useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { layoutReducer, initialLayout } from './layoutReducer';
import { loadState, saveState, loadKeywordRules, saveKeywordRules } from './persistence';
import { DEFAULT_SETTINGS } from '../utils/constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = loadState();
    return { ...DEFAULT_SETTINGS, ...saved.settings };
  });

  const [layout, dispatch] = useReducer(layoutReducer, null, () => {
    const saved = loadState();
    if (saved.layout) {
      return saved.layout;
    }
    return initialLayout();
  });

  const [keywordRules, setKeywordRules] = useState(() => loadKeywordRules());

  const updateKeywordRules = useCallback((newRules) => {
    setKeywordRules(newRules);
    saveKeywordRules(newRules);
  }, []);

  // Theme management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Debounced auto-save
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveState(layout, settings);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [layout, settings]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveState(layout, settings);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [layout, settings]);

  const value = {
    layout,
    dispatch,
    settings,
    setSettings,
    updateSettings,
    toggleTheme,
    keywordRules,
    updateKeywordRules,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
