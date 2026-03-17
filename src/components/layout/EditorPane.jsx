import React, { useRef, useState, useEffect } from 'react';
import TabBar from './TabBar';
import FindReplace from '../editor/FindReplace';
import MarkdownPreview from '../markdown/MarkdownPreview';
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
import { CiscoHighlight } from '../cisco/CiscoHighlightPlugin';
import { KeywordHighlight, keywordHighlightKey } from '../highlighting/KeywordHighlightPlugin';
import { detectCiscoConfig } from '../cisco/CiscoDetector';

// Custom TextStyle with fontSize
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

  // Close on Escape
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

export default function EditorPane({ pane }) {
  const { dispatch, layout, settings, registerEditor, unregisterEditor, keywordRules } = useApp();
  const activeTab = pane.tabs.find(t => t.id === pane.activeTabId) || pane.tabs[0];
  const contentRef = useRef(activeTab?.content);
  const isActive = layout.activePaneId === pane.id;
  const [findMode, setFindMode] = useState(null);
  const [markdownText, setMarkdownText] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const ciscoDetectTimer = useRef(null);
  const keywordRulesRef = useRef(keywordRules);
  keywordRulesRef.current = keywordRules;

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
      Placeholder.configure({ placeholder: 'Start typing, or paste a Cisco config...' }),
      CharacterCount,
      CustomTextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      CiscoHighlight.configure({ enabled: activeTab?.isCiscoConfig || false }),
      KeywordHighlight.configure({ rules: keywordRulesRef.current }),
    ],
    content: activeTab?.content || '',
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
        tabId: activeTab.id,
        content: json,
      });

      // Update markdown preview text
      if (activeTab?.isMarkdown) {
        setMarkdownText(editor.getText());
      }

      // Debounced Cisco config detection
      if (ciscoDetectTimer.current) clearTimeout(ciscoDetectTimer.current);
      ciscoDetectTimer.current = setTimeout(() => {
        const text = editor.getText();
        const result = detectCiscoConfig(text);
        if (result.isConfig !== activeTab?.isCiscoConfig) {
          dispatch({
            type: 'SET_TAB_CISCO',
            paneId: pane.id,
            tabId: activeTab.id,
            isCiscoConfig: result.isConfig,
          });
        }
      }, 2000);
    },
    onFocus: () => {
      dispatch({ type: 'SET_ACTIVE_PANE', paneId: pane.id });
    },
  }, [activeTab?.id]);

  useEffect(() => {
    if (editor) {
      registerEditor(pane.id, editor);
    }
    return () => unregisterEditor(pane.id);
  }, [editor, pane.id, registerEditor, unregisterEditor]);

  // Sync line numbers setting
  useEffect(() => {
    if (editor) {
      const el = editor.view?.dom;
      if (el) {
        el.classList.toggle('show-line-numbers', settings.showLineNumbers);
      }
    }
  }, [editor, settings.showLineNumbers]);

  // Update markdown text when tab switches
  useEffect(() => {
    if (editor && activeTab?.isMarkdown) {
      setMarkdownText(editor.getText());
    }
  }, [editor, activeTab?.isMarkdown]);

  // Live-update keyword highlight decorations when rules change
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

  // Keyboard shortcuts for this pane
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
      if (isMod && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        dispatch({
          type: 'SET_TAB_MARKDOWN',
          paneId: pane.id,
          tabId: activeTab.id,
          isMarkdown: !activeTab?.isMarkdown,
        });
      }
      // Ctrl+K / Cmd+K — Insert / edit hyperlink
      if (isMod && e.key === 'k') {
        e.preventDefault();
        setShowLinkDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, pane.id, activeTab, dispatch]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
    }}>
      <TabBar pane={pane} />

      {/* Content area: inline markdown render or editor */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {findMode && (
          <FindReplace editor={editor} mode={findMode} onClose={() => setFindMode(null)} />
        )}
        {/* Always keep editor in DOM but hide it when markdown mode is on */}
        <div style={{ display: activeTab?.isMarkdown ? 'none' : 'block', height: '100%' }}>
          <EditorContent editor={editor} style={{ height: '100%' }} />
        </div>
        {/* Show markdown preview inline when markdown mode is on */}
        {activeTab?.isMarkdown && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <MarkdownPreview content={markdownText} />
          </div>
        )}
        {showLinkDialog && (
          <LinkDialog editor={editor} onClose={() => setShowLinkDialog(false)} />
        )}
      </div>
    </div>
  );
}
