export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsHTML(editor, title = 'document') {
  if (!editor) return;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e1e1e; }
h1 { font-size: 1.75em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.15em; }
code { background: #f3f3f3; border-radius: 3px; padding: 0.15em 0.4em; font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace; }
pre { background: #f3f3f3; border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #0078d4; padding-left: 1em; color: #616161; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #d4d4d4; padding: 6px 10px; }
th { background: #f3f3f3; font-weight: 600; }
img { max-width: 100%; }
a { color: #0078d4; }
</style>
</head>
<body>
${editor.getHTML()}
</body>
</html>`;
  downloadFile(html, `${title}.html`, 'text/html');
}

export function exportAsText(editor, title = 'document') {
  if (!editor) return;
  downloadFile(editor.getText(), `${title}.txt`, 'text/plain');
}

export function exportAsMarkdown(editor, title = 'document') {
  if (!editor) return;
  const md = tiptapJsonToMarkdown(editor.getJSON());
  downloadFile(md, `${title}.md`, 'text/markdown');
}

// Serialize TipTap JSON doc to Markdown
// Exported for testing
export function tiptapJsonToMarkdown(doc) {
  if (!doc || !doc.content) return '';
  return doc.content.map(node => serializeNode(node)).join('\n\n');
}

// Escape Markdown metacharacters in plain text so it renders literally
// Note: pipe (|) is NOT escaped here — it's only special inside tables,
// and serializeTable handles escaping pipes in cell content separately.
function escapeMarkdown(text) {
  return text.replace(/([\\`*_{}[\]()#+\-.!<>~])/g, '\\$1');
}

function serializeNode(node) {
  switch (node.type) {
    case 'paragraph':
      return serializeInline(node.content);
    case 'heading': {
      const level = node.attrs?.level || 1;
      const prefix = '#'.repeat(level);
      return `${prefix} ${serializeInline(node.content)}`;
    }
    case 'bulletList':
      return serializeList(node, false);
    case 'orderedList':
      return serializeList(node, true);
    case 'blockquote': {
      // Serialize children, then prefix every line (including blank) with >
      const inner = (node.content || [])
        .map(child => serializeNode(child))
        .join('\n');
      return inner.split('\n').map(line => `> ${line}`).join('\n');
    }
    case 'codeBlock': {
      const lang = node.attrs?.language || '';
      // Extract raw text without Markdown escaping/formatting
      const code = extractRawText(node.content);
      // Choose a fence that doesn't collide with code content
      let fence = '```';
      while (code.includes(fence)) fence += '`';
      return `${fence}${lang}\n${code}\n${fence}`;
    }
    case 'horizontalRule':
      return '---';
    case 'table':
      return serializeTable(node);
    case 'image': {
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      const title = node.attrs?.title;
      return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
    }
    default:
      if (node.content) {
        return node.content.map(child => serializeNode(child)).join('');
      }
      return node.text ? escapeMarkdown(node.text) : '';
  }
}

// Extract raw text from content nodes (no Markdown formatting applied)
function extractRawText(content) {
  if (!content) return '';
  return content.map(node => {
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.content) return extractRawText(node.content);
    return '';
  }).join('');
}

function serializeInline(content) {
  if (!content) return '';
  return content.map(node => {
    if (node.type === 'text') {
      const marks = node.marks || [];
      const isCode = marks.some(m => m.type === 'code');
      let text = node.text || '';

      if (isCode) {
        // For inline code, choose backtick fence that doesn't collide
        let tick = '`';
        while (text.includes(tick)) tick += '`';
        // Add space padding if text starts/ends with backtick
        const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
        text = `${tick}${pad}${text}${pad}${tick}`;
      } else {
        // Escape Markdown metacharacters in plain text
        text = escapeMarkdown(text);
      }

      for (const mark of marks) {
        switch (mark.type) {
          case 'bold': text = `**${text}**`; break;
          case 'italic': text = `*${text}*`; break;
          case 'strike': text = `~~${text}~~`; break;
          case 'code': break; // already handled above
          case 'link': text = `[${text}](${mark.attrs?.href || ''})`; break;
          case 'underline': text = `<u>${text}</u>`; break;
        }
      }
      return text;
    }
    if (node.type === 'image') return serializeNode(node);
    if (node.type === 'hardBreak') return '  \n';
    return serializeNode(node);
  }).join('');
}

function serializeList(node, ordered, indent = '') {
  return (node.content || []).map((item, i) => {
    const bullet = ordered ? `${i + 1}.` : '-';
    const children = item.content || [];
    const parts = [];
    for (const child of children) {
      if (child.type === 'bulletList') {
        parts.push(serializeList(child, false, indent + '  '));
      } else if (child.type === 'orderedList') {
        parts.push(serializeList(child, true, indent + '  '));
      } else {
        parts.push(`${indent}${bullet} ${serializeInline(child.content)}`);
      }
    }
    return parts.join('\n');
  }).join('\n');
}

function serializeTable(node) {
  // Serialize all content in each cell (join multiple blocks with <br>)
  const rows = (node.content || []).map(row =>
    (row.content || []).map(cell => {
      const blocks = cell.content || [];
      return blocks
        .map(block => serializeInline(block.content))
        .join('<br>')
        .replace(/\|/g, '\\|')  // Escape pipes in cell content
        .replace(/\n/g, '<br>'); // Replace newlines with <br>
    })
  );
  if (rows.length === 0) return '';

  const header = rows[0];
  const lines = [];
  lines.push('| ' + header.join(' | ') + ' |');
  lines.push('| ' + header.map(() => '---').join(' | ') + ' |');
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].join(' | ') + ' |');
  }
  return lines.join('\n');
}
