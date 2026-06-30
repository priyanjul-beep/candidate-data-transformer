import * as fs from 'fs';
import * as path from 'path';

export interface Evidence {
  field: string;
  value: any;
  confidence: number;
  source: string;
  method: string;
}

export function defaultCanonicalProfile(candidateId: string = 'candidate-001'): Record<string, any> {
  return {
    candidate_id: candidateId,
    full_name: null,
    emails: [],
    phones: [],
    location: { city: null, region: null, country: null },
    links: { linkedin: null, github: null, portfolio: null, other: [] },
    headline: null,
    years_experience: null,
    skills: [],
    experience: [],
    education: [],
    provenance: [],
    overall_confidence: 0.0,
  };
}
