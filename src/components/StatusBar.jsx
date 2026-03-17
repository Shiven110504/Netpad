import React from 'react';
import {
  Sun, Moon,
  SplitSquareHorizontal, SplitSquareVertical, PanelRightClose,
  Settings, GitCompareArrows, Highlighter,
  StickyNote, Calculator,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { countPanes } from '../state/tabHelpers';
import WeatherWidget from './widgets/WeatherWidget';

export default function StatusBar({
  onOpenSettings,
  onOpenConfigDiff,
  onOpenKeywordRules,
  onToggleStickyNotes,
  onToggleSubnetCalc,
  stickyNotesOpen,
  subnetCalcOpen,
}) {
  const { layout, dispatch, settings, toggleTheme } = useApp();

  const paneCount = countPanes(layout.root);

  const handleSplitRight = () => {
    dispatch({ type: 'SPLIT_PANE', paneId: layout.activePaneId, direction: 'horizontal' });
  };

  const handleSplitDown = () => {
    dispatch({ type: 'SPLIT_PANE', paneId: layout.activePaneId, direction: 'vertical' });
  };

  const handleClosePane = () => {
    dispatch({ type: 'CLOSE_PANE', paneId: layout.activePaneId });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 26,
      padding: '0 8px',
      background: 'var(--status-bg)',
      color: 'var(--status-text)',
      fontSize: 12,
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* Left: branding + pane count + weather */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 600 }}>NetPad</span>
        <Divider />
        <span>{paneCount} Pane{paneCount !== 1 ? 's' : ''}</span>
        <Divider />
        <WeatherWidget />
      </div>

      {/* Right: tools + split + theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Tool buttons */}
        <StatusBtn
          onClick={onToggleStickyNotes}
          title="To-Do Notes"
          active={stickyNotesOpen}
        >
          <StickyNote size={13} />
        </StatusBtn>
        <StatusBtn
          onClick={onToggleSubnetCalc}
          title="IP Subnet Calculator"
          active={subnetCalcOpen}
        >
          <Calculator size={13} />
        </StatusBtn>
        <StatusBtn onClick={onOpenConfigDiff} title="Config Diff">
          <GitCompareArrows size={13} />
        </StatusBtn>
        <StatusBtn onClick={onOpenKeywordRules} title="Keyword Highlighting">
          <Highlighter size={13} />
        </StatusBtn>

        <Divider />

        {/* Split controls */}
        <StatusBtn
          onClick={handleSplitRight}
          title="Split Right (Ctrl+\)"
          disabled={paneCount >= 4}
        >
          <SplitSquareHorizontal size={13} />
        </StatusBtn>
        <StatusBtn
          onClick={handleSplitDown}
          title="Split Down (Ctrl+Shift+\)"
          disabled={paneCount >= 4}
        >
          <SplitSquareVertical size={13} />
        </StatusBtn>
        {paneCount > 1 && (
          <StatusBtn onClick={handleClosePane} title="Close Pane">
            <PanelRightClose size={13} />
          </StatusBtn>
        )}

        <Divider />

        {/* Settings */}
        <StatusBtn onClick={onOpenSettings} title="Settings (Ctrl+,)">
          <Settings size={13} />
        </StatusBtn>

        {/* Theme toggle */}
        <StatusBtn
          onClick={toggleTheme}
          title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {settings.theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </StatusBtn>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      width: 1,
      height: 14,
      background: 'rgba(255,255,255,0.3)',
      margin: '0 4px',
    }} />
  );
}

function StatusBtn({ onClick, title, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 20,
        border: 'none',
        borderRadius: 3,
        background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
        color: 'var(--status-text)',
        cursor: disabled ? 'default' : 'pointer',
        padding: 0,
        opacity: disabled ? 0.4 : 0.9,
      }}
    >
      {children}
    </button>
  );
}
