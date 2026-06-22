import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getCustomerById, updateCustomer, isPhoneUnique } from '../../db/customers';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showAlert, alertProps } = useAlert();

  useFocusEffect(useCallback(() => {
    getCustomerById(Number(id)).then((c) => {
      if (!c) return;
      setName(c.name ?? '');
      setPhone(c.phone ?? '');
      setAddress(c.address ?? '');
      setOccasion(c.occasion ?? '');
      setNotes(c.notes ?? '');
    });
  }, [id]));

  const handleSave = async () => {
    if (name.trim().length < 2) { showAlert('Required', 'Name must be at least 2 characters'); return; }
    if (!/^\d{10}$/.test(phone.trim())) { showAlert('Required', 'Enter a valid 10-digit phone number'); return; }

    setSaving(true);
    try {
      const unique = await isPhoneUnique(phone.trim(), Number(id));
      if (!unique) { showAlert('Duplicate', 'Another customer already has this phone number'); return; }

      await updateCustomer(Number(id), { name: name.trim(), phone: phone.trim(), address, occasion, notes });
      router.back();
    } catch {
      showAlert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.background }]} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
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
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  textArea: { minHeight: 80, paddingTop: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
