import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, GripVertical, ChevronDown, ChevronRight, StickyNote } from 'lucide-react';
import { loadTodos, saveTodos } from '../../state/persistence';

export default function StickyNotes({ onClose }) {
  const [todos, setTodos] = useState(() => loadTodos());
  const [newItem, setNewItem] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const inputRef = useRef(null);

  useEffect(() => { saveTodos(todos); }, [todos]);

  const addTodo = () => {
    if (!newItem.trim()) return;
    setTodos(prev => [...prev, { id: Date.now(), text: newItem.trim(), done: false }]);
    setNewItem('');
    inputRef.current?.focus();
  };

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      setTodos(prev => prev.map(t => t.id === editingId ? { ...t, text: editText.trim() } : t));
    }
    setEditingId(null);
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('input, button, label')) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  const doneCount = todos.filter(t => t.done).length;

  return (
    <div style={{
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: 280,
      background: 'var(--widget-bg)',
      border: '1px solid var(--widget-border)',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      zIndex: 999,
      color: 'var(--widget-text)',
      fontSize: 13,
      userSelect: 'none',
    }}>
      {/* Title bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          cursor: 'grab',
          borderBottom: collapsed ? 'none' : '1px solid var(--widget-border)',
          gap: 6,
        }}
      >
        <StickyNote size={14} />
        <span style={{ flex: 1, fontWeight: 600 }}>
          To-Do {todos.length > 0 && `(${doneCount}/${todos.length})`}
        </span>
        <button onClick={() => setCollapsed(!collapsed)} style={widgetBtnStyle}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <button onClick={onClose} style={widgetBtnStyle}><X size={14} /></button>
      </div>

      {!collapsed && (
        <div style={{ padding: 8, maxHeight: 300, overflowY: 'auto' }}>
          {/* Add new */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <input
              ref={inputRef}
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTodo(); }}
              placeholder="Add a task..."
              style={{
                flex: 1,
                height: 26,
                padding: '0 8px',
                fontSize: 12,
                border: '1px solid var(--widget-border)',
                borderRadius: 4,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button onClick={addTodo} style={{ ...widgetBtnStyle, background: 'var(--accent-color)', color: '#fff', borderRadius: 4, width: 26, height: 26 }}>
              <Plus size={14} />
            </button>
          </div>

          {/* Todo list */}
          {todos.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '12px 0', fontSize: 12 }}>
              No tasks yet
            </div>
          )}
          {todos.map(todo => (
            <div key={todo.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 0',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              />
              {editingId === todo.id ? (
                <input
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  style={{
                    flex: 1,
                    height: 22,
                    padding: '0 4px',
                    fontSize: 12,
                    border: '1px solid var(--accent-color)',
                    borderRadius: 2,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              ) : (
                <span
                  onClick={() => startEdit(todo)}
                  style={{
                    flex: 1,
                    cursor: 'text',
                    textDecoration: todo.done ? 'line-through' : 'none',
                    opacity: todo.done ? 0.5 : 1,
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {todo.text}
                </span>
              )}
              <button onClick={() => deleteTodo(todo.id)} style={{ ...widgetBtnStyle, opacity: 0.5 }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const widgetBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  padding: 0,
};
