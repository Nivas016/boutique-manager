import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import UnitToggle from '../../components/UnitToggle';
import { DEFAULT_GARMENTS, MeasurementUnit } from '../../constants/garments';
import { createMeasurement } from '../../db/measurements';

export default function NewMeasurementScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();
  const [garmentType, setGarmentType] = useState('');
  const [unit, setUnit] = useState<MeasurementUnit>('in');
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showAlert, alertProps } = useAlert();
  const template = useMemo(() => DEFAULT_GARMENTS.find((g) => g.type === garmentType), [garmentType]);
  const allFields = template?.fields || [];

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    const factor = newUnit === 'cm' ? 2.54 : 1 / 2.54;
    const converted: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) { const n = parseFloat(v); converted[k] = !isNaN(n) && n > 0 ? (Math.round(n * factor * 10) / 10).toString() : v; }
    setValues(converted); setUnit(newUnit);
  };

  const handleSave = async () => {
    if (!garmentType) { showAlert('Required', 'Select a garment type'); return; }
    setSaving(true);
    try {
      const data: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(values)) { if (v && v !== '0') data[k] = parseFloat(v) || v; }
      await createMeasurement({ customer_id: Number(customerId), label: garmentType, data, unit, notes });
      showAlert('Saved', `${garmentType} measurements saved`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) { showAlert('Error', 'Failed to save'); console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.background }]} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Garment type *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(!showPicker)}>
              <Text style={garmentType ? styles.pickerText : styles.pickerPlaceholder}>{garmentType || 'Select garment'}</Text>
              <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View><Text style={styles.label}>Unit</Text><UnitToggle value={unit} onChange={handleUnitChange} /></View>
        </View>
        {showPicker && (
          <View style={styles.dropdown}>
            {DEFAULT_GARMENTS.map((g) => (
              <TouchableOpacity key={g.type} style={styles.dropdownItem} onPress={() => { setGarmentType(g.type); setShowPicker(false); setValues({}); }}>
                <Text style={styles.dropdownName}>{g.type}</Text><Text style={styles.dropdownCount}>{g.fields.length} fields</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {allFields.length > 0 && (
          <View style={styles.fieldsGrid}>
            {allFields.map((field) => (
              <View key={field} style={styles.measureField}>
                <Text style={styles.measureLabel}>{field}</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput style={styles.measureInput} value={values[field] || ''} onChangeText={(v) => setValues((prev) => ({ ...prev, [field]: v }))} placeholder="0" placeholderTextColor={Colors.textTertiary} keyboardType="decimal-pad" />
                  <Text style={styles.unitText}>{unit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {garmentType && <View style={{ marginTop: 20 }}><Text style={styles.label}>Notes</Text><TextInput style={[styles.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Fit preferences..." placeholderTextColor={Colors.textTertiary} multiline textAlignVertical="top" /></View>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Measurement'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, paddingBottom: 100 },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, height: 44 },
  pickerText: { fontSize: 15, color: Colors.text },
  pickerPlaceholder: { fontSize: 15, color: Colors.textTertiary },
  dropdown: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  dropdownName: { fontSize: 15, color: Colors.text },
  dropdownCount: { fontSize: 12, color: Colors.textTertiary },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  measureField: { width: '48%' },
  measureLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  measureInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingRight: 32, paddingVertical: 10, fontSize: 15, color: Colors.text },
  unitText: { position: 'absolute', right: 10, top: '50%', fontSize: 11, color: Colors.textTertiary, transform: [{ translateY: -7 }] },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
