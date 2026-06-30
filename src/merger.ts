import { Evidence, defaultCanonicalProfile } from './models';
import { normalizeCountry, normalizeDateYYYYMM, normalizeEmail, normalizePhone, normalizeSkill, safeFloat } from './normalizers';

function dedupeKeepOrder(values: any[]): any[] {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const value of values) {
    const key = String(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function winner(evidences: Evidence[]): Evidence | null {
  const valid = evidences.filter(e => e.value !== null && e.value !== '' && !Array.isArray(e.value) && typeof e.value !== 'object');
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.confidence - a.confidence);
  return valid[0];
}

export function mergeEvidence(evidences: Evidence[], candidateId: string = 'candidate-001'): Record<string, any> {
  const profile = defaultCanonicalProfile(candidateId);
  const byField: Record<string, Evidence[]> = {};

  for (const item of evidences) {
    if (!byField[item.field]) byField[item.field] = [];
    byField[item.field].push(item);
  }

  const provenance: Array<Record<string, string>> = [];
  const confidenceParts: number[] = [];

  // Scalars
  for (const field of ['full_name', 'headline', 'years_experience']) {
    const win = winner(byField[field] || []);
    if (!win) continue;
    let value: any = win.value;
    if (field === 'years_experience') {
      value = safeFloat(value);
      if (value !== null) value = Math.round(value * 10) / 10;
    }
    profile[field] = value;
    confidenceParts.push(win.confidence);
    provenance.push({ field, source: win.source, method: win.method });
  }

  // Emails
  const emails: string[] = [];
  const emailSources: Array<[string, string, number]> = [];
  for (const e of byField.emails || []) {
    const normalized = normalizeEmail(String(e.value));
    if (normalized) {
      emails.push(normalized);
      emailSources.push([e.source, e.method, e.confidence]);
    }
  }
  profile.emails = dedupeKeepOrder(emails);
  if (profile.emails.length > 0) {
    const best = emailSources.sort((a, b) => b[2] - a[2])[0];
    confidenceParts.push(best[2]);
    provenance.push({ field: 'emails', source: best[0], method: best[1] });
  }

  // Phones
  const phones: string[] = [];
  const phoneSources: Array<[string, string, number]> = [];
  for (const e of byField.phones || []) {
    const normalized = normalizePhone(String(e.value));
    if (normalized) {
      phones.push(normalized);
      phoneSources.push([e.source, e.method, e.confidence]);
    }
  }
  profile.phones = dedupeKeepOrder(phones);
  if (profile.phones.length > 0) {
    const best = phoneSources.sort((a, b) => b[2] - a[2])[0];
    confidenceParts.push(best[2]);
    provenance.push({ field: 'phones', source: best[0], method: best[1] });
  }

  // Location
  for (const leaf of ['city', 'region', 'country']) {
    const field = `location.${leaf}`;
    const win = winner(byField[field] || []);
    if (!win) continue;
    let val = String(win.value).trim();
    if (leaf === 'country') val = normalizeCountry(val) || val;
    profile.location[leaf] = val;
    confidenceParts.push(win.confidence);
    provenance.push({ field, source: win.source, method: win.method });
  }

  // Links
  for (const leaf of ['linkedin', 'github', 'portfolio']) {
    const field = `links.${leaf}`;
    const win = winner(byField[field] || []);
    if (win) {
      profile.links[leaf] = win.value;
      confidenceParts.push(win.confidence);
      provenance.push({ field, source: win.source, method: win.method });
    }
  }

  const otherLinks: string[] = [];
  for (const e of byField['links.other'] || []) {
    if (e.value) {
      otherLinks.push(String(e.value).trim());
      confidenceParts.push(e.confidence);
      provenance.push({ field: 'links.other', source: e.source, method: e.method });
    }
  }
  profile.links.other = dedupeKeepOrder(otherLinks);

  // Skills
  const skillBucket: Record<string, { name: string; confidence: number; sources: string[] }> = {};
  for (const e of byField.skills || []) {
    const name = normalizeSkill(String(e.value));
    if (!name) continue;
    if (!skillBucket[name]) {
      skillBucket[name] = { name, confidence: e.confidence, sources: [e.source] };
    } else {
      skillBucket[name].confidence = Math.max(skillBucket[name].confidence, e.confidence);
      if (!skillBucket[name].sources.includes(e.source)) skillBucket[name].sources.push(e.source);
    }
  }
  profile.skills = Object.values(skillBucket).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
  if (profile.skills.length > 0) {
    confidenceParts.push(profile.skills.reduce((s: number, x: any) => s + x.confidence, 0) / profile.skills.length);
    provenance.push({ field: 'skills', source: 'multi', method: 'canonical_merge' });
  }

  // Experience
  const expValues: Record<string, any>[] = [];
  for (const e of byField.experience || []) {
    if (typeof e.value === 'object' && e.value !== null) {
      expValues.push({
        company: e.value.company,
        title: e.value.title,
        start: normalizeDateYYYYMM(e.value.start),
        end: normalizeDateYYYYMM(e.value.end),
        summary: e.value.summary,
      });
      confidenceParts.push(e.confidence);
      provenance.push({ field: 'experience', source: e.source, method: e.method });
    }
  }
  profile.experience = expValues;

  // Education
  const eduValues: Record<string, any>[] = [];
  for (const e of byField.education || []) {
    if (typeof e.value === 'object' && e.value !== null) {
      eduValues.push({
        institution: e.value.institution,
        degree: e.value.degree,
        field: e.value.field,
        start_year: e.value.start_year,
        end_year: e.value.end_year,
      });
      confidenceParts.push(e.confidence);
      provenance.push({ field: 'education', source: e.source, method: e.method });
    }
  }
  profile.education = eduValues;

  profile.provenance = provenance;
  profile.overall_confidence = confidenceParts.length > 0 ? Math.round((confidenceParts.reduce((a, b) => a + b, 0) / confidenceParts.length) * 10000) / 10000 : 0;

  return profile;
}
