import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabBar from '../../components/layout/TabBar';

// Mock @dnd-kit modules — they rely on pointer events not available in jsdom
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  horizontalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

const mockDispatch = vi.fn();

vi.mock('../../state/AppContext', () => ({
  useApp: () => ({
    dispatch: mockDispatch,
    layout: { activePaneId: 'pane1' },
  }),
}));

describe('TabBar', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders all tab titles', () => {
    const pane = {
      id: 'pane1',
      tabs: [
        { id: 'tab1', title: 'Tab 1' },
        { id: 'tab2', title: 'Tab 2' },
      ],
      activeTabId: 'tab1',
    };
    render(<TabBar pane={pane} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  it('renders the add tab button with correct title', () => {
    const pane = { id: 'pane1', tabs: [{ id: 't1', title: 'Tab 1' }], activeTabId: 't1' };
    render(<TabBar pane={pane} />);
    expect(screen.getByTitle('New Note Tab (Ctrl+N)')).toBeInTheDocument();
  });

  it('clicking add tab button dispatches ADD_TAB', () => {
    const pane = { id: 'pane1', tabs: [{ id: 't1', title: 'Tab 1' }], activeTabId: 't1' };
    render(<TabBar pane={pane} />);
    const addBtn = screen.getByTitle('New Note Tab (Ctrl+N)');
    fireEvent.click(addBtn);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_TAB', paneId: 'pane1' });
  });

  it('renders close button for each tab', () => {
    const pane = {
      id: 'pane1',
      tabs: [
        { id: 'tab1', title: 'Tab 1' },
        { id: 'tab2', title: 'Tab 2' },
      ],
      activeTabId: 'tab1',
    };
    render(<TabBar pane={pane} />);
    const closeBtns = screen.getAllByTitle('Close tab');
    expect(closeBtns).toHaveLength(2);
  });

  it('clicking close dispatches CLOSE_TAB with correct tabId', () => {
    const pane = {
      id: 'pane1',
      tabs: [
        { id: 'tab1', title: 'Tab 1' },
        { id: 'tab2', title: 'Tab 2' },
      ],
      activeTabId: 'tab1',
    };
    render(<TabBar pane={pane} />);
    const closeBtns = screen.getAllByTitle('Close tab');
    fireEvent.click(closeBtns[0]);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'CLOSE_TAB',
      paneId: 'pane1',
      tabId: 'tab1',
    });
  });

  it('clicking a tab dispatches ACTIVATE_TAB', () => {
    const pane = {
      id: 'pane1',
      tabs: [
        { id: 'tab1', title: 'Tab 1' },
        { id: 'tab2', title: 'Tab 2' },
      ],
      activeTabId: 'tab1',
    };
    render(<TabBar pane={pane} />);
    // Click on the second tab text
    fireEvent.click(screen.getByText('Tab 2'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ACTIVATE_TAB',
      paneId: 'pane1',
      tabId: 'tab2',
    });
  });
});
