import React, { useEffect, useState, useCallback } from 'react';
import SplitPaneTree from './layout/SplitPaneTree';
import StatusBar from './StatusBar';
import SettingsModal from './settings/SettingsModal';
import ConfigDiff from './cisco/ConfigDiff';
import KeywordRuleEditor from './highlighting/KeywordRuleEditor';
import StickyNotes from './widgets/StickyNotes';
import SubnetCalculator from './widgets/SubnetCalculator';
import { useApp } from '../state/AppContext';
import { loadKeywordRules, saveKeywordRules } from '../state/persistence';

export default function AppShell() {
  const { layout, dispatch } = useApp();

  // Modal/widget visibility state
  const [showSettings, setShowSettings] = useState(false);
  const [showConfigDiff, setShowConfigDiff] = useState(false);
  const [showKeywordRules, setShowKeywordRules] = useState(false);
  const [showStickyNotes, setShowStickyNotes] = useState(false);
  const [showSubnetCalc, setShowSubnetCalc] = useState(false);

  // Keyword rules state
  const [keywordRules, setKeywordRules] = useState(() => loadKeywordRules());

  const handleRulesChange = useCallback((newRules) => {
    setKeywordRules(newRules);
    saveKeywordRules(newRules);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Escape — Close any open modal
      if (e.key === 'Escape') {
        if (showSettings) { setShowSettings(false); e.preventDefault(); return; }
        if (showConfigDiff) { setShowConfigDiff(false); e.preventDefault(); return; }
        if (showKeywordRules) { setShowKeywordRules(false); e.preventDefault(); return; }
      }

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

      // Ctrl+, — Settings
      if (isMod && e.key === ',') {
        e.preventDefault();
        setShowSettings(prev => !prev);
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
  }, [layout, dispatch, showSettings, showConfigDiff, showKeywordRules]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
    }}>
      <SplitPaneTree />
      <StatusBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenConfigDiff={() => setShowConfigDiff(true)}
        onOpenKeywordRules={() => setShowKeywordRules(true)}
        onToggleStickyNotes={() => setShowStickyNotes(prev => !prev)}
        onToggleSubnetCalc={() => setShowSubnetCalc(prev => !prev)}
        stickyNotesOpen={showStickyNotes}
        subnetCalcOpen={showSubnetCalc}
      />

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showConfigDiff && <ConfigDiff onClose={() => setShowConfigDiff(false)} />}
      {showKeywordRules && (
        <KeywordRuleEditor
          onClose={() => setShowKeywordRules(false)}
          rules={keywordRules}
          onRulesChange={handleRulesChange}
        />
      )}

      {/* Floating widgets */}
      {showStickyNotes && <StickyNotes onClose={() => setShowStickyNotes(false)} />}
      {showSubnetCalc && <SubnetCalculator onClose={() => setShowSubnetCalc(false)} />}
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
