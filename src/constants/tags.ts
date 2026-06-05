export interface TagInfo {
  id: number;
  key: string;
  labelAr: string;
  labelEn: string;
  color: string;
}

export const UNKNOWN_TAG_ID = 10;

export const TAGS: TagInfo[] = [
  { id: 0, key: 'spam', labelAr: 'سبام', labelEn: 'Spam', color: '#ef4444' },
  { id: 1, key: 'scam', labelAr: 'احتيال', labelEn: 'Scam', color: '#991b1b' },
  { id: 2, key: 'telemarketing', labelAr: 'تسويق', labelEn: 'Telemarketing', color: '#f97316' },
  { id: 3, key: 'delivery', labelAr: 'توصيل', labelEn: 'Delivery', color: '#3b82f6' },
  { id: UNKNOWN_TAG_ID, key: 'unknown', labelAr: 'غير معروف', labelEn: 'Unknown', color: '#6b7280' },
];

export const POPULAR_TAGS: TagInfo[] = [
  TAGS.find((t) => t.key === 'spam')!,
  TAGS.find((t) => t.key === 'scam')!,
  TAGS.find((t) => t.key === 'telemarketing')!,
  TAGS.find((t) => t.key === 'delivery')!,
];

export const getTagSuggestions = (input?: string): TagInfo[] => {
  const q = (input || '').trim();

  const filtered = POPULAR_TAGS.filter((t) => {
    if (!q) return true;
    const kl = t.key.toLowerCase();
    return kl.includes(q.toLowerCase()) || t.labelAr.includes(q) || t.labelEn.toLowerCase().includes(q.toLowerCase());
  });

  return filtered;
};

export const getTagById = (id: number) => TAGS.find((t) => t.id === id);
export const getTagByKey = (key: string) => TAGS.find((t) => t.key === key);
