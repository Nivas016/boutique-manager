import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getCalendarDates, getOrders } from '../../db/orders';
import { OrderWithDetails } from '../../types';
import { formatDateShort, isOverdue, isDueToday } from '../../utils/dates';
import OrderCard from '../../components/OrderCard';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split('T')[0]);
  const [dateOrders, setDateOrders] = useState<Record<string, { count: number; hasOverdue: boolean }>>({});
  const [dayOrders, setDayOrders] = useState<OrderWithDetails[]>([]);

  // On focus: reset to today and immediately fetch today's data directly
  // (cannot rely on setSelectedDate being committed before the orders fetch)
  useFocusEffect(useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(todayStr);
    getCalendarDates(now.getFullYear(), now.getMonth()).then(setDateOrders);
    getOrders({ promisedDate: todayStr }).then(setDayOrders);
  }, []));

  // When user navigates to a different month
  useFocusEffect(useCallback(() => {
    getCalendarDates(year, month).then(setDateOrders);
  }, [year, month]));

  // When user taps a date — runs after state commits, so selectedDate is current
  useEffect(() => {
    if (selectedDate) {
      getOrders({ promisedDate: selectedDate }).then(setDayOrders);
    }
  }, [selectedDate]);

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const goToPrev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const goToNext = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const todayStr = today.toISOString().split('T')[0];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrev}><Ionicons name="chevron-back" size={22} color={Colors.text} /></TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={goToNext}><Ionicons name="chevron-forward" size={22} color={Colors.text} /></TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d) => <Text key={d} style={styles.weekLabel}>{d}</Text>)}
        </View>
        <View style={styles.grid}>
          {calendarDays.map((day, i) => {
            if (day === null) return <View key={`e-${i}`} style={styles.dayCell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const orderInfo = dateOrders[dateStr];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <TouchableOpacity key={dateStr} style={[styles.dayCell, isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]} onPress={() => setSelectedDate(dateStr)}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday, isSelected && styles.dayTextSelected]}>{day}</Text>
                {orderInfo && <View style={[styles.dot, { backgroundColor: orderInfo.hasOverdue ? Colors.danger : Colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedDate && (
          <View style={styles.dayOrders}>
            <Text style={styles.dayOrdersTitle}>{selectedDate === todayStr ? 'Today' : formatDateShort(selectedDate)}</Text>
            {dayOrders.length > 0 ? dayOrders.map((order) => (
              <OrderCard key={order.id} orderNumber={order.order_number} customerName={order.customer_name} garmentType={order.garment_type} status={order.status} promisedDate={formatDateShort(order.promised_date)} balance={order.balance} isOverdue={isOverdue(order.promised_date) && !['delivered','cancelled'].includes(order.status)} isDueToday={isDueToday(order.promised_date)} onPress={() => router.push(`/order/${order.id}`)} />
            )) : <Text style={styles.noOrders}>No orders due this day</Text>}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  monthTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  weekRow: { flexDirection: 'row', paddingHorizontal: 8 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500', color: Colors.textTertiary, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  dayCell: { width: '14.28%', height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dayCellToday: { backgroundColor: Colors.primaryLight, borderRadius: 20 },
  dayCellSelected: { backgroundColor: Colors.primary, borderRadius: 20 },
  dayText: { fontSize: 14, color: Colors.text },
  dayTextToday: { fontWeight: '700', color: Colors.primary },
  dayTextSelected: { fontWeight: '700', color: Colors.white },
  dot: { position: 'absolute', bottom: 4, width: 6, height: 6, borderRadius: 3 },
  dayOrders: { paddingHorizontal: 16, marginTop: 16 },
  dayOrdersTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  noOrders: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
});
