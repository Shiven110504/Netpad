import React, { useState, useCallback } from 'react';
import { X, ChevronDown, ChevronRight, Search, Copy, Check } from 'lucide-react';
import { normalizeMac, isValidMac, formatMac, lookupVendorLocal, lookupVendorOnline } from '../../utils/macUtils';

export default function MacLookup({ onClose }) {
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 360, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [lookupState, setLookupState] = useState('idle'); // idle | searching | found | not-found
  const [copiedField, setCopiedField] = useState(null);
  const dragOffset = React.useRef({ x: 0, y: 0 });

  const bare = normalizeMac(input);
  const formats = bare ? formatMac(bare) : null;

  const doLookup = useCallback(async () => {
    if (!bare) return;

    // Try local first
    const local = lookupVendorLocal(bare);
    if (local) {
      setVendor(local);
      setLookupState('found');
      return;
    }

    // Fall back to online API
    setLookupState('searching');
    const result = await lookupVendorOnline(bare);
    if (result.found) {
      setVendor(result.vendor);
      setLookupState('found');
    } else {
      setVendor(null);
      setLookupState('not-found');
    }
  }, [bare]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setLookupState('idle');
    setVendor(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && bare) {
      doLookup();
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Drag handling
  const handleMouseDown = (e) => {
    if (e.target.closest('input, button')) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  React.useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  return (
    <div style={{
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: 340,
      background: 'var(--menu-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      zIndex: 999,
      color: 'var(--text-primary)',
      fontSize: 12,
      userSelect: 'none',
    }}>
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          cursor: 'grab',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-color)',
          gap: 6,
          background: 'var(--bg-tertiary)',
          borderRadius: collapsed ? 8 : '8px 8px 0 0',
        }}
      >
        <Search size={14} />
        <span style={{ flex: 1, fontWeight: 600 }}>MAC Address Lookup</span>
        <button onClick={() => setCollapsed(!collapsed)} style={btnStyle}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <button onClick={onClose} style={btnStyle}><X size={14} /></button>
      </div>

      {!collapsed && (
        <div style={{ padding: 10 }}>
          {/* Input */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 00:1A:2B:3C:4D:5E or 001a.2b3c.4d5e"
              style={inputStyle}
              autoFocus
            />
            <button
              onClick={doLookup}
              disabled={!bare}
              style={{
                ...btnActionStyle,
                opacity: bare ? 1 : 0.4,
                cursor: bare ? 'pointer' : 'default',
              }}
              title="Lookup"
            >
              <Search size={13} />
            </button>
          </div>

          {/* Validation message */}
          {input && !bare && (
            <div style={{ color: 'var(--danger)', marginBottom: 8 }}>
              Invalid MAC address
            </div>
          )}

          {/* Formats */}
          {formats && (
            <div style={{ marginBottom: 10 }}>
              <div style={sectionHeader}>Formats</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Cisco', formats.cisco],
                    ['Standard', formats.colon],
                    ['Windows', formats.hyphen],
                    ['Bare', formats.bare],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={tdLabelStyle}>{label}</td>
                      <td style={tdValueStyle}>{value}</td>
                      <td style={{ width: 24, padding: '2px 0' }}>
                        <button
                          onClick={() => copyToClipboard(value, label)}
                          style={copyBtnStyle}
                          title={`Copy ${label} format`}
                        >
                          {copiedField === label
                            ? <Check size={11} style={{ color: 'var(--success, #4caf50)' }} />
                            : <Copy size={11} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* OUI Info */}
          {formats && (
            <div>
              <div style={sectionHeader}>OUI Prefix</div>
              <div style={{
                fontFamily: 'monospace',
                padding: '4px 0',
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}>
                {formats.bare.substring(0, 6)} ({formats.colon.substring(0, 8)})
              </div>
            </div>
          )}

          {/* Vendor result */}
          {lookupState === 'searching' && (
            <div style={{ padding: '6px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Looking up vendor...
            </div>
          )}
          {lookupState === 'found' && vendor && (
            <div style={{
              padding: '6px 8px',
              background: 'var(--bg-tertiary)',
              borderRadius: 4,
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 2, fontSize: 11 }}>Vendor</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{vendor}</div>
            </div>
          )}
          {lookupState === 'not-found' && (
            <div style={{
              padding: '6px 8px',
              background: 'var(--bg-tertiary)',
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
            }}>
              Vendor not found for this OUI prefix
            </div>
          )}

          {/* Hint */}
          {!input && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.4 }}>
              Enter a MAC address in any format: Cisco (aabb.ccdd.eeff),
              colon (AA:BB:CC:DD:EE:FF), hyphen (AA-BB-CC-DD-EE-FF), or bare (AABBCCDDEEFF).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  padding: 0,
};

const btnActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 26,
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

const copyBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: 0,
  opacity: 0.7,
};

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
  fontFamily: 'monospace',
};

const sectionHeader = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
};

const tdLabelStyle = {
  padding: '3px 8px 3px 0',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  fontWeight: 500,
};

const tdValueStyle = {
  padding: '3px 0',
  fontFamily: 'monospace',
};
