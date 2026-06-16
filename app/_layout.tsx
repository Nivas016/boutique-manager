import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/colors';
import { View, ActivityIndicator, Text } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';

export default function RootLayout() {
  const { isReady, error } = useDatabase();

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <Text style={{ color: Colors.danger, padding: 20, textAlign: 'center' }}>Database error: {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="customer/new"
          options={{
            headerShown: true,
            title: 'New Customer',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="customer/[id]"
          options={{
            headerShown: true,
            title: 'Customer',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="customer/edit"
          options={{
            headerShown: true,
            title: 'Edit Customer',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="order/new"
          options={{
            headerShown: true,
            title: 'New Order',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="order/[id]"
          options={{
            headerShown: true,
            title: 'Order Details',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="order/edit"
          options={{
            headerShown: true,
            title: 'Edit Order',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="measurement/new"
          options={{
            headerShown: true,
            title: 'Add Measurement',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="measurement/[id]"
          options={{
            headerShown: true,
            title: 'Measurement',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="payment/new"
          options={{
            headerShown: true,
            title: 'Add Payment',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="employee/index"
          options={{
            headerShown: true,
            title: 'Employees',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="employee/new"
          options={{
            headerShown: true,
            title: 'Add Employee',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="employee/[id]"
          options={{
            headerShown: true,
            title: 'Employee',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="employee/edit"
          options={{
            headerShown: true,
            title: 'Edit Employee',
            headerTintColor: Colors.text,
            headerStyle: { backgroundColor: Colors.white },
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}
