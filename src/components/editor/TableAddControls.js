import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TextSelection } from '@tiptap/pm/state';

const pluginKey = new PluginKey('tableAddControls');

export const TableAddControls = Extension.create({
  name: 'tableAddControls',

  addProseMirrorPlugins() {
    const editor = this.editor;

    function handleAddRow(view, tablePos) {
      const tableNode = view.state.doc.nodeAt(tablePos);
      if (!tableNode || tableNode.type.name !== 'table') return;

      // Navigate to last row's first cell's paragraph content
      let lastRowPos = tablePos + 1;
      for (let i = 0; i < tableNode.childCount - 1; i++) {
        lastRowPos += tableNode.child(i).nodeSize;
      }
      // +1 into row, +1 into cell, +1 into paragraph = text position
      const cursorPos = lastRowPos + 3;

      editor.chain()
        .command(({ tr, dispatch }) => {
          tr.setSelection(TextSelection.create(tr.doc, cursorPos));
          if (dispatch) dispatch(tr);
          return true;
        })
        .addRowAfter()
        .run();
    }

    function handleAddCol(view, tablePos) {
      const tableNode = view.state.doc.nodeAt(tablePos);
      if (!tableNode || tableNode.type.name !== 'table') return;

      // Navigate to first row's last cell's paragraph content
      const firstRow = tableNode.firstChild;
      // tablePos + 1 = inside table (first row), +1 = inside row (first cell)
      let cellPos = tablePos + 2;
      for (let i = 0; i < firstRow.childCount - 1; i++) {
        cellPos += firstRow.child(i).nodeSize;
      }
      // +1 into cell, +1 into paragraph = text position
      const cursorPos = cellPos + 2;

      editor.chain()
        .command(({ tr, dispatch }) => {
          tr.setSelection(TextSelection.create(tr.doc, cursorPos));
          if (dispatch) dispatch(tr);
          return true;
        })
        .addColumnAfter()
        .run();
    }

    return [
      new Plugin({
        key: pluginKey,

        props: {
          decorations(state) {
            const decorations = [];

            state.doc.descendants((node, pos) => {
              if (node.type.name === 'table') {
                // Single widget after table with both add-row and add-col buttons
                decorations.push(
                  Decoration.widget(
                    pos + node.nodeSize,
                    () => {
                      const container = document.createElement('div');
                      container.className = 'table-add-controls';
                      container.contentEditable = 'false';

                      // Add Row button
                      const rowBtn = document.createElement('div');
                      rowBtn.className = 'table-add-row-btn';
                      rowBtn.setAttribute('data-table-control', 'add-row');
                      rowBtn.setAttribute('data-table-pos', String(pos));
                      rowBtn.title = 'Add row';
                      rowBtn.innerHTML =
                        '<div class="table-add-btn-line"></div>' +
                        '<div class="table-add-btn-circle">+</div>' +
                        '<div class="table-add-btn-text">Row</div>' +
                        '<div class="table-add-btn-line"></div>';

                      // Add Column button
                      const colBtn = document.createElement('div');
                      colBtn.className = 'table-add-col-btn';
                      colBtn.setAttribute('data-table-control', 'add-col');
                      colBtn.setAttribute('data-table-pos', String(pos));
                      colBtn.title = 'Add column';
                      colBtn.innerHTML =
                        '<div class="table-add-btn-line"></div>' +
                        '<div class="table-add-btn-circle">+</div>' +
                        '<div class="table-add-btn-text">Column</div>' +
                        '<div class="table-add-btn-line"></div>';

                      container.appendChild(rowBtn);
                      container.appendChild(colBtn);
                      return container;
                    },
                    { side: -1, key: `table-controls-${pos}` }
                  )
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },

          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target.closest('[data-table-control]');
              if (!target) return false;

              event.preventDefault();
              event.stopPropagation();

              const action = target.getAttribute('data-table-control');
              const tablePos = parseInt(target.getAttribute('data-table-pos'), 10);
              if (isNaN(tablePos)) return false;

              if (action === 'add-row') {
                handleAddRow(view, tablePos);
              } else if (action === 'add-col') {
                handleAddCol(view, tablePos);
              }

              return true;
            },
          },
        },
      }),
    ];
  },
});
