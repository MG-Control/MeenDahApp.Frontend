import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTheme } from '@/hooks/use-theme';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles } from './styles';

interface AuthScreenProps {
  children: React.ReactNode;
}

export function AuthScreen({ children }: AuthScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[sharedStyles.safeArea, { backgroundColor: theme.background }]}>
      <View pointerEvents="none" style={sharedStyles.backdrop}>
        <View style={sharedStyles.backdropGlowTop} />
        <View style={sharedStyles.backdropGlowBottom} />
      </View>
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={sharedStyles.header}>
          <LanguageSwitcher variant="auth" />
        </View>
        <View style={sharedStyles.container}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
