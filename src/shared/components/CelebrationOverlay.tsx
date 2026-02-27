import React, { useEffect } from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface CelebrationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  message?: string;
}

export function CelebrationOverlay({
  visible,
  onDismiss,
  message = 'Great start!',
}: CelebrationOverlayProps) {
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Portal>
      <TouchableWithoutFeedback onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss celebration">
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}
        >
          <View style={styles.content}>
            <LottieView
              source={require('../../../assets/animations/confetti.json')}
              autoPlay
              loop={false}
              style={styles.animation}
            />
            <Text variant="headlineMedium" style={[styles.message, { color: theme.colors.inverseSurface }]}>
              {message}
            </Text>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  animation: {
    width: 300,
    height: 300,
  },
  message: {
    fontWeight: 'bold',
    marginTop: 16,
  },
});
