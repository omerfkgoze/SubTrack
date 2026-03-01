import React from 'react';
import { Chip } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import type { SubscriptionCategory } from '@config/categories';

interface CategoryChipProps {
  category: SubscriptionCategory;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function CategoryChip({ category, selected, onPress, disabled = false }: CategoryChipProps) {
  return (
    <Chip
      selected={selected}
      onPress={onPress}
      icon={category.icon}
      disabled={disabled}
      style={[
        styles.chip,
        selected && { backgroundColor: category.color + '1F' },
      ]}
      accessibilityLabel={`${category.label} category`}
      accessibilityRole="button"
    >
      {category.label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginRight: 8,
    minHeight: 44,
  },
});
