import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

export default function Tab({ tab, isActive, onActivate, onClose, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tab.title);
  const inputRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditTitle(tab.title);
    setIsEditing(true);
  };

  const handleRenameSubmit = () => {
    if (editTitle.trim()) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px 0 12px',
        height: 32,
        background: isActive ? 'var(--tab-active-bg)' : 'var(--tab-bg)',
        color: isActive ? 'var(--tab-active-text)' : 'var(--tab-text)',
        borderRight: '1px solid var(--tab-border)',
        cursor: 'pointer',
        fontSize: 12,
        gap: 4,
        minWidth: 0,
        maxWidth: 180,
        userSelect: 'none',
        borderBottom: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
      }}
      onClick={onActivate}
      onDoubleClick={handleDoubleClick}
      {...attributes}
      {...listeners}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setIsEditing(false);
            e.stopPropagation();
          }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            height: 20,
            fontSize: 12,
            border: '1px solid var(--accent-color)',
            borderRadius: 2,
            padding: '0 4px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      ) : (
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {tab.title}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          border: 'none',
          borderRadius: 3,
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
        }}
        title="Close tab"
        onMouseEnter={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.color = 'var(--danger)'; }}
        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-secondary)'; }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
