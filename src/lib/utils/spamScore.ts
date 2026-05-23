export const getSpamDetails = (score: number) => {
  if (score >= 80) return { label: 'High Risk', color: '#ef4444', level: 'danger' };
  if (score >= 50) return { label: 'Medium Risk', color: '#f97316', level: 'warning' };
  if (score >= 20) return { label: 'Low Risk', color: '#eab308', level: 'info' };
  return { label: 'Safe', color: '#22c55e', level: 'success' };
};

export const getSpamDetailsAr = (score: number) => {
  if (score >= 80) return { label: 'خطر مرتفع', color: '#ef4444', level: 'danger' };
  if (score >= 50) return { label: 'خطر متوسط', color: '#f97316', level: 'warning' };
  if (score >= 20) return { label: 'خطر منخفض', color: '#eab308', level: 'info' };
  return { label: 'آمن', color: '#22c55e', level: 'success' };
};
