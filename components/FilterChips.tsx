import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';

interface Chip {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  chips: Chip[];
  selected: string;
  onSelect: (key: string) => void;
}

export default function FilterChips({ chips, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {chips.map((chip) => {
        const active = chip.key === selected;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.chip,
              { backgroundColor: active ? Colors.primaryLight : Colors.white, borderColor: active ? Colors.primary : Colors.border },
            ]}
            onPress={() => onSelect(chip.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, { color: active ? Colors.primary : Colors.textSecondary }]}>
              {chip.label}
              {chip.count !== undefined ? ` (${chip.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 50, flexGrow: 0 },
  container: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '500' },
});
