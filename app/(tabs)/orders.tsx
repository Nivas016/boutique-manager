import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { OrderWithDetails } from '../../types';
import { getOrders } from '../../db/orders';
import { formatDateShort, isOverdue, isDueToday } from '../../utils/dates';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import OrderCard from '../../components/OrderCard';
import FAB from '../../components/FAB';
import EmptyState from '../../components/EmptyState';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'overdue', label: 'Overdue' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getOrders({ search, status: filter });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.searchContainer}>
          <SearchBar placeholder="Order #, customer, design..." onSearch={setSearch} />
        </View>
        <FilterChips chips={FILTERS} selected={filter} onSelect={setFilter} />
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <OrderCard
            orderNumber={item.order_number}
            customerName={item.customer_name}
            garmentType={item.garment_type}
            status={item.status}
            promisedDate={formatDateShort(item.promised_date)}
            balance={item.balance}
            isOverdue={isOverdue(item.promised_date) && !['delivered', 'cancelled'].includes(item.status)}
            isDueToday={isDueToday(item.promised_date) && !['delivered', 'cancelled'].includes(item.status)}
            onPress={() => router.push(`/order/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt-outline"
              title={search || filter !== 'all' ? 'No matching orders' : 'No orders yet'}
              subtitle={!search && filter === 'all' ? 'Tap + to create your first order' : undefined}
            />
          ) : null
        }
      />
      <FAB onPress={() => router.push('/order/new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topSection: { backgroundColor: Colors.background },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
});
