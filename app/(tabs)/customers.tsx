import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { CustomerWithStats } from '../../types';
import { getCustomers } from '../../db/customers';
import SearchBar from '../../components/SearchBar';
import CustomerCard from '../../components/CustomerCard';
import FAB from '../../components/FAB';
import EmptyState from '../../components/EmptyState';

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomers(search);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Name or phone number..."
          onSearch={setSearch}
        />
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CustomerCard
            name={item.name}
            phone={item.phone}
            activeOrders={item.active_orders}
            onPress={() => router.push(`/customer/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="people-outline"
              title={search ? 'No matches found' : 'No customers yet'}
              subtitle={search ? 'Try a different search' : 'Tap + to add your first customer'}
            />
          ) : null
        }
      />

      <FAB icon="person-add-outline" onPress={() => router.push('/customer/new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
});
