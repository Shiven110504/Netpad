import { describe, it, expect } from 'vitest';
import { extractPlainText } from '../../utils/extractPlainText';

describe('Compare slot fill from tab via context action', () => {
  it('fills a compare slot with tab metadata and plain text', () => {
    const tab = {
      id: 'tab-1',
      title: 'Config A',
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'interface GigabitEthernet0/0' }] },
          { type: 'paragraph', content: [{ type: 'text', text: ' ip address 10.0.0.1 255.255.255.0' }] },
        ],
      },
    };

    const slot = {
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText(tab.content),
    };

    expect(slot.tabId).toBe('tab-1');
    expect(slot.title).toBe('Config A');
    expect(slot.text).toContain('interface GigabitEthernet0/0');
    expect(slot.text).toContain('ip address 10.0.0.1');
  });

  it('handles tab with null content', () => {
    const tab = { id: 'tab-2', title: 'Empty', content: null };
    const slot = {
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText(tab.content),
    };
    expect(slot.text).toBe('');
  });

  it('handles tab with string content', () => {
    const tab = { id: 'tab-3', title: 'Raw', content: 'hostname Router1' };
    const slot = {
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText(tab.content),
    };
    expect(slot.text).toBe('hostname Router1');
  });

  it('includes filledAt nonce for stale-content detection', () => {
    const tab = { id: 'tab-1', title: 'Test', content: 'hello' };
    const before = Date.now();
    const slot = {
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText(tab.content),
      filledAt: Date.now(),
    };
    expect(slot.filledAt).toBeGreaterThanOrEqual(before);
    expect(slot.filledAt).toBeLessThanOrEqual(Date.now());
  });

  it('re-adding same tab produces different filledAt nonce', async () => {
    const tab = { id: 'tab-1', title: 'Test', content: 'v1' };
    const slot1 = {
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText(tab.content),
      filledAt: Date.now(),
    };
    // Small delay to ensure different timestamp
    await new Promise(r => setTimeout(r, 5));
    const slot2 = {
      tabId: tab.id,
      title: tab.title,
      text: extractPlainText('v2'),
      filledAt: Date.now(),
    };
    expect(slot1.tabId).toBe(slot2.tabId);
    expect(slot1.filledAt).not.toBe(slot2.filledAt);
  });
});

describe('Compare slot fill via drag/drop target', () => {
  it('simulates drag-end populating slot A from tab data', () => {
    // Simulate what AppShell.handleDragEnd does when target is compare-drop-a
    const tabData = {
      paneId: 'pane-1',
      tab: {
        id: 'tab-1',
        title: 'Source Tab',
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'line 1' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'line 2' }] },
          ],
        },
      },
    };

    const overId = 'compare-drop-a';
    let slotA = null;

    // Simulate the handler
    if (overId === 'compare-drop-a') {
      slotA = {
        tabId: tabData.tab.id,
        title: tabData.tab.title,
        text: extractPlainText(tabData.tab.content),
      };
    }

    expect(slotA).not.toBeNull();
    expect(slotA.tabId).toBe('tab-1');
    expect(slotA.title).toBe('Source Tab');
    expect(slotA.text).toBe('line 1\nline 2');
  });

  it('simulates drag-end populating slot B from tab data', () => {
    const tabData = {
      paneId: 'pane-1',
      tab: {
        id: 'tab-2',
        title: 'Another Tab',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] },
      },
    };

    const overId = 'compare-drop-b';
    let slotB = null;

    if (overId === 'compare-drop-b') {
      slotB = {
        tabId: tabData.tab.id,
        title: tabData.tab.title,
        text: extractPlainText(tabData.tab.content),
      };
    }

    expect(slotB).not.toBeNull();
    expect(slotB.text).toBe('hello');
  });
});
