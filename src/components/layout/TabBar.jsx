import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import Tab from './Tab';
import { useApp } from '../../state/AppContext';

export default function TabBar({ pane }) {
  const { dispatch } = useApp();

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `pane-drop-${pane.id}`,
    data: { paneId: pane.id, type: 'tab-bar' },
  });

  const handleAddTab = () => {
    dispatch({ type: 'ADD_TAB', paneId: pane.id });
  };

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
              onClose={() => dispatch({ type: 'CLOSE_TAB', paneId: pane.id, tabId: tab.id })}
              onRename={(title) => dispatch({ type: 'UPDATE_TAB_TITLE', paneId: pane.id, tabId: tab.id, title })}
              onSplitRight={() => dispatch({ type: 'SPLIT_PANE', paneId: pane.id, direction: 'horizontal' })}
              onSplitDown={() => dispatch({ type: 'SPLIT_PANE', paneId: pane.id, direction: 'vertical' })}
            />
          ))}
        </SortableContext>
      </div>
      <button
        onClick={handleAddTab}
        title="New Tab (Ctrl+N)"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.target.style.background = 'var(--tab-hover-bg)'; }}
        onMouseLeave={e => { e.target.style.background = 'transparent'; }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
