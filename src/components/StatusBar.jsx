import React from 'react';
import { Sun, Moon, SplitSquareHorizontal, SplitSquareVertical, PanelRightClose } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { countPanes } from '../state/tabHelpers';

export default function StatusBar() {
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
      height: 24,
      padding: '0 8px',
      background: 'var(--status-bg)',
      color: 'var(--status-text)',
      fontSize: 12,
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>NetPad</span>
        <span style={{ opacity: 0.7 }}>|</span>
        <span>{paneCount} Pane{paneCount !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Split controls */}
        <button
          onClick={handleSplitRight}
          title="Split Right (Ctrl+\)"
          style={statusBtnStyle}
          disabled={paneCount >= 4}
        >
          <SplitSquareHorizontal size={13} />
        </button>
        <button
          onClick={handleSplitDown}
          title="Split Down (Ctrl+Shift+\)"
          style={statusBtnStyle}
          disabled={paneCount >= 4}
        >
          <SplitSquareVertical size={13} />
        </button>
        {paneCount > 1 && (
          <button
            onClick={handleClosePane}
            title="Close Pane"
            style={statusBtnStyle}
          >
            <PanelRightClose size={13} />
          </button>
        )}

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          style={statusBtnStyle}
        >
          {settings.theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </div>
  );
}

const statusBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 20,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: 'var(--status-text)',
  cursor: 'pointer',
  padding: 0,
  opacity: 0.9,
};
