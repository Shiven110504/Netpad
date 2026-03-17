import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { calculateSubnet, isValidIp } from '../../utils/subnetMath';

export default function SubnetCalculator({ onClose }) {
  const [ip, setIp] = useState('192.168.1.0');
  const [cidr, setCidr] = useState(24);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });

  const result = useMemo(() => {
    if (!isValidIp(ip)) return null;
    return calculateSubnet(ip, cidr);
  }, [ip, cidr]);

  const handleMouseDown = (e) => {
    if (e.target.closest('input, button, select')) return;
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
      width: 320,
      background: 'var(--menu-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      zIndex: 999,
      color: 'var(--text-primary)',
      fontSize: 12,
      userSelect: 'none',
    }}>
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
        <Calculator size={14} />
        <span style={{ flex: 1, fontWeight: 600 }}>IP Subnet Calculator</span>
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
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="192.168.1.0"
              style={inputStyle}
            />
            <span style={{ lineHeight: '26px' }}>/</span>
            <select
              value={cidr}
              onChange={e => setCidr(Number(e.target.value))}
              style={{ ...inputStyle, width: 55, flex: 'none' }}
            >
              {Array.from({ length: 33 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {!isValidIp(ip) && (
            <div style={{ color: 'var(--danger)', marginBottom: 8 }}>Invalid IP address</div>
          )}

          {result && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Network', result.network],
                  ['Broadcast', result.broadcast],
                  ['First Host', result.firstHost],
                  ['Last Host', result.lastHost],
                  ['Subnet Mask', result.subnetMask],
                  ['Wildcard', result.wildcardMask],
                  ['CIDR', `/${result.cidr}`],
                  ['Total Hosts', result.totalHosts.toLocaleString()],
                  ['Usable Hosts', result.usableHosts.toLocaleString()],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={tdLabelStyle}>{label}</td>
                    <td style={tdValueStyle}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
