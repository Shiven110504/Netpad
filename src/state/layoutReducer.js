import { createTab, createPane, createSplit, countPanes, findPaneById } from './tabHelpers';
import { MAX_PANES } from '../utils/constants';

function updateNode(node, nodeId, updater) {
  if (node.id === nodeId) return updater(node);
  if (node.type === 'split') {
    return {
      ...node,
      children: node.children.map(child => updateNode(child, nodeId, updater)),
    };
  }
  return node;
}

function removePane(node, paneId) {
  if (node.type === 'pane') return node;
  if (node.type === 'split') {
    const idx = node.children.findIndex(c => c.id === paneId);
    if (idx !== -1) {
      return node.children[idx === 0 ? 1 : 0];
    }
    return {
      ...node,
      children: node.children.map(child => removePane(child, paneId)),
    };
  }
  return node;
}

function findFirstPane(node) {
  if (node.type === 'pane') return node;
  if (node.type === 'split' && node.children.length > 0) {
    return findFirstPane(node.children[0]);
  }
  return null;
}

export const initialLayout = () => {
  const pane = createPane();
  return {
    root: pane,
    activePaneId: pane.id,
  };
};

export function layoutReducer(state, action) {
  switch (action.type) {
    case 'SPLIT_PANE': {
      const { paneId, direction } = action;
      if (countPanes(state.root) >= MAX_PANES) return state;

      const currentPane = findPaneById(state.root, paneId);
      let newRoot;

      if (currentPane && currentPane.tabs.length >= 2) {
        // Move the active tab into the new pane
        const activeTab = currentPane.tabs.find(t => t.id === currentPane.activeTabId);
        const remainingTabs = currentPane.tabs.filter(t => t.id !== currentPane.activeTabId);
        const newActiveTabId = remainingTabs[remainingTabs.length - 1]?.id;

        const newPane = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          type: 'pane',
          tabs: [activeTab],
          activeTabId: activeTab.id,
        };

        // First update the source pane to remove the moved tab
        newRoot = updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs: remainingTabs,
          activeTabId: newActiveTabId,
        }));
        // Then wrap the updated source pane in a split with the new pane
        newRoot = updateNode(newRoot, paneId, (pane) => createSplit(direction, [pane, newPane]));
      } else {
        // Only 1 tab — create a blank tab in the new pane (existing behaviour)
        const newTab = createTab(state.root);
        const newPane = createPane(newTab);
        newRoot = updateNode(state.root, paneId, (pane) => createSplit(direction, [pane, newPane]));
      }

      return { ...state, root: newRoot };
    }

    case 'CLOSE_PANE': {
      const { paneId } = action;
      if (countPanes(state.root) <= 1) return state;

      const newRoot = removePane(state.root, paneId);
      const newActivePaneId = state.activePaneId === paneId
        ? findFirstPane(newRoot)?.id || state.activePaneId
        : state.activePaneId;

      return { ...state, root: newRoot, activePaneId: newActivePaneId };
    }

    case 'SET_ACTIVE_PANE': {
      return { ...state, activePaneId: action.paneId };
    }

    case 'RESIZE_SPLIT': {
      const { splitId, sizes } = action;
      return {
        ...state,
        root: updateNode(state.root, splitId, (node) => ({ ...node, sizes })),
      };
    }

    case 'ADD_TAB': {
      const { paneId, tab } = action;
      const newTab = tab || createTab(state.root);
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs: [...pane.tabs, newTab],
          activeTabId: newTab.id,
        })),
      };
    }

    case 'CLOSE_TAB': {
      const { paneId, tabId } = action;
      const pane = findPaneById(state.root, paneId);
      if (!pane) return state;

      const newTabs = pane.tabs.filter(t => t.id !== tabId);

      if (newTabs.length === 0) {
        if (countPanes(state.root) <= 1) {
          // Only pane — create a new blank tab (keep the pane alive)
          const rootWithoutTab = updateNode(state.root, paneId, (p) => ({
            ...p,
            tabs: [],
          }));
          const newTab = createTab(rootWithoutTab);
          return {
            ...state,
            root: updateNode(state.root, paneId, (p) => ({
              ...p,
              tabs: [newTab],
              activeTabId: newTab.id,
            })),
          };
        } else {
          // Other panes exist — close this pane automatically
          const newRoot = removePane(state.root, paneId);
          const newActivePaneId = state.activePaneId === paneId
            ? findFirstPane(newRoot)?.id || state.activePaneId
            : state.activePaneId;
          return { ...state, root: newRoot, activePaneId: newActivePaneId };
        }
      }

      const newActiveTabId = pane.activeTabId === tabId
        ? newTabs[Math.min(pane.tabs.findIndex(t => t.id === tabId), newTabs.length - 1)].id
        : pane.activeTabId;

      return {
        ...state,
        root: updateNode(state.root, paneId, (p) => ({
          ...p,
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })),
      };
    }

    case 'ACTIVATE_TAB': {
      const { paneId, tabId } = action;
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          activeTabId: tabId,
        })),
        activePaneId: paneId,
      };
    }

    case 'REORDER_TABS': {
      const { paneId, tabs } = action;
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs,
        })),
      };
    }

    case 'MOVE_TAB': {
      const { fromPaneId, toPaneId, tabId } = action;
      let movedTab = null;

      let newRoot = updateNode(state.root, fromPaneId, (pane) => {
        movedTab = pane.tabs.find(t => t.id === tabId);
        const newTabs = pane.tabs.filter(t => t.id !== tabId);
        if (newTabs.length === 0) {
          const rootWithoutTab = updateNode(state.root, fromPaneId, (p) => ({
            ...p,
            tabs: [],
          }));
          const newTab = createTab(rootWithoutTab);
          return { ...pane, tabs: [newTab], activeTabId: newTab.id };
        }
        const newActiveTabId = pane.activeTabId === tabId
          ? newTabs[0].id
          : pane.activeTabId;
        return { ...pane, tabs: newTabs, activeTabId: newActiveTabId };
      });

      if (movedTab) {
        newRoot = updateNode(newRoot, toPaneId, (pane) => ({
          ...pane,
          tabs: [...pane.tabs, movedTab],
          activeTabId: movedTab.id,
        }));
      }

      return { ...state, root: newRoot };
    }

    case 'UPDATE_TAB_CONTENT': {
      const { paneId, tabId, content } = action;
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs: pane.tabs.map(t =>
            t.id === tabId ? { ...t, content, modifiedAt: Date.now() } : t
          ),
        })),
      };
    }

    case 'UPDATE_TAB_TITLE': {
      const { paneId, tabId, title } = action;
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs: pane.tabs.map(t =>
            t.id === tabId ? { ...t, title } : t
          ),
        })),
      };
    }

    case 'SET_TAB_MARKDOWN': {
      const { paneId, tabId, isMarkdown } = action;
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs: pane.tabs.map(t =>
            t.id === tabId ? { ...t, isMarkdown } : t
          ),
        })),
      };
    }

    case 'SET_TAB_CISCO': {
      const { paneId, tabId, isCiscoConfig } = action;
      return {
        ...state,
        root: updateNode(state.root, paneId, (pane) => ({
          ...pane,
          tabs: pane.tabs.map(t =>
            t.id === tabId ? { ...t, isCiscoConfig } : t
          ),
        })),
      };
    }

    case 'RESTORE_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}
