import { describe, it, expect } from 'vitest';
import {
  createTab,
  createTabWithTitle,
  createPane,
  createSplit,
  countPanes,
  findPaneById,
} from '../../state/tabHelpers';

describe('tabHelpers', () => {
  describe('createTab', () => {
    it('generates unique ids', () => {
      const t1 = createTab(null);
      const t2 = createTab(null);
      expect(t1.id).not.toBe(t2.id);
    });

    it('defaults isMarkdown to false', () => {
      const tab = createTab(null);
      expect(tab.isMarkdown).toBe(false);
    });

    it('defaults isCiscoConfig to true (Cisco highlighting on by default)', () => {
      const tab = createTab(null);
      expect(tab.isCiscoConfig).toBe(true);
    });

    it('titles first tab as Untitled 1 when no root', () => {
      const tab = createTab(null);
      expect(tab.title).toBe('Untitled 1');
    });

    it('numbers untitled tabs correctly based on existing tabs', () => {
      const root = { type: 'pane', tabs: [{ id: '1', title: 'Untitled 1' }] };
      const tab = createTab(root);
      expect(tab.title).toBe('Untitled 2');
    });

    it('finds lowest available number (gaps)', () => {
      const root = {
        type: 'pane',
        tabs: [
          { id: '1', title: 'Untitled 1' },
          { id: '3', title: 'Untitled 3' },
        ],
      };
      const tab = createTab(root);
      expect(tab.title).toBe('Untitled 2');
    });

    it('has content, scrollPosition, and cursorPosition fields', () => {
      const tab = createTab(null);
      expect(tab.content).toBeNull();
      expect(tab.scrollPosition).toBe(0);
      expect(tab.cursorPosition).toEqual({ from: 0, to: 0 });
    });
  });

  describe('createTabWithTitle', () => {
    it('creates a tab with the given title', () => {
      const tab = createTabWithTitle('My Custom Tab');
      expect(tab.title).toBe('My Custom Tab');
    });

    it('generates a unique id', () => {
      const t1 = createTabWithTitle('T');
      const t2 = createTabWithTitle('T');
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('createPane', () => {
    it('creates a pane with one tab', () => {
      const pane = createPane();
      expect(pane.type).toBe('pane');
      expect(pane.tabs).toHaveLength(1);
      expect(pane.activeTabId).toBe(pane.tabs[0].id);
    });

    it('accepts an existing tab', () => {
      const tab = createTab(null);
      const pane = createPane(tab);
      expect(pane.tabs[0].id).toBe(tab.id);
      expect(pane.activeTabId).toBe(tab.id);
    });

    it('generates a unique id', () => {
      const p1 = createPane();
      const p2 = createPane();
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('createSplit', () => {
    it('creates a split node with given direction', () => {
      const p1 = createPane();
      const p2 = createPane();
      const split = createSplit('horizontal', [p1, p2]);
      expect(split.type).toBe('split');
      expect(split.direction).toBe('horizontal');
      expect(split.children).toHaveLength(2);
    });

    it('defaults sizes to [50, 50]', () => {
      const p1 = createPane();
      const p2 = createPane();
      const split = createSplit('vertical', [p1, p2]);
      expect(split.sizes).toEqual([50, 50]);
    });

    it('accepts custom sizes', () => {
      const p1 = createPane();
      const p2 = createPane();
      const split = createSplit('horizontal', [p1, p2], [30, 70]);
      expect(split.sizes).toEqual([30, 70]);
    });
  });

  describe('countPanes', () => {
    it('returns 1 for a single pane', () => {
      const pane = createPane();
      expect(countPanes(pane)).toBe(1);
    });

    it('returns 2 for a split with two panes', () => {
      const p1 = createPane();
      const p2 = createPane();
      const split = createSplit('horizontal', [p1, p2]);
      expect(countPanes(split)).toBe(2);
    });

    it('counts correctly for nested splits', () => {
      const p1 = createPane();
      const p2 = createPane();
      const p3 = createPane();
      const split1 = createSplit('horizontal', [p1, p2]);
      const split2 = createSplit('vertical', [split1, p3]);
      expect(countPanes(split2)).toBe(3);
    });

    it('returns 0 for null', () => {
      expect(countPanes(null)).toBe(0);
    });
  });

  describe('findPaneById', () => {
    it('finds a root pane by id', () => {
      const pane = createPane();
      expect(findPaneById(pane, pane.id)).toEqual(pane);
    });

    it('finds a nested pane by id', () => {
      const p1 = createPane();
      const p2 = createPane();
      const split = createSplit('horizontal', [p1, p2]);
      expect(findPaneById(split, p2.id)).toEqual(p2);
    });

    it('finds a deeply nested pane', () => {
      const p1 = createPane();
      const p2 = createPane();
      const p3 = createPane();
      const split1 = createSplit('horizontal', [p1, p2]);
      const split2 = createSplit('vertical', [split1, p3]);
      expect(findPaneById(split2, p2.id)).toEqual(p2);
    });

    it('returns null for unknown id', () => {
      const pane = createPane();
      expect(findPaneById(pane, 'nonexistent')).toBeNull();
    });

    it('returns null for null node', () => {
      expect(findPaneById(null, 'any')).toBeNull();
    });
  });
});
