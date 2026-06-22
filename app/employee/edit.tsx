import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Switch,
} from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getEmployeeById, getEmployeeRates, setEmployeeRate, updateEmployee } from '../../db/employees';
import { DEFAULT_GARMENTS } from '../../constants/garments';

export default function EmployeeEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { showAlert, alertProps } = useAlert();

  useFocusEffect(useCallback(() => {
    Promise.all([getEmployeeById(Number(id)), getEmployeeRates(Number(id))]).then(([emp, existingRates]) => {
      if (!emp) return;
      setName(emp.name);
      setPhone(emp.phone ?? '');
      setSpecialization(emp.specialization ?? '');
      setIsActive(emp.is_active === 1);
      const rateMap: Record<string, string> = {};
      for (const r of existingRates) {
        if (r.rate > 0) rateMap[r.garment_type] = String(r.rate);
      }
      setRates(rateMap);
    });
  }, [id]));

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      showAlert('Validation', 'Name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      await updateEmployee(Number(id), {
        name: trimmedName,
        phone: phone.trim() || null,
        specialization: specialization.trim() || null,
        is_active: isActive ? 1 : 0,
      } as any);

      for (const g of DEFAULT_GARMENTS) {
        const rateStr = rates[g.type] || '';
        const rate = rateStr.trim() ? parseFloat(rateStr) : 0;
        await setEmployeeRate(Number(id), g.type, isNaN(rate) ? 0 : rate);
      }

      router.back();
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: Colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Employee name"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Specialization</Text>
          <View style={styles.chips}>
            {['Stitching', 'Embroidery', 'Cutting', 'All-round'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, specialization === s && styles.chipOn]}
                onPress={() => setSpecialization(s)}
              >
                <Text style={[styles.chipT, specialization === s && styles.chipTOn]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Active</Text>
              <Text style={styles.switchSub}>Inactive employees won't appear in order assignment</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
              thumbColor={isActive ? Colors.primary : Colors.textTertiary}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Stitching rate per garment (₹)</Text>
        <Text style={styles.sectionSub}>Embroidery rates vary per order — enter them when creating an order.</Text>
        <View style={styles.rateCard}>
          {DEFAULT_GARMENTS.map((g, i) => (
            <View key={g.type} style={[styles.rateRow, i < DEFAULT_GARMENTS.length - 1 && styles.rateRowBorder]}>
              <Text style={styles.rateLabel}>{g.type}</Text>
              <View style={styles.rateInputWrap}>
                <Text style={styles.rateCurrency}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={rates[g.type] || ''}
                  onChangeText={(v) => setRates((prev) => ({ ...prev, [g.type]: v }))}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 8 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.background },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipT: { fontSize: 13, color: Colors.textSecondary },
  chipTOn: { color: Colors.primary, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  switchLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  switchSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, maxWidth: '80%' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, paddingHorizontal: 4 },
  sectionSub: { fontSize: 12, color: Colors.textTertiary, marginBottom: 10, paddingHorizontal: 4, lineHeight: 16 },
  rateCard: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 20 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  rateRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  rateLabel: { fontSize: 15, color: Colors.text, flex: 1 },
  rateInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rateCurrency: { fontSize: 14, color: Colors.textSecondary },
  rateInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, color: Colors.text, textAlign: 'right', minWidth: 80 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
