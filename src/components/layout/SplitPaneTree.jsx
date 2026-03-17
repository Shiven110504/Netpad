import React from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import EditorPane from './EditorPane';
import { useApp } from '../../state/AppContext';

function ResizeHandle({ direction }) {
  return (
    <Separator
      style={{
        background: 'var(--resize-handle)',
        transition: 'background 0.15s',
        ...(direction === 'horizontal'
          ? { width: 4, cursor: 'col-resize' }
          : { height: 4, cursor: 'row-resize' }),
      }}
    />
  );
}

function RenderNode({ node }) {
  const { dispatch } = useApp();

  if (node.type === 'pane') {
    return <EditorPane pane={node} />;
  }

  if (node.type === 'split') {
    // node.direction: 'horizontal' = left/right split, 'vertical' = top/bottom split
    // Group orientation: 'horizontal' = panels side-by-side, 'vertical' = panels stacked
    const panelOrientation = node.direction === 'horizontal' ? 'horizontal' : 'vertical';
    return (
      <Group
        orientation={panelOrientation}
        onLayoutChange={(sizes) => {
          dispatch({ type: 'RESIZE_SPLIT', splitId: node.id, sizes });
        }}
      >
        {node.children.map((child, i) => (
          <React.Fragment key={child.id}>
            {i > 0 && <ResizeHandle direction={panelOrientation} />}
            <Panel
              defaultSize={node.sizes?.[i] || 50}
              minSize={15}
            >
              <RenderNode node={child} />
            </Panel>
          </React.Fragment>
        ))}
      </Group>
    );
  }

  return null;
}

export default function SplitPaneTree() {
  const { layout } = useApp();
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <RenderNode node={layout.root} />
    </div>
  );
}
