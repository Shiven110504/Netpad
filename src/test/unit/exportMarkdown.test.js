import { describe, it, expect } from 'vitest';
import { tiptapJsonToMarkdown } from '../../utils/exportHelpers';

describe('tiptapJsonToMarkdown', () => {
  it('returns empty string for null/empty doc', () => {
    expect(tiptapJsonToMarkdown(null)).toBe('');
    expect(tiptapJsonToMarkdown({})).toBe('');
    expect(tiptapJsonToMarkdown({ content: [] })).toBe('');
  });

  it('serializes a paragraph', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('Hello world');
  });

  it('serializes headings at all levels', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Subtitle' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Section' }] },
      ],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('# Title\n\n## Subtitle\n\n### Section');
  });

  it('serializes bold, italic, and strike marks', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' and ' },
          { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
          { type: 'text', text: ' and ' },
          { type: 'text', text: 'struck', marks: [{ type: 'strike' }] },
        ],
      }],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('**bold** and *italic* and ~~struck~~');
  });

  it('serializes links', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'click here', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
        ],
      }],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('[click here](https://example.com)');
  });

  it('serializes bullet lists', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
        ],
      }],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('- A\n- B');
  });

  it('serializes ordered lists', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
        ],
      }],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('1. First\n2. Second');
  });

  it('serializes nested lists', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Parent' }] },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child' }] }] },
              ],
            },
          ],
        }],
      }],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('- Parent\n  - Child');
  });

  it('serializes blockquotes with multiline content', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'blockquote',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] },
        ],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    // Every line should be prefixed with >
    for (const line of result.split('\n')) {
      expect(line.startsWith('> ')).toBe(true);
    }
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });

  it('serializes code blocks with raw text (no Markdown escaping)', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'codeBlock',
        attrs: { language: 'js' },
        content: [{ type: 'text', text: 'const x = 1;' }],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    expect(result).toBe('```js\nconst x = 1;\n```');
  });

  it('handles code blocks containing triple backticks', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'codeBlock',
        attrs: { language: '' },
        content: [{ type: 'text', text: 'some ``` code' }],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    // Should use a longer fence
    expect(result).toContain('````');
    expect(result).toContain('some ``` code');
  });

  it('serializes inline code with backtick escaping', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'a`b', marks: [{ type: 'code' }] },
        ],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    // Should use double backticks to wrap content containing single backtick
    expect(result).toContain('``');
    expect(result).toContain('a`b');
  });

  it('serializes tables with header separator', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] },
            ],
          },
        ],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    const lines = result.split('\n');
    expect(lines[0]).toBe('| Name | Value |');
    expect(lines[1]).toBe('| --- | --- |');
    expect(lines[2]).toBe('| A | 1 |');
  });

  it('escapes pipe characters in table cells', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a|b' }] }] },
          ],
        }],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    expect(result).toContain('a\\|b');
  });

  it('serializes images', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'image',
        attrs: { src: 'img.png', alt: 'photo', title: 'My Photo' },
      }],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('![photo](img.png "My Photo")');
  });

  it('serializes horizontal rules', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Above' }] },
        { type: 'horizontalRule' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Below' }] },
      ],
    };
    expect(tiptapJsonToMarkdown(doc)).toBe('Above\n\n---\n\nBelow');
  });

  it('escapes Markdown metacharacters in plain text', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Use *asterisks* and <tags>' }],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    expect(result).toContain('\\*asterisks\\*');
    expect(result).toContain('\\<tags\\>');
  });

  it('serializes hard breaks', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Line 1' },
          { type: 'hardBreak' },
          { type: 'text', text: 'Line 2' },
        ],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    expect(result).toContain('Line 1  \nLine 2');
  });

  it('serializes table cells with multiple blocks', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'tableRow',
          content: [{
            type: 'tableCell',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
            ],
          }],
        }],
      }],
    };
    const result = tiptapJsonToMarkdown(doc);
    expect(result).toContain('First<br>Second');
  });
});
