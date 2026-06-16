import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import type { AlertButton } from '../hooks/useAlert';

interface AppAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss: () => void;
}

export default function AppAlert({ visible, title, message, buttons, onDismiss }: AppAlertProps) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.88);
      opacity.setValue(0);
    }
  }, [visible]);

  const handle = (btn: AlertButton) => {
    onDismiss();
    btn.onPress?.();
  };

  const stacked = buttons.length > 2;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <View style={styles.divider} />
          <View style={[styles.buttons, !stacked && styles.buttonsRow]}>
            {buttons.map((btn, idx) => (
              <React.Fragment key={btn.text}>
                {!stacked && idx > 0 && <View style={styles.btnDivider} />}
                <TouchableOpacity
                  style={[
                    styles.btn,
                    stacked && styles.btnStacked,
                    stacked && idx < buttons.length - 1 && styles.btnStackedBorder,
                  ]}
                  onPress={() => handle(btn)}
                  activeOpacity={0.55}
                >
                  <Text
                    style={[
                      styles.btnText,
                      btn.style === 'cancel' && styles.btnCancel,
                      btn.style === 'destructive' && styles.btnDestructive,
                      (!btn.style || btn.style === 'default') && styles.btnDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  body: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  message: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  divider: { height: 0.5, backgroundColor: Colors.border },
  buttons: { flexDirection: 'column' },
  buttonsRow: { flexDirection: 'row' },
  btn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnStacked: { flex: 0, paddingVertical: 14 },
  btnStackedBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  btnDivider: { width: 0.5, backgroundColor: Colors.border },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnDefault: { color: Colors.primary },
  btnCancel: { color: Colors.textSecondary, fontWeight: '400' },
  btnDestructive: { color: Colors.danger },
});
