import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
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
import { useApp } from '../../state/AppContext';

// Custom TextStyle extension to support fontSize
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

export default function TiptapEditor({ tab, paneId, onUpdate, onFocus }) {
  const { settings } = useApp();
  const isInitialMount = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: 'Start typing, or paste a Cisco config...',
      }),
      CharacterCount,
      CustomTextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
    ],
    content: tab.content || '',
    editorProps: {
      attributes: {
        class: `tiptap-editor ${settings.showLineNumbers ? 'show-line-numbers' : ''}`,
        spellcheck: 'false',
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) return false;
              const reader = new FileReader();
              reader.onload = () => {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: reader.result });
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handleClick: (view, pos, event) => {
        // Ctrl+click to open links
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
      if (onUpdate) {
        onUpdate(editor.getJSON());
      }
    },
    onFocus: () => {
      if (onFocus) onFocus();
    },
  });

  // Sync content when tab changes
  useEffect(() => {
    if (editor && !isInitialMount.current) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(tab.content || '');
      if (currentContent !== newContent) {
        editor.commands.setContent(tab.content || '', false);
      }
    }
    isInitialMount.current = false;
  }, [tab.id]); // Only re-sync when tab ID changes

  // Update line number class when setting changes
  useEffect(() => {
    if (editor) {
      const el = editor.view.dom;
      if (settings.showLineNumbers) {
        el.classList.add('show-line-numbers');
      } else {
        el.classList.remove('show-line-numbers');
      }
    }
  }, [editor, settings.showLineNumbers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <EditorContent
        editor={editor}
        style={{ flex: 1, overflow: 'hidden' }}
      />
    </div>
  );
}

// Export a hook to get the editor instance from the component
export { TiptapEditor };
