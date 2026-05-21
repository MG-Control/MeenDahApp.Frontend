export interface TagInfo {
  id: number;
  key: string;
  labelAr: string;
  labelEn: string;
  color: string;
}

export const TAGS: TagInfo[] = [
  { id: 0, key: 'spam', labelAr: 'سبام', labelEn: 'Spam', color: '#ef4444' },
  { id: 1, key: 'scam', labelAr: 'احتيال', labelEn: 'Scam', color: '#991b1b' },
  { id: 2, key: 'telemarketing', labelAr: 'تسويق', labelEn: 'Telemarketing', color: '#f97316' },
  { id: 3, key: 'delivery', labelAr: 'توصيل', labelEn: 'Delivery', color: '#3b82f6' },
  { id: 4, key: 'bank', labelAr: 'بنك', labelEn: 'Bank', color: '#0d9488' },
  { id: 5, key: 'loan', labelAr: 'قرض', labelEn: 'Loan', color: '#7c3aed' },
  { id: 6, key: 'family', labelAr: 'عائلة', labelEn: 'Family', color: '#16a34a' },
  { id: 7, key: 'business', labelAr: 'تجاري', labelEn: 'Business', color: '#4f46e5' },
  { id: 8, key: 'annoying', labelAr: 'مزعج', labelEn: 'Annoying', color: '#ca8a04' },
  { id: 9, key: 'store', labelAr: 'محل', labelEn: 'Store', color: '#0891b2' },
  { id: 10, key: 'unknown', labelAr: 'غير معروف', labelEn: 'Unknown', color: '#6b7280' },
];

export const getTagById = (id: number) => TAGS.find((t) => t.id === id);
export const getTagByKey = (key: string) => TAGS.find((t) => t.key === key);
