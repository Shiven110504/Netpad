import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo2, Redo2, Link as LinkIcon,
  Image as ImageIcon, Table as TableIcon, Paintbrush, Type, Palette,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
} from 'lucide-react';
import { FONT_FAMILIES, FONT_SIZES } from '../../utils/constants';

function ToolbarButton({ icon: Icon, label, isActive, onClick, disabled }) {
  return (
    <button
      className="toolbar-btn"
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        background: isActive ? 'var(--toolbar-btn-active)' : 'transparent',
        color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
        opacity: disabled ? 0.4 : 1,
        padding: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.target.style.background = 'var(--toolbar-btn-hover)'; }}
      onMouseLeave={e => { e.target.style.background = isActive ? 'var(--toolbar-btn-active)' : 'transparent'; }}
    >
      <Icon size={16} />
    </button>
  );
}

function ToolbarSeparator() {
  return (
    <div style={{
      width: 1,
      height: 20,
      background: 'var(--border-color)',
      margin: '0 4px',
    }} />
  );
}

function TableGridPicker({ onInsert, onClose }) {
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      background: 'var(--menu-bg)',
      border: '1px solid var(--menu-border)',
      borderRadius: 6,
      padding: 8,
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        {hoverRow} x {hoverCol}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 18px)', gap: 2 }}>
        {Array.from({ length: 48 }, (_, i) => {
          const r = Math.floor(i / 8) + 1;
          const c = (i % 8) + 1;
          return (
            <div
              key={i}
              onMouseEnter={() => { setHoverRow(r); setHoverCol(c); }}
              onClick={() => { onInsert(r, c); onClose(); }}
              style={{
                width: 16,
                height: 16,
                border: '1px solid var(--border-color)',
                borderRadius: 2,
                background: r <= hoverRow && c <= hoverCol ? 'var(--accent-color)' : 'var(--bg-primary)',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function EditorToolbar({ editor }) {
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef(null);

  // Format Painter state
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [copiedMarks, setCopiedMarks] = useState(null);

  if (!editor) return null;

  const handleInsertLink = () => {
    if (showLinkInput) {
      if (linkUrl) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      }
      setShowLinkInput(false);
      setLinkUrl('');
    } else {
      const existing = editor.getAttributes('link').href || '';
      setLinkUrl(existing);
      setShowLinkInput(true);
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleInsertTable = (rows, cols) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  const handleFormatPainter = () => {
    if (!editor) return;

    if (formatPainterActive) {
      setFormatPainterActive(false);
      setCopiedMarks(null);
      return;
    }

    // Copy current marks from selection or cursor position
    const { from, to } = editor.state.selection;
    const marks = {};
    editor.state.doc.nodesBetween(from, to, (node) => {
      node.marks.forEach(mark => {
        marks[mark.type.name] = mark.attrs;
      });
    });

    // Also check cursor position marks
    const $pos = editor.state.selection.$from;
    $pos.marks().forEach(mark => {
      marks[mark.type.name] = mark.attrs;
    });

    setCopiedMarks(marks);
    setFormatPainterActive(true);
  };

  // Apply format painter on selection change
  useEffect(() => {
    if (!formatPainterActive || !copiedMarks || !editor) return;

    const handleSelectionUpdate = () => {
      const { from, to, empty } = editor.state.selection;
      if (!empty && formatPainterActive) {
        // Apply marks to selection
        const chain = editor.chain().focus();

        // First clear existing marks
        chain.unsetAllMarks();

        // Apply stored marks
        if (copiedMarks.bold) chain.setBold();
        if (copiedMarks.italic) chain.setItalic();
        if (copiedMarks.underline) chain.setUnderline();
        if (copiedMarks.strike) chain.setStrike();
        if (copiedMarks.textStyle?.color) chain.setColor(copiedMarks.textStyle.color);
        if (copiedMarks.textStyle?.fontSize) chain.setMark('textStyle', { fontSize: copiedMarks.textStyle.fontSize });
        if (copiedMarks.textStyle?.fontFamily) chain.setFontFamily(copiedMarks.textStyle.fontFamily);

        chain.run();
        setFormatPainterActive(false);
        setCopiedMarks(null);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => editor.off('selectionUpdate', handleSelectionUpdate);
  }, [formatPainterActive, copiedMarks, editor]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
      background: 'var(--toolbar-bg)',
      gap: 2,
      flexWrap: 'nowrap',
      minHeight: 36,
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
    }}>
      {/* Undo/Redo */}
      <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
      <ToolbarButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />

      <ToolbarSeparator />

      {/* Font Family */}
      <select
        value={editor.getAttributes('textStyle').fontFamily || ''}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        style={{
          height: 26,
          fontSize: 12,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: '0 4px',
          maxWidth: 120,
        }}
        title="Font Family"
      >
        {FONT_FAMILIES.map(f => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font Size */}
      <select
        value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '14'}
        onChange={(e) => {
          editor.chain().focus().setMark('textStyle', { fontSize: e.target.value + 'px' }).run();
        }}
        style={{
          height: 26,
          width: 50,
          fontSize: 12,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: '0 4px',
        }}
        title="Font Size"
      >
        {FONT_SIZES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <ToolbarSeparator />

      {/* Text Formatting */}
      <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon={Underline} label="Underline (Ctrl+U)" isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarButton icon={Strikethrough} label="Strikethrough" isActive={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarButton icon={Code} label="Inline Code" isActive={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} />

      {/* Format Painter */}
      <ToolbarButton
        icon={Paintbrush}
        label="Format Painter"
        isActive={formatPainterActive}
        onClick={handleFormatPainter}
      />

      <ToolbarSeparator />

      {/* Text Color */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <label title="Text Color" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4 }}>
          <Palette size={16} style={{ color: editor.getAttributes('textStyle').color || 'var(--text-primary)' }} />
          <input
            type="color"
            value={editor.getAttributes('textStyle').color || '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
          />
        </label>
      </div>

      {/* Highlight */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <label title="Highlight Color" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4 }}>
          <Highlighter size={16} style={{ color: 'var(--text-primary)' }} />
          <input
            type="color"
            value="#ffff00"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
          />
        </label>
      </div>

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarButton icon={Heading1} label="Heading 1" isActive={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarButton icon={Heading2} label="Heading 2" isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton icon={Heading3} label="Heading 3" isActive={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />

      <ToolbarSeparator />

      {/* Lists & Quote */}
      <ToolbarButton icon={List} label="Bullet List" isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon={ListOrdered} label="Ordered List" isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton icon={Quote} label="Blockquote" isActive={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton icon={Minus} label="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />

      <ToolbarSeparator />

      {/* Link */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <ToolbarButton
          icon={LinkIcon}
          label="Insert Link (Ctrl+K)"
          isActive={editor.isActive('link')}
          onClick={handleInsertLink}
        />
        {showLinkInput && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'var(--menu-bg)',
            border: '1px solid var(--menu-border)',
            borderRadius: 6,
            padding: 8,
            zIndex: 9999,
            display: 'flex',
            gap: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <input
              ref={linkInputRef}
              type="text"
              placeholder="https://..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleInsertLink(); if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); } }}
              style={{
                width: 220,
                height: 26,
                fontSize: 12,
                padding: '0 8px',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleInsertLink}
              style={{
                height: 26,
                padding: '0 12px',
                fontSize: 12,
                background: 'var(--accent-color)',
                color: 'var(--accent-text)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      <ToolbarButton icon={ImageIcon} label="Insert Image" onClick={handleInsertImage} />

      {/* Table */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <ToolbarButton
          icon={TableIcon}
          label="Insert Table"
          onClick={() => setShowTablePicker(!showTablePicker)}
        />
        {showTablePicker && (
          <TableGridPicker
            onInsert={handleInsertTable}
            onClose={() => setShowTablePicker(false)}
          />
        )}
      </div>
    </div>
  );
}
