import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, FileText, Terminal, ChevronDown } from 'lucide-react';
import Tab from './Tab';
import { useApp } from '../../state/AppContext';
import { extractPlainText } from '../../utils/extractPlainText';

export default function TabBar({ pane }) {
  const { dispatch, setCompareSlotA, setCompareSlotB, openConfigDiffRef, showConnectionDialog, setShowConnectionDialog } = useApp();
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `pane-drop-${pane.id}`,
    data: { paneId: pane.id, type: 'tab-bar' },
  });

  const handleAddTab = () => {
    dispatch({ type: 'ADD_TAB', paneId: pane.id });
  };

  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const handleNewSshTab = () => {
    setShowNewTabMenu(false);
    if (setShowConnectionDialog) {
      setShowConnectionDialog(pane.id);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!showNewTabMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowNewTabMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNewTabMenu]);

  const fillSlot = useCallback((tab, setter) => {
    const nonce = performance.now();
    setter({
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText(tab.content),
      filledAt: nonce,
    });
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      background: isOver ? 'var(--tab-hover-bg)' : 'var(--tab-bg)',
      borderBottom: '1px solid var(--tab-border)',
      height: 34,
      overflow: 'hidden',
      transition: 'background 0.15s',
    }}>
      <div
        ref={setDroppableRef}
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <SortableContext items={pane.tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
          {pane.tabs.map(tab => (
            <Tab
              key={tab.id}
              tab={tab}
              paneId={pane.id}
              isActive={tab.id === pane.activeTabId}
              onActivate={() => dispatch({ type: 'ACTIVATE_TAB', paneId: pane.id, tabId: tab.id })}
              onClose={() => {
                // Disconnect SSH session when closing tab
                if (tab.type === 'ssh' && tab.sshSessionId && window.sshAPI?.isAvailable) {
                  window.sshAPI.disconnect(tab.sshSessionId);
                }
                dispatch({ type: 'CLOSE_TAB', paneId: pane.id, tabId: tab.id });
              }}
              onRename={(title) => dispatch({ type: 'UPDATE_TAB_TITLE', paneId: pane.id, tabId: tab.id, title })}
              onSplitRight={() => dispatch({ type: 'SPLIT_PANE', paneId: pane.id, direction: 'horizontal' })}
              onSplitDown={() => dispatch({ type: 'SPLIT_PANE', paneId: pane.id, direction: 'vertical' })}
              onCompareA={() => { fillSlot(tab, setCompareSlotA); openConfigDiffRef.current?.(); }}
              onCompareB={() => { fillSlot(tab, setCompareSlotB); openConfigDiffRef.current?.(); }}
              onOpenCompare={() => openConfigDiffRef.current?.()}
              onReconnect={() => {
                // Disconnect existing session first, then request reconnect
                if (tab.sshSessionId && window.sshAPI?.isAvailable) {
                  window.sshAPI.disconnect(tab.sshSessionId);
                }
                dispatch({
                  type: 'UPDATE_SSH_STATUS',
                  paneId: pane.id,
                  tabId: tab.id,
                  status: 'disconnected',
                  sessionId: null,
                });
                dispatch({
                  type: 'REQUEST_SSH_RECONNECT',
                  paneId: pane.id,
                  tabId: tab.id,
                });
              }}
              onDisconnect={() => {
                if (tab.sshSessionId && window.sshAPI?.isAvailable) {
                  window.sshAPI.disconnect(tab.sshSessionId);
                }
              }}
              onDuplicateSession={() => {
                if (tab.sshConfig) {
                  dispatch({ type: 'ADD_SSH_TAB', paneId: pane.id, config: tab.sshConfig });
                }
              }}
            />
          ))}
        </SortableContext>
      </div>
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
        <button
          onClick={handleAddTab}
          title="New Note Tab (Ctrl+N)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tab-hover-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Plus size={14} />
        </button>
        <button
          ref={buttonRef}
          onClick={() => {
            if (!showNewTabMenu && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
            }
            setShowNewTabMenu(!showNewTabMenu);
          }}
          title="New Tab Options"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            opacity: 0.6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tab-hover-bg)'; e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.6'; }}
        >
          <ChevronDown size={10} />
        </button>

        {showNewTabMenu && (
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 9999,
              background: 'var(--bg-secondary, #2d2d2d)',
              border: '1px solid var(--tab-border, #444)',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              minWidth: 170,
              overflow: 'hidden',
              fontSize: 13,
            }}
          >
            <NewTabMenuItem
              icon={<FileText size={13} />}
              label="New Note"
              shortcut="Ctrl+N"
              onClick={() => { setShowNewTabMenu(false); handleAddTab(); }}
            />
            <NewTabMenuItem
              icon={<Terminal size={13} />}
              label="New SSH Terminal"
              shortcut="Ctrl+Shift+T"
              onClick={handleNewSshTab}
              disabled={!window.sshAPI?.isAvailable}
              tooltip={!window.sshAPI?.isAvailable ? 'Requires Electron desktop app' : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NewTabMenuItem({ icon, label, shortcut, onClick, disabled, tooltip }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tooltip}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '7px 12px',
        border: 'none',
        background: hovered && !disabled ? 'var(--accent-color, #007acc)' : 'transparent',
        color: disabled ? 'var(--text-tertiary, #666)' : (hovered ? '#fff' : 'var(--text-primary, #ccc)'),
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        gap: 8,
        whiteSpace: 'nowrap',
        justifyContent: 'space-between',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {label}
      </span>
      {shortcut && (
        <span style={{ opacity: 0.6, fontSize: 11 }}>{shortcut}</span>
      )}
    </button>
  );
}
