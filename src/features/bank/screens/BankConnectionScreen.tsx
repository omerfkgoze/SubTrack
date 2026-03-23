import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Surface,
  Snackbar,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { SettingsStackParamList } from '@app/navigation/types';
import { useBankStore } from '@shared/stores/useBankStore';
import { BankConsentDialog } from '../components/BankConsentDialog';
import {
  buildTinkLinkUrl,
  TINK_REDIRECT_URI,
  parseCallbackFromUrl,
  isTinkCallbackUrl,
  parseTinkError,
} from '../services/bankService';
import { env } from '@config/env';

type FlowState = 'info' | 'consent' | 'preparing' | 'webview' | 'processing';

export function BankConnectionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'BankConnection'>>();
  const autoConnect = route.params?.autoConnect;
  const connections = useBankStore((s) => s.connections);
  const isConnecting = useBankStore((s) => s.isConnecting);
  const connectionError = useBankStore((s) => s.connectionError);
  const initiateConnection = useBankStore((s) => s.initiateConnection);
  const createLinkSession = useBankStore((s) => s.createLinkSession);
  const clearConnectionError = useBankStore((s) => s.clearConnectionError);
  const fetchConnections = useBankStore((s) => s.fetchConnections);
  const isDetecting = useBankStore((s) => s.isDetecting);
  const detectionError = useBankStore((s) => s.detectionError);
  const lastDetectionResult = useBankStore((s) => s.lastDetectionResult);
  const detectSubscriptions = useBankStore((s) => s.detectSubscriptions);
  const fetchDetectedSubscriptions = useBankStore((s) => s.fetchDetectedSubscriptions);
  const detectedSubscriptions = useBankStore((s) => s.detectedSubscriptions);
  const isBankConnected = connections.length > 0;
  const detectedCount = detectedSubscriptions.length;
  const activeConnection = connections.find((c) => c.status === 'active') ?? null;
  const displayConnection = activeConnection ?? connections[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      fetchConnections();
      fetchDetectedSubscriptions();
    }, [fetchConnections, fetchDetectedSubscriptions]),
  );

  const [flowState, setFlowState] = useState<FlowState>(autoConnect ? 'consent' : 'info');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  const [pendingAuthCode, setPendingAuthCode] = useState<string | null>(null);
  const [pendingCredentialsId, setPendingCredentialsId] = useState<string | null>(null);
  const [delegatedCode, setDelegatedCode] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  // navTimerRef is intentionally NOT cleared in the processing effect's cleanup.
  // Clearing it there would cancel navigation when setPendingAuthCode(null) triggers
  // a dependency change and re-runs cleanup mid-flight. Cleared only on unmount.
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const tinkLinkUrl = buildTinkLinkUrl({
    clientId: env.TINK_CLIENT_ID,
    redirectUri: TINK_REDIRECT_URI,
    authorizationCode: delegatedCode ?? undefined,
  });

  // Process auth code AFTER WebView is unmounted (flowState === 'processing')
  // Delay ensures iOS network session is ready after WebView/OAuth redirect
  useEffect(() => {
    if (flowState !== 'processing' || !pendingAuthCode) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      await initiateConnection(pendingAuthCode, pendingCredentialsId);
      if (cancelled) return;

      const currentError = useBankStore.getState().connectionError;
      if (currentError) {
        setSnackbarType('error');
        setSnackbarMessage(currentError.message);
        setPendingAuthCode(null);
        setFlowState('info');
      } else {
        // Switch to info state BEFORE setting navTimer so:
        // 1. Snackbar renders (it lives in the info screen JSX)
        // 2. setPendingAuthCode(null) triggers effect cleanup which would cancel a
        //    local navTimer — using navTimerRef avoids that race condition
        setSnackbarType('success');
        setSnackbarMessage('Bank account connected successfully');
        setFlowState('info');
        setPendingAuthCode(null);
        navTimerRef.current = setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      // navTimerRef is intentionally NOT cleared here — see comment above
    };
  }, [flowState, pendingAuthCode, initiateConnection, navigation]);

  const handleConnectPress = useCallback(() => {
    clearConnectionError();
    setFlowState('consent');
  }, [clearConnectionError]);

  const handleConsentConfirm = useCallback(async () => {
    setFlowState('preparing');
    clearConnectionError();
    const code = await createLinkSession();
    if (code) {
      setDelegatedCode(code);
      setFlowState('webview');
    } else {
      const currentError = useBankStore.getState().connectionError;
      setSnackbarType('error');
      setSnackbarMessage(currentError?.message ?? 'Failed to prepare bank connection. Please try again.');
      setFlowState('info');
    }
  }, [createLinkSession, clearConnectionError]);

  const handleConsentCancel = useCallback(() => {
    setFlowState('info');
  }, []);

  const handleCallbackUrl = useCallback(
    (url: string) => {
      // Check for error in callback
      const tinkError = parseTinkError(url);
      if (tinkError) {
        setSnackbarType('error');
        setSnackbarMessage('Bank connection was cancelled or failed. Please try again.');
        setFlowState('info');
        return;
      }

      // Parse authorization code and credentialsId from callback
      const callbackResult = parseCallbackFromUrl(url);
      if (!callbackResult) {
        setSnackbarType('error');
        setSnackbarMessage('Bank connection failed. Please try again.');
        setFlowState('info');
        return;
      }

      // Store auth code and credentialsId, switch to processing — WebView unmounts,
      // then useEffect picks up and calls Edge Function
      setPendingAuthCode(callbackResult.authorizationCode);
      setPendingCredentialsId(callbackResult.credentialsId);
      setFlowState('processing');
    },
    [],
  );

  const handleWebViewShouldStartLoad = useCallback(
    (request: { url: string }) => {
      if (isTinkCallbackUrl(request.url)) {
        handleCallbackUrl(request.url);
        return false;
      }
      return true;
    },
    [handleCallbackUrl],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const { url } = navState;
      if (url && isTinkCallbackUrl(url) && flowState === 'webview') {
        handleCallbackUrl(url);
      }
    },
    [handleCallbackUrl, flowState],
  );

  const handleRetry = useCallback(() => {
    clearConnectionError();
    setSnackbarMessage('');
    setFlowState('consent');
  }, [clearConnectionError]);

  const handleScanPress = useCallback(async () => {
    if (!activeConnection) return;
    await detectSubscriptions(activeConnection.id);
  }, [activeConnection, detectSubscriptions]);

  const [detectionSnackbarWithReview, setDetectionSnackbarWithReview] = useState(false);

  // Show snackbar on detection result or error
  useEffect(() => {
    if (isDetecting) return;
    if (lastDetectionResult) {
      const count = lastDetectionResult.detectedCount;
      if (count === 0) {
        setDetectionSnackbarWithReview(false);
        setSnackbarType('success');
        setSnackbarMessage('No recurring subscriptions detected yet. We\'ll keep checking as more transaction data becomes available.');
      } else {
        setDetectionSnackbarWithReview(true);
        setSnackbarType('success');
        setSnackbarMessage(`${count} subscription${count === 1 ? '' : 's'} detected!`);
      }
    }
  }, [isDetecting, lastDetectionResult]);

  useEffect(() => {
    if (isDetecting) return;
    if (detectionError) {
      setSnackbarType('error');
      setSnackbarMessage(detectionError.message);
      // Reconnect-type errors are handled by the "Reconnect required" UI state
      // Retryable errors can be retried via the scan button which remains visible
    }
  }, [isDetecting, detectionError]);

  // Preparing session (getting delegated auth code from server)
  if (flowState === 'preparing') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.processingText}>
          Preparing bank connection...
        </Text>
      </View>
    );
  }

  // WebView flow
  if (flowState === 'webview') {
    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: tinkLinkUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleWebViewShouldStartLoad}
          originWhitelist={['https://link.tink.com/*', 'https://*.tink.com/*', 'subtrack://*']}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text variant="bodyMedium" style={styles.loadingText}>
                Loading bank connection...
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  // Processing state
  if (flowState === 'processing' || isConnecting) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.processingText}>
          Setting up your bank connection...
        </Text>
      </View>
    );
  }

  // Info screen (default)
  return (
    <View style={styles.container}>
      {isBankConnected && (
        <Surface style={styles.connectedCard} elevation={1}>
          <View style={styles.connectedRow}>
            <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>
              Bank Connected
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
              {displayConnection?.bankName || 'Open Banking'}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.connectedDetail}>
            Connected {displayConnection ? new Date(displayConnection.connectedAt).toLocaleDateString() : ''}
          </Text>

          {activeConnection ? (
            <>
              {isDetecting ? (
                <View style={styles.scanLoadingContainer}>
                  <ActivityIndicator size="small" />
                  <Text variant="bodySmall" style={styles.scanLoadingText}>
                    Scanning your transactions...
                  </Text>
                </View>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleScanPress}
                  style={styles.scanButton}
                  accessibilityLabel="Scan for Subscriptions"
                  accessibilityRole="button"
                >
                  Scan for Subscriptions
                </Button>
              )}
              {detectedCount > 0 && (
                <Button
                  mode="outlined"
                  icon="eye"
                  onPress={() => navigation.navigate('DetectedReview')}
                  style={styles.reviewButton}
                  accessibilityLabel={`Review ${detectedCount} detected subscription${detectedCount === 1 ? '' : 's'}`}
                  accessibilityRole="button"
                >
                  {`Review Detected (${detectedCount})`}
                </Button>
              )}
              <Text variant="bodySmall" style={styles.lastSyncedText}>
                {activeConnection?.lastSyncedAt
                  ? `Last scanned: ${new Date(activeConnection.lastSyncedAt).toLocaleDateString()}`
                  : 'Never scanned'}
              </Text>
            </>
          ) : (
            <Text
              variant="bodySmall"
              style={[styles.connectedDetail, { color: theme.colors.error }]}
              accessibilityLabel="Reconnect required"
            >
              Reconnect required
            </Text>
          )}
        </Surface>
      )}

      <Surface style={styles.infoCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isBankConnected ? 'Bank Connection' : 'Connect Your Bank'}
        </Text>

        <Text variant="bodyMedium" style={styles.description}>
          Open Banking lets SubTrack securely detect your subscriptions by analyzing your bank
          transactions. This uses Tink, a Visa-backed service trusted by millions.
        </Text>

        <Surface style={styles.securityCard} elevation={0}>
          <Text variant="titleSmall" style={styles.securityTitle}>
            How it works
          </Text>
          <Text variant="bodySmall" style={styles.securityItem}>
            {'\u2022'} You authenticate directly with your bank — SubTrack never sees your credentials
          </Text>
          <Text variant="bodySmall" style={styles.securityItem}>
            {'\u2022'} Only read access to accounts and transactions (last 90 days)
          </Text>
          <Text variant="bodySmall" style={styles.securityItem}>
            {'\u2022'} No payments or transfers can be made
          </Text>
          <Text variant="bodySmall" style={styles.securityItem}>
            {'\u2022'} You can disconnect at any time
          </Text>
          <Text variant="bodySmall" style={styles.securityItem}>
            {'\u2022'} Raw transaction data deleted after 30 days
          </Text>
        </Surface>

        {!isBankConnected && (
          <Button
            mode="contained"
            onPress={handleConnectPress}
            disabled={isConnecting}
            loading={isConnecting}
            style={styles.connectButton}
            contentStyle={styles.connectButtonContent}
            accessibilityLabel="Connect Bank Account"
            accessibilityRole="button"
          >
            Connect Bank Account
          </Button>
        )}

        <Button
          mode="outlined"
          onPress={() => navigation.navigate('SupportedBanks')}
          style={styles.supportedBanksButton}
          accessibilityLabel="View Supported Banks"
          accessibilityRole="button"
        >
          View Supported Banks
        </Button>

        {connectionError && (
          <View style={styles.errorContainer}>
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {connectionError.message}
            </Text>
            <Button
              mode="text"
              onPress={handleRetry}
              accessibilityLabel="Retry bank connection"
              accessibilityRole="button"
            >
              Try Again
            </Button>
          </View>
        )}
      </Surface>

      <BankConsentDialog
        visible={flowState === 'consent'}
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
      />

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={snackbarType === 'error' ? 5000 : 3000}
        accessibilityLiveRegion="polite"
        style={snackbarType === 'error' ? { backgroundColor: theme.colors.error } : undefined}
        action={
          snackbarType === 'error' && detectionError && activeConnection
            ? { label: 'Retry', onPress: handleScanPress }
            : detectionSnackbarWithReview
            ? { label: 'Review', onPress: () => navigation.navigate('DetectedReview') }
            : undefined
        }
      >
        {snackbarMessage}
      </Snackbar>
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
  },
  connectedCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  connectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedDetail: {
    marginTop: 4,
    opacity: 0.7,
  },
  scanButton: {
    marginTop: 12,
  },
  reviewButton: {
    marginTop: 8,
  },
  scanLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  scanLoadingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  lastSyncedText: {
    marginTop: 6,
    opacity: 0.6,
  },
  infoCard: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
  },
  title: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 20,
    lineHeight: 22,
  },
  securityCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  securityTitle: {
    marginBottom: 8,
  },
  securityItem: {
    marginBottom: 4,
    lineHeight: 20,
  },
  connectButton: {
    marginBottom: 8,
  },
  supportedBanksButton: {
    marginBottom: 8,
  },
  connectButtonContent: {
    minHeight: 48,
  },
  errorContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  processingText: {
    marginTop: 16,
  },
});
