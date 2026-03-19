import React from 'react';
import TabBar from './TabBar';
import NoteEditorView from './NoteEditorView';
import TerminalView from '../terminal/TerminalView';
import { useApp } from '../../state/AppContext';

export default function EditorPane({ pane }) {
  const { layout } = useApp();
  const activeTab = pane.tabs.find(t => t.id === pane.activeTabId) || pane.tabs[0];
  const isActive = layout.activePaneId === pane.id;
  const sshTabs = pane.tabs.filter(t => t.type === 'ssh');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
    }}>
      <TabBar pane={pane} />

      {/* Show note editor only when active tab is not SSH */}
      {activeTab && activeTab.type !== 'ssh' && (
        <NoteEditorView pane={pane} tab={activeTab} />
      )}

      {/* Keep all SSH terminal views mounted to preserve session state;
          hide inactive ones so xterm DOM is not destroyed on tab switch */}
      {sshTabs.map(tab => (
        <div
          key={tab.id}
          style={{
            display: tab.id === pane.activeTabId ? 'flex' : 'none',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <TerminalView pane={pane} tab={tab} />
        </div>
      ))}
    </div>
  );
}
