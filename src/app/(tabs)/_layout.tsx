import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/lib/stores/settingsStore';

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useSettingsStore((state) => state.language);
  const isRTL = language === 'ar';
  const pathname = usePathname();

  useEffect(() => {
    console.log('[Tabs] navigated to:', pathname);
  }, [pathname]);

  const tabs = [
    { name: 'index', label: t('tabs.home'), icon: require('@/assets/images/tabIcons/home.png') },
    { name: 'explore', label: t('tabs.explore'), icon: require('@/assets/images/tabIcons/explore.png') },
    { name: 'profile', label: t('tabs.profile'), icon: require('@/assets/images/tabIcons/explore.png') },
  ];

  const orderedTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundElement}
      labelStyle={{ selected: { color: theme.text } }}>
      {orderedTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={tab.icon}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
