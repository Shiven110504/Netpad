import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const columnModeKey = new PluginKey('columnMode');

/**
 * Column Mode (rectangular/block selection) for Tiptap.
 *
 * Activation: Alt/Option + mouse drag creates a rectangular selection.
 * Keyboard: Alt+Shift+Arrow extends/shrinks the rectangle.
 * Copy: Copies column-sliced text as newline-joined lines.
 * Paste: Pastes block at cursor anchor line-by-line.
 *
 * Known limitations:
 * - Works best with monospace fonts; variable-width fonts may cause visual misalignment
 *   between column positions and character indices.
 * - Tab characters are treated as single characters for column math.
 * - Very long lines or lines with complex Unicode may have edge cases in column slicing.
 * - Scrolling during drag selection works but may be slightly imprecise at viewport edges.
 */

// Helper: get all text lines from the document with their ProseMirror positions
function getDocLines(doc) {
  const lines = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      lines.push({
        pos,
        text: node.textContent,
        nodeSize: node.nodeSize,
      });
      return false; // don't descend into text nodes
    }
  });
  return lines;
}

// Extract rectangular selection text
export function extractColumnText(doc, rect) {
  const lines = getDocLines(doc);
  const result = [];
  for (let row = rect.startRow; row <= rect.endRow && row < lines.length; row++) {
    const line = lines[row].text;
    const startCol = Math.min(rect.startCol, line.length);
    const endCol = Math.min(rect.endCol, line.length);
    result.push(line.slice(startCol, endCol));
  }
  return result;
}

// Given a view and screen coordinates, return { row, col } in document lines
function screenToRowCol(view, x, y) {
  const lines = getDocLines(view.state.doc);
  if (lines.length === 0) return { row: 0, col: 0 };

  // Find the closest position to the coordinates
  const pos = view.posAtCoords({ left: x, top: y });
  if (!pos) return { row: lines.length - 1, col: 0 };

  // Find which line this pos belongs to
  let row = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineStart = lines[i].pos + 1; // +1 for inside the textblock
    const lineEnd = lines[i].pos + lines[i].nodeSize - 1;
    if (pos.pos >= lineStart && pos.pos <= lineEnd) {
      row = i;
      break;
    }
    if (pos.pos < lineStart) {
      row = Math.max(0, i - 1);
      break;
    }
    row = i;
  }

  // Calculate column based on character offset within the textblock
  const lineStart = lines[row].pos + 1;
  const col = Math.max(0, pos.pos - lineStart);

  return { row, col };
}

function createDecorations(doc, rect) {
  if (!rect) return DecorationSet.empty;

  const lines = getDocLines(doc);
  const decorations = [];

  for (let row = rect.startRow; row <= rect.endRow && row < lines.length; row++) {
    const line = lines[row];
    const lineStart = line.pos + 1; // inside textblock
    const lineText = line.text;

    const startCol = Math.min(rect.startCol, lineText.length);
    const endCol = Math.min(rect.endCol, lineText.length);

    if (startCol < endCol) {
      decorations.push(
        Decoration.inline(lineStart + startCol, lineStart + endCol, {
          class: 'column-selection',
          style: 'background: var(--accent-color, #007acc); opacity: 0.35;',
        })
      );
    } else if (startCol === endCol && startCol <= lineText.length) {
      // Zero-width column cursor on this line
      decorations.push(
        Decoration.widget(lineStart + startCol, () => {
          const span = document.createElement('span');
          span.className = 'column-cursor';
          span.style.cssText = 'border-left: 2px solid var(--accent-color, #007acc); margin-left: -1px; display: inline;';
          return span;
        })
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

// Normalize rect so startRow <= endRow and startCol <= endCol
function normalizeRect(anchor, head) {
  return {
    startRow: Math.min(anchor.row, head.row),
    endRow: Math.max(anchor.row, head.row),
    startCol: Math.min(anchor.col, head.col),
    endCol: Math.max(anchor.col, head.col),
  };
}

export const ColumnMode = Extension.create({
  name: 'columnMode',

  addProseMirrorPlugins() {
    // Closure variable to track active drag cleanup — allows view.destroy() to
    // remove document-level mousemove/mouseup listeners if the editor unmounts mid-drag.
    let activeDragCleanup = null;

    return [
      new Plugin({
        key: columnModeKey,

        view() {
          return {
            destroy() {
              if (activeDragCleanup) {
                activeDragCleanup();
                activeDragCleanup = null;
              }
            },
          };
        },

        state: {
          init() {
            return { active: false, anchor: null, head: null, rect: null };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(columnModeKey);
            if (meta) return meta;
            // Map positions through document changes
            if (prev.active && tr.docChanged) {
              // Column selection is by row/col, not positions, so it survives edits
              return prev;
            }
            return prev;
          },
        },

        props: {
          decorations(state) {
            const pluginState = columnModeKey.getState(state);
            if (!pluginState?.active || !pluginState.rect) return DecorationSet.empty;
            return createDecorations(state.doc, pluginState.rect);
          },

          handleDOMEvents: {
            mousedown(view, event) {
              // Alt/Option + click starts column selection
              if (!event.altKey) return false;
              // Don't interfere with right-click
              if (event.button !== 0) return false;

              event.preventDefault();
              const { row, col } = screenToRowCol(view, event.clientX, event.clientY);
              const anchor = { row, col };
              const rect = normalizeRect(anchor, anchor);

              view.dispatch(view.state.tr.setMeta(columnModeKey, {
                active: true,
                anchor,
                head: anchor,
                rect,
              }));

              const handleMouseMove = (e) => {
                const head = screenToRowCol(view, e.clientX, e.clientY);
                const newRect = normalizeRect(anchor, head);
                view.dispatch(view.state.tr.setMeta(columnModeKey, {
                  active: true,
                  anchor,
                  head,
                  rect: newRect,
                }));
              };

              const removeListeners = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                activeDragCleanup = null;
              };

              const handleMouseUp = () => {
                removeListeners();
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);

              // Register cleanup so listeners are removed if view is destroyed mid-drag
              activeDragCleanup = removeListeners;

              return true;
            },

            // Clear column selection on normal click (without Alt)
            click(view, event) {
              if (event.altKey) return false;
              const pluginState = columnModeKey.getState(view.state);
              if (pluginState?.active) {
                view.dispatch(view.state.tr.setMeta(columnModeKey, {
                  active: false, anchor: null, head: null, rect: null,
                }));
              }
              return false;
            },

            // Handle copy/cut for column selection
            copy(view, event) {
              const pluginState = columnModeKey.getState(view.state);
              if (!pluginState?.active || !pluginState.rect) return false;

              event.preventDefault();
              const lines = extractColumnText(view.state.doc, pluginState.rect);
              const text = lines.join('\n');
              event.clipboardData.setData('text/plain', text);
              event.clipboardData.setData('application/x-column-mode', JSON.stringify({
                lines,
                width: pluginState.rect.endCol - pluginState.rect.startCol,
              }));
              return true;
            },

            cut(view, event) {
              const pluginState = columnModeKey.getState(view.state);
              if (!pluginState?.active || !pluginState.rect) return false;

              event.preventDefault();
              const lines = extractColumnText(view.state.doc, pluginState.rect);
              const text = lines.join('\n');
              event.clipboardData.setData('text/plain', text);
              event.clipboardData.setData('application/x-column-mode', JSON.stringify({
                lines,
                width: pluginState.rect.endCol - pluginState.rect.startCol,
              }));

              // Delete the selected columns
              const docLines = getDocLines(view.state.doc);
              const { rect } = pluginState;
              let tr = view.state.tr;

              // Delete from bottom to top to preserve positions.
              // Clamp endRow to actual document length so out-of-range selections
              // still cut the in-range portion.
              const lastRow = Math.min(rect.endRow, docLines.length - 1);
              for (let row = lastRow; row >= rect.startRow; row--) {
                const line = docLines[row];
                const lineStart = line.pos + 1;
                const startCol = Math.min(rect.startCol, line.text.length);
                const endCol = Math.min(rect.endCol, line.text.length);
                if (startCol < endCol) {
                  tr = tr.delete(lineStart + startCol, lineStart + endCol);
                }
              }

              tr = tr.setMeta(columnModeKey, { active: false, anchor: null, head: null, rect: null });
              view.dispatch(tr);
              return true;
            },

            paste(view, event) {
              const columnData = event.clipboardData.getData('application/x-column-mode');
              if (!columnData) return false;

              event.preventDefault();
              let parsed;
              try {
                parsed = JSON.parse(columnData);
              } catch {
                return false;
              }

              const { lines: pasteLines } = parsed;
              if (!pasteLines || !Array.isArray(pasteLines)) return false;

              // Insert at cursor position, line by line
              const docLines = getDocLines(view.state.doc);
              const { selection } = view.state;
              const cursorPos = selection.from;

              // Find which line and column the cursor is on
              let cursorRow = 0;
              let cursorCol = 0;
              for (let i = 0; i < docLines.length; i++) {
                const lineStart = docLines[i].pos + 1;
                const lineEnd = docLines[i].pos + docLines[i].nodeSize - 1;
                if (cursorPos >= lineStart && cursorPos <= lineEnd) {
                  cursorRow = i;
                  cursorCol = cursorPos - lineStart;
                  break;
                }
              }

              let tr = view.state.tr;
              // Insert from bottom to top to preserve positions
              for (let i = pasteLines.length - 1; i >= 0; i--) {
                const targetRow = cursorRow + i;
                if (targetRow >= docLines.length) continue;

                const line = docLines[targetRow];
                const lineStart = line.pos + 1;
                const insertCol = Math.min(cursorCol, line.text.length);

                // Pad with spaces if line is shorter than insert position
                const padding = cursorCol > line.text.length
                  ? ' '.repeat(cursorCol - line.text.length)
                  : '';

                const insertText = padding + pasteLines[i];
                const insertPos = lineStart + insertCol;
                tr = tr.insertText(insertText, insertPos);
              }

              tr = tr.setMeta(columnModeKey, { active: false, anchor: null, head: null, rect: null });
              view.dispatch(tr);
              return true;
            },
          },

          handleKeyDown(view, event) {
            // Alt+Shift+Arrow for keyboard column selection
            if (event.altKey && event.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
              event.preventDefault();

              const pluginState = columnModeKey.getState(view.state);
              let anchor, head;

              if (pluginState?.active && pluginState.anchor && pluginState.head) {
                anchor = pluginState.anchor;
                head = { ...pluginState.head };
              } else {
                // Start from current cursor position
                const docLines = getDocLines(view.state.doc);
                const cursorPos = view.state.selection.from;
                let row = 0, col = 0;
                for (let i = 0; i < docLines.length; i++) {
                  const lineStart = docLines[i].pos + 1;
                  const lineEnd = docLines[i].pos + docLines[i].nodeSize - 1;
                  if (cursorPos >= lineStart && cursorPos <= lineEnd) {
                    row = i;
                    col = cursorPos - lineStart;
                    break;
                  }
                }
                anchor = { row, col };
                head = { row, col };
              }

              const docLines = getDocLines(view.state.doc);
              switch (event.key) {
                case 'ArrowUp':
                  head.row = Math.max(0, head.row - 1);
                  break;
                case 'ArrowDown':
                  head.row = Math.min(docLines.length - 1, head.row + 1);
                  break;
                case 'ArrowLeft':
                  head.col = Math.max(0, head.col - 1);
                  break;
                case 'ArrowRight':
                  head.col = head.col + 1;
                  break;
              }

              const rect = normalizeRect(anchor, head);
              view.dispatch(view.state.tr.setMeta(columnModeKey, {
                active: true,
                anchor,
                head,
                rect,
              }));

              return true;
            }

            // Escape clears column selection
            if (event.key === 'Escape') {
              const pluginState = columnModeKey.getState(view.state);
              if (pluginState?.active) {
                view.dispatch(view.state.tr.setMeta(columnModeKey, {
                  active: false, anchor: null, head: null, rect: null,
                }));
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
