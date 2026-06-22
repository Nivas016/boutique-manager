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
  const borderColor = isOverdue ? Colors.danger : isDueToday ? Colors.warning : Colors.primary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.white, borderLeftColor: borderColor, shadowColor: Colors.cardShadow }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.info}>
          <Text style={[styles.customerName, { color: Colors.text }]}>{customerName}</Text>
          <Text style={[styles.meta, { color: Colors.textSecondary }]}>
            {orderNumber} · {garmentType}
          </Text>
        </View>
        <StatusBadge status={status} small />
      </View>

      <View style={[styles.divider, { backgroundColor: Colors.borderLight }]} />

      <View style={styles.bottomRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
          <Text style={[styles.dateText, { color: isOverdue ? Colors.danger : Colors.textSecondary }, isOverdue && styles.overdueText]}>
            {isOverdue ? 'Overdue · ' : isDueToday ? 'Due today · ' : ''}
            {promisedDate}
          </Text>
        </View>
        {balance > 0 ? (
          <Text style={[styles.balanceText, { color: Colors.danger }]}>₹{balance.toLocaleString('en-IN')} due</Text>
        ) : (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
            <Text style={[styles.paidText, { color: Colors.success }]}>Paid</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flex: 1, marginRight: 10 },
  customerName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  meta: { fontSize: 12, marginTop: 3, letterSpacing: 0.1 },
  divider: { height: 1, marginVertical: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12 },
  overdueText: { fontWeight: '600' },
  balanceText: { fontSize: 12, fontWeight: '600' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  paidText: { fontSize: 12, fontWeight: '600' },
});
