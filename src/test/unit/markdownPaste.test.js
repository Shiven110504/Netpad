import { describe, it, expect } from 'vitest';

// Import the functions we need to test — they are module-level in EditorPane.jsx
// Since they're not exported, we'll re-implement them here for testing.
// In a production codebase, these would be extracted to a utility module.

function looksLikeMarkdown(text) {
  const mdPatterns = [
    /^#{1,6}\s/m,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /\*\*.+\*\*/,
    /\*.+\*/,
    /`[^`]+`/,
    /```[\s\S]*```/,
    /^\s*>/m,
    /\[.+\]\(.+\)/,
    /^---$/m,
    /^\|.*\|$/m,
  ];

  let matchCount = 0;
  for (const pattern of mdPatterns) {
    if (pattern.test(text)) matchCount++;
  }

  return matchCount >= 2;
}

function simpleMarkdownToHtml(md) {
  let html = md;

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images before links
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  const lines = html.split('\n');
  let result = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);

    if (ulMatch) {
      if (!inUl) { result.push('<ul>'); inUl = true; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inOl) { result.push('<ol>'); inOl = true; }
      if (inUl) { result.push('</ul>'); inUl = false; }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      if (line.trim() && !line.startsWith('<')) {
        result.push(`<p>${line}</p>`);
      } else {
        result.push(line);
      }
    }
  }
  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  return result.join('\n');
}

describe('looksLikeMarkdown', () => {
  it('detects headers + bold as markdown', () => {
    expect(looksLikeMarkdown('# Title\n\nSome **bold** text')).toBe(true);
  });

  it('detects bullet list + headers', () => {
    expect(looksLikeMarkdown('# Title\n- item 1\n- item 2')).toBe(true);
  });

  it('detects ordered list + inline code', () => {
    expect(looksLikeMarkdown('1. First step\n2. Use `code` here')).toBe(true);
  });

  it('detects code blocks + headers', () => {
    expect(looksLikeMarkdown('## API\n```js\nconsole.log("hi")\n```')).toBe(true);
  });

  it('detects blockquotes + links', () => {
    expect(looksLikeMarkdown('> A quote\n[link](http://example.com)')).toBe(true);
  });

  it('rejects plain text without markdown patterns', () => {
    expect(looksLikeMarkdown('Hello world, this is normal text.')).toBe(false);
  });

  it('rejects text with only one markdown pattern', () => {
    // Note: **bold** matches both bold and italic regexes, so use a single-pattern test
    expect(looksLikeMarkdown('Just a `code snippet` here.')).toBe(false);
  });

  it('detects tables + headers', () => {
    expect(looksLikeMarkdown('# Table\n| A | B |\n|---|---|\n| 1 | 2 |')).toBe(true);
  });

  it('detects horizontal rule + list', () => {
    expect(looksLikeMarkdown('---\n- item 1\n- item 2')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(looksLikeMarkdown('')).toBe(false);
  });
});

describe('simpleMarkdownToHtml', () => {
  it('converts headers', () => {
    expect(simpleMarkdownToHtml('# Hello')).toContain('<h1>Hello</h1>');
    expect(simpleMarkdownToHtml('## Sub')).toContain('<h2>Sub</h2>');
    expect(simpleMarkdownToHtml('### Third')).toContain('<h3>Third</h3>');
  });

  it('converts bold text', () => {
    expect(simpleMarkdownToHtml('**bold**')).toContain('<strong>bold</strong>');
    expect(simpleMarkdownToHtml('__bold__')).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    expect(simpleMarkdownToHtml('*italic*')).toContain('<em>italic</em>');
    expect(simpleMarkdownToHtml('_italic_')).toContain('<em>italic</em>');
  });

  it('converts bold+italic', () => {
    expect(simpleMarkdownToHtml('***both***')).toContain('<strong><em>both</em></strong>');
  });

  it('converts strikethrough', () => {
    expect(simpleMarkdownToHtml('~~deleted~~')).toContain('<s>deleted</s>');
  });

  it('converts inline code', () => {
    expect(simpleMarkdownToHtml('Use `npm install`')).toContain('<code>npm install</code>');
  });

  it('converts code blocks', () => {
    const md = '```js\nconsole.log("hi")\n```';
    const html = simpleMarkdownToHtml(md);
    expect(html).toContain('<pre><code>');
    expect(html).toContain('console.log("hi")');
  });

  it('converts links', () => {
    expect(simpleMarkdownToHtml('[Google](http://google.com)'))
      .toContain('<a href="http://google.com">Google</a>');
  });

  it('converts images before links', () => {
    const html = simpleMarkdownToHtml('![alt](img.png)');
    expect(html).toContain('<img src="img.png" alt="alt" />');
    expect(html).not.toContain('<a href=');
  });

  it('converts unordered lists', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const html = simpleMarkdownToHtml(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
    expect(html).toContain('<li>Item 3</li>');
    expect(html).toContain('</ul>');
  });

  it('converts ordered lists', () => {
    const md = '1. First\n2. Second\n3. Third';
    const html = simpleMarkdownToHtml(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('</ol>');
  });

  it('converts blockquotes', () => {
    expect(simpleMarkdownToHtml('> Quote here')).toContain('<blockquote><p>Quote here</p></blockquote>');
  });

  it('converts horizontal rules', () => {
    expect(simpleMarkdownToHtml('---')).toContain('<hr>');
  });

  it('wraps plain text in paragraph tags', () => {
    expect(simpleMarkdownToHtml('Just text')).toContain('<p>Just text</p>');
  });

  it('handles mixed markdown content', () => {
    const md = '# Title\n\nSome **bold** and *italic*.\n\n- item 1\n- item 2\n\n> quote';
    const html = simpleMarkdownToHtml(md);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item 1</li>');
    expect(html).toContain('<blockquote>');
  });

  it('closes unclosed lists at end of input', () => {
    const md = '- item 1\n- item 2';
    const html = simpleMarkdownToHtml(md);
    expect(html).toContain('</ul>');
  });

  it('handles list followed by regular text', () => {
    const md = '- item 1\n- item 2\nRegular text';
    const html = simpleMarkdownToHtml(md);
    expect(html).toContain('</ul>');
    expect(html).toContain('<p>Regular text</p>');
  });
});
