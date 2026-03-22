import React, { useState } from 'react';
import { List, Avatar } from 'react-native-paper';
import type { SupportedBank } from '../types';

interface BankListItemProps {
  bank: SupportedBank;
  onPress: (bank: SupportedBank) => void;
}

export function BankListItem({ bank, onPress }: BankListItemProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <List.Item
      title={bank.displayName}
      description={bank.market}
      left={() =>
        bank.iconUrl && !imageError ? (
          <Avatar.Image
            size={40}
            source={{ uri: bank.iconUrl }}
            onError={() => setImageError(true)}
          />
        ) : (
          <Avatar.Icon size={40} icon="bank" />
        )
      }
      onPress={() => onPress(bank)}
      accessibilityLabel={`${bank.displayName} - ${bank.market}`}
      accessibilityRole="button"
    />
  );
}
