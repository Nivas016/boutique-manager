import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DEFAULT_GARMENTS, MeasurementUnit } from '../../constants/garments';
import { getCustomers, createCustomer, isPhoneUnique } from '../../db/customers';
import { getEmployees, getEmployeeGarmentRate } from '../../db/employees';
import { createOrder } from '../../db/orders';
import { createMeasurement, getLatestMeasurement } from '../../db/measurements';
import { CustomerWithStats, EmployeeWithWorkload } from '../../types';
import UnitToggle from '../../components/UnitToggle';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NewOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerWithStats[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithWorkload[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);

  const [garmentType, setGarmentType] = useState('');
  const [showGarmentPicker, setShowGarmentPicker] = useState(false);
  const [fabricDetails, setFabricDetails] = useState('');
  const [embroideryDetails, setEmbroideryDetails] = useState('');
  const [designNumber, setDesignNumber] = useState('');
  const [promisedDate, setPromisedDate] = useState<Date | null>(null);
  const [trialDate, setTrialDate] = useState<Date | null>(null);
  const [showPromisedPicker, setShowPromisedPicker] = useState(false);
  const [showTrialPicker, setShowTrialPicker] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [employeeShare, setEmployeeShare] = useState('');
  const [selectedEmbroideryEmployee, setSelectedEmbroideryEmployee] = useState<number | null>(null);
  const [embroideryShare, setEmbroideryShare] = useState('');

  const { showAlert, alertProps } = useAlert();
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measureUnit, setMeasureUnit] = useState<MeasurementUnit>('in');
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const garmentTemplate = useMemo(() => DEFAULT_GARMENTS.find((g) => g.type === garmentType), [garmentType]);

  useFocusEffect(useCallback(() => {
    getEmployees().then(setEmployees);
  }, []));

  useEffect(() => {
    if (selectedEmployee && garmentType) {
      getEmployeeGarmentRate(selectedEmployee, garmentType).then((rate) => {
        setEmployeeShare(rate > 0 ? String(rate) : '');
      });
    } else {
      setEmployeeShare('');
    }
  }, [selectedEmployee, garmentType]);

  const searchCustomers = async (text: string) => {
    setCustomerSearch(text);
    setShowNewCustomerForm(false);
    if (text.trim().length >= 2) {
      const results = await getCustomers(text);
      setCustomerResults(results.slice(0, 5));
    } else {
      setCustomerResults([]);
    }
  };

  const openNewCustomerForm = () => {
    setNewCustomerName(customerSearch.trim());
    setNewCustomerPhone('');
    setShowNewCustomerForm(true);
  };

  const handleCreateCustomer = async () => {
    if (newCustomerName.trim().length < 2) { showAlert('Required', 'Enter a valid name'); return; }
    if (!/^\d{10}$/.test(newCustomerPhone.trim())) { showAlert('Required', 'Enter a valid 10-digit phone number'); return; }
    setCreatingCustomer(true);
    try {
      const unique = await isPhoneUnique(newCustomerPhone.trim());
      if (!unique) { showAlert('Duplicate', 'A customer with this phone number already exists'); return; }
      const id = await createCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() });
      setSelectedCustomer({ id, name: newCustomerName.trim() });
      setCustomerSearch('');
      setCustomerResults([]);
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch { showAlert('Error', 'Failed to create customer'); }
    finally { setCreatingCustomer(false); }
  };

  const handleGarmentSelect = async (type: string) => {
    setGarmentType(type);
    setShowGarmentPicker(false);
    setShowMeasurements(true);
    setMeasureValues({});
    // Auto-fill existing measurements if customer selected
    if (selectedCustomer) {
      const existing = await getLatestMeasurement(selectedCustomer.id, type);
      if (existing) {
        const data = JSON.parse(existing.data);
        const vals: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) vals[k] = String(v);
        setMeasureValues(vals);
        setMeasureUnit(existing.unit as MeasurementUnit);
      }
    }
  };

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    const factor = newUnit === 'cm' ? 2.54 : 1 / 2.54;
    const converted: Record<string, string> = {};
    for (const [key, val] of Object.entries(measureValues)) {
      const num = parseFloat(val);
      converted[key] = !isNaN(num) && num > 0 ? (Math.round(num * factor * 10) / 10).toString() : val;
    }
    setMeasureValues(converted);
    setMeasureUnit(newUnit);
  };

  const handleSave = async () => {
    if (!selectedCustomer) { showAlert('Required', 'Select a customer'); return; }
    if (!garmentType) { showAlert('Required', 'Select a garment type'); return; }
    if (!promisedDate) { showAlert('Required', 'Select Promised Date'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { showAlert('Required', 'Enter total amount'); return; }

    setSaving(true);
    try {
      const orderId = await createOrder({
        customer_id: selectedCustomer.id,
        employee_id: selectedEmployee || undefined,
        employee_share: employeeShare ? parseFloat(employeeShare) : 0,
        embroidery_employee_id: selectedEmbroideryEmployee || undefined,
        embroidery_share: embroideryShare ? parseFloat(embroideryShare) : 0,
        design_serial_number: designNumber,
        fabric_details: fabricDetails,
        embroidery_details: embroideryDetails,
        garment_type: garmentType,
        promised_date: promisedDate
        ? promisedDate.toISOString().split('T')[0]
        : '',
        trial_date: trialDate
          ? trialDate.toISOString().split('T')[0]
          : undefined,
        total_amount: parseFloat(totalAmount),
        notes,
        advance_amount: advanceAmount ? parseFloat(advanceAmount) : undefined,
        advance_mode: paymentMode,
      });

      // Save measurements if any filled
      const filledValues: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(measureValues)) {
        if (v && v !== '0') filledValues[k] = parseFloat(v) || v;
      }
      if (Object.keys(filledValues).length > 0) {
        await createMeasurement({
          customer_id: selectedCustomer.id,
          label: garmentType,
          data: filledValues,
          unit: measureUnit,
        });
      }

      showAlert('Order Created', `Order created for ${selectedCustomer.name}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      showAlert('Error', 'Failed to create order');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Customer */}
        <View style={styles.field}>
          <Text style={styles.label}>Customer *</Text>
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <Text style={styles.selectedName}>{selectedCustomer.name}</Text>
              <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); setShowNewCustomerForm(false); }}>
                <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput style={styles.input} value={customerSearch} onChangeText={searchCustomers} placeholder="Search by name or phone..." placeholderTextColor={Colors.textTertiary} />
              {customerSearch.trim().length >= 2 && (
                <View style={styles.dropdown}>
                  {customerResults.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setSelectedCustomer({ id: c.id, name: c.name }); setCustomerSearch(''); setCustomerResults([]); setShowNewCustomerForm(false); }}>
                      <Text style={styles.dropdownName}>{c.name}</Text>
                      <Text style={styles.dropdownPhone}>{c.phone}</Text>
                    </TouchableOpacity>
                  ))}
                  {!showNewCustomerForm ? (
                    <TouchableOpacity style={styles.addCustomerRow} onPress={openNewCustomerForm}>
                      <Ionicons name="person-add-outline" size={15} color={Colors.primary} />
                      <Text style={styles.addCustomerText}>
                        {customerResults.length === 0 ? `Add "${customerSearch.trim()}" as new customer` : 'Add new customer'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.newCustomerForm}>
                      <TextInput style={styles.input} value={newCustomerName} onChangeText={setNewCustomerName} placeholder="Name *" placeholderTextColor={Colors.textTertiary} />
                      <TextInput style={[styles.input, { marginTop: 8 }]} value={newCustomerPhone} onChangeText={setNewCustomerPhone} placeholder="Phone (10 digits) *" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" maxLength={10} />
                      <View style={styles.newCustomerActions}>
                        <TouchableOpacity style={styles.cancelNewBtn} onPress={() => setShowNewCustomerForm(false)}>
                          <Text style={styles.cancelNewText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.createNewBtn, creatingCustomer && { opacity: 0.6 }]} onPress={handleCreateCustomer} disabled={creatingCustomer}>
                          <Text style={styles.createNewText}>{creatingCustomer ? 'Creating...' : 'Create & Select'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Garment */}
        <View style={styles.field}>
          <Text style={styles.label}>Garment type *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowGarmentPicker(!showGarmentPicker)}>
            <Text style={garmentType ? styles.pickerText : styles.pickerPlaceholder}>{garmentType || 'Select garment'}</Text>
            <Ionicons name={showGarmentPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          {showGarmentPicker && (
            <View style={styles.dropdown}>
              {DEFAULT_GARMENTS.map((g) => (
                <TouchableOpacity key={g.type} style={styles.dropdownItem} onPress={() => handleGarmentSelect(g.type)}>
                  <Text style={styles.dropdownName}>{g.type}</Text>
                  <Text style={styles.dropdownPhone}>{g.fields.length} fields</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Measurements */}
        {garmentType !== '' && garmentTemplate && (
          <View style={styles.measureSection}>
            <TouchableOpacity style={styles.measureHeader} onPress={() => setShowMeasurements(!showMeasurements)}>
              <View style={styles.measureTitleRow}>
                <Ionicons name="resize-outline" size={18} color={Colors.primary} />
                <Text style={styles.measureTitle}>Body Measurements</Text>
              </View>
              <Ionicons name={showMeasurements ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            {showMeasurements && (
              <View style={styles.measureBody}>
                <View style={styles.unitRow}>
                  <Text style={styles.unitLabel}>Unit</Text>
                  <UnitToggle value={measureUnit} onChange={handleUnitChange} />
                </View>
                <View style={styles.fieldsGrid}>
                  {garmentTemplate.fields.map((field) => (
                    <View key={field} style={styles.measureField}>
                      <Text style={styles.measureFieldLabel}>{field}</Text>
                      <View style={styles.measureInputWrap}>
                        <TextInput
                          style={styles.measureInput}
                          value={measureValues[field] || ''}
                          onChangeText={(v) => setMeasureValues((prev) => ({ ...prev, [field]: v }))}
                          placeholder="0"
                          placeholderTextColor={Colors.textTertiary}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.measureUnitText}>{measureUnit}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tailor */}
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

        {/* Stitching share */}
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

        {/* Fabric + Design */}
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

        {/* Embroidery assignment */}
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

        {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Promised Date *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowPromisedPicker(true)}
              >
                <Text>
                  {promisedDate
                    ? promisedDate.toLocaleDateString()
                    : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Trial Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowTrialPicker(true)}
              >
                <Text>
                  {trialDate
                    ? trialDate.toLocaleDateString()
                    : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showPromisedPicker && (
            <DateTimePicker
              value={promisedDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowPromisedPicker(false);

                if (selectedDate) {
                  setPromisedDate(selectedDate);
                }
              }}
            />
          )}

          {showTrialPicker && (
            <DateTimePicker
              value={trialDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowTrialPicker(false);

                if (selectedDate) {
                  setTrialDate(selectedDate);
                }
              }}
            />
          )}

        {/* Amount */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Total amount *</Text>
            <TextInput style={styles.input} value={totalAmount} onChangeText={setTotalAmount} placeholder="₹0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Advance</Text>
            <TextInput style={styles.input} value={advanceAmount} onChangeText={setAdvanceAmount} placeholder="₹0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Payment mode</Text>
          <View style={styles.chipsRow}>
            {['Cash', 'UPI', 'Card'].map((mode) => (
              <TouchableOpacity key={mode} style={[styles.chip, paymentMode === mode && styles.chipActive]} onPress={() => setPaymentMode(mode)}>
                <Text style={[styles.chipText, paymentMode === mode && styles.chipTextActive]}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={notes} onChangeText={setNotes} placeholder="Special instructions..." placeholderTextColor={Colors.textTertiary} multiline textAlignVertical="top" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Creating...' : 'Create Order'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  form: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, height: 48 },
  pickerText: { fontSize: 15, color: Colors.text },
  pickerPlaceholder: { fontSize: 15, color: Colors.textTertiary },
  dropdown: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  dropdownName: { fontSize: 15, color: Colors.text },
  dropdownPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  selectedCustomer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  selectedName: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  measureSection: { backgroundColor: Colors.white, borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  measureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  measureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  measureTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  measureBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  unitLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  measureField: { width: '47%' },
  measureFieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  measureInputWrap: { position: 'relative' },
  measureInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingRight: 32, paddingVertical: 10, fontSize: 15, color: Colors.text },
  measureUnitText: { position: 'absolute', right: 10, top: '50%', fontSize: 11, color: Colors.textTertiary, transform: [{ translateY: -7 }] },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  addCustomerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  addCustomerText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  newCustomerForm: { padding: 14, borderTopWidth: 0.5, borderTopColor: Colors.borderLight, gap: 0 },
  newCustomerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelNewBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelNewText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  createNewBtn: { flex: 2, paddingVertical: 11, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center' },
  createNewText: { fontSize: 14, color: Colors.white, fontWeight: '600' },
});
