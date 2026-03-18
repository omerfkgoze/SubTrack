import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './providers';
import { RootNavigator } from './navigation';
import { NetworkBanner } from '@shared/components/feedback';

export default function App() {
  return (
    <AppProviders>
      <NetworkBanner />
      <RootNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
