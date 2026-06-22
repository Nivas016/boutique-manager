import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getMeasurementById } from '../../db/measurements';
import { Measurement } from '../../types';

export default function MeasurementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useTheme();
  const [measurement, setMeasurement] = useState<Measurement | null>(null);

  useFocusEffect(useCallback(() => {
    getMeasurementById(Number(id)).then(setMeasurement);
  }, [id]));

  if (!measurement) return null;
  const data = JSON.parse(measurement.data) as Record<string, number>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.garment}>{measurement.label}</Text>
        <Text style={styles.meta}>Unit: {measurement.unit} · Recorded: {measurement.recorded_at.split(' ')[0]}</Text>
      </View>
      <View style={styles.grid}>
        {Object.entries(data).map(([field, value]) => (
          <View key={field} style={styles.item}>
            <Text style={styles.fieldLabel}>{field}</Text>
            <Text style={styles.fieldValue}>{value} {measurement.unit}</Text>
          </View>
        ))}
      </View>
      {measurement.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{measurement.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  garment: { fontSize: 20, fontWeight: '700', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  item: { width: '47%', backgroundColor: Colors.white, borderRadius: 10, padding: 14 },
  fieldLabel: { fontSize: 12, color: Colors.textTertiary },
  fieldValue: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 4 },
  notesBox: { margin: 16, backgroundColor: Colors.white, borderRadius: 10, padding: 14 },
  notesLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  notesText: { fontSize: 14, color: Colors.text },
});
