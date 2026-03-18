import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  RadioButton,
  Button,
  Snackbar,
  useTheme,
  List,
} from 'react-native-paper';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { exportToJSON, exportToCSV } from '@features/settings/services/exportService';

type ExportFormat = 'json' | 'csv';

export function DataExportScreen() {
  const theme = useTheme();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const fetchSubscriptions = useSubscriptionStore((s) => s.fetchSubscriptions);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    isError: boolean;
  }>({
    visible: false,
    message: '',
    isError: false,
  });

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleExport = useCallback(async () => {
    if (subscriptions.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      if (format === 'json') {
        await exportToJSON(subscriptions);
      } else {
        await exportToCSV(subscriptions);
      }
      setSnackbar({ visible: true, message: 'Export complete', isError: false });
    } catch {
      setSnackbar({
        visible: true,
        message: 'Export failed. Please try again.',
        isError: true,
      });
    } finally {
      setIsExporting(false);
    }
  }, [subscriptions, format, isExporting]);

  const isEmpty = subscriptions.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <List.Section>
          <List.Subheader>Export Format</List.Subheader>
          <RadioButton.Group
            onValueChange={(v) => setFormat(v as ExportFormat)}
            value={format}
          >
            <RadioButton.Item
              label="JSON"
              value="json"
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item
              label="CSV"
              value="csv"
              labelStyle={styles.radioLabel}
            />
          </RadioButton.Group>
        </List.Section>

        {isEmpty ? (
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            No data to export. Add subscriptions first.
          </Text>
        ) : (
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleExport}
              disabled={isExporting || isEmpty}
              loading={isExporting}
              accessibilityLabel="Export"
              accessibilityRole="button"
            >
              Export
            </Button>
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        duration={snackbar.isError ? 5000 : 3000}
        style={snackbar.isError ? { backgroundColor: theme.colors.error } : undefined}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  radioLabel: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 24,
  },
});
