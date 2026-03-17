import React, { useEffect } from 'react';
import SplitPaneTree from './layout/SplitPaneTree';
import StatusBar from './StatusBar';
import { useApp } from '../state/AppContext';

export default function AppShell() {
  const { layout, dispatch } = useApp();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+N — New tab
      if (isMod && e.key === 'n') {
        e.preventDefault();
        dispatch({ type: 'ADD_TAB', paneId: layout.activePaneId });
      }

      // Ctrl+W — Close tab
      if (isMod && e.key === 'w') {
        e.preventDefault();
        const pane = findActivePane(layout.root, layout.activePaneId);
        if (pane) {
          dispatch({ type: 'CLOSE_TAB', paneId: pane.id, tabId: pane.activeTabId });
        }
      }

      // Ctrl+\ — Split right
      if (isMod && !e.shiftKey && e.key === '\\') {
        e.preventDefault();
        dispatch({ type: 'SPLIT_PANE', paneId: layout.activePaneId, direction: 'horizontal' });
      }

      // Ctrl+Shift+\ — Split down
      if (isMod && e.shiftKey && e.key === '|') {
        e.preventDefault();
        dispatch({ type: 'SPLIT_PANE', paneId: layout.activePaneId, direction: 'vertical' });
      }

      // Ctrl+Tab — Next tab
      if (isMod && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const pane = findActivePane(layout.root, layout.activePaneId);
        if (pane && pane.tabs.length > 1) {
          const idx = pane.tabs.findIndex(t => t.id === pane.activeTabId);
          const nextIdx = (idx + 1) % pane.tabs.length;
          dispatch({ type: 'ACTIVATE_TAB', paneId: pane.id, tabId: pane.tabs[nextIdx].id });
        }
      }

      // Ctrl+Shift+Tab — Previous tab
      if (isMod && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const pane = findActivePane(layout.root, layout.activePaneId);
        if (pane && pane.tabs.length > 1) {
          const idx = pane.tabs.findIndex(t => t.id === pane.activeTabId);
          const prevIdx = (idx - 1 + pane.tabs.length) % pane.tabs.length;
          dispatch({ type: 'ACTIVATE_TAB', paneId: pane.id, tabId: pane.tabs[prevIdx].id });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layout, dispatch]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
    }}>
      <SplitPaneTree />
      <StatusBar />
    </div>
  );
}

function findActivePane(node, paneId) {
  if (node.type === 'pane' && node.id === paneId) return node;
  if (node.type === 'split') {
    for (const child of node.children) {
      const found = findActivePane(child, paneId);
      if (found) return found;
    }
  }
  return null;
}
