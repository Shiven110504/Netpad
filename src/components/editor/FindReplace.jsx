import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll, CaseSensitive, Regex } from 'lucide-react';

export default function FindReplace({ editor, mode, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matches, setMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, [mode]);

  const findMatches = useCallback(() => {
    if (!editor || !searchTerm) {
      setMatches([]);
      setCurrentMatch(0);
      return;
    }

    const text = editor.state.doc.textContent;
    const found = [];

    try {
      let regex;
      if (useRegex) {
        regex = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
      } else {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
      }

      let match;
      while ((match = regex.exec(text)) !== null) {
        found.push({ from: match.index, to: match.index + match[0].length, text: match[0] });
        if (found.length > 10000) break; // Safety limit
      }
    } catch (e) {
      // Invalid regex
    }

    setMatches(found);
    if (found.length > 0 && currentMatch >= found.length) {
      setCurrentMatch(0);
    }
  }, [editor, searchTerm, caseSensitive, useRegex]);

  useEffect(() => {
    findMatches();
  }, [findMatches]);

  const goToMatch = (index) => {
    if (!editor || matches.length === 0) return;
    const m = matches[index];
    if (!m) return;

    // Find position in doc
    let pos = 0;
    let found = false;
    editor.state.doc.descendants((node, nodePos) => {
      if (found || !node.isText) return;
      const text = node.text;
      if (pos + text.length > m.from) {
        const from = nodePos + (m.from - pos);
        const to = from + m.text.length;
        editor.chain().focus().setTextSelection({ from, to }).run();
        found = true;
        return false;
      }
      pos += text.length;
    });
    setCurrentMatch(index);
  };

  const nextMatch = () => {
    if (matches.length === 0) return;
    const next = (currentMatch + 1) % matches.length;
    goToMatch(next);
  };

  const prevMatch = () => {
    if (matches.length === 0) return;
    const prev = (currentMatch - 1 + matches.length) % matches.length;
    goToMatch(prev);
  };

  const replaceCurrent = () => {
    if (!editor || matches.length === 0) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt({ from, to }, replaceTerm).run();
    setTimeout(findMatches, 50);
  };

  const replaceAll = () => {
    if (!editor || matches.length === 0) return;

    // Build a list of {from, to} positions in the actual ProseMirror doc
    const positions = [];
    let textOffset = 0;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const nodeText = node.text;
      // For each match that falls within this text node, compute the doc position
      for (const m of matches) {
        if (m.from >= textOffset && m.from < textOffset + nodeText.length) {
          const docFrom = pos + (m.from - textOffset);
          const docTo = docFrom + m.text.length;
          positions.push({ docFrom, docTo });
        }
      }
      textOffset += nodeText.length;
    });

    if (positions.length === 0) return;

    // Apply replacements from end to start so earlier positions stay valid
    const { tr } = editor.state;
    for (let i = positions.length - 1; i >= 0; i--) {
      const { docFrom, docTo } = positions[i];
      tr.insertText(replaceTerm, docFrom, docTo);
    }
    editor.view.dispatch(tr);
    setMatches([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); nextMatch(); }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); prevMatch(); }
  };

  const showReplace = mode === 'replace';

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 16,
      background: 'var(--menu-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '0 0 8px 8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: 8,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontSize: 12,
      minWidth: 320,
    }}>
      {/* Find row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          ref={searchRef}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find..."
          style={inputStyle}
        />
        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: 50, textAlign: 'center' }}>
          {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : 'No results'}
        </span>
        <button onClick={() => setCaseSensitive(!caseSensitive)} title="Case Sensitive" style={{ ...toggleBtnStyle, background: caseSensitive ? 'var(--accent-color)' : 'transparent', color: caseSensitive ? '#fff' : 'var(--text-secondary)' }}>
          Aa
        </button>
        <button onClick={() => setUseRegex(!useRegex)} title="Regex" style={{ ...toggleBtnStyle, background: useRegex ? 'var(--accent-color)' : 'transparent', color: useRegex ? '#fff' : 'var(--text-secondary)' }}>
          .*
        </button>
        <button onClick={prevMatch} title="Previous (Shift+Enter)" style={navBtnStyle}><ChevronUp size={14} /></button>
        <button onClick={nextMatch} title="Next (Enter)" style={navBtnStyle}><ChevronDown size={14} /></button>
        <button onClick={onClose} style={navBtnStyle}><X size={14} /></button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            value={replaceTerm}
            onChange={e => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Replace..."
            style={inputStyle}
          />
          <button onClick={replaceCurrent} title="Replace" style={{ ...navBtnStyle, fontSize: 11, width: 'auto', padding: '0 8px' }}>
            Replace
          </button>
          <button onClick={replaceAll} title="Replace All" style={{ ...navBtnStyle, fontSize: 11, width: 'auto', padding: '0 8px' }}>
            All
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  flex: 1,
  height: 26,
  padding: '0 8px',
  fontSize: 12,
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const toggleBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 22,
  padding: '0 6px',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
};

const navBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: 0,
};
