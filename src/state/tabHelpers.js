import { v4 as uuidv4 } from 'uuid';

function collectAllTabs(node) {
  if (!node) return [];
  if (node.type === 'pane') return node.tabs || [];
  if (node.type === 'split') {
    return node.children.flatMap(child => collectAllTabs(child));
  }
  return [];
}

function nextUntitledNumber(rootNode) {
  const tabs = collectAllTabs(rootNode);
  const usedNumbers = new Set();
  for (const tab of tabs) {
    const match = tab.title?.match(/^Untitled (\d+)$/);
    if (match) usedNumbers.add(parseInt(match[1], 10));
  }
  let n = 1;
  while (usedNumbers.has(n)) n++;
  return n;
}

export function createTab(rootNode) {
  const num = nextUntitledNumber(rootNode);
  return {
    id: uuidv4(),
    title: `Untitled ${num}`,
    content: null,
    isMarkdown: false,
    isCiscoConfig: true,
    scrollPosition: 0,
    cursorPosition: { from: 0, to: 0 },
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
}

export function createTabWithTitle(title) {
  return {
    id: uuidv4(),
    title,
    content: null,
    isMarkdown: false,
    isCiscoConfig: true,
    scrollPosition: 0,
    cursorPosition: { from: 0, to: 0 },
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
}

export function createPane(tab) {
  const t = tab || createTab(null);
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
    direction,
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
