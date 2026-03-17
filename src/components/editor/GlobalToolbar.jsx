import React, { useState } from 'react';
import EditorToolbar from './EditorToolbar';
import { useApp } from '../../state/AppContext';
import { findPaneById } from '../../state/tabHelpers';
import { Eye, Download } from 'lucide-react';
import { exportAsHTML, exportAsText, exportAsMarkdown } from '../../utils/exportHelpers';

export default function GlobalToolbar() {
  const { activeEditor, layout, dispatch } = useApp();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const pane = findPaneById(layout.root, layout.activePaneId);
  const activeTab = pane?.tabs.find(t => t.id === pane.activeTabId) || pane?.tabs[0];

  const toggleMarkdown = () => {
    if (!pane || !activeTab) return;
    dispatch({
      type: 'SET_TAB_MARKDOWN',
      paneId: pane.id,
      tabId: activeTab.id,
      isMarkdown: !activeTab.isMarkdown,
    });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--toolbar-bg)',
      borderBottom: '1px solid var(--toolbar-border)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <EditorToolbar editor={activeEditor} />
      </div>

      <button
        onClick={toggleMarkdown}
        title="Toggle Markdown Render Mode (Ctrl+Shift+M)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          margin: '0 4px',
          border: 'none',
          borderRadius: 4,
          background: activeTab?.isMarkdown ? 'var(--accent-color)' : 'transparent',
          color: activeTab?.isMarkdown ? '#fff' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 11,
          whiteSpace: 'nowrap',
        }}
      >
        <Eye size={13} />
        MD
      </button>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          title="Export"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            margin: '0 2px',
            border: 'none',
            borderRadius: 4,
            background: showExportMenu ? 'var(--toolbar-btn-active)' : 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          <Download size={13} />
        </button>
        {showExportMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: 'var(--menu-bg)',
            border: '1px solid var(--menu-border)',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 140,
            padding: 4,
          }}>
            {[
              ['HTML', () => exportAsHTML(activeEditor, activeTab?.title || 'document')],
              ['Plain Text', () => exportAsText(activeEditor, activeTab?.title || 'document')],
              ['Markdown', () => exportAsMarkdown(activeEditor, activeTab?.title || 'document')],
            ].map(([label, action]) => (
              <button
                key={label}
                onClick={() => { action(); setShowExportMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--menu-text)',
                  cursor: 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                  borderRadius: 4,
                }}
                onMouseEnter={e => e.target.style.background = 'var(--menu-hover)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                Export as {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab?.isCiscoConfig && (
        <span style={{
          padding: '2px 6px',
          margin: '0 4px',
          borderRadius: 4,
          background: 'var(--success)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 600,
        }}>
          CISCO
        </span>
      )}
    </div>
  );
}
