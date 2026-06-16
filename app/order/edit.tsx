import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getEmployees, getEmployeeGarmentRate } from '../../db/employees';
import { getOrderById, updateOrder } from '../../db/orders';
import { EmployeeWithWorkload, OrderWithDetails } from '../../types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { showAlert, alertProps } = useAlert();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithWorkload[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [designNumber, setDesignNumber] = useState('');
  const [fabricDetails, setFabricDetails] = useState('');
  const [embroideryDetails, setEmbroideryDetails] = useState('');
  const [promisedDate, setPromisedDate] = useState<Date | null>(null);
  const [trialDate, setTrialDate] = useState<Date | null>(null);
  const [showPromisedPicker, setShowPromisedPicker] = useState(false);
  const [showTrialPicker, setShowTrialPicker] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [alterationNotes, setAlterationNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [employeeShare, setEmployeeShare] = useState('');
  const [selectedEmbroideryEmployee, setSelectedEmbroideryEmployee] = useState<number | null>(null);
  const [embroideryShare, setEmbroideryShare] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([getOrderById(Number(orderId)), getEmployees()]).then(([o, emps]) => {
      if (!o) return;
      setOrder(o);
      setEmployees(emps);
      setSelectedEmployee(o.employee_id ?? null);
      setDesignNumber(o.design_serial_number ?? '');
      setFabricDetails(o.fabric_details ?? '');
      setEmbroideryDetails(o.embroidery_details ?? '');
      setPromisedDate(o.promised_date ? new Date(o.promised_date) : null);
      setTrialDate(o.trial_date ? new Date(o.trial_date) : null);
      setTotalAmount(String(o.total_amount ?? ''));
      setAlterationNotes(o.alteration_notes ?? '');
      setNotes(o.notes ?? '');
      setEmployeeShare(o.employee_share > 0 ? String(o.employee_share) : '');
      setSelectedEmbroideryEmployee(o.embroidery_employee_id ?? null);
      setEmbroideryShare(o.embroidery_share > 0 ? String(o.embroidery_share) : '');
    });
  }, [orderId]));

  const [prevEmployee, setPrevEmployee] = useState<number | null>(null);
  useEffect(() => {
    if (order && selectedEmployee !== prevEmployee) {
      setPrevEmployee(selectedEmployee);
      if (selectedEmployee && order.garment_type) {
        getEmployeeGarmentRate(selectedEmployee, order.garment_type).then((rate) => {
          setEmployeeShare(rate > 0 ? String(rate) : '');
        });
      } else if (!selectedEmployee) {
        setEmployeeShare('');
      }
    }
  }, [selectedEmployee]);

  const handleSave = async () => {
    if (!promisedDate) { showAlert('Required', 'Select a promised date'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { showAlert('Required', 'Enter total amount'); return; }

    setSaving(true);
    try {
      await updateOrder(Number(orderId), {
        employee_id: selectedEmployee ?? undefined,
        employee_share: employeeShare ? parseFloat(employeeShare) : 0,
        embroidery_employee_id: selectedEmbroideryEmployee ?? undefined,
        embroidery_share: embroideryShare ? parseFloat(embroideryShare) : 0,
        design_serial_number: designNumber,
        fabric_details: fabricDetails,
        embroidery_details: embroideryDetails,
        promised_date: promisedDate.toISOString().split('T')[0],
        trial_date: trialDate ? trialDate.toISOString().split('T')[0] : undefined,
        total_amount: parseFloat(totalAmount),
        alteration_notes: alterationNotes,
        notes,
      });
      showAlert('Saved', 'Order updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      showAlert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.customerBanner}>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>{order.customer_name}</Text>
          <Text style={styles.customerSub}>{order.garment_type} · #{order.order_number}</Text>
        </View>

        {employees.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Assign to tailor</Text>
            <View style={styles.chipsRow}>
              {employees.map((e) => (
                <TouchableOpacity key={e.id} style={[styles.chip, selectedEmployee === e.id && styles.chipActive]} onPress={() => setSelectedEmployee(selectedEmployee === e.id ? null : e.id)}>
                  <Text style={[styles.chipText, selectedEmployee === e.id && styles.chipTextActive]}>{e.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedEmployee && (
          <View style={styles.field}>
            <Text style={styles.label}>Stitching share (₹){employeeShare ? '  ·  auto-filled' : ''}</Text>
            <TextInput
              style={styles.input}
              value={employeeShare}
              onChangeText={setEmployeeShare}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Fabric details</Text>
            <TextInput style={styles.input} value={fabricDetails} onChangeText={setFabricDetails} placeholder="Type, color" placeholderTextColor={Colors.textTertiary} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Design no.</Text>
            <TextInput style={styles.input} value={designNumber} onChangeText={setDesignNumber} placeholder="EMB-001" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Embroidery details</Text>
          <TextInput style={styles.input} value={embroideryDetails} onChangeText={setEmbroideryDetails} placeholder="Embroidery description" placeholderTextColor={Colors.textTertiary} />
        </View>

        {employees.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Assign embroidery to</Text>
            <View style={styles.chipsRow}>
              {employees.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.chip, selectedEmbroideryEmployee === e.id && styles.chipActive]}
                  onPress={() => setSelectedEmbroideryEmployee(selectedEmbroideryEmployee === e.id ? null : e.id)}
                >
                  <Text style={[styles.chipText, selectedEmbroideryEmployee === e.id && styles.chipTextActive]}>{e.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {selectedEmbroideryEmployee && (
          <View style={styles.field}>
            <Text style={styles.label}>Embroidery share (₹)  ·  enter per design</Text>
            <TextInput
              style={styles.input}
              value={embroideryShare}
              onChangeText={setEmbroideryShare}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Promised Date *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPromisedPicker(true)}>
              <Text style={promisedDate ? styles.dateText : styles.datePlaceholder}>
                {promisedDate ? promisedDate.toLocaleDateString() : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Trial Date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowTrialPicker(true)}>
              <Text style={trialDate ? styles.dateText : styles.datePlaceholder}>
                {trialDate ? trialDate.toLocaleDateString() : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showPromisedPicker && (
          <DateTimePicker
            value={promisedDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => { setShowPromisedPicker(false); if (date) setPromisedDate(date); }}
          />
        )}
        {showTrialPicker && (
          <DateTimePicker
            value={trialDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => { setShowTrialPicker(false); if (date) setTrialDate(date); }}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Total amount *</Text>
          <TextInput style={styles.input} value={totalAmount} onChangeText={setTotalAmount} placeholder="₹0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Alteration notes</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={alterationNotes} onChangeText={setAlterationNotes} placeholder="Alteration instructions..." placeholderTextColor={Colors.textTertiary} multiline textAlignVertical="top" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={notes} onChangeText={setNotes} placeholder="Special instructions..." placeholderTextColor={Colors.textTertiary} multiline textAlignVertical="top" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  form: { padding: 16, paddingBottom: 100 },
  customerBanner: { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 20 },
  customerLabel: { fontSize: 11, color: Colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  customerName: { fontSize: 17, fontWeight: '700', color: Colors.text, marginTop: 2 },
  customerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  dateText: { fontSize: 15, color: Colors.text },
  datePlaceholder: { fontSize: 15, color: Colors.textTertiary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
