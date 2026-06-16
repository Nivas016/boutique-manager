import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={Colors.borderLight} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
