/**
 * Formatação de datas em português (pt-PT).
 */

export function formatDatePt(value, localeOptions, fallback = '-') {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleDateString('pt-PT', localeOptions);
  } catch {
    return String(value);
  }
}

export function formatDateShortPt(value, fallback = '-') {
  return formatDatePt(value, {
    day: '2-digit', month: 'short', year: 'numeric',
  }, fallback);
}

export function formatDateLongPt(value, fallback = '-') {
  return formatDatePt(value, {
    day: '2-digit', month: 'long', year: 'numeric',
  }, fallback);
}

export function formatDateTimePt(value, fallback = '-') {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleDateString('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}
