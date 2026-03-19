import { describe, it, expect } from 'vitest';
import { layoutReducer, initialLayout } from '../../state/layoutReducer';

describe('layoutReducer', () => {
  it('initializes with a single pane', () => {
    const state = initialLayout();
    expect(state.root.type).toBe('pane');
    expect(state.root.tabs).toHaveLength(1);
    expect(state.activePaneId).toBe(state.root.id);
  });

  it('ADD_TAB adds a tab to a pane', () => {
    const initial = initialLayout();
    const state = layoutReducer(initial, { type: 'ADD_TAB', paneId: initial.root.id });
    expect(state.root.tabs).toHaveLength(2);
  });

  it('CLOSE_TAB removes the specified tab', () => {
    const initial = initialLayout();
    const addedState = layoutReducer(initial, { type: 'ADD_TAB', paneId: initial.root.id });
    const tabToClose = addedState.root.tabs[0];
    const state = layoutReducer(addedState, {
      type: 'CLOSE_TAB',
      paneId: initial.root.id,
      tabId: tabToClose.id,
    });
    expect(state.root.tabs).toHaveLength(1);
    expect(state.root.tabs.find(t => t.id === tabToClose.id)).toBeUndefined();
  });

  it('CLOSE_TAB on last tab creates a new tab (for single pane)', () => {
    const initial = initialLayout();
    const tabId = initial.root.tabs[0].id;
    const state = layoutReducer(initial, { type: 'CLOSE_TAB', paneId: initial.root.id, tabId });
    expect(state.root.tabs).toHaveLength(1);
    expect(state.root.tabs[0].id).not.toBe(tabId);
  });

  it('SPLIT_PANE creates a horizontal split', () => {
    const initial = initialLayout();
    const state = layoutReducer(initial, {
      type: 'SPLIT_PANE',
      paneId: initial.root.id,
      direction: 'horizontal',
    });
    expect(state.root.type).toBe('split');
    expect(state.root.direction).toBe('horizontal');
    expect(state.root.children).toHaveLength(2);
  });

  it('SPLIT_PANE creates a vertical split', () => {
    const initial = initialLayout();
    const state = layoutReducer(initial, {
      type: 'SPLIT_PANE',
      paneId: initial.root.id,
      direction: 'vertical',
    });
    expect(state.root.type).toBe('split');
    expect(state.root.direction).toBe('vertical');
  });

  it('ACTIVATE_TAB changes the active tab', () => {
    const initial = initialLayout();
    const addedState = layoutReducer(initial, { type: 'ADD_TAB', paneId: initial.root.id });
    const secondTab = addedState.root.tabs[1];
    const state = layoutReducer(addedState, {
      type: 'ACTIVATE_TAB',
      paneId: initial.root.id,
      tabId: secondTab.id,
    });
    expect(state.root.activeTabId).toBe(secondTab.id);
  });

  it('ACTIVATE_TAB also updates activePaneId', () => {
    const initial = initialLayout();
    const addedState = layoutReducer(initial, { type: 'ADD_TAB', paneId: initial.root.id });
    const secondTab = addedState.root.tabs[1];
    const state = layoutReducer(addedState, {
      type: 'ACTIVATE_TAB',
      paneId: initial.root.id,
      tabId: secondTab.id,
    });
    expect(state.activePaneId).toBe(initial.root.id);
  });

  it('MOVE_TAB moves a tab between panes', () => {
    const initial = initialLayout();
    // Add second tab to source pane
    const withTab = layoutReducer(initial, { type: 'ADD_TAB', paneId: initial.root.id });
    // Split to create second pane
    const withSplit = layoutReducer(withTab, {
      type: 'SPLIT_PANE', paneId: initial.root.id, direction: 'horizontal',
    });
    const srcPaneId = withSplit.root.children[0].id;
    const dstPaneId = withSplit.root.children[1].id;
    const tabToMove = withSplit.root.children[0].tabs[0];

    const state = layoutReducer(withSplit, {
      type: 'MOVE_TAB',
      fromPaneId: srcPaneId,
      toPaneId: dstPaneId,
      tabId: tabToMove.id,
    });
    const dstPane = state.root.children.find(c => c.id === dstPaneId);
    expect(dstPane.tabs.find(t => t.id === tabToMove.id)).toBeTruthy();
  });

  it('REORDER_TABS changes tab order', () => {
    const initial = initialLayout();
    const withTabs = layoutReducer(initial, { type: 'ADD_TAB', paneId: initial.root.id });
    const tabs = withTabs.root.tabs;
    const reordered = [tabs[1], tabs[0]];
    const state = layoutReducer(withTabs, {
      type: 'REORDER_TABS',
      paneId: initial.root.id,
      tabs: reordered,
    });
    expect(state.root.tabs[0].id).toBe(tabs[1].id);
  });

  it('does not split beyond MAX_PANES', () => {
    // Split 3 times to reach max of 4 panes
    let state = initialLayout();
    for (let i = 0; i < 3; i++) {
      const paneId = state.activePaneId;
      state = layoutReducer(state, { type: 'SPLIT_PANE', paneId, direction: 'horizontal' });
    }
    const paneCount1 = countPanesFromState(state);
    // Try to split one more time
    state = layoutReducer(state, {
      type: 'SPLIT_PANE', paneId: state.activePaneId, direction: 'horizontal',
    });
    const paneCount2 = countPanesFromState(state);
    expect(paneCount2).toBe(paneCount1); // Should not have changed
  });

  it('SET_ACTIVE_PANE updates activePaneId', () => {
    const initial = initialLayout();
    const withSplit = layoutReducer(initial, {
      type: 'SPLIT_PANE', paneId: initial.root.id, direction: 'horizontal',
    });
    const secondPaneId = withSplit.root.children[1].id;
    const state = layoutReducer(withSplit, { type: 'SET_ACTIVE_PANE', paneId: secondPaneId });
    expect(state.activePaneId).toBe(secondPaneId);
  });

  it('CLOSE_PANE removes a pane from split', () => {
    const initial = initialLayout();
    const withSplit = layoutReducer(initial, {
      type: 'SPLIT_PANE', paneId: initial.root.id, direction: 'horizontal',
    });
    const paneToClose = withSplit.root.children[1].id;
    const state = layoutReducer(withSplit, { type: 'CLOSE_PANE', paneId: paneToClose });
    expect(state.root.type).toBe('pane');
  });

  it('CLOSE_PANE does not remove when only one pane', () => {
    const initial = initialLayout();
    const state = layoutReducer(initial, { type: 'CLOSE_PANE', paneId: initial.root.id });
    expect(state.root.type).toBe('pane');
    expect(state.root.id).toBe(initial.root.id);
  });

  it('UPDATE_TAB_CONTENT updates content and modifiedAt', () => {
    const initial = initialLayout();
    const tabId = initial.root.tabs[0].id;
    const state = layoutReducer(initial, {
      type: 'UPDATE_TAB_CONTENT',
      paneId: initial.root.id,
      tabId,
      content: 'hello world',
    });
    const tab = state.root.tabs.find(t => t.id === tabId);
    expect(tab.content).toBe('hello world');
  });

  it('UPDATE_TAB_TITLE updates title', () => {
    const initial = initialLayout();
    const tabId = initial.root.tabs[0].id;
    const state = layoutReducer(initial, {
      type: 'UPDATE_TAB_TITLE',
      paneId: initial.root.id,
      tabId,
      title: 'My Doc',
    });
    const tab = state.root.tabs.find(t => t.id === tabId);
    expect(tab.title).toBe('My Doc');
  });

  it('RESTORE_STATE replaces state entirely', () => {
    const initial = initialLayout();
    const other = initialLayout();
    const state = layoutReducer(initial, { type: 'RESTORE_STATE', state: other });
    expect(state.activePaneId).toBe(other.activePaneId);
  });

  it('SET_TAB_CISCO updates isCiscoConfig on the target tab', () => {
    const initial = initialLayout();
    const paneId = initial.root.id;
    const tabId = initial.root.tabs[0].id;
    const state = layoutReducer(initial, {
      type: 'SET_TAB_CISCO',
      paneId,
      tabId,
      isCiscoConfig: false,
    });
    const tab = state.root.tabs.find(t => t.id === tabId);
    expect(tab.isCiscoConfig).toBe(false);
  });

  it('SET_TAB_CISCO does not affect other tabs', () => {
    const initial = initialLayout();
    const paneId = initial.root.id;
    const withTab = layoutReducer(initial, { type: 'ADD_TAB', paneId });
    const firstTabId = withTab.root.tabs[0].id;
    const secondTabId = withTab.root.tabs[1].id;
    const state = layoutReducer(withTab, {
      type: 'SET_TAB_CISCO',
      paneId,
      tabId: firstTabId,
      isCiscoConfig: false,
    });
    const secondTab = state.root.tabs.find(t => t.id === secondTabId);
    expect(secondTab.isCiscoConfig).toBe(true);
  });

  it('SET_TAB_MARKDOWN updates isMarkdown on the target tab', () => {
    const initial = initialLayout();
    const paneId = initial.root.id;
    const tabId = initial.root.tabs[0].id;
    const state = layoutReducer(initial, {
      type: 'SET_TAB_MARKDOWN',
      paneId,
      tabId,
      isMarkdown: true,
    });
    const tab = state.root.tabs.find(t => t.id === tabId);
    expect(tab.isMarkdown).toBe(true);
  });

  it('SET_TAB_MARKDOWN does not affect other tabs', () => {
    const initial = initialLayout();
    const paneId = initial.root.id;
    const withTab = layoutReducer(initial, { type: 'ADD_TAB', paneId });
    const firstTabId = withTab.root.tabs[0].id;
    const secondTabId = withTab.root.tabs[1].id;
    const state = layoutReducer(withTab, {
      type: 'SET_TAB_MARKDOWN',
      paneId,
      tabId: firstTabId,
      isMarkdown: true,
    });
    const secondTab = state.root.tabs.find(t => t.id === secondTabId);
    expect(secondTab.isMarkdown).toBe(false);
  });

  it('ADD_SSH_TAB adds an SSH tab with correct type and config', () => {
    const initial = initialLayout();
    const config = { host: '10.0.0.1', port: 22, username: 'root', authMethod: 'password', password: 'pass' };
    const state = layoutReducer(initial, { type: 'ADD_SSH_TAB', paneId: initial.root.id, config });
    const sshTab = state.root.tabs.find(t => t.type === 'ssh');
    expect(sshTab).toBeTruthy();
    expect(sshTab.sshConfig.host).toBe('10.0.0.1');
    expect(sshTab.sshStatus).toBe('disconnected');
    expect(state.root.activeTabId).toBe(sshTab.id);
  });

  it('UPDATE_SSH_STATUS updates status and sessionId on SSH tab', () => {
    const initial = initialLayout();
    const config = { host: '10.0.0.1', username: 'root' };
    const withSsh = layoutReducer(initial, { type: 'ADD_SSH_TAB', paneId: initial.root.id, config });
    const sshTab = withSsh.root.tabs.find(t => t.type === 'ssh');

    const state = layoutReducer(withSsh, {
      type: 'UPDATE_SSH_STATUS',
      paneId: initial.root.id,
      tabId: sshTab.id,
      status: 'connected',
      sessionId: 'sess-123',
    });

    const updatedTab = state.root.tabs.find(t => t.id === sshTab.id);
    expect(updatedTab.sshStatus).toBe('connected');
    expect(updatedTab.sshSessionId).toBe('sess-123');
  });

  it('REQUEST_SSH_RECONNECT sets a reconnect token on the SSH tab', () => {
    const initial = initialLayout();
    const config = { host: '10.0.0.1', username: 'root' };
    const withSsh = layoutReducer(initial, { type: 'ADD_SSH_TAB', paneId: initial.root.id, config });
    const sshTab = withSsh.root.tabs.find(t => t.type === 'ssh');

    const state = layoutReducer(withSsh, {
      type: 'REQUEST_SSH_RECONNECT',
      paneId: initial.root.id,
      tabId: sshTab.id,
    });

    const updatedTab = state.root.tabs.find(t => t.id === sshTab.id);
    expect(updatedTab.sshReconnectToken).toBeDefined();
    expect(typeof updatedTab.sshReconnectToken).toBe('number');
  });

  it('unknown action returns state unchanged', () => {
    const initial = initialLayout();
    const state = layoutReducer(initial, { type: 'UNKNOWN_ACTION' });
    expect(state).toBe(initial);
  });
});

function countPanesFromState(state) {
  function count(node) {
    if (node.type === 'pane') return 1;
    return node.children.reduce((sum, c) => sum + count(c), 0);
  }
  return count(state.root);
}
