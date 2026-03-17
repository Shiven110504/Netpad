import React, { useState, useEffect, useRef } from 'react';
import EditorToolbar from './EditorToolbar';
import { useApp } from '../../state/AppContext';
import { findPaneById } from '../../state/tabHelpers';
import { Download } from 'lucide-react';
import { exportAsHTML, exportAsText, exportAsMarkdown } from '../../utils/exportHelpers';
import WeatherWidget from '../widgets/WeatherWidget';

export default function GlobalToolbar() {
  const { activeEditor, layout } = useApp();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  const pane = findPaneById(layout.root, layout.activePaneId);
  const activeTab = pane?.tabs.find(t => t.id === pane.activeTabId) || pane?.tabs[0];

  useEffect(() => {
    if (!showExportMenu) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowExportMenu(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showExportMenu]);

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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}>
        <WeatherWidget />
      </div>

      <div ref={exportMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
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
          <>
            <div
              onClick={() => setShowExportMenu(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
                background: 'transparent',
              }}
            />
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
          </>
        )}
      </div>
    </div>
  );
}
