export function formatRelativeTime(
  isoDate: string,
  language: 'ar' | 'en'
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat === 'undefined') {
    if (diffSec < 60) return language === 'ar' ? 'الآن' : 'now';
    if (diffMin < 60) return language === 'ar' ? `منذ ${diffMin} دقيقة` : `${diffMin} min ago`;
    if (diffHour < 24) return language === 'ar' ? `منذ ${diffHour} ساعة` : `${diffHour} hr ago`;
    if (diffDay < 30) return language === 'ar' ? `منذ ${diffDay} يوم` : `${diffDay} day ago`;

    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  if (diffDay < 30) return rtf.format(-diffDay, 'day');

  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
