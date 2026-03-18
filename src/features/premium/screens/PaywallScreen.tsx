import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Icon, Snackbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@app/navigation/types';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { PremiumStatusCard } from '@features/premium/components/PremiumStatusCard';

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
  const isPremium = usePremiumStore((s) => s.isPremium);

  const handleUpgradePress = () => {
    setSnackbarMessage('Coming soon');
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Icon source="crown" size={48} color={theme.colors.secondary} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Unlock Premium
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Upgrade to Premium to track unlimited subscriptions and unlock all features.
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
          <View style={[styles.pricingOption, { borderColor: theme.colors.secondary }]}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              €2.99/month
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Billed monthly. Auto-renews. Cancel anytime.
            </Text>
          </View>
          <View style={[styles.pricingOption, styles.pricingHighlight, { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondaryContainer }]}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSecondaryContainer }}>
              €24.99/year
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer }}>
              Save 30% · Billed annually. Auto-renews. Cancel anytime.
            </Text>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Button
            mode="contained"
            onPress={handleUpgradePress}
            buttonColor={theme.colors.secondary}
            textColor={theme.colors.onSecondary}
            style={styles.upgradeButton}
          >
            Upgrade to Premium
          </Button>
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
  pricingOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  pricingHighlight: {
    borderWidth: 2,
  },
  ctaSection: {
    gap: 8,
  },
  upgradeButton: {
    borderRadius: 8,
  },
  legalSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
