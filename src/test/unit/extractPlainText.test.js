import { describe, it, expect } from 'vitest';
import { extractPlainText } from '../../utils/extractPlainText';

describe('extractPlainText', () => {
  it('returns empty string for null/undefined', () => {
    expect(extractPlainText(null)).toBe('');
    expect(extractPlainText(undefined)).toBe('');
    expect(extractPlainText('')).toBe('');
  });

  it('returns string content as-is', () => {
    expect(extractPlainText('hello world')).toBe('hello world');
  });

  it('extracts text from Tiptap JSON doc with paragraphs', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
      ],
    };
    expect(extractPlainText(doc)).toBe('Hello\nWorld');
  });

  it('handles empty doc', () => {
    expect(extractPlainText({ type: 'doc', content: [] })).toBe('');
    expect(extractPlainText({ type: 'doc' })).toBe('');
  });

  it('handles doc with mixed inline formatting', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'bold ' },
            { type: 'text', text: 'and italic' },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('bold and italic');
  });

  it('handles bullet lists', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item 2' }] }] },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('- item 1\n- item 2');
  });

  it('handles ordered lists', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }] },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('1. first\n2. second');
  });

  it('handles hard breaks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line 1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'line 2' },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('line 1\nline 2');
  });

  it('handles unknown object shapes gracefully', () => {
    const result = extractPlainText({ foo: 'bar' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
