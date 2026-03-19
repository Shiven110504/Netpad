import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { useApp } from '../../state/AppContext';
import { getTerminalTheme } from './terminalThemes';
import { DEFAULT_SSH_SETTINGS } from '../../utils/constants';
import { RotateCcw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export default function TerminalView({ pane, tab }) {
  const { dispatch, settings } = useApp();
  const terminalRef = useRef(null);
  const containerRef = useRef(null);
  const fitAddonRef = useRef(null);
  const cleanupRef = useRef([]);
  const reconnectTimerRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const userDisconnectedRef = useRef(false);

  const termSettings = settings.terminal || DEFAULT_SSH_SETTINGS;

  const connectSession = useCallback(async (config) => {
    if (!window.sshAPI?.isAvailable) return;

    dispatch({
      type: 'UPDATE_SSH_STATUS',
      paneId: pane.id,
      tabId: tab.id,
      status: 'connecting',
    });

    try {
      const result = await window.sshAPI.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        authMethod: config.authMethod,
        keyFilePath: config.keyFilePath,
        passphrase: config.passphrase,
      });

      if (result.status === 'connected') {
        dispatch({
          type: 'UPDATE_SSH_STATUS',
          paneId: pane.id,
          tabId: tab.id,
          status: 'connected',
          sessionId: result.sessionId,
        });
        setRetryCount(0);

        // Send initial resize
        if (terminalRef.current && fitAddonRef.current) {
          try { fitAddonRef.current.fit(); } catch (e) { /* ignore */ }
          window.sshAPI.resize(
            result.sessionId,
            terminalRef.current.cols,
            terminalRef.current.rows
          );
        }
      } else {
        dispatch({
          type: 'UPDATE_SSH_STATUS',
          paneId: pane.id,
          tabId: tab.id,
          status: 'error',
          error: result.error || 'Connection failed',
        });
      }
    } catch (err) {
      dispatch({
        type: 'UPDATE_SSH_STATUS',
        paneId: pane.id,
        tabId: tab.id,
        status: 'error',
        error: err.message || 'Connection failed',
      });
    }
  }, [dispatch, pane.id, tab.id]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const theme = getTerminalTheme(settings.theme);
    const term = new Terminal({
      cursorBlink: termSettings.cursorBlink,
      cursorStyle: termSettings.cursorStyle || 'block',
      fontSize: termSettings.fontSize || 14,
      fontFamily: termSettings.fontFamily || DEFAULT_SSH_SETTINGS.fontFamily,
      scrollback: termSettings.scrollbackLines || 5000,
      theme,
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit
    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch (e) { /* container not ready */ }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          if (tab.sshSessionId && window.sshAPI?.isAvailable) {
            window.sshAPI.resize(tab.sshSessionId, term.cols, term.rows);
          }
        } catch (e) { /* ignore */ }
      });
    });
    ro.observe(containerRef.current);

    // Handle terminal input → SSH
    const dataDisposable = term.onData((data) => {
      if (tab.sshSessionId && window.sshAPI?.isAvailable) {
        window.sshAPI.send(tab.sshSessionId, data);
      }
    });

    // Handle clipboard
    const keyDisposable = term.onKey(({ domEvent }) => {
      // Ctrl+Shift+C → copy
      if (domEvent.ctrlKey && domEvent.shiftKey && domEvent.key === 'C') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      }
      // Ctrl+Shift+V → paste
      if (domEvent.ctrlKey && domEvent.shiftKey && domEvent.key === 'V') {
        navigator.clipboard.readText().then(text => {
          if (text && tab.sshSessionId && window.sshAPI?.isAvailable) {
            window.sshAPI.send(tab.sshSessionId, text);
          }
        });
      }
    });

    cleanupRef.current.push(() => {
      ro.disconnect();
      dataDisposable.dispose();
      keyDisposable.dispose();
      term.dispose();
    });

    return () => {
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [tab.id]); // Only re-init on tab change

  // Listen for SSH data
  useEffect(() => {
    if (!window.sshAPI?.isAvailable) return;

    const removeDataListener = window.sshAPI.onData((sessionId, base64Data) => {
      if (sessionId === tab.sshSessionId && terminalRef.current) {
        const decoded = atob(base64Data);
        terminalRef.current.write(decoded);
      }
    });

    return () => removeDataListener();
  }, [tab.sshSessionId]);

  // Listen for SSH status changes
  useEffect(() => {
    if (!window.sshAPI?.isAvailable) return;

    const removeStatusListener = window.sshAPI.onStatus((sessionId, status, error) => {
      if (sessionId === tab.sshSessionId) {
        dispatch({
          type: 'UPDATE_SSH_STATUS',
          paneId: pane.id,
          tabId: tab.id,
          status,
          error,
        });

        if (status === 'disconnected' && terminalRef.current) {
          terminalRef.current.write('\r\n\x1b[31m--- Session disconnected ---\x1b[0m\r\n');
        }
      }
    });

    return () => removeStatusListener();
  }, [tab.sshSessionId, dispatch, pane.id, tab.id]);

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getTerminalTheme(settings.theme);
    }
  }, [settings.theme]);

  // Update terminal settings
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.fontSize = termSettings.fontSize || 14;
      terminalRef.current.options.fontFamily = termSettings.fontFamily || DEFAULT_SSH_SETTINGS.fontFamily;
      terminalRef.current.options.cursorBlink = termSettings.cursorBlink;
      terminalRef.current.options.cursorStyle = termSettings.cursorStyle || 'block';
      if (fitAddonRef.current) {
        try { fitAddonRef.current.fit(); } catch (e) { /* ignore */ }
      }
    }
  }, [termSettings.fontSize, termSettings.fontFamily, termSettings.cursorBlink, termSettings.cursorStyle]);

  // Auto-connect on mount if config present and disconnected
  useEffect(() => {
    if (
      tab.sshConfig &&
      tab.sshStatus === 'disconnected' &&
      !tab.sshSessionId &&
      tab.sshConfig.host &&
      tab.sshConfig.username
    ) {
      // Small delay to let terminal initialize
      const timer = setTimeout(() => {
        connectSession(tab.sshConfig);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [tab.id]); // Only on mount (tab.id is stable)

  // Auto-reconnect logic
  useEffect(() => {
    if (
      tab.sshStatus === 'disconnected' &&
      !userDisconnectedRef.current &&
      tab.sshConfig?.host &&
      retryCount > 0 &&
      retryCount <= 3
    ) {
      const delay = Math.pow(2, retryCount - 1) * 5; // 5, 10, 20 seconds
      setRetryCountdown(delay);

      const countdownInterval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      reconnectTimerRef.current = setTimeout(() => {
        connectSession(tab.sshConfig);
      }, delay * 1000);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(reconnectTimerRef.current);
      };
    }
  }, [tab.sshStatus, retryCount, connectSession, tab.sshConfig]);

  // Cleanup on unmount — disconnect session
  useEffect(() => {
    return () => {
      if (tab.sshSessionId && window.sshAPI?.isAvailable) {
        window.sshAPI.disconnect(tab.sshSessionId);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [tab.sshSessionId]);

  const handleReconnect = () => {
    userDisconnectedRef.current = false;
    setRetryCount(0);
    if (tab.sshConfig) {
      connectSession(tab.sshConfig);
    }
  };

  const handleDisconnect = () => {
    userDisconnectedRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (tab.sshSessionId && window.sshAPI?.isAvailable) {
      window.sshAPI.disconnect(tab.sshSessionId);
    }
  };

  // Focus terminal when pane becomes active
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [pane.activeTabId]);

  const showOverlay = tab.sshStatus === 'disconnected' || tab.sshStatus === 'error' || tab.sshStatus === 'connecting';

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--editor-bg)' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          padding: '4px 0 0 4px',
          boxSizing: 'border-box',
        }}
        onClick={() => terminalRef.current?.focus()}
      />

      {/* Status overlay */}
      {showOverlay && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: tab.sshStatus === 'error'
            ? 'rgba(220, 38, 38, 0.9)'
            : tab.sshStatus === 'connecting'
              ? 'rgba(234, 179, 8, 0.9)'
              : 'rgba(100, 100, 100, 0.9)',
          color: '#fff',
          fontSize: 13,
          backdropFilter: 'blur(4px)',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tab.sshStatus === 'connecting' && (
              <>
                <div style={{
                  width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span>Connecting to {tab.sshConfig?.host}...</span>
              </>
            )}
            {tab.sshStatus === 'error' && (
              <>
                <AlertCircle size={14} />
                <span>{tab.sshError || 'Connection error'}</span>
              </>
            )}
            {tab.sshStatus === 'disconnected' && (
              <>
                <WifiOff size={14} />
                <span>
                  Disconnected
                  {retryCountdown > 0 && ` — reconnecting in ${retryCountdown}s`}
                </span>
              </>
            )}
          </div>

          {(tab.sshStatus === 'disconnected' || tab.sshStatus === 'error') && (
            <button
              onClick={handleReconnect}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4,
                color: '#fff',
                fontSize: 12,
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RotateCcw size={12} />
              Reconnect
            </button>
          )}
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
