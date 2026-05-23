import * as Contacts from 'expo-contacts';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { normalizePhoneNumber } from '@/lib/utils/phoneNormalizer';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export const useContactSync = () => {
  const { t } = useTranslation();
  const { setHasSyncedContacts } = useSettingsStore();

  const syncMutation = useMutation({
    mutationFn: async (contacts: { name: string; phoneNumber: string; email?: string }[]) => {
      await apiClient.post('/phones/sync', { contacts });
    },
    onSuccess: () => {
      setHasSyncedContacts(true);
      Alert.alert(t('common.success', 'Success'), t('contacts.syncSuccess', 'Contacts synced successfully!'));
    },
    onError: (error: any) => {
      console.error('[ContactSync] Mutation Error:', error);
      const errorMsg = error.response?.data?.message || error.message || t('common.error');
      Alert.alert(t('common.error'), errorMsg);
    },
  });

  const requestAndSync = async () => {
    try {
      if (!Contacts.requestPermissionsAsync) {
        throw new Error('Contacts module not found. Please rebuild your development client.');
      }

      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });

        if (data.length > 0) {
          const formattedContacts = data
            .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
            .flatMap(c => 
              (c.phoneNumbers || []).map(p => ({
                name: c.name,
                phoneNumber: normalizePhoneNumber(p.number || ''),
                email: c.emails && c.emails.length > 0 ? c.emails[0].email : undefined
              }))
            )
            .filter(c => c.phoneNumber.startsWith('+')); // Only send valid E164

          if (formattedContacts.length > 0) {
            syncMutation.mutate(formattedContacts);
          }
        }
        return true;
      } else {
        Alert.alert(
          t('contacts.permissionDenied', 'Permission Denied'),
          t('contacts.permissionReason', 'We need contact access to identify unknown callers.')
        );
        return false;
      }
    } catch (error) {
      console.error('[ContactSync] Error:', error);
      return false;
    }
  };

  return {
    syncContacts: requestAndSync,
    isSyncing: syncMutation.isPending,
    isSuccess: syncMutation.isSuccess,
  };
};
