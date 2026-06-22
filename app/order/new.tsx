import React, { useState, useCallback } from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_GARMENTS, NO_MEASUREMENT_GARMENTS, MeasurementUnit } from '../../constants/garments';
import { getCustomers, createCustomer, isPhoneUnique } from '../../db/customers';
import { getEmployees, getEmployeeGarmentRate } from '../../db/employees';
import { createOrder } from '../../db/orders';
import { createMeasurement, getLatestMeasurement } from '../../db/measurements';
import { CustomerWithStats, EmployeeWithWorkload } from '../../types';
import UnitToggle from '../../components/UnitToggle';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ItemInput {
  localId: string;
  garment_type: string;
  quantity: number;
  employee_id: number | null;
  employee_share: string;
  embroidery_employee_id: number | null;
  embroidery_share: string;
}

let _nextId = 1;
const newItem = (): ItemInput => ({
  localId: String(_nextId++),
  garment_type: '',
  quantity: 1,
  employee_id: null,
  employee_share: '',
  embroidery_employee_id: null,
  embroidery_share: '',
});

export default function NewOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTheme();

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerWithStats[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Employees (loaded once)
  const [employees, setEmployees] = useState<EmployeeWithWorkload[]>([]);

  // Items
  const [items, setItems] = useState<ItemInput[]>([newItem()]);
  const [activeGarmentPickerId, setActiveGarmentPickerId] = useState<string | null>(null);

  // Per-item measurements: { localId: { fieldName: value } }
  const [itemMeasureValues, setItemMeasureValues] = useState<Record<string, Record<string, string>>>({});
  const [measureUnit, setMeasureUnit] = useState<MeasurementUnit>('in');
  const [expandedMeasureIds, setExpandedMeasureIds] = useState<Set<string>>(new Set());

  // Order-level fields
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

  const { showAlert, alertProps } = useAlert();
  const [saving, setSaving] = useState(false);

  // Skill-based employee split
  const tailorEmployees = employees.filter(e => e.specialization !== 'Embroidery');
  const embroideryEmployees = employees.filter(e => e.specialization !== 'Stitching');

  useFocusEffect(useCallback(() => {
    getEmployees().then(setEmployees);
  }, []));

  // ── Measurement helpers ────────────────────────────────────
  const toggleMeasure = (localId: string) => {
    setExpandedMeasureIds(prev => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId); else next.add(localId);
      return next;
    });
  };

  const handleMeasureChange = (localId: string, field: string, value: string) => {
    setItemMeasureValues(prev => ({
      ...prev,
      [localId]: { ...(prev[localId] ?? {}), [field]: value },
    }));
  };

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    const factor = newUnit === 'cm' ? 2.54 : 1 / 2.54;
    setItemMeasureValues(prev => {
      const next: Record<string, Record<string, string>> = {};
      for (const [lid, fields] of Object.entries(prev)) {
        next[lid] = {};
        for (const [f, val] of Object.entries(fields)) {
          const num = parseFloat(val);
          next[lid][f] = !isNaN(num) && num > 0 ? (Math.round(num * factor * 10) / 10).toString() : val;
        }
      }
      return next;
    });
    setMeasureUnit(newUnit);
  };

  // ── Item helpers ───────────────────────────────────────────
  const updateItem = (localId: string, field: keyof ItemInput, value: any) => {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, [field]: value } : it));
  };

  const selectGarmentType = async (localId: string, garmentType: string) => {
    setActiveGarmentPickerId(null);
    const item = items.find(i => i.localId === localId);

    // Update garment type first
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, garment_type: garmentType } : it));

    if (!NO_MEASUREMENT_GARMENTS.has(garmentType)) {
      // Expand measurements for this item
      setExpandedMeasureIds(prev => new Set([...prev, localId]));
      // Auto-fill from customer's saved measurements
      if (selectedCustomer) {
        const existing = await getLatestMeasurement(selectedCustomer.id, garmentType);
        if (existing) {
          const data = JSON.parse(existing.data);
          const vals: Record<string, string> = {};
          for (const [k, v] of Object.entries(data)) vals[k] = String(v);
          setItemMeasureValues(prev => ({ ...prev, [localId]: vals }));
          setMeasureUnit(existing.unit as MeasurementUnit);
        }
      }
    }

    // Auto-fill employee share
    if (item?.employee_id) {
      const rate = await getEmployeeGarmentRate(item.employee_id, garmentType);
      if (rate > 0) {
        setItems(prev => prev.map(it =>
          it.localId === localId
            ? { ...it, garment_type: garmentType, employee_share: String(rate * it.quantity) }
            : it
        ));
      }
    }
  };

  const selectEmployee = async (localId: string, empId: number) => {
    const item = items.find(i => i.localId === localId);
    const toggled = item?.employee_id === empId ? null : empId;
    setItems(prev => prev.map(it =>
      it.localId === localId ? { ...it, employee_id: toggled, employee_share: toggled ? it.employee_share : '' } : it
    ));
    if (toggled && item?.garment_type) {
      const rate = await getEmployeeGarmentRate(toggled, item.garment_type);
      if (rate > 0) {
        setItems(prev => prev.map(it =>
          it.localId === localId ? { ...it, employee_share: String(rate * it.quantity) } : it
        ));
      }
    }
  };

  const selectEmbEmployee = (localId: string, empId: number) => {
    const item = items.find(i => i.localId === localId);
    const toggled = item?.embroidery_employee_id === empId ? null : empId;
    setItems(prev => prev.map(it =>
      it.localId === localId ? { ...it, embroidery_employee_id: toggled, embroidery_share: toggled ? it.embroidery_share : '' } : it
    ));
  };

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (localId: string) => {
    setItems(prev => prev.filter(it => it.localId !== localId));
    setItemMeasureValues(prev => { const n = { ...prev }; delete n[localId]; return n; });
    setExpandedMeasureIds(prev => { const n = new Set(prev); n.delete(localId); return n; });
  };

  // ── Customer helpers ───────────────────────────────────────
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

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedCustomer) { showAlert('Required', 'Select a customer'); return; }
    const validItems = items.filter(it => it.garment_type.trim());
    if (validItems.length === 0) { showAlert('Required', 'Select at least one garment type'); return; }
    if (!promisedDate) { showAlert('Required', 'Select Promised Date'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { showAlert('Required', 'Enter total amount'); return; }

    setSaving(true);
    try {
      await createOrder({
        customer_id: selectedCustomer.id,
        items: validItems.map(it => ({
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
        notes,
        advance_amount: advanceAmount ? parseFloat(advanceAmount) : undefined,
        advance_mode: paymentMode,
      });

      // Save measurements for each item that has them
      for (const it of validItems) {
        if (NO_MEASUREMENT_GARMENTS.has(it.garment_type)) continue;
        const vals = itemMeasureValues[it.localId];
        if (!vals) continue;
        const filled: Record<string, number | string> = {};
        for (const [k, v] of Object.entries(vals)) {
          if (v && v !== '0') filled[k] = parseFloat(v) || v;
        }
        if (Object.keys(filled).length > 0) {
          await createMeasurement({
            customer_id: selectedCustomer.id,
            label: it.garment_type,
            data: filled,
            unit: measureUnit,
          });
        }
      }

      const savedCustomer = selectedCustomer;
      showAlert(
        'Order Created',
        `${validItems.length === 1 ? validItems[0].garment_type : `${validItems.length} items`} added for ${selectedCustomer.name}`,
        [
          {
            text: 'Add Another Order',
            onPress: () => {
              setItems([newItem()]);
              setItemMeasureValues({});
              setExpandedMeasureIds(new Set());
              setFabricDetails('');
              setEmbroideryDetails('');
              setDesignNumber('');
              setPromisedDate(null);
              setTrialDate(null);
              setTotalAmount('');
              setAdvanceAmount('');
              setNotes('');
              setActiveGarmentPickerId(null);
              setSelectedCustomer(savedCustomer);
            },
          },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (err) {
      showAlert('Error', 'Failed to create order');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render measurement section for an item ─────────────────
  const renderMeasurements = (item: ItemInput) => {
    if (!item.garment_type || NO_MEASUREMENT_GARMENTS.has(item.garment_type)) return null;
    const tpl = DEFAULT_GARMENTS.find(g => g.type === item.garment_type);
    if (!tpl) return null;
    const expanded = expandedMeasureIds.has(item.localId);
    const vals = itemMeasureValues[item.localId] ?? {};
    const filledCount = Object.values(vals).filter(v => v && v !== '0').length;

    return (
      <View style={styles.itemMeasureSection}>
        <TouchableOpacity style={styles.itemMeasureHeader} onPress={() => toggleMeasure(item.localId)}>
          <View style={styles.itemMeasureTitleRow}>
            <Ionicons name="resize-outline" size={14} color={Colors.primary} />
            <Text style={styles.itemMeasureTitle}>Measurements</Text>
            {filledCount > 0 && !expanded && (
              <View style={styles.itemMeasureBadge}>
                <Text style={styles.itemMeasureBadgeText}>{filledCount} filled</Text>
              </View>
            )}
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.itemMeasureBody}>
            <View style={styles.unitRow}>
              <Text style={styles.unitLabel}>Unit</Text>
              <UnitToggle value={measureUnit} onChange={handleUnitChange} />
            </View>
            <View style={styles.fieldsGrid}>
              {tpl.fields.map(field => (
                <View key={field} style={styles.measureField}>
                  <Text style={styles.measureFieldLabel}>{field}</Text>
                  <View style={styles.measureInputWrap}>
                    <TextInput
                      style={styles.measureInput}
                      value={vals[field] || ''}
                      onChangeText={v => handleMeasureChange(item.localId, field, v)}
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
    );
  };

  // ── JSX ───────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.background }]} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setActiveGarmentPickerId(null)}
      >
        {/* ── Customer ── */}
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
                  {customerResults.map(c => (
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
                        <TouchableOpacity style={[styles.createNewBtn, { backgroundColor: Colors.primary }, creatingCustomer && { opacity: 0.6 }]} onPress={handleCreateCustomer} disabled={creatingCustomer}>
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

        {/* ── Garment Items ── */}
        <View style={styles.itemsSection}>
          <Text style={styles.label}>Garment items *</Text>

          {items.map((item, index) => (
            <View key={item.localId} style={styles.itemCard}>
              {/* Header row: badge + garment picker + qty stepper */}
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
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => item.quantity > 1 && updateItem(item.localId, 'quantity', item.quantity - 1)}>
                    <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItem(item.localId, 'quantity', item.quantity + 1)}>
                    <Ionicons name="add" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Garment type dropdown */}
              {activeGarmentPickerId === item.localId && (
                <View style={styles.garmentDropdown}>
                  {DEFAULT_GARMENTS.map(g => (
                    <TouchableOpacity
                      key={g.type}
                      style={[styles.garmentDropdownItem, item.garment_type === g.type && styles.garmentDropdownItemActive]}
                      onPress={() => selectGarmentType(item.localId, g.type)}
                    >
                      <Text style={[styles.garmentDropdownText, item.garment_type === g.type && styles.garmentDropdownTextActive]}>{g.type}</Text>
                      {item.garment_type === g.type && <Ionicons name="checkmark" size={15} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Measurements (per-item, hidden for quantity-only types) */}
              {renderMeasurements(item)}

              {/* Tailor assignment (skill-filtered) */}
              {tailorEmployees.length > 0 && (
                <>
                  <Text style={styles.itemFieldLabel}>Tailor</Text>
                  <View style={styles.chipsRow}>
                    {tailorEmployees.map(e => (
                      <TouchableOpacity key={e.id} style={[styles.chip, item.employee_id === e.id && styles.chipActive]} onPress={() => selectEmployee(item.localId, e.id)}>
                        <Text style={[styles.chipText, item.employee_id === e.id && styles.chipTextActive]}>{e.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {item.employee_id && (
                    <TextInput style={styles.shareInput} value={item.employee_share} onChangeText={v => updateItem(item.localId, 'employee_share', v)} placeholder="Stitching share ₹" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
                  )}
                </>
              )}

              {/* Embroidery assignment (skill-filtered) */}
              {embroideryEmployees.length > 0 && (
                <>
                  <Text style={styles.itemFieldLabel}>Embroidery</Text>
                  <View style={styles.chipsRow}>
                    {embroideryEmployees.map(e => (
                      <TouchableOpacity key={e.id} style={[styles.chip, item.embroidery_employee_id === e.id && styles.chipActive]} onPress={() => selectEmbEmployee(item.localId, e.id)}>
                        <Text style={[styles.chipText, item.embroidery_employee_id === e.id && styles.chipTextActive]}>{e.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {item.embroidery_employee_id && (
                    <TextInput style={styles.shareInput} value={item.embroidery_share} onChangeText={v => updateItem(item.localId, 'embroidery_share', v)} placeholder="Embroidery share ₹" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
                  )}
                </>
              )}

              {/* Remove button */}
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

        {/* ── Dates ── */}
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
          <DateTimePicker value={promisedDate || new Date()} mode="date" display="default"
            onChange={(_, date) => { setShowPromisedPicker(false); if (date) setPromisedDate(date); }} />
        )}
        {showTrialPicker && (
          <DateTimePicker value={trialDate || new Date()} mode="date" display="default"
            onChange={(_, date) => { setShowTrialPicker(false); if (date) setTrialDate(date); }} />
        )}

        {/* ── Amount ── */}
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
            {['Cash', 'UPI', 'Card'].map(mode => (
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
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Creating...' : 'Create Order'}</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  dateText: { fontSize: 15, color: Colors.text },
  datePlaceholder: { fontSize: 15, color: Colors.textTertiary },
  dropdown: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  dropdownName: { fontSize: 15, color: Colors.text },
  dropdownPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  selectedCustomer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  selectedName: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  addCustomerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  addCustomerText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  newCustomerForm: { padding: 14, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  newCustomerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelNewBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelNewText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  createNewBtn: { flex: 2, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  createNewText: { fontSize: 14, color: Colors.white, fontWeight: '600' },

  // Items section
  itemsSection: { marginBottom: 16 },
  itemCard: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  itemBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  garmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  garmentBtnText: { fontSize: 14, color: Colors.text, flex: 1, marginRight: 4 },
  garmentBtnPlaceholder: { fontSize: 14, color: Colors.textTertiary, flex: 1, marginRight: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, overflow: 'hidden' },
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

  // Per-item measurements
  itemMeasureSection: { borderTopWidth: 0.5, borderTopColor: Colors.borderLight, marginTop: 8, paddingTop: 6, marginBottom: 4 },
  itemMeasureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  itemMeasureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemMeasureTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  itemMeasureBadge: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  itemMeasureBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  itemMeasureBody: { paddingTop: 6 },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  unitLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  measureField: { width: '47%' },
  measureFieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  measureInputWrap: { position: 'relative' },
  measureInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingRight: 32, paddingVertical: 10, fontSize: 14, color: Colors.text },
  measureUnitText: { position: 'absolute', right: 8, top: '50%', fontSize: 10, color: Colors.textTertiary, transform: [{ translateY: -6 }] },

  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.white },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
