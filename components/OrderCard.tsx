import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { OrderStatusKey } from '../constants/statuses';
import StatusBadge from './StatusBadge';

interface Props {
  orderNumber: string;
  customerName: string;
  garmentType: string;
  status: OrderStatusKey;
  promisedDate: string;
  balance: number;
  isOverdue?: boolean;
  isDueToday?: boolean;
  onPress?: () => void;
}

export default function OrderCard({
  orderNumber,
  customerName,
  garmentType,
  status,
  promisedDate,
  balance,
  isOverdue,
  isDueToday,
  onPress,
}: Props) {
  const borderColor = isOverdue
    ? Colors.danger
    : isDueToday
      ? Colors.warning
      : Colors.primary;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.info}>
          <Text style={styles.customerName}>{customerName}</Text>
          <Text style={styles.meta}>
            {orderNumber} · {garmentType}
          </Text>
        </View>
        <StatusBadge status={status} small />
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
          <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
            {isOverdue ? 'Overdue · ' : isDueToday ? 'Due today · ' : ''}
            {promisedDate}
          </Text>
        </View>
        {balance > 0 ? (
          <Text style={styles.balanceText}>₹{balance.toLocaleString('en-IN')} due</Text>
        ) : (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
            <Text style={styles.paidText}>Paid</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 10,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.1,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  overdueText: {
    color: Colors.danger,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  paidText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
});
