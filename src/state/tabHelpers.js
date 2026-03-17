import { v4 as uuidv4 } from 'uuid';

let tabCounter = 0;

export function createTab(title) {
  tabCounter++;
  return {
    id: uuidv4(),
    title: title || `Untitled ${tabCounter}`,
    content: null, // Tiptap JSON content, null = empty doc
    isMarkdown: false,
    isCiscoConfig: false,
    scrollPosition: 0,
    cursorPosition: { from: 0, to: 0 },
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
}

export function createPane(tab) {
  const t = tab || createTab();
  return {
    id: uuidv4(),
    type: 'pane',
    tabs: [t],
    activeTabId: t.id,
  };
}

export function createSplit(direction, children, sizes) {
  return {
    id: uuidv4(),
    type: 'split',
    direction, // 'horizontal' | 'vertical'
    children,
    sizes: sizes || [50, 50],
  };
}

export function countPanes(node) {
  if (!node) return 0;
  if (node.type === 'pane') return 1;
  return node.children.reduce((sum, child) => sum + countPanes(child), 0);
}

export function findPaneById(node, paneId) {
  if (!node) return null;
  if (node.type === 'pane' && node.id === paneId) return node;
  if (node.type === 'split') {
    for (const child of node.children) {
      const found = findPaneById(child, paneId);
      if (found) return found;
    }
  }
  return null;
}

export function resetTabCounter(count) {
  tabCounter = count || 0;
}

export function getTabCounter() {
  return tabCounter;
}
