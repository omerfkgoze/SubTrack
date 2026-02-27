import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';

const CARD_HEIGHT = 72;
const CARD_BORDER_RADIUS = 12;

function SkeletonCard() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const bgColor = theme.colors.surfaceVariant;

  return (
    <Animated.View style={[styles.card, { opacity, backgroundColor: bgColor }]}>
      <View style={[styles.stripe, { backgroundColor: theme.colors.outlineVariant }]} />
      <View style={styles.content}>
        <View style={[styles.iconPlaceholder, { backgroundColor: theme.colors.outlineVariant }]} />
        <View style={styles.textArea}>
          <View style={[styles.titlePlaceholder, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={[styles.subtitlePlaceholder, { backgroundColor: theme.colors.outlineVariant }]} />
        </View>
        <View style={[styles.pricePlaceholder, { backgroundColor: theme.colors.outlineVariant }]} />
      </View>
    </Animated.View>
  );
}

function SkeletonHeader() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.header, { opacity }]}>
      <View style={[styles.headerLine1, { backgroundColor: theme.colors.surfaceVariant }]} />
      <View style={[styles.headerLine2, { backgroundColor: theme.colors.surfaceVariant }]} />
    </Animated.View>
  );
}

export function SubscriptionListSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonHeader />
      <SkeletonCard />
      <View style={styles.separator} />
      <SkeletonCard />
      <View style={styles.separator} />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
    padding: 16,
  },
  headerLine1: {
    height: 28,
    width: 180,
    borderRadius: 4,
  },
  headerLine2: {
    height: 16,
    width: 120,
    borderRadius: 4,
    marginTop: 8,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderBottomLeftRadius: CARD_BORDER_RADIUS,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  textArea: {
    flex: 1,
  },
  titlePlaceholder: {
    height: 16,
    width: '70%',
    borderRadius: 4,
  },
  subtitlePlaceholder: {
    height: 12,
    width: '50%',
    borderRadius: 4,
    marginTop: 6,
  },
  pricePlaceholder: {
    height: 16,
    width: 60,
    borderRadius: 4,
  },
  separator: {
    height: 12,
  },
});
