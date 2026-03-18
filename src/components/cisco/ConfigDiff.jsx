import React, { useState, useMemo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import { diffLines } from 'diff';
import { useApp } from '../../state/AppContext';

function CompareDropZone({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        outline: isOver ? '2px solid var(--accent-color)' : 'none',
        outlineOffset: -2,
        transition: 'outline 0.15s',
      }}
    >
      {children}
    </div>
  );
}

export default function ConfigDiff({ onClose }) {
  const { compareSlotA, setCompareSlotA, compareSlotB, setCompareSlotB } = useApp();

  // Track which slot fill was last applied via a nonce, not just tabId.
  // This ensures re-adding the same tab (with updated content) refreshes the textarea.
  const [state1, setState1] = useState({ filledAt: null, text: '' });
  const [state2, setState2] = useState({ filledAt: null, text: '' });

  const slotANonce = compareSlotA?.filledAt ?? null;
  const slotBNonce = compareSlotB?.filledAt ?? null;

  // Derive config, resetting when slot fill changes (setState during render is a supported React pattern)
  let config1 = state1.text;
  if (state1.filledAt !== slotANonce && compareSlotA) {
    config1 = compareSlotA.text;
    setState1({ filledAt: slotANonce, text: compareSlotA.text });
  }
  let config2 = state2.text;
  if (state2.filledAt !== slotBNonce && compareSlotB) {
    config2 = compareSlotB.text;
    setState2({ filledAt: slotBNonce, text: compareSlotB.text });
  }

  const handleChange1 = useCallback((e) => setState1(prev => ({ ...prev, text: e.target.value })), []);
  const handleChange2 = useCallback((e) => setState2(prev => ({ ...prev, text: e.target.value })), []);

  const diff = useMemo(() => {
    if (!config1 && !config2) return [];
    return diffLines(config1, config2);
  }, [config1, config2]);

  const clearSlotA = () => {
    setCompareSlotA(null);
    setState1({ filledAt: null, text: '' });
  };

  const clearSlotB = () => {
    setCompareSlotB(null);
    setState2({ filledAt: null, text: '' });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '90vw', maxWidth: 1000, height: '80vh',
        background: 'var(--menu-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Config Diff</span>
          <button onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Config A — droppable */}
          <CompareDropZone id="compare-drop-a">
            <div style={paneLabelStyle}>
              <span style={{ flex: 1 }}>
                Config A (Before)
                {compareSlotA && <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.7 }}>— {compareSlotA.title}</span>}
              </span>
              {(config1 || compareSlotA) && (
                <button onClick={clearSlotA} style={clearBtnStyle} title="Clear">
                  <X size={12} />
                </button>
              )}
            </div>
            <textarea
              value={config1}
              onChange={handleChange1}
              placeholder="Paste first config here, or drag a tab..."
              style={textareaStyle}
            />
          </CompareDropZone>

          {/* Config B — droppable */}
          <CompareDropZone id="compare-drop-b">
            <div style={paneLabelStyle}>
              <span style={{ flex: 1 }}>
                Config B (After)
                {compareSlotB && <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.7 }}>— {compareSlotB.title}</span>}
              </span>
              {(config2 || compareSlotB) && (
                <button onClick={clearSlotB} style={clearBtnStyle} title="Clear">
                  <X size={12} />
                </button>
              )}
            </div>
            <textarea
              value={config2}
              onChange={handleChange2}
              placeholder="Paste second config here, or drag a tab..."
              style={textareaStyle}
            />
          </CompareDropZone>

          {/* Diff output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={paneLabelStyle}><span>Diff Result</span></div>
            <div style={{
              flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5,
              padding: 8, background: 'var(--editor-bg)',
            }}>
              {diff.map((part, i) => {
                const lines = part.value.split('\n').filter((l, idx, arr) => idx < arr.length - 1 || l);
                return lines.map((line, j) => (
                  <div key={`${i}-${j}`} style={{
                    padding: '1px 8px',
                    background: part.added ? 'rgba(76, 175, 80, 0.15)' : part.removed ? 'rgba(244, 67, 54, 0.15)' : 'transparent',
                    color: part.added ? 'var(--success)' : part.removed ? 'var(--danger)' : 'var(--text-primary)',
                    borderLeft: part.added ? '3px solid var(--success)' : part.removed ? '3px solid var(--danger)' : '3px solid transparent',
                  }}>
                    <span style={{ opacity: 0.5, marginRight: 8 }}>{part.added ? '+' : part.removed ? '-' : ' '}</span>
                    {line}
                  </div>
                ));
              })}
              {!config1 && !config2 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Paste configs in the panels to see differences, or drag tabs here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const closeBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, border: 'none', borderRadius: 6,
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
};

const clearBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 18, height: 18, border: 'none', borderRadius: 3,
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
  flexShrink: 0,
};

const paneLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-light)',
  background: 'var(--bg-secondary)',
};

const textareaStyle = {
  flex: 1,
  resize: 'none',
  border: 'none',
  padding: 8,
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.5,
  background: 'var(--editor-bg)',
  color: 'var(--editor-text)',
  outline: 'none',
};
