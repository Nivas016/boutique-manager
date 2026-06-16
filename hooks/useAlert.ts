import { useState, useCallback } from 'react';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export function useAlert() {
  const [state, setState] = useState<AlertState>({ visible: false, title: '', buttons: [] });

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setState({ visible: true, title, message, buttons: buttons ?? [{ text: 'OK' }] });
  }, []);

  const onDismiss = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  return { showAlert, alertProps: { ...state, onDismiss } };
}
