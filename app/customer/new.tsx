import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { createCustomer, isPhoneUnique } from '../../db/customers';

export default function NewCustomerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showAlert, alertProps } = useAlert();

  const handleSave = async () => {
    if (name.trim().length < 2) {
      showAlert('Validation', 'Name must be at least 2 characters');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      showAlert('Validation', 'Enter a valid 10-digit phone number');
      return;
    }

    setSaving(true);
    try {
      const unique = await isPhoneUnique(phone);
      if (!unique) {
        showAlert('Duplicate', 'A customer with this phone number already exists');
        setSaving(false);
        return;
      }

      await createCustomer({ name, phone, address, notes, occasion });
      showAlert('Saved', `${name.trim()} added successfully`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      showAlert('Error', 'Failed to save customer');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Customer name" placeholderTextColor={Colors.textTertiary} autoFocus />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Phone *</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" maxLength={10} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} placeholder="Full address" placeholderTextColor={Colors.textTertiary} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Usual Occasion</Text>
          <TextInput style={styles.input} value={occasion} onChangeText={setOccasion} placeholder="e.g., Wedding, Festival, Daily wear" placeholderTextColor={Colors.textTertiary} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Preferences, special instructions..." placeholderTextColor={Colors.textTertiary} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Customer'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  form: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  textArea: { minHeight: 80, paddingTop: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
