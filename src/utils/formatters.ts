export function cleanText(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/&#0*39;|&#x0*27;|&apos;|â€™|Ã¢â‚¬â„¢/gi, "'")
    .replace(/&quot;|&#0*34;/gi, '"')
    .replace(/&amp;/gi, '&');
}

export function formatHumanDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const cleaned = dateStr.replace(/^\[|\]$/g, '').trim();
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  }
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  }
  return cleaned;
}

export function formatTableDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const cleaned = dateStr.replace(/^\[|\]$/g, '').trim();
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  }
  return formatHumanDate(dateStr);
}

export function getDoctorInitials(name?: string | null): string {
  if (!name) return 'DR';
  const stripped = cleanText(name)
    .replace(/^(dr\.?|prof\.?|assoc\.?\s*prof\.?)\s+/i, '')
    .trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
