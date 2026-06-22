import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { globalSearch } from '../db/search';
import { formatDateShort, isOverdue } from '../utils/dates';
import SearchBar from '../components/SearchBar';
import OrderCard from '../components/OrderCard';
import CustomerCard from '../components/CustomerCard';

export default function SearchScreen() {
  const router = useRouter();
  useTheme();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length >= 2) {
      const results = await globalSearch(text);
      setCustomers(results.customers);
      setOrders(results.orders);
    } else {
      setCustomers([]); setOrders([]);
    }
  };

  const hasResults = customers.length > 0 || orders.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}><SearchBar placeholder="Name, phone, order #, design #..." onSearch={handleSearch} autoFocus /></View>
      </View>
      {!hasResults && query.length < 2 && (
        <View style={styles.hint}>
          <Ionicons name="search-outline" size={40} color={Colors.borderLight} />
          <Text style={styles.hintText}>Search by customer name, phone number, order number, or design number</Text>
        </View>
      )}
      {hasResults && (
        <ScrollViewResults customers={customers} orders={orders} router={router} />
      )}
    </SafeAreaView>
  );
}

function ScrollViewResults({ customers, orders, router }: any) {
  return (
    <FlatList
      data={[
        ...(customers.length > 0 ? [{ type: 'header', title: 'Customers' }] : []),
        ...customers.map((c: any) => ({ ...c, type: 'customer' })),
        ...(orders.length > 0 ? [{ type: 'header', title: 'Orders' }] : []),
        ...orders.map((o: any) => ({ ...o, type: 'order' })),
      ]}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        if (item.type === 'header') return <Text style={styles.sectionTitle}>{item.title}</Text>;
        if (item.type === 'customer') return <CustomerCard name={item.name} phone={item.phone} activeOrders={item.active_orders} onPress={() => router.push(`/customer/${item.id}`)} />;
        if (item.type === 'order') return <OrderCard orderNumber={item.order_number} customerName={item.customer_name} garmentType={item.garment_type} status={item.status} promisedDate={formatDateShort(item.promised_date)} balance={item.balance} isOverdue={isOverdue(item.promised_date) && !['delivered','cancelled'].includes(item.status)} onPress={() => router.push(`/order/${item.id}`)} />;
        return null;
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { padding: 4 },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  hintText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
});
