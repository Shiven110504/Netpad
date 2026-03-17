import React from 'react';
import { AppProvider } from './state/AppContext';
import AppShell from './components/AppShell';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
