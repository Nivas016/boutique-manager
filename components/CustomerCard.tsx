import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  name: string;
  phone: string;
  activeOrders: number;
  onPress?: () => void;
}

export default function CustomerCard({ name, phone, activeOrders, onPress }: Props) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.white, shadowColor: Colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: Colors.primaryLight }]}>
        <Text style={[styles.initials, { color: Colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: Colors.text }]}>{name}</Text>
        <Text style={[styles.phone, { color: Colors.textSecondary }]}>{phone}</Text>
      </View>
      {activeOrders > 0 && (
        <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
          <Text style={[styles.badgeText, { color: Colors.primary }]}>{activeOrders}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  initials: { fontSize: 15, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  phone: { fontSize: 13, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
