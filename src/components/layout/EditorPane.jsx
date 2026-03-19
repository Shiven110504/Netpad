import React from 'react';
import TabBar from './TabBar';
import NoteEditorView from './NoteEditorView';
import TerminalView from '../terminal/TerminalView';
import { useApp } from '../../state/AppContext';

export default function EditorPane({ pane }) {
  const { layout } = useApp();
  const activeTab = pane.tabs.find(t => t.id === pane.activeTabId) || pane.tabs[0];
  const isActive = layout.activePaneId === pane.id;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
    }}>
      <TabBar pane={pane} />

      {activeTab?.type === 'ssh' ? (
        <TerminalView pane={pane} tab={activeTab} />
      ) : (
        <NoteEditorView pane={pane} tab={activeTab} />
      )}
    </div>
  );
}
