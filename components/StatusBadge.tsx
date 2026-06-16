import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ORDER_STATUSES, OrderStatusKey } from '../constants/statuses';

interface Props {
  status: OrderStatusKey;
  small?: boolean;
}

export default function StatusBadge({ status, small }: Props) {
  const config = ORDER_STATUSES[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, small && styles.small]}>
      <Text style={[styles.text, { color: config.color }, small && styles.smallText]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 11,
  },
});
