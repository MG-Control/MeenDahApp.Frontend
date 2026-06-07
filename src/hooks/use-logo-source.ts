import { useTranslation } from 'react-i18next';
import { useColorScheme } from './use-color-scheme';

export function useLogoSource() {
  const { i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isArabic = i18n.language === 'ar';
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  if (isArabic && scheme === 'dark') return require('@/assets/images/logo/meendah_arabic_dark.png');
  if (isArabic && scheme === 'light') return require('@/assets/images/logo/meendah_arabic_light.png');
  if (!isArabic && scheme === 'dark') return require('@/assets/images/logo/meendah_english_dark.png');
  return require('@/assets/images/logo/meendah_english_light.png');
}
