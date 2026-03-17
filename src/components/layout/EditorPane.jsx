import React, { useRef, useState, useEffect, useCallback } from 'react';
import TabBar from './TabBar';
import EditorToolbar from '../editor/EditorToolbar';
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
import { detectCiscoConfig } from '../cisco/CiscoDetector';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { FileCode, Eye, Download } from 'lucide-react';
import { exportAsHTML, exportAsText, exportAsMarkdown } from '../../utils/exportHelpers';

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

export default function EditorPane({ pane }) {
  const { dispatch, layout, settings } = useApp();
  const activeTab = pane.tabs.find(t => t.id === pane.activeTabId) || pane.tabs[0];
  const contentRef = useRef(activeTab?.content);
  const isActive = layout.activePaneId === pane.id;
  const [findMode, setFindMode] = useState(null); // null | 'find' | 'replace'
  const [markdownText, setMarkdownText] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const ciscoDetectTimer = useRef(null);

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, pane.id, activeTab, dispatch]);

  const toggleMarkdown = () => {
    dispatch({
      type: 'SET_TAB_MARKDOWN',
      paneId: pane.id,
      tabId: activeTab.id,
      isMarkdown: !activeTab?.isMarkdown,
    });
  };

  const editorContent = (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      {findMode && (
        <FindReplace editor={editor} mode={findMode} onClose={() => setFindMode(null)} />
      )}
      <EditorContent editor={editor} style={{ height: '100%' }} />
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
    }}>
      <TabBar pane={pane} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--toolbar-bg)',
        borderBottom: '1px solid var(--toolbar-border)',
      }}>
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <EditorToolbar editor={editor} />
        </div>
        {/* Markdown toggle */}
        <button
          onClick={toggleMarkdown}
          title="Toggle Markdown Preview (Ctrl+Shift+M)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            margin: '0 4px',
            border: 'none',
            borderRadius: 4,
            background: activeTab?.isMarkdown ? 'var(--accent-color)' : 'transparent',
            color: activeTab?.isMarkdown ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          <Eye size={13} />
          MD
        </button>
        {/* Export menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
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
                ['HTML', () => exportAsHTML(editor, activeTab?.title || 'document')],
                ['Plain Text', () => exportAsText(editor, activeTab?.title || 'document')],
                ['Markdown', () => exportAsMarkdown(editor, activeTab?.title || 'document')],
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
          )}
        </div>
        {/* Cisco indicator */}
        {activeTab?.isCiscoConfig && (
          <span style={{
            padding: '2px 6px',
            margin: '0 4px',
            borderRadius: 4,
            background: 'var(--success)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
          }}>
            CISCO
          </span>
        )}
      </div>

      {/* Content area: editor or editor+preview */}
      {activeTab?.isMarkdown ? (
        <Group direction="horizontal" style={{ flex: 1 }}>
          <Panel defaultSize={50} minSize={20}>
            {editorContent}
          </Panel>
          <Separator style={{ width: 4, background: 'var(--resize-handle)', cursor: 'col-resize' }} />
          <Panel defaultSize={50} minSize={20}>
            <MarkdownPreview content={markdownText} />
          </Panel>
        </Group>
      ) : (
        editorContent
      )}
    </div>
  );
}
