import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { STATUS_FLOW, ORDER_STATUSES, OrderStatusKey } from '../constants/statuses';

interface Props {
  currentStatus: OrderStatusKey;
  onStatusTap?: (status: OrderStatusKey) => void;
  /** Which steps to show (defaults to a compact 5-step view) */
  visibleSteps?: OrderStatusKey[];
}

const DEFAULT_VISIBLE: OrderStatusKey[] = [
  'received', 'cutting', 'stitching', 'alterations', 'ready', 'delivered',
];

export default function StatusStepper({ currentStatus, onStatusTap, visibleSteps }: Props) {
  const steps = visibleSteps || DEFAULT_VISIBLE;
  const currentIndex = steps.indexOf(currentStatus);
  // If current status is between visible steps, find the nearest previous
  const activeIndex = currentIndex >= 0
    ? currentIndex
    : steps.reduce((best, s, i) => {
        const sStep = ORDER_STATUSES[s].step;
        const cStep = ORDER_STATUSES[currentStatus].step;
        return sStep <= cStep ? i : best;
      }, 0);

  return (
    <View style={styles.container}>
      {steps.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isCurrent = i === activeIndex;
        const config = ORDER_STATUSES[step];

        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  (isCompleted || isCurrent) && styles.connectorActive,
                ]}
              />
            )}
            <TouchableOpacity
              style={styles.stepContainer}
              onPress={() => onStatusTap?.(step)}
              activeOpacity={0.7}
              disabled={!onStatusTap}
            >
              <View
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isCompleted && (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                )}
                {isCurrent && <View style={styles.dotInner} />}
              </View>
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isCompleted && styles.labelCompleted,
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepContainer: {
    alignItems: 'center',
    width: 52,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: 12,
    minWidth: 8,
  },
  connectorActive: {
    backgroundColor: Colors.success,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotCurrent: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  labelCurrent: {
    color: Colors.primary,
    fontWeight: '600',
  },
  labelCompleted: {
    color: Colors.textSecondary,
  },
});
