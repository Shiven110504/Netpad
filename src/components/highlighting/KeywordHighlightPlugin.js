import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const keywordHighlightKey = new PluginKey('keywordHighlight');

function buildDecorations(doc, rules) {
  if (!rules || rules.length === 0) return DecorationSet.empty;

  const enabledRules = rules.filter(r => r.enabled && r.pattern);
  if (enabledRules.length === 0) return DecorationSet.empty;

  const decorations = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text;
    if (!text) return;

    // Track which character offsets within this text node are already claimed
    // by a higher-priority (earlier) rule so later rules don't override them.
    const claimed = new Uint8Array(text.length);

    for (const rule of enabledRules) {
      try {
        const flags = rule.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(rule.pattern, flags);
        let match;
        while ((match = regex.exec(text)) !== null) {
          if (match[0].length === 0) break;
          const start = match.index;
          const end = start + match[0].length;

          let overlap = false;
          for (let i = start; i < end; i++) {
            if (claimed[i]) { overlap = true; break; }
          }
          if (overlap) continue;

          for (let i = start; i < end; i++) claimed[i] = 1;

          let style = `color: ${rule.color};`;
          if (rule.backgroundColor) {
            style += ` background: ${rule.backgroundColor};`;
          }

          decorations.push(
            Decoration.inline(pos + start, pos + end, { style })
          );
        }
      } catch (e) {
        // invalid regex — skip
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const KeywordHighlight = Extension.create({
  name: 'keywordHighlight',

  addOptions() {
    return {
      rules: [],
    };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: keywordHighlightKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc, ext.options.rules);
          },
          apply(tr, old) {
            if (tr.getMeta(keywordHighlightKey) || tr.docChanged) {
              return buildDecorations(tr.doc, ext.options.rules);
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
