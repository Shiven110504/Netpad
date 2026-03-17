import React, { useState } from 'react';
import { X, Plus, Upload, Download, Trash2, GripVertical } from 'lucide-react';
import { loadKeywordRules, saveKeywordRules } from '../../state/persistence';

export default function KeywordRuleEditor({ onClose, rules, onRulesChange }) {
  const [editingRule, setEditingRule] = useState(null);
  const [testText, setTestText] = useState('ERROR: Connection failed\nWARNING: Timeout reached\nINFO: System ready');

  const addRule = () => {
    const newRule = {
      id: Date.now().toString(),
      name: 'New Rule',
      pattern: '\\b(ERROR|FAIL)\\b',
      color: '#FF4444',
      backgroundColor: '',
      caseSensitive: false,
      enabled: true,
    };
    const updated = [...rules, newRule];
    onRulesChange(updated);
    setEditingRule(newRule);
  };

  const updateRule = (id, updates) => {
    const updated = rules.map(r => r.id === id ? { ...r, ...updates } : r);
    onRulesChange(updated);
    if (editingRule?.id === id) setEditingRule({ ...editingRule, ...updates });
  };

  const deleteRule = (id) => {
    onRulesChange(rules.filter(r => r.id !== id));
    if (editingRule?.id === id) setEditingRule(null);
  };

  const exportRules = () => {
    const json = JSON.stringify({ rules }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyword-rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.rules && Array.isArray(data.rules)) {
          onRulesChange([...rules, ...data.rules.map(r => ({ ...r, id: Date.now() + Math.random().toString() }))]);
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    input.click();
  };

  const importSecureCRT = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ini,.txt';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = parseSecureCRT(text);
        onRulesChange([...rules, ...imported]);
      } catch (err) {
        alert('Failed to parse SecureCRT file: ' + err.message);
      }
    };
    input.click();
  };

  // Build highlighted test text as safe React elements (no dangerouslySetInnerHTML)
  const getHighlightedTestElements = () => {
    // Build a flat list of {start, end, rule} ranges
    const highlights = [];
    for (const rule of rules.filter(r => r.enabled)) {
      try {
        const flags = rule.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(rule.pattern, flags);
        let m;
        while ((m = regex.exec(testText)) !== null) {
          highlights.push({ start: m.index, end: m.index + m[0].length, rule });
          if (highlights.length > 5000) break;
        }
      } catch (e) { /* invalid regex */ }
    }

    if (highlights.length === 0) return testText;

    // Sort by start position, then by length descending (first matching rule wins)
    highlights.sort((a, b) => a.start - b.start || b.end - a.end);

    // Build non-overlapping segments (first match wins at each position)
    const segments = [];
    let cursor = 0;
    for (const h of highlights) {
      if (h.start < cursor) continue; // overlaps with a previous highlight
      if (h.start > cursor) {
        segments.push({ text: testText.slice(cursor, h.start), rule: null });
      }
      segments.push({ text: testText.slice(h.start, h.end), rule: h.rule });
      cursor = h.end;
    }
    if (cursor < testText.length) {
      segments.push({ text: testText.slice(cursor), rule: null });
    }

    return segments.map((seg, i) => {
      if (!seg.rule) return <React.Fragment key={i}>{seg.text}</React.Fragment>;
      const style = {
        color: seg.rule.color,
        ...(seg.rule.backgroundColor ? { background: seg.rule.backgroundColor } : {}),
      };
      return <span key={i} style={style}>{seg.text}</span>;
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 640, maxHeight: '80vh',
        background: 'var(--menu-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Keyword Highlighting Rules</span>
          <button onClick={onClose} style={headerBtnStyle}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Rules list */}
          <div style={{ width: 280, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid var(--border-light)' }}>
              <button onClick={addRule} style={actionBtnStyle} title="Add Rule"><Plus size={14} /> Add</button>
              <button onClick={importJSON} style={actionBtnStyle} title="Import JSON"><Upload size={14} /> JSON</button>
              <button onClick={importSecureCRT} style={actionBtnStyle} title="Import SecureCRT"><Upload size={14} /> CRT</button>
              <button onClick={exportRules} style={actionBtnStyle} title="Export"><Download size={14} /></button>
            </div>

            {/* Rule list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rules.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
                  No rules. Click "Add" to create one.
                </div>
              )}
              {rules.map(rule => (
                <div key={rule.id}
                  onClick={() => setEditingRule(rule)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    background: editingRule?.id === rule.id ? 'var(--bg-hover)' : 'transparent',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={e => { e.stopPropagation(); updateRule(rule.id, { enabled: !rule.enabled }); }}
                  />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: rule.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rule.name}
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteRule(rule.id); }} style={{ ...headerBtnStyle, width: 18, height: 18 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, padding: 12, overflowY: 'auto', fontSize: 13 }}>
            {editingRule ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input value={editingRule.name} onChange={e => updateRule(editingRule.id, { name: e.target.value })} style={fieldInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Regex Pattern</label>
                  <input value={editingRule.pattern} onChange={e => updateRule(editingRule.id, { pattern: e.target.value })} style={{ ...fieldInputStyle, fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Text Color</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input type="color" value={editingRule.color} onChange={e => updateRule(editingRule.id, { color: e.target.value })} style={{ width: 32, height: 28, border: 'none', cursor: 'pointer' }} />
                      <input value={editingRule.color} onChange={e => updateRule(editingRule.id, { color: e.target.value })} style={{ ...fieldInputStyle, flex: 1 }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Background</label>
                    <input value={editingRule.backgroundColor || ''} onChange={e => updateRule(editingRule.id, { backgroundColor: e.target.value })} placeholder="none" style={fieldInputStyle} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <input type="checkbox" checked={editingRule.caseSensitive} onChange={e => updateRule(editingRule.id, { caseSensitive: e.target.checked })} />
                  Case Sensitive
                </label>

                {/* Live test */}
                <div>
                  <label style={labelStyle}>Test Area</label>
                  <textarea
                    value={testText}
                    onChange={e => setTestText(e.target.value)}
                    style={{ ...fieldInputStyle, height: 60, fontFamily: 'monospace', resize: 'vertical' }}
                  />
                  <div style={{
                    marginTop: 6, padding: 8,
                    background: 'var(--bg-tertiary)',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {getHighlightedTestElements()}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                Select a rule to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseSecureCRT(text) {
  const rules = [];
  const lines = text.split('\n');
  let listName = 'Imported';
  let caseSensitive = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse list name
    const nameMatch = trimmed.match(/^S:"List Name"=(.+)/);
    if (nameMatch) { listName = nameMatch[1]; continue; }

    // Parse case sensitivity
    const caseMatch = trimmed.match(/^D:"Match Case"=(\w+)/);
    if (caseMatch) { caseSensitive = caseMatch[1] !== '00000000'; continue; }

    // Parse keyword lines: "pattern",BBGGRR00,flag1,flag2
    // or with leading space:  "pattern",BBGGRR00,flag1,flag2
    const kwMatch = trimmed.match(/^\s*"(.+?)",([0-9a-fA-F]{8}),(\d+),(\d+)/);
    if (kwMatch) {
      const pattern = kwMatch[1];
      const colorHex = kwMatch[2];

      // Skip separators (lines starting with --)
      if (pattern.startsWith('--')) continue;

      // Convert BBGGRR00 → #RRGGBB
      const b = colorHex.substring(0, 2);
      const g = colorHex.substring(2, 4);
      const r = colorHex.substring(4, 6);
      const color = `#${r}${g}${b}`;

      rules.push({
        id: Date.now() + Math.random().toString(),
        name: `${listName}: ${pattern.substring(0, 30)}`,
        pattern,
        color,
        backgroundColor: '',
        caseSensitive,
        enabled: true,
      });
    }
  }

  return rules;
}

const headerBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, border: 'none', borderRadius: 6,
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
};

const actionBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 4,
  height: 24, padding: '0 8px', fontSize: 11,
  border: '1px solid var(--border-color)', borderRadius: 4,
  background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer',
};

const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 };

const fieldInputStyle = {
  width: '100%', height: 28, padding: '0 8px', fontSize: 12,
  border: '1px solid var(--border-color)', borderRadius: 4,
  background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
};
