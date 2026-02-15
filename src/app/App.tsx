import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './providers';
import { RootNavigator } from './navigation';
import { useAuth } from './providers/AuthProvider';

function AppContent() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <RootNavigator isAuthenticated={isAuthenticated} />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
