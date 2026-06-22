import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllSettings, setSetting } from '../../db/settings';
import { exportBackup, importBackup } from '../../db/backup';
import * as DocumentPicker from 'expo-document-picker';
import { scheduleDailyReminder } from '../../utils/notifications';

function SettingRow({ icon, label, subtitle, onPress, danger }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? Colors.dangerLight : Colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.danger : Colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { showAlert, alertProps } = useAlert();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editModal, setEditModal] = useState<{ key: string; label: string; value: string } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  useFocusEffect(useCallback(() => {
    getAllSettings().then((s) => {
      setSettings(s);
      if (s.reminder_time) {
        const [h, m] = s.reminder_time.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setReminderTime(d);
      }
    });
  }, []));

  const formatReminderTime = (s: Record<string, string>) => {
    if (!s.reminder_time) return 'Not set';
    const [h, m] = s.reminder_time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  const handleReminderTimeChange = async (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selected) return;
    setReminderTime(selected);
    if (Platform.OS === 'android') saveReminderTime(selected);
  };

  const saveReminderTime = async (time: Date) => {
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    const value = `${hh}:${mm}`;
    await setSetting('reminder_time', value);
    setSettings((prev) => ({ ...prev, reminder_time: value }));
    const scheduled = await scheduleDailyReminder(time.getHours(), time.getMinutes());
    showAlert(
      'Reminder Saved',
      scheduled
        ? `Daily reminder set for ${formatReminderTime({ reminder_time: value })}.`
        : `Time saved, but notification permission was denied. Enable it in your device settings.`,
    );
  };

  const handleEdit = (key: string, label: string) => {
    setEditModal({ key, label, value: settings[key] || '' });
  };

  const handleSaveEdit = async () => {
    if (editModal) {
      await setSetting(editModal.key, editModal.value);
      setSettings((prev) => ({ ...prev, [editModal.key]: editModal.value }));
      setEditModal(null);
    }
  };

  const handleExport = async () => {
    try {
      await exportBackup();
    } catch (err) { showAlert('Error', 'Export failed'); console.error(err); }
  };

  const handleImport = async () => {
    showAlert('Import Data', 'This will replace ALL current data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Import', style: 'destructive', onPress: async () => {
        try {
          const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
          if (!result.canceled && result.assets[0]) {
            await importBackup(result.assets[0].uri);
            showAlert('Success', 'Data restored successfully');
            getAllSettings().then(setSettings);
          }
        } catch (err) { showAlert('Error', 'Import failed'); console.error(err); }
      }},
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={[styles.card, { padding: 10 }]}>
        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[styles.themeTile, theme === 'peacock' && styles.themeTileActive]}
            onPress={() => setTheme('peacock')}
            activeOpacity={0.75}
          >
            <View style={[styles.themeCircle, { backgroundColor: '#226880' }]} />
            <Text style={[styles.themeLabel, theme === 'peacock' && { color: '#226880', fontWeight: '700' }]}>Peacock</Text>
            {theme === 'peacock' && <Ionicons name="checkmark-circle" size={15} color="#226880" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeTile, theme === 'atelier' && { ...styles.themeTileActive, borderColor: '#8B3A5B' }]}
            onPress={() => setTheme('atelier')}
            activeOpacity={0.75}
          >
            <View style={[styles.themeCircle, { backgroundColor: '#8B3A5B' }]} />
            <Text style={[styles.themeLabel, theme === 'atelier' && { color: '#8B3A5B', fontWeight: '700' }]}>Atelier</Text>
            {theme === 'atelier' && <Ionicons name="checkmark-circle" size={15} color="#8B3A5B" />}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shop</Text>
      <View style={styles.card}>
        <SettingRow icon="storefront-outline" label="Shop Name" subtitle={settings.shop_name || 'Tap to set'} onPress={() => handleEdit('shop_name', 'Shop Name')} />
        <SettingRow icon="call-outline" label="Phone" subtitle={settings.shop_phone || 'Tap to set'} onPress={() => handleEdit('shop_phone', 'Phone')} />
        <SettingRow icon="location-outline" label="Address" subtitle={settings.shop_address || 'Tap to set'} onPress={() => handleEdit('shop_address', 'Address')} />
      </View>

      <Text style={styles.sectionTitle}>Orders</Text>
      <View style={styles.card}>
        <SettingRow icon="text-outline" label="Order Number Prefix" subtitle={settings.order_number_prefix || 'ORD'} onPress={() => handleEdit('order_number_prefix', 'Order Prefix')} />
        <SettingRow icon="resize-outline" label="Default Unit" subtitle={settings.default_unit === 'cm' ? 'Centimeters' : 'Inches'} onPress={() => handleEdit('default_unit', 'Default Unit (in or cm)')} />
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <SettingRow
          icon="alarm-outline"
          label="Daily Reminder"
          subtitle={`Every day at ${formatReminderTime(settings)}`}
          onPress={() => setShowTimePicker(true)}
        />
      </View>
      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleReminderTimeChange}
        />
      )}
      {showTimePicker && Platform.OS === 'ios' && (
        <View style={styles.iosTimeRow}>
          <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.iosTimeBtn}>
            <Text style={styles.iosTimeCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowTimePicker(false); saveReminderTime(reminderTime); }}
            style={styles.iosTimeBtn}
          >
            <Text style={styles.iosTimeSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.card}>
        <SettingRow icon="people-outline" label="Employees" subtitle="Manage tailors" onPress={() => router.push('/employee')} />
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.card}>
        <SettingRow icon="cloud-upload-outline" label="Export Backup" subtitle="Save data to a file" onPress={handleExport} />
        <SettingRow icon="cloud-download-outline" label="Import Backup" subtitle="Restore from a file" onPress={handleImport} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Boutique Manager v1.3</Text>
        <Text style={styles.footerText}>Made with Care ❤️</Text>
      </View>

      <AppAlert {...alertProps} />

      {/* Edit modal */}
      <Modal visible={!!editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editModal?.label}</Text>
            <TextInput
              style={styles.modalInput}
              value={editModal?.value || ''}
              onChangeText={(v) => editModal && setEditModal({ ...editModal, value: v })}
              autoFocus
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditModal(null)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8, paddingHorizontal: 20 },
  card: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  rowSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  footer: { alignItems: 'center', paddingVertical: 30 },
  footerText: { fontSize: 12, color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.white, borderRadius: 14, padding: 20, width: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 16 },
  modalCancel: { fontSize: 15, color: Colors.textSecondary },
  modalSave: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  iosTimeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 12, marginTop: 4 },
  iosTimeBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  iosTimeCancelText: { fontSize: 15, color: Colors.textSecondary },
  iosTimeSaveText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeTile: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, gap: 8 },
  themeTileActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  themeCircle: { width: 22, height: 22, borderRadius: 11 },
  themeLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
});
