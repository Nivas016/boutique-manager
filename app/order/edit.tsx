import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_GARMENTS } from '../../constants/garments';
import { getEmployees, getEmployeeGarmentRate } from '../../db/employees';
import { getOrderById, updateOrder } from '../../db/orders';
import { getOrderItems } from '../../db/order_items';
import { EmployeeWithWorkload, OrderItem, OrderWithDetails } from '../../types';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ItemInput {
  localId: string;
  dbId: number | null;
  garment_type: string;
  quantity: number;
  employee_id: number | null;
  employee_share: string;
  embroidery_employee_id: number | null;
  embroidery_share: string;
}

let _editNextId = 100;
const blankItem = (): ItemInput => ({
  localId: String(_editNextId++),
  dbId: null,
  garment_type: '',
  quantity: 1,
  employee_id: null,
  employee_share: '',
  embroidery_employee_id: null,
  embroidery_share: '',
});

const fromDbItem = (oi: OrderItem): ItemInput => ({
  localId: String(_editNextId++),
  dbId: oi.id,
  garment_type: oi.garment_type,
  quantity: oi.quantity,
  employee_id: oi.employee_id,
  employee_share: oi.employee_share > 0 ? String(oi.employee_share) : '',
  embroidery_employee_id: oi.embroidery_employee_id,
  embroidery_share: oi.embroidery_share > 0 ? String(oi.embroidery_share) : '',
});

export default function EditOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();
  const { showAlert, alertProps } = useAlert();

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithWorkload[]>([]);

  // Skill-based employee split
  const tailorEmployees = employees.filter(e => e.specialization !== 'Embroidery');
  const embroideryEmployees = employees.filter(e => e.specialization !== 'Stitching');
  const [items, setItems] = useState<ItemInput[]>([blankItem()]);
  const [activeGarmentPickerId, setActiveGarmentPickerId] = useState<string | null>(null);

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
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([
      getOrderById(Number(orderId)),
      getEmployees(),
      getOrderItems(Number(orderId)),
    ]).then(([o, emps, dbItems]) => {
      if (!o) return;
      setOrder(o);
      setEmployees(emps);
      setItems(dbItems.length > 0 ? dbItems.map(fromDbItem) : [blankItem()]);
      setDesignNumber(o.design_serial_number ?? '');
      setFabricDetails(o.fabric_details ?? '');
      setEmbroideryDetails(o.embroidery_details ?? '');
      setPromisedDate(o.promised_date ? new Date(o.promised_date) : null);
      setTrialDate(o.trial_date ? new Date(o.trial_date) : null);
      setTotalAmount(String(o.total_amount ?? ''));
      setAlterationNotes(o.alteration_notes ?? '');
      setNotes(o.notes ?? '');
    });
  }, [orderId]));

  const updateItem = (localId: string, field: keyof ItemInput, value: any) => {
    setItems((prev) => prev.map((it) => it.localId === localId ? { ...it, [field]: value } : it));
  };

  const selectGarmentType = async (localId: string, garmentType: string) => {
    setActiveGarmentPickerId(null);
    const item = items.find((i) => i.localId === localId);
    setItems((prev) => prev.map((it) => it.localId === localId ? { ...it, garment_type: garmentType } : it));
    if (item?.employee_id) {
      const rate = await getEmployeeGarmentRate(item.employee_id, garmentType);
      if (rate > 0) {
        setItems((prev) => prev.map((it) =>
          it.localId === localId ? { ...it, garment_type: garmentType, employee_share: String(rate * it.quantity) } : it
        ));
      }
    }
  };

  const selectEmployee = async (localId: string, empId: number) => {
    const item = items.find((i) => i.localId === localId);
    const toggled = item?.employee_id === empId ? null : empId;
    setItems((prev) => prev.map((it) =>
      it.localId === localId ? { ...it, employee_id: toggled, employee_share: toggled ? it.employee_share : '' } : it
    ));
    if (toggled && item?.garment_type) {
      const rate = await getEmployeeGarmentRate(toggled, item.garment_type);
      if (rate > 0) {
        setItems((prev) => prev.map((it) =>
          it.localId === localId ? { ...it, employee_share: String(rate * it.quantity) } : it
        ));
      }
    }
  };

  const selectEmbEmployee = (localId: string, empId: number) => {
    const item = items.find((i) => i.localId === localId);
    const toggled = item?.embroidery_employee_id === empId ? null : empId;
    setItems((prev) => prev.map((it) =>
      it.localId === localId ? { ...it, embroidery_employee_id: toggled, embroidery_share: toggled ? it.embroidery_share : '' } : it
    ));
  };

  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const removeItem = (localId: string) => setItems((prev) => prev.filter((it) => it.localId !== localId));

  const handleSave = async () => {
    if (!promisedDate) { showAlert('Required', 'Select a promised date'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { showAlert('Required', 'Enter total amount'); return; }
    const validItems = items.filter((it) => it.garment_type.trim());
    if (validItems.length === 0) { showAlert('Required', 'Select at least one garment type'); return; }

    setSaving(true);
    try {
      await updateOrder(Number(orderId), {
        items: validItems.map((it) => ({
          garment_type: it.garment_type,
          quantity: it.quantity,
          employee_id: it.employee_id,
          employee_share: it.employee_share ? parseFloat(it.employee_share) : 0,
          embroidery_employee_id: it.embroidery_employee_id,
          embroidery_share: it.embroidery_share ? parseFloat(it.embroidery_share) : 0,
        })),
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
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.background }]} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setActiveGarmentPickerId(null)}
      >
        <View style={styles.customerBanner}>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>{order.customer_name}</Text>
          <Text style={styles.customerSub}>#{order.order_number}</Text>
        </View>

        {/* ── Garment Items ── */}
        <View style={styles.itemsSection}>
          <Text style={styles.label}>Garment items</Text>

          {items.map((item, index) => (
            <View key={item.localId} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemBadge}>
                  <Text style={styles.itemBadgeText}>{index + 1}</Text>
                </View>

                <TouchableOpacity
                  style={styles.garmentBtn}
                  onPress={() => setActiveGarmentPickerId(activeGarmentPickerId === item.localId ? null : item.localId)}
                >
                  <Text style={item.garment_type ? styles.garmentBtnText : styles.garmentBtnPlaceholder} numberOfLines={1}>
                    {item.garment_type || 'Select garment'}
                  </Text>
                  <Ionicons name={activeGarmentPickerId === item.localId ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => item.quantity > 1 && updateItem(item.localId, 'quantity', item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateItem(item.localId, 'quantity', item.quantity + 1)}
                  >
                    <Ionicons name="add" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {activeGarmentPickerId === item.localId && (
                <View style={styles.garmentDropdown}>
                  {DEFAULT_GARMENTS.map((g) => (
                    <TouchableOpacity
                      key={g.type}
                      style={[styles.garmentDropdownItem, item.garment_type === g.type && styles.garmentDropdownItemActive]}
                      onPress={() => selectGarmentType(item.localId, g.type)}
                    >
                      <Text style={[styles.garmentDropdownText, item.garment_type === g.type && styles.garmentDropdownTextActive]}>
                        {g.type}
                      </Text>
                      {item.garment_type === g.type && <Ionicons name="checkmark" size={15} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {tailorEmployees.length > 0 && (
                <>
                  <Text style={styles.itemFieldLabel}>Tailor</Text>
                  <View style={styles.chipsRow}>
                    {tailorEmployees.map((e) => (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.chip, item.employee_id === e.id && styles.chipActive]}
                        onPress={() => selectEmployee(item.localId, e.id)}
                      >
                        <Text style={[styles.chipText, item.employee_id === e.id && styles.chipTextActive]}>{e.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {item.employee_id && (
                    <TextInput
                      style={styles.shareInput}
                      value={item.employee_share}
                      onChangeText={(v) => updateItem(item.localId, 'employee_share', v)}
                      placeholder="Stitching share ₹"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                    />
                  )}
                </>
              )}
              {embroideryEmployees.length > 0 && (
                <>
                  <Text style={styles.itemFieldLabel}>Embroidery</Text>
                  <View style={styles.chipsRow}>
                    {embroideryEmployees.map((e) => (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.chip, item.embroidery_employee_id === e.id && styles.chipActive]}
                        onPress={() => selectEmbEmployee(item.localId, e.id)}
                      >
                        <Text style={[styles.chipText, item.embroidery_employee_id === e.id && styles.chipTextActive]}>{e.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {item.embroidery_employee_id && (
                    <TextInput
                      style={styles.shareInput}
                      value={item.embroidery_share}
                      onChangeText={(v) => updateItem(item.localId, 'embroidery_share', v)}
                      placeholder="Embroidery share ₹"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                    />
                  )}
                </>
              )}

              {items.length > 1 && (
                <TouchableOpacity style={styles.removeItemBtn} onPress={() => removeItem(item.localId)}>
                  <Ionicons name="trash-outline" size={13} color={Colors.danger} />
                  <Text style={styles.removeItemText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addItemText}>Add another garment</Text>
          </TouchableOpacity>
        </View>

        {/* ── Order Details ── */}
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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  itemsSection: { marginBottom: 16 },
  itemCard: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  itemBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  garmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  garmentBtnText: { fontSize: 14, color: Colors.text, flex: 1, marginRight: 4 },
  garmentBtnPlaceholder: { fontSize: 14, color: Colors.textTertiary, flex: 1, marginRight: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, overflow: 'hidden' },
  qtyBtn: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '600', color: Colors.text, minWidth: 20, textAlign: 'center' },
  garmentDropdown: { backgroundColor: Colors.white, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  garmentDropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  garmentDropdownItemActive: { backgroundColor: Colors.primaryLight },
  garmentDropdownText: { fontSize: 14, color: Colors.text },
  garmentDropdownTextActive: { color: Colors.primary, fontWeight: '600' },
  itemFieldLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6, marginTop: 2 },
  shareInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.text, marginBottom: 8 },
  removeItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingVertical: 4, marginTop: 4 },
  removeItemText: { fontSize: 12, color: Colors.danger },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', justifyContent: 'center' },
  addItemText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
