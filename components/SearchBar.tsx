import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  placeholder?: string;
  value?: string;
  onSearch: (text: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
}

export default function SearchBar({
  placeholder = 'Search...',
  value: externalValue,
  onSearch,
  debounceMs = 300,
  autoFocus = false,
}: Props) {
  const [text, setText] = useState(externalValue || '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalValue !== undefined) setText(externalValue);
  }, [externalValue]);

  const handleChange = useCallback(
    (val: string) => {
      setText(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(val), debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleClear = () => {
    setText('');
    onSearch('');
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color={Colors.textTertiary} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={text}
        onChangeText={handleChange}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {text.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
});
