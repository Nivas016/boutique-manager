import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getEmployees } from '../../db/employees';
import { EmployeeWithWorkload } from '../../types';
import FAB from '../../components/FAB';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/currency';

export default function EmployeeListScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithWorkload[]>([]);
  useFocusEffect(useCallback(() => { getEmployees().then(setEmployees); }, []));

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={employees}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/employee/${item.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}><Text style={styles.init}>{item.name[0]}</Text></View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.spec}>{item.specialization || 'General'}</Text>
              {item.monthly_earnings > 0 && (
                <Text style={styles.earningsText}>{formatCurrency(item.monthly_earnings)} this month</Text>
              )}
            </View>
            <View style={styles.right}>
              <View style={styles.badge}><Text style={styles.badgeT}>{item.active_orders} active</Text></View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} style={{ marginTop: 6 }} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No employees" subtitle="Add your tailors here" />}
      />
      <FAB icon="person-add-outline" onPress={() => router.push('/employee/new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, padding: 14, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  init: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  spec: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  rateText: { fontSize: 12, color: Colors.textTertiary },
  earningsText: { fontSize: 12, color: Colors.success, fontWeight: '500' },
  right: { alignItems: 'flex-end' },
  badge: { backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeT: { fontSize: 12, fontWeight: '500', color: Colors.info },
});
