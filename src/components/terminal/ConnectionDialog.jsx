import React, { useState, useEffect } from 'react';
import { Terminal, Key, Eye, EyeOff, FolderOpen, ChevronDown } from 'lucide-react';
import { loadSshProfiles, saveSshProfiles } from '../../state/persistence';
import { v4 as uuidv4 } from 'uuid';

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
};

const cancelBtnStyle = {
  height: 34,
  padding: '0 16px',
  fontSize: 13,
  background: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  cursor: 'pointer',
};

const connectBtnStyle = {
  height: 34,
  padding: '0 20px',
  fontSize: 13,
  fontWeight: 600,
  background: 'var(--accent-color)',
  color: 'var(--accent-text)',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export default function ConnectionDialog({ onConnect, onClose, paneId }) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState('password');
  const [keyFilePath, setKeyFilePath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [showProfiles, setShowProfiles] = useState(false);

  useEffect(() => {
    setSavedProfiles(loadSshProfiles());
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSelectProfile = (profile) => {
    setHost(profile.host || '');
    setPort(String(profile.port || 22));
    setUsername(profile.username || '');
    setAuthMethod(profile.authMethod || 'password');
    setKeyFilePath(profile.keyFilePath || '');
    setSessionName(profile.name || '');
    setShowProfiles(false);
  };

  const handleDeleteProfile = (e, profileId) => {
    e.stopPropagation();
    const updated = savedProfiles.filter(p => p.id !== profileId);
    setSavedProfiles(updated);
    saveSshProfiles(updated);
  };

  const handleSelectKeyFile = async () => {
    if (window.sshAPI?.selectKeyFile) {
      const path = await window.sshAPI.selectKeyFile();
      if (path) setKeyFilePath(path);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!host || !username) return;

    const config = {
      host,
      port: parseInt(port, 10) || 22,
      username,
      authMethod,
      sessionName,
      ...(authMethod === 'password' ? { password } : { keyFilePath, passphrase }),
    };

    if (saveProfile) {
      const profile = {
        id: uuidv4(),
        name: sessionName || `${username}@${host}`,
        host,
        port: parseInt(port, 10) || 22,
        username,
        authMethod,
        keyFilePath: authMethod === 'key' ? keyFilePath : undefined,
      };
      const updated = [...savedProfiles, profile];
      setSavedProfiles(updated);
      saveSshProfiles(updated);
    }

    onConnect(config, paneId);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      <div style={{
        background: 'var(--menu-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        width: 420,
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Terminal size={18} style={{ color: 'var(--accent-color)' }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>
            SSH Connection
          </span>
        </div>

        {/* Saved Profiles */}
        {savedProfiles.length > 0 && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowProfiles(!showProfiles)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Saved Sessions ({savedProfiles.length})
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
            {showProfiles && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--menu-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                marginTop: 4,
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                maxHeight: 200,
                overflow: 'auto',
              }}>
                {savedProfiles.map(profile => (
                  <div
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-light)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{profile.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {profile.username}@{profile.host}:{profile.port}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProfile(e, profile.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '0 4px',
                        lineHeight: 1,
                      }}
                      title="Delete profile"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Host and Port */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Hostname / IP</label>
              <input
                autoFocus
                type="text"
                placeholder="192.168.1.1"
                value={host}
                onChange={e => setHost(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ width: 80 }}>
              <label style={labelStyle}>Port</label>
              <input
                type="number"
                value={port}
                onChange={e => setPort(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Auth Method */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Authentication</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="authMethod"
                  value="password"
                  checked={authMethod === 'password'}
                  onChange={() => setAuthMethod('password')}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                Password
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="authMethod"
                  value="key"
                  checked={authMethod === 'key'}
                  onChange={() => setAuthMethod('key')}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <Key size={13} />
                Private Key
              </label>
            </div>
          </div>

          {/* Password or Key fields */}
          {authMethod === 'password' ? (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Private Key File</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={keyFilePath}
                    onChange={e => setKeyFilePath(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="~/.ssh/id_rsa"
                  />
                  <button
                    type="button"
                    onClick={handleSelectKeyFile}
                    style={{
                      ...cancelBtnStyle,
                      height: 34,
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Browse for key file"
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Passphrase (optional)</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  style={inputStyle}
                  placeholder="Key passphrase"
                />
              </div>
            </>
          )}

          {/* Session Name + Save */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Session Name (optional)</label>
              <input
                type="text"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                style={inputStyle}
                placeholder="My Server"
              />
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              paddingBottom: 8,
            }}>
              <input
                type="checkbox"
                checked={saveProfile}
                onChange={e => setSaveProfile(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)' }}
              />
              Save
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button
              type="submit"
              style={{
                ...connectBtnStyle,
                opacity: (!host || !username) ? 0.5 : 1,
              }}
              disabled={!host || !username}
            >
              <Terminal size={14} />
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
