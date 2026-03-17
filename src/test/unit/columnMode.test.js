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
});
