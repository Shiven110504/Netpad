import React, { useEffect, useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import SplitPaneTree from './layout/SplitPaneTree';
import GlobalToolbar from './editor/GlobalToolbar';
import StatusBar from './StatusBar';
import SettingsModal from './settings/SettingsModal';
import ConfigDiff from './cisco/ConfigDiff';
import KeywordRuleEditor from './highlighting/KeywordRuleEditor';
import StickyNotes from './widgets/StickyNotes';
import SubnetCalculator from './widgets/SubnetCalculator';
import MacLookup from './widgets/MacLookup';
import { useApp } from '../state/AppContext';
import { findPaneById } from '../state/tabHelpers';
import { extractPlainText } from '../utils/extractPlainText';

export default function AppShell() {
  const { layout, dispatch, keywordRules, updateKeywordRules, setCompareSlotA, setCompareSlotB, openConfigDiffRef } = useApp();

  // Modal/widget visibility state
  const [showSettings, setShowSettings] = useState(false);
  const [showConfigDiff, setShowConfigDiff] = useState(false);
  const [showKeywordRules, setShowKeywordRules] = useState(false);
  const [showStickyNotes, setShowStickyNotes] = useState(false);
  const [showSubnetCalc, setShowSubnetCalc] = useState(false);
  const [showMacLookup, setShowMacLookup] = useState(false);

  // Register the open-config-diff callback so Tab context menus can use it
  useEffect(() => {
    openConfigDiffRef.current = () => setShowConfigDiff(true);
    return () => { openConfigDiffRef.current = null; };
  }, [openConfigDiffRef]);

  // Drag and drop state
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const [activeDragTab, setActiveDragTab] = useState(null);

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveDragTab(active.data.current?.tab || null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveDragTab(null);

    if (!over || !active) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData?.paneId) return;

    // Handle drops onto compare diff slots
    const overId = over.id;
    if (overId === 'compare-drop-a' || overId === 'compare-drop-b') {
      const tab = activeData.tab;
      if (tab) {
        const slot = { tabId: tab.id, title: tab.title, text: extractPlainText(tab.content), filledAt: Date.now() };
        if (overId === 'compare-drop-a') {
          setCompareSlotA(slot);
        } else {
          setCompareSlotB(slot);
        }
      }
      return;
    }

    const fromPaneId = activeData.paneId;

    // Determine target pane
    let toPaneId;
    if (overData?.type === 'tab-bar') {
      // Dropped on a tab bar area
      toPaneId = overData.paneId;
    } else if (overData?.paneId) {
      // Dropped on another tab
      toPaneId = overData.paneId;
    } else {
      return;
    }

    if (fromPaneId === toPaneId) {
      // Same pane — reorder
      const pane = findPaneById(layout.root, fromPaneId);
      if (!pane) return;

      const oldIndex = pane.tabs.findIndex(t => t.id === active.id);
      const newIndex = pane.tabs.findIndex(t => t.id === over.id);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newTabs = arrayMove(pane.tabs, oldIndex, newIndex);
      dispatch({ type: 'REORDER_TABS', paneId: fromPaneId, tabs: newTabs });
    } else {
      // Cross-pane — move tab
      dispatch({ type: 'MOVE_TAB', fromPaneId, toPaneId, tabId: active.id });
    }
  }, [layout, dispatch, setCompareSlotA, setCompareSlotB]);

  const handleDragCancel = useCallback(() => {
    setActiveDragTab(null);
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
        const pane = findPaneById(layout.root, layout.activePaneId);
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
        const pane = findPaneById(layout.root, layout.activePaneId);
        if (pane && pane.tabs.length > 1) {
          const idx = pane.tabs.findIndex(t => t.id === pane.activeTabId);
          const nextIdx = (idx + 1) % pane.tabs.length;
          dispatch({ type: 'ACTIVATE_TAB', paneId: pane.id, tabId: pane.tabs[nextIdx].id });
        }
      }

      // Ctrl+Shift+Tab — Previous tab
      if (isMod && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const pane = findPaneById(layout.root, layout.activePaneId);
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
      <GlobalToolbar />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SplitPaneTree />
        <DragOverlay>
          {activeDragTab ? (
            <div style={{
              padding: '4px 12px',
              background: 'var(--tab-active-bg)',
              color: 'var(--tab-active-text)',
              border: '1px solid var(--accent-color)',
              borderRadius: 4,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}>
              {activeDragTab.title}
            </div>
          ) : null}
        </DragOverlay>

        {/* ConfigDiff rendered inside DndContext so its droppables work */}
        {showConfigDiff && <ConfigDiff onClose={() => setShowConfigDiff(false)} />}
      </DndContext>
      <StatusBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenConfigDiff={() => setShowConfigDiff(true)}
        onOpenKeywordRules={() => setShowKeywordRules(true)}
        onToggleStickyNotes={() => setShowStickyNotes(prev => !prev)}
        onToggleSubnetCalc={() => setShowSubnetCalc(prev => !prev)}
        onToggleMacLookup={() => setShowMacLookup(prev => !prev)}
        stickyNotesOpen={showStickyNotes}
        subnetCalcOpen={showSubnetCalc}
        macLookupOpen={showMacLookup}
      />

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showKeywordRules && (
        <KeywordRuleEditor
          onClose={() => setShowKeywordRules(false)}
          rules={keywordRules}
          onRulesChange={updateKeywordRules}
        />
      )}

      {/* Floating widgets */}
      {showStickyNotes && <StickyNotes onClose={() => setShowStickyNotes(false)} />}
      {showSubnetCalc && <SubnetCalculator onClose={() => setShowSubnetCalc(false)} />}
      {showMacLookup && <MacLookup onClose={() => setShowMacLookup(false)} />}
    </div>
  );
}
