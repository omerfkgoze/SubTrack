import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, Icon, Snackbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@app/navigation/types';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { PremiumStatusCard } from '@features/premium/components/PremiumStatusCard';
import { MONTHLY_SKU, YEARLY_SKU } from '@features/premium/config/iapProducts';
import { fetchSubscriptions } from '@features/premium/services/purchaseService';
import type { Subscription } from 'react-native-iap';

const FREE_FEATURES = [
  'Up to 5 subscriptions',
  'Basic renewal reminders',
  'Basic spending overview',
];

const PREMIUM_FEATURES = [
  'Unlimited subscriptions',
  'Advanced reminder options',
  'Calendar sync',
  'Data export (CSV/JSON)',
  'Full analytics & insights',
];

export function PaywallScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [selectedSku, setSelectedSku] = React.useState(YEARLY_SKU);
  const [products, setProducts] = React.useState<Subscription[]>([]);

  const isPremium = usePremiumStore((s) => s.isPremium);
  const purchaseInProgress = usePremiumStore((s) => s.purchaseInProgress);
  const expiresAt = usePremiumStore((s) => s.expiresAt);
  const purchaseErrorMessage = usePremiumStore((s) => s.purchaseErrorMessage);

  const isExpired = !isPremium && expiresAt !== null;

  React.useEffect(() => {
    fetchSubscriptions()
      .then(setProducts)
      .catch(() => {
        // Products will show fallback prices
      });
  }, []);

  const getPrice = (sku: string, fallback: string): string => {
    const product = products.find((p) => p.productId === sku);
    return product?.localizedPrice ?? fallback;
  };

  const getOfferToken = (sku: string): string | undefined => {
    const product = products.find((p) => p.productId === sku);
    return product?.subscriptionOfferDetails?.[0]?.offerToken;
  };

  const handleUpgradePress = async () => {
    try {
      const offerToken = getOfferToken(selectedSku);
      await usePremiumStore.getState().purchaseSubscription(selectedSku, offerToken);
    } catch {
      setSnackbarMessage('Failed to start purchase. Please try again.');
    }
  };

  // Listen for purchase completion via store state changes
  const prevPurchaseInProgress = React.useRef(purchaseInProgress);
  React.useEffect(() => {
    if (prevPurchaseInProgress.current && !purchaseInProgress) {
      if (isPremium) {
        setSnackbarMessage('🎉 Welcome to Premium! All features are now unlocked.');
      } else if (purchaseErrorMessage) {
        setSnackbarMessage(purchaseErrorMessage);
        usePremiumStore.getState().clearPurchaseError();
      }
    }
    prevPurchaseInProgress.current = purchaseInProgress;
  }, [purchaseInProgress, isPremium, purchaseErrorMessage]);

  const handleDismiss = () => {
    navigation.goBack();
  };

  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <PremiumStatusCard onManageError={(msg) => setSnackbarMessage(msg)} />
        </ScrollView>
        <Snackbar
          visible={!!snackbarMessage}
          onDismiss={() => setSnackbarMessage('')}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </SafeAreaView>
    );
  }

  const monthlyPrice = getPrice(MONTHLY_SKU, '€2.99');
  const yearlyPrice = getPrice(YEARLY_SKU, '€24.99');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Icon source="crown" size={48} color={theme.colors.secondary} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Unlock Premium
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {isExpired
              ? 'Your premium has ended. Renew to keep unlimited access.'
              : 'Upgrade to Premium to track unlimited subscriptions and unlock all features.'}
          </Text>
        </View>

        <View style={[styles.comparisonCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.comparisonColumn}>
            <Text variant="titleMedium" style={[styles.planTitle, { color: theme.colors.onSurfaceVariant }]}>
              Free
            </Text>
            {FREE_FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon source="check" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={[styles.featureText, { color: theme.colors.onSurfaceVariant }]}>
                  {f}
                </Text>
              </View>
            ))}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.comparisonColumn}>
            <Text variant="titleMedium" style={[styles.planTitle, { color: theme.colors.secondary }]}>
              Premium
            </Text>
            {PREMIUM_FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon source="check-circle" size={16} color={theme.colors.secondary} />
                <Text variant="bodySmall" style={[styles.featureText, { color: theme.colors.onSurface }]}>
                  {f}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pricingSection}>
          <Button
            mode={selectedSku === MONTHLY_SKU ? 'contained' : 'outlined'}
            onPress={() => setSelectedSku(MONTHLY_SKU)}
            buttonColor={selectedSku === MONTHLY_SKU ? theme.colors.secondaryContainer : undefined}
            textColor={selectedSku === MONTHLY_SKU ? theme.colors.onSecondaryContainer : theme.colors.onSurface}
            style={[styles.pricingButton, { borderColor: theme.colors.secondary }]}
          >
            {`${monthlyPrice}/month`}
          </Button>
          <Button
            mode={selectedSku === YEARLY_SKU ? 'contained' : 'outlined'}
            onPress={() => setSelectedSku(YEARLY_SKU)}
            buttonColor={selectedSku === YEARLY_SKU ? theme.colors.secondaryContainer : undefined}
            textColor={selectedSku === YEARLY_SKU ? theme.colors.onSecondaryContainer : theme.colors.onSurface}
            style={[styles.pricingButton, { borderColor: theme.colors.secondary }]}
          >
            {`${yearlyPrice}/year · Save 30%`}
          </Button>
        </View>

        <View style={styles.ctaSection}>
          <Button
            mode="contained"
            onPress={handleUpgradePress}
            buttonColor={theme.colors.secondary}
            textColor={theme.colors.onSecondary}
            style={styles.upgradeButton}
            disabled={purchaseInProgress}
          >
            {purchaseInProgress ? 'Processing...' : 'Upgrade to Premium'}
          </Button>
          {purchaseInProgress && (
            <ActivityIndicator size="small" color={theme.colors.secondary} style={styles.loader} />
          )}
          <Button mode="text" onPress={handleDismiss} textColor={theme.colors.onSurfaceVariant}>
            Maybe Later
          </Button>
        </View>

        <View style={styles.legalSection}>
          <Button mode="text" compact textColor={theme.colors.onSurfaceVariant} onPress={() => {}}>
            Restore Purchases
          </Button>
          <Button mode="text" compact textColor={theme.colors.onSurfaceVariant} onPress={() => {}}>
            Terms of Use
          </Button>
          <Button mode="text" compact textColor={theme.colors.onSurfaceVariant} onPress={() => {}}>
            Privacy Policy
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
  },
  comparisonCard: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  comparisonColumn: {
    gap: 8,
  },
  planTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    flex: 1,
  },
  divider: {
    marginVertical: 4,
  },
  pricingSection: {
    gap: 12,
  },
  pricingButton: {
    borderRadius: 12,
  },
  ctaSection: {
    gap: 8,
    alignItems: 'center',
  },
  upgradeButton: {
    borderRadius: 8,
    width: '100%',
  },
  loader: {
    marginTop: 4,
  },
  legalSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
