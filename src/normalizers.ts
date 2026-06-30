const skillMap: Record<string, string> = {
  js: 'javascript',
  node: 'node.js',
  nodejs: 'node.js',
  py: 'python',
  postgres: 'postgresql',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  nlp: 'natural language processing',
};

const countryMap: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  us: 'US',
  india: 'IN',
  in: 'IN',
  'united kingdom': 'GB',
  uk: 'GB',
  germany: 'DE',
  canada: 'CA',
};

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

export function normalizePhone(value: string | null | undefined, defaultRegion: string = 'US'): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/[^\d+]/g, '');
  if (!cleaned.match(/^(\+)?1?\d{10,}$/)) return null;
  let digits = cleaned.replace(/^\+/, '').replace(/^1/, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

export function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (countryMap[key]) return countryMap[key];
  if (value.trim().length === 2) return value.trim().toUpperCase();
  return null;
}

export function normalizeSkill(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return skillMap[key] || key;
}

export function normalizeDateYYYYMM(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();

  const formats = [
    /^(\d{4})-(\d{2})$/,
    /^(\d{4})\/(\d{2})$/,
    /^(\d{4})-(\d{2})-\d{2}$/,
    /^(\d{4})\/(\d{2})\/\d{2}$/,
  ];

  for (const format of formats) {
    const match = text.match(format);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
  }

  const yearMatch = text.match(/(19|20)\d{2}/);
  if (yearMatch) return `${yearMatch[0]}-01`;

  return null;
}

export function safeFloat(value: any): number | null {
  try {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}
