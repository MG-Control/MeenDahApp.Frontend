import React from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import { ThemedText, ThemedTextProps } from '@/components/themed-text';

export const RTLText: React.FC<ThemedTextProps> = ({ children, style, ...props }) => {
  return (
    <ThemedText
      style={[
        styles.text,
        style
      ]}
      {...props}
    >
      {children}
    </ThemedText>
  );
};

const styles = StyleSheet.create({
  text: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});
