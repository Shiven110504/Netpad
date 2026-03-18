import React, { useRef, useState, useEffect } from 'react';
import FindReplace from '../editor/FindReplace';
import { useApp } from '../../state/AppContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';
import { CiscoHighlight, ciscoKey } from '../cisco/CiscoHighlightPlugin';
import { KeywordHighlight, keywordHighlightKey } from '../highlighting/KeywordHighlightPlugin';
import { TableAddControls } from '../editor/TableAddControls';
import { ColumnMode } from '../editor/ColumnModePlugin';

function looksLikeMarkdown(text) {
  const mdPatterns = [
    /^#{1,6}\s/m,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /\*\*.+\*\*/,
    /\*.+\*/,
    /`[^`]+`/,
    /```[\s\S]*```/,
    /^\s*>/m,
    /\[.+\]\(.+\)/,
    /^---$/m,
    /^\|.*\|$/m,
  ];

  let matchCount = 0;
  for (const pattern of mdPatterns) {
    if (pattern.test(text)) matchCount++;
  }
  return matchCount >= 2;
}

function simpleMarkdownToHtml(md) {
  let html = md;

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  const lines = html.split('\n');
  let result = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);

    if (ulMatch) {
      if (!inUl) { result.push('<ul>'); inUl = true; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inOl) { result.push('<ol>'); inOl = true; }
      if (inUl) { result.push('</ul>'); inUl = false; }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      if (line.trim() && !line.startsWith('<')) {
        result.push(`<p>${line}</p>`);
      } else {
        result.push(line);
      }
    }
  }
  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  return result.join('\n');
}

const SelectLineOnFormat = Extension.create({
  name: 'selectLineOnFormat',
  addKeyboardShortcuts() {
    const selectLineAndToggle = (toggleCommand) => {
      return ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (selection.empty) {
          const { $from } = selection;
          const start = $from.start();
          const end = $from.end();
          if (end > start) {
            editor.chain()
              .command(({ tr }) => {
                tr.setSelection(TextSelection.create(tr.doc, start, end));
                return true;
              })
              [toggleCommand]()
              .run();
            return true;
          }
        }
        return editor.chain()[toggleCommand]().run();
      };
    };
    return {
      'Mod-b': selectLineAndToggle('toggleBold'),
      'Mod-i': selectLineAndToggle('toggleItalic'),
      'Mod-u': selectLineAndToggle('toggleUnderline'),
    };
  },
});

const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

const cancelBtnStyle = {
  height: 30,
  padding: '0 14px',
  fontSize: 13,
  background: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  cursor: 'pointer',
};

const submitBtnStyle = {
  height: 30,
  padding: '0 14px',
  fontSize: 13,
  background: 'var(--accent-color)',
  color: 'var(--accent-text)',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

function LinkDialog({ editor, onClose }) {
  const [url, setUrl] = useState(() => editor?.getAttributes('link').href || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    onClose();
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        background: 'rgba(0,0,0,0.15)',
      }}
    >
      <div style={{
        background: 'var(--menu-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        minWidth: 340,
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            Insert Hyperlink
          </div>
          <input
            autoFocus
            type="url"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" style={submitBtnStyle}>
              {url ? 'Insert Link' : 'Remove Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NoteEditorView({ pane, tab }) {
  const { dispatch, layout, settings, registerEditor, unregisterEditor, keywordRules } = useApp();
  const contentRef = useRef(tab?.content);
  const isActive = layout.activePaneId === pane.id;
  const [findMode, setFindMode] = useState(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const keywordRulesRef = useRef(keywordRules);
  keywordRulesRef.current = keywordRules;

  const ciscoEnabled = settings.ciscoHighlighting !== false;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExt,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Start Typing' }),
      CharacterCount,
      CustomTextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      SelectLineOnFormat,
      CiscoHighlight.configure({ enabled: ciscoEnabled }),
      KeywordHighlight.configure({ rules: keywordRulesRef.current }),
      TableAddControls,
      ColumnMode,
    ],
    content: tab?.content || '',
    editorProps: {
      attributes: {
        class: `tiptap-editor ${settings.showLineNumbers ? 'show-line-numbers' : ''}`,
        spellcheck: 'false',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) return false;
              const reader = new FileReader();
              reader.onload = () => {
                const node = view.state.schema.nodes.image.create({ src: reader.result });
                view.dispatch(view.state.tr.replaceSelectionWith(node));
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }

        const htmlContent = event.clipboardData?.getData('text/html');
        if (htmlContent) {
          return false;
        }

        const text = event.clipboardData?.getData('text/plain');
        if (text && looksLikeMarkdown(text)) {
          event.preventDefault();
          const html = simpleMarkdownToHtml(text);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const parser = ProseMirrorDOMParser.fromSchema(view.state.schema);
          const slice = parser.parseSlice(tempDiv);
          view.dispatch(view.state.tr.replaceSelection(slice));
          return true;
        }

        return false;
      },
      handleClick: (view, pos, event) => {
        if (event.ctrlKey || event.metaKey) {
          const link = event.target.closest('a');
          if (link?.href) {
            window.open(link.href, '_blank', 'noopener,noreferrer');
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      contentRef.current = json;
      dispatch({
        type: 'UPDATE_TAB_CONTENT',
        paneId: pane.id,
        tabId: tab.id,
        content: json,
      });
    },
    onFocus: () => {
      dispatch({ type: 'SET_ACTIVE_PANE', paneId: pane.id });
    },
  }, [tab?.id]);

  useEffect(() => {
    if (editor) {
      registerEditor(pane.id, editor);
    }
    return () => unregisterEditor(pane.id);
  }, [editor, pane.id, registerEditor, unregisterEditor]);

  useEffect(() => {
    if (editor) {
      const el = editor.view?.dom;
      if (el) {
        el.classList.toggle('show-line-numbers', settings.showLineNumbers);
        if (settings.fontFamily) {
          el.style.fontFamily = settings.fontFamily;
        }
        if (settings.fontSize) {
          el.style.fontSize = `${settings.fontSize}px`;
        }
        if (settings.wordWrap === false) {
          el.style.whiteSpace = 'pre';
          el.style.overflowX = 'auto';
        } else {
          el.style.whiteSpace = '';
          el.style.overflowX = '';
        }
      }
    }
  }, [editor, settings.showLineNumbers, settings.fontFamily, settings.fontSize, settings.wordWrap]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const ext = editor.extensionManager.extensions.find(e => e.name === 'ciscoHighlight');
    if (ext) {
      ext.options.enabled = ciscoEnabled;
    }
    const { tr } = editor.state;
    tr.setMeta(ciscoKey, true);
    editor.view.dispatch(tr);
  }, [editor, ciscoEnabled]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const ext = editor.extensionManager.extensions.find(e => e.name === 'keywordHighlight');
    if (ext) {
      ext.options.rules = keywordRules;
    }
    const { tr } = editor.state;
    tr.setMeta(keywordHighlightKey, true);
    editor.view.dispatch(tr);
  }, [editor, keywordRules]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        setFindMode('find');
      }
      if (isMod && e.key === 'h') {
        e.preventDefault();
        setFindMode('replace');
      }
      if (isMod && e.key === 'k') {
        e.preventDefault();
        setShowLinkDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, pane.id, tab, dispatch]);

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      {findMode && (
        <FindReplace editor={editor} mode={findMode} onClose={() => setFindMode(null)} />
      )}
      <div style={{ height: '100%' }}>
        <EditorContent editor={editor} style={{ height: '100%' }} />
      </div>
      {showLinkDialog && (
        <LinkDialog editor={editor} onClose={() => setShowLinkDialog(false)} />
      )}
    </div>
  );
}
