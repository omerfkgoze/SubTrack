import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './providers';
import { RootNavigator } from './navigation';
import { NetworkBanner } from '@shared/components/feedback';
import { useIAPSetup } from '@features/premium/hooks/useIAPSetup';

function AppContent() {
  useIAPSetup();

  return (
    <>
      <NetworkBanner />
      <RootNavigator />
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
