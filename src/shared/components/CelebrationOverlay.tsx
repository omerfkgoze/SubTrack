import React, { useEffect } from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { Portal, Text } from 'react-native-paper';
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
          style={styles.overlay}
        >
          <View style={styles.content}>
            <LottieView
              source={require('../../../assets/animations/confetti.json')}
              autoPlay
              loop={false}
              style={styles.animation}
            />
            <Text variant="headlineMedium" style={styles.message}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 16,
  },
});
