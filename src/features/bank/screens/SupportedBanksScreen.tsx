import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Text,
  Searchbar,
  Chip,
  ActivityIndicator,
  Button,
  Surface,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@app/navigation/types';
import { useBankStore } from '@shared/stores/useBankStore';
import type { SupportedBank } from '../types';
import { BankListItem } from '../components/BankListItem';

const MARKETS = [
  { code: 'ALL', label: 'All' },
  { code: 'SE', label: '🇸🇪 Sweden' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'GB', label: '🇬🇧 UK' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'NL', label: '🇳🇱 Netherlands' },
  { code: 'FI', label: '🇫🇮 Finland' },
  { code: 'NO', label: '🇳🇴 Norway' },
  { code: 'DK', label: '🇩🇰 Denmark' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'IT', label: '🇮🇹 Italy' },
];

function sortBanks(banks: SupportedBank[]): SupportedBank[] {
  return [...banks].sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function SupportedBanksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const supportedBanks = useBankStore((s) => s.supportedBanks);
  const isFetchingBanks = useBankStore((s) => s.isFetchingBanks);
  const fetchBanksError = useBankStore((s) => s.fetchBanksError);
  const fetchSupportedBanks = useBankStore((s) => s.fetchSupportedBanks);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('ALL');

  useFocusEffect(
    useCallback(() => {
      fetchSupportedBanks();
    }, [fetchSupportedBanks]),
  );

  const filteredBanks = useMemo(() => {
    let banks = supportedBanks;

    if (selectedMarket !== 'ALL') {
      banks = banks.filter((b) => b.market === selectedMarket);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      banks = banks.filter((b) => b.displayName.toLowerCase().includes(query));
    }

    return sortBanks(banks);
  }, [supportedBanks, selectedMarket, searchQuery]);

  const handleBankSelect = useCallback(
    (bank: SupportedBank) => {
      navigation.navigate('BankConnection', { autoConnect: true });
    },
    [navigation],
  );

  const handleRetry = useCallback(() => {
    fetchSupportedBanks();
  }, [fetchSupportedBanks]);

  const handleMarketSelect = useCallback((marketCode: string) => {
    setSelectedMarket(marketCode);
  }, []);

  // Loading state
  if (isFetchingBanks && supportedBanks.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" accessibilityLabel="Loading supported banks" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading supported banks...
        </Text>
      </View>
    );
  }

  // Error state
  if (fetchBanksError && supportedBanks.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyMedium" style={styles.errorText}>
          {fetchBanksError.message}
        </Text>
        <Button mode="contained" onPress={handleRetry} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search banks..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
        accessibilityLabel="Search banks"
      />

      <View style={styles.chipContainer}>
        <FlatList
          data={MARKETS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.chipList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedMarket === item.code}
              onPress={() => handleMarketSelect(item.code)}
              style={styles.chip}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      <FlatList
        data={filteredBanks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BankListItem bank={item} onPress={handleBankSelect} />
        )}
        ListEmptyComponent={
          <Surface style={styles.emptyContainer} elevation={0}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {searchQuery.trim() || selectedMarket !== 'ALL'
                ? "Your bank isn't supported yet. You can continue using manual entry."
                : 'No banks found.'}
            </Text>
          </Surface>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  chipContainer: {
    marginBottom: 8,
  },
  chipList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 4,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
