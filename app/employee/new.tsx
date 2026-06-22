import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { createEmployee, setEmployeeRate } from '../../db/employees';
import { DEFAULT_GARMENTS } from '../../constants/garments';

export default function NewEmployeeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [spec, setSpec] = useState('');
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { showAlert, alertProps } = useAlert();

  const handleSave = async () => {
    if (name.trim().length < 2) { showAlert('Required', 'Enter a valid name'); return; }
    setSaving(true);
    try {
      const empId = await createEmployee({ name, phone, specialization: spec });
      for (const [garmentType, rateStr] of Object.entries(rates)) {
        const rate = parseFloat(rateStr);
        if (!isNaN(rate) && rate > 0) {
          await setEmployeeRate(empId, garmentType, rate);
        }
      }
      showAlert('Saved', `${name.trim()} added`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) { showAlert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.background }]} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.form} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.field}><Text style={styles.label}>Name *</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Employee name" placeholderTextColor={Colors.textTertiary} autoFocus autoCapitalize="words" /></View>
        <View style={styles.field}><Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" /></View>
        <View style={styles.field}>
          <Text style={styles.label}>Specialization</Text>
          <View style={styles.chips}>
            {['Stitching', 'Embroidery', 'Cutting', 'All-round'].map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, spec === s && styles.chipOn]} onPress={() => setSpec(s)}>
                <Text style={[styles.chipT, spec === s && styles.chipTOn]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Stitching rate per garment (₹)</Text>
          <Text style={styles.sublabel}>Leave blank if rate not applicable. Embroidery rates vary per order — enter them when creating an order.</Text>
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
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnT}>{saving ? 'Saving...' : 'Add Employee'}</Text>
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
  sublabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8, lineHeight: 16 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipT: { fontSize: 13, color: Colors.textSecondary },
  chipTOn: { color: Colors.primary, fontWeight: '600' },
  rateCard: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  rateRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  rateLabel: { fontSize: 15, color: Colors.text, flex: 1 },
  rateInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rateCurrency: { fontSize: 14, color: Colors.textSecondary },
  rateInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, color: Colors.text, textAlign: 'right', minWidth: 80 },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnT: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
