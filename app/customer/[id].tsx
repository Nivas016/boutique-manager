import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Customer } from '../../types';
import { getCustomerById, softDeleteCustomer } from '../../db/customers';
import { getMeasurements } from '../../db/measurements';
import { getOrders } from '../../db/orders';
import { formatDateShort } from '../../utils/dates';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';

type Tab = 'info' | 'measurements' | 'orders';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const cust = await getCustomerById(Number(id));
        setCustomer(cust);
        if (cust) {
          const m = await getMeasurements(cust.id);
          // Group by label, take latest per label
          const grouped: Record<string, any> = {};
          for (const item of m) {
            if (!grouped[item.label]) grouped[item.label] = item;
          }
          setMeasurements(Object.values(grouped));
          const o = await getOrders({ customerId: cust.id });
          setOrders(o);
        }
      }
      load();
    }, [id])
  );

  if (!customer) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'measurements', label: 'Measurements' },
    { key: 'orders', label: `Orders (${orders.length})` },
  ];

  const initials = customer.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push(`/customer/edit?id=${id}`)} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="create-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.phone}>{customer.phone}</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {activeTab === 'info' && (
          <View style={styles.section}>
            <InfoRow label="Address" value={customer.address} />
            <InfoRow label="Occasion" value={customer.occasion} />
            <InfoRow label="Notes" value={customer.notes} />
          </View>
        )}

        {activeTab === 'measurements' && (
          <View style={styles.section}>
            {measurements.map((m) => {
              const data = JSON.parse(m.data);
              const fieldCount = Object.keys(data).length;
              return (
                <TouchableOpacity key={m.id} style={styles.measurementCard} onPress={() => router.push(`/measurement/${m.id}`)}>
                  <View style={styles.measurementIcon}>
                    <Ionicons name="resize-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.measurementInfo}>
                    <Text style={styles.measurementLabel}>{m.label}</Text>
                    <Text style={styles.measurementMeta}>{fieldCount} fields · {m.unit} · {formatDateShort(m.recorded_at.split(' ')[0])}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/measurement/new?customerId=${id}`)}>
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add measurement</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'orders' && (
          <View style={styles.section}>
            {orders.length > 0 ? orders.map((order) => (
              <OrderCard
                key={order.id}
                orderNumber={order.order_number}
                customerName={order.customer_name}
                garmentType={order.garment_type}
                status={order.status}
                promisedDate={formatDateShort(order.promised_date)}
                balance={order.balance}
                isOverdue={order.promised_date < new Date().toISOString().split('T')[0] && !['delivered', 'cancelled'].includes(order.status)}
                onPress={() => router.push(`/order/${order.id}`)}
              />
            )) : (
              <EmptyState icon="receipt-outline" title="No orders yet" />
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  initials: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 18, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  tabLabelActive: { color: Colors.primary },
  body: { flex: 1 },
  section: { padding: 16 },
  infoRow: { backgroundColor: Colors.white, borderRadius: 10, padding: 14, marginBottom: 8 },
  infoLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 2 },
  infoValue: { fontSize: 15, color: Colors.text },
  measurementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, padding: 14, marginBottom: 8 },
  measurementIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  measurementInfo: { flex: 1 },
  measurementLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  measurementMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', marginTop: 4 },
  addBtnText: { fontSize: 14, fontWeight: '500', color: Colors.primary },
});
