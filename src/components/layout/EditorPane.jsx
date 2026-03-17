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
import { Panel, Group, Separator } from 'react-resizable-panels';

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
  const { dispatch, layout, settings, registerEditor, unregisterEditor, keywordRules } = useApp();
  const activeTab = pane.tabs.find(t => t.id === pane.activeTabId) || pane.tabs[0];
  const contentRef = useRef(activeTab?.content);
  const isActive = layout.activePaneId === pane.id;
  const [findMode, setFindMode] = useState(null);
  const [markdownText, setMarkdownText] = useState('');
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, pane.id, activeTab, dispatch]);

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
