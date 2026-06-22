import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getEmployeeById, getEmployeeRates, getEmployeeMonthlyOrders, MonthlyOrderEntry } from '../../db/employees';
import { EmployeeRate, EmployeeWithWorkload } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateShort } from '../../utils/dates';
import { ORDER_STATUSES, OrderStatusKey } from '../../constants/statuses';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  useTheme();

  const [employee, setEmployee] = useState<EmployeeWithWorkload | null>(null);
  const [rates, setRates] = useState<EmployeeRate[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthOrders, setMonthOrders] = useState<MonthlyOrderEntry[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useFocusEffect(useCallback(() => {
    Promise.all([getEmployeeById(Number(id)), getEmployeeRates(Number(id))]).then(([emp, r]) => {
      setEmployee(emp);
      setRates(r);
    });
  }, [id]));

  useEffect(() => {
    getEmployeeMonthlyOrders(Number(id), year, month).then(({ orders, total_earnings }) => {
      setMonthOrders(orders);
      setTotalEarnings(total_earnings);
    });
  }, [id, year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  if (!employee) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: employee.name,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push(`/employee/edit?id=${id}` as any)} style={{ marginRight: 4 }}>
              <Ionicons name="create-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{employee.name[0]}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{employee.name}</Text>
              <Text style={styles.profileSpec}>{employee.specialization || 'General'}</Text>
              {employee.phone ? <Text style={styles.profilePhone}>{employee.phone}</Text> : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{employee.active_orders}</Text>
              <Text style={styles.statLabel}>Active orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{rates.length}</Text>
              <Text style={styles.statLabel}>Garment rates set</Text>
            </View>
          </View>
        </View>

        {/* Rates */}
        {rates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Stitching rates</Text>
            <View style={styles.ratesCard}>
              {rates.map((r, i) => (
                <View key={r.garment_type} style={[styles.rateRow, i < rates.length - 1 && styles.rateRowBorder]}>
                  <Text style={styles.rateGarment}>{r.garment_type}</Text>
                  <Text style={styles.rateAmount}>{formatCurrency(r.rate)}<Text style={styles.rateUnit}> /piece</Text></Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Monthly earnings */}
        <View style={styles.section}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTH_NAMES[month - 1]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}>
              <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? Colors.textTertiary : Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <Text style={styles.earningsLabel}>Total earnings</Text>
              <Text style={styles.earningsValue}>{formatCurrency(totalEarnings)}</Text>
            </View>
            <Text style={styles.earningsSubLabel}>{monthOrders.length} order{monthOrders.length !== 1 ? 's' : ''} this month</Text>
          </View>

          {monthOrders.length > 0 ? (
            <View style={styles.orderList}>
              {monthOrders.map((order) => {
                const statusConfig = ORDER_STATUSES[order.status as OrderStatusKey];
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderRow}
                    onPress={() => router.push(`/order/${order.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderMeta}>
                      <Text style={styles.orderNumber}>{order.order_number} · {order.work_type}</Text>
                      <Text style={styles.orderCustomer}>{order.customer_name} · {order.garment_type}</Text>
                      <Text style={styles.orderDate}>{order.work_type} done {formatDateShort(order.completed_at.split(' ')[0])}</Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderShare}>{formatCurrency(order.share)}</Text>
                      <View style={[styles.statusDot, { backgroundColor: statusConfig?.bgColor ?? Colors.borderLight }]}>
                        <Text style={[styles.statusDotText, { color: statusConfig?.color ?? Colors.textSecondary }]}>
                          {statusConfig?.label ?? order.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyMonth}>
              <Ionicons name="clipboard-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyMonthText}>No orders this month</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  profileCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  profileSpec: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profilePhone: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  ratesCard: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden' },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  rateRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  rateGarment: { fontSize: 15, color: Colors.text },
  rateAmount: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  rateUnit: { fontSize: 12, fontWeight: '400', color: Colors.textSecondary },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthArrow: { padding: 8 },
  monthArrowDisabled: { opacity: 0.3 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  earningsCard: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, marginBottom: 10 },
  earningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  earningsValue: { fontSize: 22, fontWeight: '700', color: Colors.white },
  earningsSubLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  orderList: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden' },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  orderMeta: { flex: 1 },
  orderNumber: { fontSize: 13, fontWeight: '600', color: Colors.text },
  orderCustomer: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  orderDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderShare: { fontSize: 14, fontWeight: '600', color: Colors.success },
  statusDot: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  statusDotText: { fontSize: 10, fontWeight: '600' },
  emptyMonth: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyMonthText: { fontSize: 14, color: Colors.textTertiary },
});
