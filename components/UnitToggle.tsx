import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { MeasurementUnit } from '../constants/garments';

interface Props {
  value: MeasurementUnit;
  onChange: (unit: MeasurementUnit) => void;
}

export default function UnitToggle({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, value === 'in' && styles.optionActive]}
        onPress={() => onChange('in')}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, value === 'in' && styles.labelActive]}>in</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, value === 'cm' && styles.optionActive]}
        onPress={() => onChange('cm')}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, value === 'cm' && styles.labelActive]}>cm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    height: 40,
  },
  option: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  optionActive: {
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.white,
  },
});
