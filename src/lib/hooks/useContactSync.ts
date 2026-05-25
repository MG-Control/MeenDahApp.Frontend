import { useContactPickerStore } from '@/lib/stores/contactPickerStore';
import { normalizePhoneNumber } from '@/lib/utils/phoneNormalizer';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

export const useContactSync = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { setPendingContacts } = useContactPickerStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const requestAndSync = async () => {
    try {
      setIsSyncing(true);

      if (!Contacts.requestPermissionsAsync) {
        throw new Error('Contacts module not found. Please rebuild your development client.');
      }

      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('contacts.permissionDenied', 'Permission Denied'),
          t('contacts.permissionReason', 'We need contact access to identify unknown callers.')
        );
        return false;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Image],
      });

      const formattedContacts = data
        .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
        .flatMap(c =>
          (c.phoneNumbers || []).map(p => ({
            name: c.name ?? '',
            phoneNumber: normalizePhoneNumber(p.number || ''),
            email: c.emails?.[0]?.email,
            avatarUri: c.imageAvailable ? c.image?.uri : undefined,
          }))
        )
        .filter(c => c.phoneNumber.startsWith('+'));

      if (formattedContacts.length === 0) {
        Alert.alert(t('common.error'), t('contacts.noValidContacts', 'No valid contacts found.'));
        return false;
      }

      setPendingContacts(formattedContacts);
      router.push('/contact-picker' as never);
      return true;
    } catch (error) {
      console.error('[ContactSync] Error:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncContacts: requestAndSync,
    isSyncing,
  };
};
