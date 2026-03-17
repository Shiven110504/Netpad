import React, { useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import Tab from './Tab';
import { useApp } from '../../state/AppContext';

export default function TabBar({ pane }) {
  const { dispatch } = useApp();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pane.tabs.findIndex(t => t.id === active.id);
    const newIndex = pane.tabs.findIndex(t => t.id === over.id);
    const newTabs = arrayMove(pane.tabs, oldIndex, newIndex);
    dispatch({ type: 'REORDER_TABS', paneId: pane.id, tabs: newTabs });
  }, [pane, dispatch]);

  const handleAddTab = () => {
    dispatch({ type: 'ADD_TAB', paneId: pane.id });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--tab-bg)',
      borderBottom: '1px solid var(--tab-border)',
      height: 34,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'auto',
        scrollbarWidth: 'none',
      }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pane.tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
            {pane.tabs.map(tab => (
              <Tab
                key={tab.id}
                tab={tab}
                isActive={tab.id === pane.activeTabId}
                onActivate={() => dispatch({ type: 'ACTIVATE_TAB', paneId: pane.id, tabId: tab.id })}
                onClose={() => dispatch({ type: 'CLOSE_TAB', paneId: pane.id, tabId: tab.id })}
                onRename={(title) => dispatch({ type: 'UPDATE_TAB_TITLE', paneId: pane.id, tabId: tab.id, title })}
                onSplitRight={() => dispatch({ type: 'SPLIT_PANE', paneId: pane.id, direction: 'horizontal' })}
                onSplitDown={() => dispatch({ type: 'SPLIT_PANE', paneId: pane.id, direction: 'vertical' })}
              />
            ))}
          </SortableContext>
        </DndContext>
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
