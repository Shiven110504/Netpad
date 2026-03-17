import React, { useCallback, useRef } from 'react';
import TabBar from './TabBar';
import TiptapEditor from '../editor/TiptapEditor';
import EditorToolbar from '../editor/EditorToolbar';
import { useApp } from '../../state/AppContext';
import { useEditor } from '@tiptap/react';
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
import { EditorContent } from '@tiptap/react';

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
    },
    onFocus: () => {
      dispatch({ type: 'SET_ACTIVE_PANE', paneId: pane.id });
    },
  }, [activeTab?.id]); // Re-create editor when active tab changes

  // Sync line numbers setting
  React.useEffect(() => {
    if (editor) {
      const el = editor.view?.dom;
      if (el) {
        el.classList.toggle('show-line-numbers', settings.showLineNumbers);
      }
    }
  }, [editor, settings.showLineNumbers]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
        borderRadius: 0,
      }}
    >
      <TabBar pane={pane} />
      <EditorToolbar editor={editor} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <EditorContent
          editor={editor}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
