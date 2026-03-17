import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { diffLines } from 'diff';

export default function ConfigDiff({ onClose }) {
  const [config1, setConfig1] = useState('');
  const [config2, setConfig2] = useState('');

  const diff = useMemo(() => {
    if (!config1 && !config2) return [];
    return diffLines(config1, config2);
  }, [config1, config2]);

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
          {/* Input panes */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)' }}>
            <div style={paneLabelStyle}>Config A (Before)</div>
            <textarea
              value={config1}
              onChange={e => setConfig1(e.target.value)}
              placeholder="Paste first config here..."
              style={textareaStyle}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)' }}>
            <div style={paneLabelStyle}>Config B (After)</div>
            <textarea
              value={config2}
              onChange={e => setConfig2(e.target.value)}
              placeholder="Paste second config here..."
              style={textareaStyle}
            />
          </div>

          {/* Diff output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={paneLabelStyle}>Diff Result</div>
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
                  Paste configs in the panels to see differences
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

const paneLabelStyle = {
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
