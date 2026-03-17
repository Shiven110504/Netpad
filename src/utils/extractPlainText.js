/**
 * Extract plain text from a tab's content.
 * Handles Tiptap JSON docs, plain strings, and null/unknown shapes.
 */
export function extractPlainText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;

  // Tiptap JSON document: { type: 'doc', content: [...] }
  if (typeof content === 'object' && content.type === 'doc') {
    return extractFromDoc(content);
  }

  // Unknown shape — try JSON stringification as last resort
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return '';
  }
}

function extractFromDoc(doc) {
  if (!doc.content || !Array.isArray(doc.content)) return '';
  return doc.content.map(node => extractFromNode(node)).join('\n');
}

function extractFromNode(node) {
  if (!node) return '';

  // Text leaf node
  if (node.type === 'text') {
    return node.text || '';
  }

  // Nodes with content children
  if (node.content && Array.isArray(node.content)) {
    const childText = node.content.map(child => extractFromNode(child)).join('');

    // Block-level nodes that should have newlines between them
    switch (node.type) {
      case 'listItem':
        return childText;
      case 'bulletList':
      case 'orderedList':
        return node.content.map((child, i) => {
          const text = extractFromNode(child);
          return node.type === 'orderedList' ? `${i + 1}. ${text}` : `- ${text}`;
        }).join('\n');
      case 'blockquote':
        return childText.split('\n').map(line => `> ${line}`).join('\n');
      case 'codeBlock':
        return childText;
      case 'table':
        return node.content.map(row => extractFromNode(row)).join('\n');
      case 'tableRow':
        return node.content.map(cell => extractFromNode(cell)).join('\t');
      case 'tableCell':
      case 'tableHeader':
        return childText;
      default:
        return childText;
    }
  }

  // Hard break
  if (node.type === 'hardBreak') return '\n';

  // Horizontal rule
  if (node.type === 'horizontalRule') return '---';

  // Image
  if (node.type === 'image') return `[image: ${node.attrs?.alt || node.attrs?.src || ''}]`;

  return '';
}
