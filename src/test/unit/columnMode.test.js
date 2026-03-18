import { describe, it, expect } from 'vitest';
import { extractColumnText } from '../../components/editor/ColumnModePlugin';

// Mock a minimal ProseMirror-like doc for extractColumnText
function mockDoc(textLines) {
  const content = [];
  let pos = 0;
  for (const text of textLines) {
    content.push({
      pos,
      text,
      nodeSize: text.length + 2, // +2 for open/close tokens
      isTextblock: true,
      textContent: text,
    });
    pos += text.length + 2;
  }

  return {
    descendants(callback) {
      for (const node of content) {
        callback(
          { isTextblock: true, textContent: node.text, nodeSize: node.nodeSize },
          node.pos
        );
      }
    },
  };
}

describe('extractColumnText', () => {
  it('extracts a rectangular region from middle of document', () => {
    const doc = mockDoc([
      'abcdef',
      'ghijkl',
      'mnopqr',
    ]);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 2,
      startCol: 1,
      endCol: 4,
    });
    expect(result).toEqual(['bcd', 'hij', 'nop']);
  });

  it('handles short lines by clamping columns', () => {
    const doc = mockDoc([
      'abcdef',
      'ab',
      'abcdef',
    ]);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 2,
      startCol: 2,
      endCol: 5,
    });
    expect(result).toEqual(['cde', '', 'cde']);
  });

  it('handles empty lines', () => {
    const doc = mockDoc([
      'hello',
      '',
      'world',
    ]);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 2,
      startCol: 0,
      endCol: 3,
    });
    expect(result).toEqual(['hel', '', 'wor']);
  });

  it('handles single-row selection', () => {
    const doc = mockDoc(['abcdefgh']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 0,
      startCol: 2,
      endCol: 6,
    });
    expect(result).toEqual(['cdef']);
  });

  it('handles selection beyond line length', () => {
    const doc = mockDoc(['ab', 'cd']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 1,
      startCol: 0,
      endCol: 10,
    });
    expect(result).toEqual(['ab', 'cd']);
  });

  it('handles zero-width selection (cursor column)', () => {
    const doc = mockDoc(['abc', 'def']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 1,
      startCol: 2,
      endCol: 2,
    });
    expect(result).toEqual(['', '']);
  });

  it('handles endRow beyond document length', () => {
    const doc = mockDoc(['abc', 'def']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 10,
      startCol: 0,
      endCol: 2,
    });
    expect(result).toEqual(['ab', 'de']);
  });

  it('handles startCol beyond all line lengths', () => {
    const doc = mockDoc(['ab', 'cd']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 1,
      startCol: 5,
      endCol: 8,
    });
    expect(result).toEqual(['', '']);
  });

  it('handles mixed-length lines with tabs as single chars', () => {
    const doc = mockDoc(['a\tb\tc', 'xy', 'hello world']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 2,
      startCol: 1,
      endCol: 4,
    });
    // Tab is treated as a single character at index 1
    expect(result).toEqual(['\tb\t', 'y', 'ell']);
  });

  it('handles single character lines', () => {
    const doc = mockDoc(['a', 'b', 'c']);
    const result = extractColumnText(doc, {
      startRow: 0,
      endRow: 2,
      startCol: 0,
      endCol: 1,
    });
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('column mode cut/paste helpers', () => {
  // These tests validate the clamping and padding logic used in cut and paste.

  it('cut clamping: simulates column deletion on lines of varying length', () => {
    // Simulate what the cut handler does: clamp cols to line length before deleting
    const lines = ['abcdef', 'ab', 'abcdef'];
    const rect = { startRow: 0, endRow: 2, startCol: 2, endCol: 5 };
    const results = [];
    for (let row = rect.startRow; row <= Math.min(rect.endRow, lines.length - 1); row++) {
      const line = lines[row];
      const startCol = Math.min(rect.startCol, line.length);
      const endCol = Math.min(rect.endCol, line.length);
      if (startCol < endCol) {
        results.push(line.slice(0, startCol) + line.slice(endCol));
      } else {
        results.push(line); // nothing to delete
      }
    }
    expect(results).toEqual(['abf', 'ab', 'abf']);
  });

  it('cut with endRow beyond doc length only cuts in-range rows', () => {
    const lines = ['abc', 'def'];
    const rect = { startRow: 0, endRow: 10, startCol: 1, endCol: 2 };
    const results = [];
    const lastRow = Math.min(rect.endRow, lines.length - 1);
    for (let row = lastRow; row >= rect.startRow; row--) {
      const line = lines[row];
      const startCol = Math.min(rect.startCol, line.length);
      const endCol = Math.min(rect.endCol, line.length);
      if (startCol < endCol) {
        results.push(line.slice(0, startCol) + line.slice(endCol));
      }
    }
    // Both rows should have column 1-2 removed
    expect(results).toEqual(['df', 'ac']);
  });

  it('paste padding: pads short lines with spaces when pasting at column beyond line end', () => {
    const lines = ['ab', 'cd', 'e'];
    const pasteLines = ['XX', 'YY', 'ZZ'];
    const cursorRow = 0;
    const cursorCol = 4; // beyond all line lengths

    const results = [];
    for (let i = 0; i < pasteLines.length; i++) {
      const targetRow = cursorRow + i;
      if (targetRow >= lines.length) continue;

      const line = lines[targetRow];
      const insertCol = Math.min(cursorCol, line.length);
      const padding = cursorCol > line.length ? ' '.repeat(cursorCol - line.length) : '';
      const insertText = padding + pasteLines[i];
      // Simulate insert at insertCol
      const newLine = line.slice(0, insertCol) + insertText + line.slice(insertCol);
      results.push(newLine);
    }
    expect(results).toEqual(['ab  XX', 'cd  YY', 'e   ZZ']);
  });

  it('paste does not affect rows beyond document length', () => {
    const lines = ['ab'];
    const pasteLines = ['XX', 'YY', 'ZZ'];
    const cursorRow = 0;
    const cursorCol = 0;

    const results = [];
    for (let i = 0; i < pasteLines.length; i++) {
      const targetRow = cursorRow + i;
      if (targetRow >= lines.length) continue;
      const line = lines[targetRow];
      const newLine = line.slice(0, cursorCol) + pasteLines[i] + line.slice(cursorCol);
      results.push(newLine);
    }
    // Only 1 row in doc, so only 1 paste line applied
    expect(results).toEqual(['XXab']);
  });
});
