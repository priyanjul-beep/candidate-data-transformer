import fs from 'fs';
import Papa from 'papaparse';
import { Evidence } from './models';

const KNOWN_SKILLS = [
  'python',
  'java',
  'javascript',
  'sql',
  'aws',
  'docker',
  'kubernetes',
  'machine learning',
  'nlp',
  'react',
  'node',
  'postgres',
];

export function extractFromRecruiterCsv(filePath: string | null): Evidence[] {
  if (!filePath || !fs.existsSync(filePath)) return [];

  const result: Evidence[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data) {
      const name = row.name || null;
      const email = row.email || null;
      const phone = row.phone || null;
      const company = row.current_company || null;
      const title = row.title || null;
      const location = row.location || null;
      const skills = row.skills || null;

      if (name) result.push({ field: 'full_name', value: name, confidence: 0.93, source: 'recruiter_csv', method: 'column:name' });
      if (email) result.push({ field: 'emails', value: email, confidence: 0.97, source: 'recruiter_csv', method: 'column:email' });
      if (phone) result.push({ field: 'phones', value: phone, confidence: 0.9, source: 'recruiter_csv', method: 'column:phone' });
      if (title) result.push({ field: 'headline', value: title, confidence: 0.7, source: 'recruiter_csv', method: 'column:title' });

      if (company || title) {
        result.push({
          field: 'experience',
          value: { company, title, start: null, end: null, summary: 'Current role from recruiter export' },
          confidence: 0.75,
          source: 'recruiter_csv',
          method: 'row_to_experience',
        });
      }

      if (location) {
        const locParts = location.split(',').map((p: string) => p.trim());
        if (locParts[0]) result.push({ field: 'location.city', value: locParts[0], confidence: 0.8, source: 'recruiter_csv', method: 'parse_location' });
        if (locParts[1]) result.push({ field: 'location.region', value: locParts[1], confidence: 0.8, source: 'recruiter_csv', method: 'parse_location' });
        if (locParts[2]) result.push({ field: 'location.country', value: locParts[2], confidence: 0.8, source: 'recruiter_csv', method: 'parse_location' });
      }

      if (skills) {
        const skillList = skills.split(',').map((s: string) => s.trim());
        for (const skill of skillList) {
          if (skill) result.push({ field: 'skills', value: skill, confidence: 0.8, source: 'recruiter_csv', method: 'column:skills' });
        }
      }
    }
  } catch (e) {
    // ignore parsing errors
  }

  return result;
}

export function extractFromAtsJson(filePath: string | null): Evidence[] {
  if (!filePath || !fs.existsSync(filePath)) return [];

  const result: Evidence[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(content);

    if (payload.fullName) result.push({ field: 'full_name', value: payload.fullName, confidence: 0.88, source: 'ats_json', method: 'field:fullName' });
    if (payload.primaryEmail) result.push({ field: 'emails', value: payload.primaryEmail, confidence: 0.92, source: 'ats_json', method: 'field:primaryEmail' });
    if (payload.phoneNumber) result.push({ field: 'phones', value: payload.phoneNumber, confidence: 0.87, source: 'ats_json', method: 'field:phoneNumber' });
    if (payload.yearsExp !== undefined) result.push({ field: 'years_experience', value: payload.yearsExp, confidence: 0.78, source: 'ats_json', method: 'field:yearsExp' });

    if (payload.links && typeof payload.links === 'object') {
      if (payload.links.github) result.push({ field: 'links.github', value: payload.links.github, confidence: 0.83, source: 'ats_json', method: 'field:links.github' });
      if (payload.links.linkedin) result.push({ field: 'links.linkedin', value: payload.links.linkedin, confidence: 0.83, source: 'ats_json', method: 'field:links.linkedin' });
    }

    if (Array.isArray(payload.skills)) {
      for (const skill of payload.skills) {
        result.push({ field: 'skills', value: skill, confidence: 0.85, source: 'ats_json', method: 'field:skills' });
      }
    }

    if (Array.isArray(payload.experience)) {
      for (const exp of payload.experience) {
        if (typeof exp === 'object') {
          result.push({ field: 'experience', value: exp, confidence: 0.8, source: 'ats_json', method: 'field:experience' });
        }
      }
    }

    if (Array.isArray(payload.education)) {
      for (const edu of payload.education) {
        if (typeof edu === 'object') {
          result.push({ field: 'education', value: edu, confidence: 0.82, source: 'ats_json', method: 'field:education' });
        }
      }
    }
  } catch (e) {
    // ignore parsing errors
  }

  return result;
}

export function extractFromNotesTxt(filePath: string | null): Evidence[] {
  if (!filePath || !fs.existsSync(filePath)) return [];

  const result: Evidence[] = [];
  try {
    const text = fs.readFileSync(filePath, 'utf-8');

    const nameMatch = text.match(/name\s*:\s*(.+)/i);
    if (nameMatch) result.push({ field: 'full_name', value: nameMatch[1].trim(), confidence: 0.72, source: 'notes_txt', method: 'regex:name' });

    const emails = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    for (const email of emails) {
      result.push({ field: 'emails', value: email, confidence: 0.7, source: 'notes_txt', method: 'regex:email' });
    }

    const phones = text.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [];
    for (const phone of phones) {
      result.push({ field: 'phones', value: phone, confidence: 0.65, source: 'notes_txt', method: 'regex:phone' });
    }

    const yearsMatch = text.match(/(\d+)\+?\s+years/i);
    if (yearsMatch) {
      result.push({ field: 'years_experience', value: parseInt(yearsMatch[1], 10), confidence: 0.7, source: 'notes_txt', method: 'regex:years_experience' });
    }

    const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/\S+/i);
    if (linkedin) result.push({ field: 'links.linkedin', value: linkedin[0], confidence: 0.74, source: 'notes_txt', method: 'regex:linkedin' });

    const github = text.match(/https?:\/\/(?:www\.)?github\.com\/\S+/i);
    if (github) result.push({ field: 'links.github', value: github[0], confidence: 0.74, source: 'notes_txt', method: 'regex:github' });

    for (const skill of KNOWN_SKILLS) {
      const skillRegex = new RegExp(`\\b${skill}\\b`, 'i');
      if (skillRegex.test(text)) {
        result.push({ field: 'skills', value: skill, confidence: 0.62, source: 'notes_txt', method: 'keyword_match' });
      }
    }
  } catch (e) {
    // ignore parsing errors
  }

  return result;
}
