import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { createPayment } from '../../db/payments';

export default function NewPaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showAlert, alertProps } = useAlert();

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) { showAlert('Required', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      await createPayment({ order_id: Number(orderId), amount: parseFloat(amount), mode, notes });
      showAlert('Payment Recorded', `₹${amount} added`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) { showAlert('Error', 'Failed to save'); console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.background }]} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.form}>
        <Text style={styles.label}>Amount *</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="₹0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" autoFocus />
        <Text style={[styles.label, { marginTop: 16 }]}>Payment mode</Text>
        <View style={styles.chipsRow}>
          {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => (
            <TouchableOpacity key={m} style={[styles.chip, mode === m && styles.chipActive]} onPress={() => setMode(m)}>
              <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { marginTop: 16 }]}>Notes</Text>
        <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="e.g., Final balance" placeholderTextColor={Colors.textTertiary} />
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Record Payment'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white, marginTop: 'auto' as any },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
