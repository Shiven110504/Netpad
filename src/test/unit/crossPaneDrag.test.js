import { describe, it, expect } from 'vitest';
import { layoutReducer, initialLayout } from '../../state/layoutReducer';
import { findPaneById, countPanes } from '../../state/tabHelpers';

describe('Cross-pane tab drag and drop (MOVE_TAB)', () => {
  function createSplitLayout() {
    // Create a layout with two panes, each having multiple tabs
    let state = initialLayout();
    state = layoutReducer(state, { type: 'ADD_TAB', paneId: state.root.id });
    state = layoutReducer(state, { type: 'ADD_TAB', paneId: state.root.id });
    state = layoutReducer(state, {
      type: 'SPLIT_PANE', paneId: state.root.id, direction: 'horizontal',
    });
    return state;
  }

  it('moves a tab from one pane to another', () => {
    const state = createSplitLayout();
    const srcPane = state.root.children[0];
    const dstPane = state.root.children[1];
    const tabToMove = srcPane.tabs[0];
    const srcTabCountBefore = srcPane.tabs.length;

    const result = layoutReducer(state, {
      type: 'MOVE_TAB',
      fromPaneId: srcPane.id,
      toPaneId: dstPane.id,
      tabId: tabToMove.id,
    });

    const resultSrc = findPaneById(result.root, srcPane.id);
    const resultDst = findPaneById(result.root, dstPane.id);

    expect(resultSrc.tabs.find(t => t.id === tabToMove.id)).toBeUndefined();
    expect(resultDst.tabs.find(t => t.id === tabToMove.id)).toBeTruthy();
    expect(resultSrc.tabs.length).toBe(srcTabCountBefore - 1);
  });

  it('sets moved tab as active in destination pane', () => {
    const state = createSplitLayout();
    const srcPane = state.root.children[0];
    const dstPane = state.root.children[1];
    const tabToMove = srcPane.tabs[0];

    const result = layoutReducer(state, {
      type: 'MOVE_TAB',
      fromPaneId: srcPane.id,
      toPaneId: dstPane.id,
      tabId: tabToMove.id,
    });

    const resultDst = findPaneById(result.root, dstPane.id);
    expect(resultDst.activeTabId).toBe(tabToMove.id);
  });

  it('creates new blank tab if last tab is moved from source pane', () => {
    // Create split with only 1 tab in source
    let state = initialLayout();
    state = layoutReducer(state, {
      type: 'SPLIT_PANE', paneId: state.root.id, direction: 'horizontal',
    });
    const srcPane = state.root.children[0];
    const dstPane = state.root.children[1];
    const onlyTab = srcPane.tabs[0];

    expect(srcPane.tabs.length).toBe(1);

    const result = layoutReducer(state, {
      type: 'MOVE_TAB',
      fromPaneId: srcPane.id,
      toPaneId: dstPane.id,
      tabId: onlyTab.id,
    });

    const resultSrc = findPaneById(result.root, srcPane.id);
    // Source pane should have a new blank tab
    expect(resultSrc.tabs.length).toBe(1);
    expect(resultSrc.tabs[0].id).not.toBe(onlyTab.id);
  });

  it('updates activeTabId in source pane after move', () => {
    const state = createSplitLayout();
    const srcPane = state.root.children[0];
    const dstPane = state.root.children[1];
    const activeTab = srcPane.tabs.find(t => t.id === srcPane.activeTabId);

    const result = layoutReducer(state, {
      type: 'MOVE_TAB',
      fromPaneId: srcPane.id,
      toPaneId: dstPane.id,
      tabId: activeTab.id,
    });

    const resultSrc = findPaneById(result.root, srcPane.id);
    // Active tab should have changed to another tab
    expect(resultSrc.activeTabId).not.toBe(activeTab.id);
    expect(resultSrc.tabs.find(t => t.id === resultSrc.activeTabId)).toBeTruthy();
  });

  it('preserves tab content and metadata during move', () => {
    const state = createSplitLayout();
    const srcPane = state.root.children[0];
    const dstPane = state.root.children[1];

    // First update the tab content
    const tabToMove = srcPane.tabs[0];
    const stateWithContent = layoutReducer(state, {
      type: 'UPDATE_TAB_CONTENT',
      paneId: srcPane.id,
      tabId: tabToMove.id,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });

    const result = layoutReducer(stateWithContent, {
      type: 'MOVE_TAB',
      fromPaneId: srcPane.id,
      toPaneId: dstPane.id,
      tabId: tabToMove.id,
    });

    const resultDst = findPaneById(result.root, dstPane.id);
    const movedTab = resultDst.tabs.find(t => t.id === tabToMove.id);
    expect(movedTab.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(movedTab.title).toBe(tabToMove.title);
  });

  it('does not change pane count during move', () => {
    const state = createSplitLayout();
    const before = countPanes(state.root);
    const srcPane = state.root.children[0];
    const dstPane = state.root.children[1];

    const result = layoutReducer(state, {
      type: 'MOVE_TAB',
      fromPaneId: srcPane.id,
      toPaneId: dstPane.id,
      tabId: srcPane.tabs[0].id,
    });

    expect(countPanes(result.root)).toBe(before);
  });
});

describe('SPLIT_PANE with multiple tabs', () => {
  it('moves active tab to new pane when source has 2+ tabs', () => {
    let state = initialLayout();
    state = layoutReducer(state, { type: 'ADD_TAB', paneId: state.root.id });
    const activeTabId = state.root.activeTabId;
    const otherTabId = state.root.tabs.find(t => t.id !== activeTabId).id;

    state = layoutReducer(state, {
      type: 'SPLIT_PANE', paneId: state.root.id, direction: 'horizontal',
    });

    const leftPane = state.root.children[0];
    const rightPane = state.root.children[1];

    // Active tab should be in the new pane (right)
    expect(rightPane.tabs.find(t => t.id === activeTabId)).toBeTruthy();
    // Other tab should remain in original pane (left)
    expect(leftPane.tabs.find(t => t.id === otherTabId)).toBeTruthy();
  });

  it('creates blank tab in new pane when source has only 1 tab', () => {
    let state = initialLayout();
    const originalTabId = state.root.tabs[0].id;

    state = layoutReducer(state, {
      type: 'SPLIT_PANE', paneId: state.root.id, direction: 'horizontal',
    });

    const leftPane = state.root.children[0];
    const rightPane = state.root.children[1];

    // Original tab should stay in left pane
    expect(leftPane.tabs.find(t => t.id === originalTabId)).toBeTruthy();
    // Right pane should have a new blank tab
    expect(rightPane.tabs.length).toBe(1);
    expect(rightPane.tabs[0].id).not.toBe(originalTabId);
  });
});
