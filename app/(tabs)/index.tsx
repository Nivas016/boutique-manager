import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Platform, StatusBar, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getDashboardStats, getOrders } from '../../db/orders';
import { getSetting } from '../../db/settings';
import { OrderWithDetails } from '../../types';
import { formatDateShort, isOverdue, isDueToday } from '../../utils/dates';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';

const TOP_PADDING = Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 8 : 16;

export default function Dashboard() {
  const router = useRouter();
  useTheme(); // subscribe to theme changes so inline Colors.* props update
  const [stats, setStats] = useState({ overdue: 0, dueToday: 0, dueTomorrow: 0, active: 0 });
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [shopName, setShopName] = useState('My Boutique');

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const s = await getDashboardStats();
        setStats(s);
        const o = await getOrders({ status: 'active' });
        setOrders(o.slice(0, 10));
        const name = await getSetting('shop_name');
        if (name) setShopName(name);
      }
      load();
    }, [])
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.safe, { backgroundColor: Colors.background }]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primaryLight, Colors.background, Colors.background]} style={styles.headerGradient}>
          <View style={[styles.header, { paddingTop: TOP_PADDING }]}>
            <View style={styles.headerLeft}>
              <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
              <View>
                <Text style={styles.greeting}>{greeting()} ✨</Text>
                <Text style={styles.shopName}>{shopName || 'My Boutique'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/search')}>
              <Ionicons name="search-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statCard, { backgroundColor: Colors.dangerLight }]} onPress={() => router.push({ pathname: '/(tabs)/orders', params: { filter: 'overdue' } } as any)} activeOpacity={0.75}>
              <View style={styles.statIconWrap}><Ionicons name="alert-circle" size={18} color={Colors.danger} /></View>
              <Text style={[styles.statNumber, { color: Colors.danger }]}>{stats.overdue}</Text>
              <Text style={[styles.statLabel, { color: Colors.danger }]}>Overdue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, { backgroundColor: Colors.warningLight }]} onPress={() => router.push({ pathname: '/(tabs)/orders', params: { filter: 'today' } } as any)} activeOpacity={0.75}>
              <View style={styles.statIconWrap}><Ionicons name="time" size={18} color={Colors.warning} /></View>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.dueToday}</Text>
              <Text style={[styles.statLabel, { color: Colors.warning }]}>Due today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, { backgroundColor: Colors.primaryLight }]} onPress={() => router.push({ pathname: '/(tabs)/orders', params: { filter: 'tomorrow' } } as any)} activeOpacity={0.75}>
              <View style={styles.statIconWrap}><Ionicons name="calendar" size={18} color={Colors.primary} /></View>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.dueTomorrow}</Text>
              <Text style={[styles.statLabel, { color: Colors.primary }]}>Tomorrow</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/order/new')} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.primary, Colors.primaryMuted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickIconGradient}>
              <Ionicons name="add" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.quickLabel}>New order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/customer/new')} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.success, '#34D399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickIconGradient}>
              <Ionicons name="person-add-outline" size={18} color="#FFF" />
            </LinearGradient>
            <Text style={styles.quickLabel}>New customer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active orders <Text style={styles.sectionCount}>({stats.active})</Text></Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>

          {orders.length > 0 ? orders.map((order) => (
            <OrderCard
              key={order.id}
              orderNumber={order.order_number}
              customerName={order.customer_name}
              garmentType={order.garment_type}
              status={order.status}
              promisedDate={formatDateShort(order.promised_date)}
              balance={order.balance}
              isOverdue={isOverdue(order.promised_date) && !['delivered', 'cancelled'].includes(order.status)}
              isDueToday={isDueToday(order.promised_date) && !['delivered', 'cancelled'].includes(order.status)}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          )) : (
            <EmptyState icon="receipt-outline" title="No active orders" subtitle="Create your first order to get started" />
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  headerGradient: { paddingBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 42, height: 42, borderRadius: 21 },
  greeting: { fontSize: 14, color: Colors.textSecondary, letterSpacing: 0.2 },
  shopName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 2, letterSpacing: -0.3 },
  searchBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 16 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  statIconWrap: { marginBottom: 6 },
  statNumber: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 20 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 16, padding: 16, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  quickIconGradient: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, letterSpacing: 0.1 },
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  sectionCount: { fontSize: 14, fontWeight: '500', color: Colors.textTertiary },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
