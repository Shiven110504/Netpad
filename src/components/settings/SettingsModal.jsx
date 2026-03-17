import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { FONT_FAMILIES, FONT_SIZES } from '../../utils/constants';

const SHORTCUTS = [
  ['Ctrl+N', 'New tab'],
  ['Ctrl+W', 'Close tab'],
  ['Ctrl+B', 'Bold'],
  ['Ctrl+I', 'Italic'],
  ['Ctrl+U', 'Underline'],
  ['Ctrl+K', 'Insert hyperlink'],
  ['Ctrl+Shift+V', 'Paste as plain text'],
  ['Ctrl+Shift+M', 'Toggle Markdown preview'],
  ['Ctrl+\\', 'Split pane right'],
  ['Ctrl+Shift+\\', 'Split pane down'],
  ['Ctrl+,', 'Open Settings'],
  ['Ctrl+F', 'Find'],
  ['Ctrl+H', 'Find & Replace'],
  ['Ctrl+Tab', 'Next tab'],
  ['Ctrl+Shift+Tab', 'Previous tab'],
  ['Escape', 'Close panel/dialog'],
];

export default function SettingsModal({ onClose }) {
  const { settings, updateSettings, toggleTheme } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const [locationInput, setLocationInput] = useState(
    settings.weatherLocation?.city || ''
  );
  const [locationStatus, setLocationStatus] = useState(null);

  const handleSetLocation = async () => {
    const cityName = locationInput.trim();
    if (!cityName) return;

    setLocationStatus('Searching...');
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const loc = {
          lat: r.latitude,
          lon: r.longitude,
          city: r.name + (r.country ? `, ${r.country}` : ''),
        };
        updateSettings({ weatherLocation: loc });
        setLocationInput(loc.city);
        // Clear weather cache so next fetch uses new location
        localStorage.removeItem('netpad_weather_cache');
        setLocationStatus('Location set.');
      } else {
        setLocationStatus('City not found. Try a different name.');
      }
    } catch (e) {
      setLocationStatus('Lookup failed. Check your connection.');
    }
  };

  const handleClearLocation = () => {
    updateSettings({ weatherLocation: null });
    setLocationInput('');
    localStorage.removeItem('netpad_weather_cache');
    setLocationStatus('Using auto-detect.');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 520,
        maxHeight: '80vh',
        background: 'var(--menu-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Settings</span>
          <button onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        {/* Tab row */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}>
          {['general', 'editor', 'shortcuts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === tab ? 'var(--menu-bg)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingRow label="Theme">
                <select
                  value={settings.theme}
                  onChange={e => updateSettings({ theme: e.target.value })}
                  style={selectStyle}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </SettingRow>
              <SettingRow label="Font Family">
                <select
                  value={settings.fontFamily}
                  onChange={e => updateSettings({ fontFamily: e.target.value })}
                  style={selectStyle}
                >
                  {FONT_FAMILIES.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
                </select>
              </SettingRow>
              <SettingRow label="Font Size">
                <select
                  value={settings.fontSize}
                  onChange={e => updateSettings({ fontSize: Number(e.target.value) })}
                  style={selectStyle}
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
              </SettingRow>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Weather
              </div>

              <SettingRow label="Temperature Unit">
                <select
                  value={settings.weatherUnit || 'celsius'}
                  onChange={e => updateSettings({ weatherUnit: e.target.value })}
                  style={selectStyle}
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </SettingRow>

              <SettingRow label="Weather Location">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="City name (auto-detect if empty)"
                      value={locationInput}
                      onChange={e => setLocationInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSetLocation(); }}
                      style={{
                        height: 30,
                        padding: '0 8px',
                        fontSize: 13,
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        minWidth: 180,
                      }}
                    />
                    <button
                      onClick={handleSetLocation}
                      style={{
                        ...actionBtnStyle,
                        background: 'var(--accent-color)',
                        color: '#fff',
                      }}
                    >
                      Set
                    </button>
                    <button
                      onClick={handleClearLocation}
                      style={actionBtnStyle}
                    >
                      Auto
                    </button>
                  </div>
                  {locationStatus && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{locationStatus}</span>
                  )}
                </div>
              </SettingRow>
            </div>
          )}

          {activeTab === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingRow label="Line Numbers">
                <ToggleSwitch
                  checked={settings.showLineNumbers}
                  onChange={v => updateSettings({ showLineNumbers: v })}
                />
              </SettingRow>
              <SettingRow label="Word Wrap">
                <ToggleSwitch
                  checked={settings.wordWrap}
                  onChange={v => updateSettings({ wordWrap: v })}
                />
              </SettingRow>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Shortcut</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map(([shortcut, action]) => (
                  <tr key={shortcut}>
                    <td style={tdStyle}>
                      <code style={{
                        background: 'var(--bg-tertiary)',
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: 12,
                      }}>{shortcut}</code>
                    </td>
                    <td style={tdStyle}>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: checked ? 'var(--accent-color)' : 'var(--bg-active)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: checked ? 21 : 3,
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

const closeBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};

const selectStyle = {
  height: 30,
  padding: '0 8px',
  fontSize: 13,
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  minWidth: 150,
};

const actionBtnStyle = {
  height: 30,
  padding: '0 10px',
  fontSize: 13,
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const thStyle = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

const tdStyle = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--border-light)',
};
