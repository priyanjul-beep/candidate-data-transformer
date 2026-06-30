import { extractFromAtsJson, extractFromNotesTxt, extractFromRecruiterCsv } from './extractors';
import { mergeEvidence } from './merger';
import { defaultProjectionConfig, project } from './projector';
import { validateCustomProjection, validateDefaultProfile } from './validator';

export interface PipelineResult {
  canonical: Record<string, any>;
  projected: Record<string, any>;
  validation_errors: string[];
}

export function runPipeline(
  recruiterCsvPath?: string | null,
  atsJsonPath?: string | null,
  notesTxtPath?: string | null,
  config?: Record<string, any> | null,
  candidateId: string = 'candidate-001'
): PipelineResult {
  const evidence = [];
  if (recruiterCsvPath) evidence.push(...extractFromRecruiterCsv(recruiterCsvPath));
  if (atsJsonPath) evidence.push(...extractFromAtsJson(atsJsonPath));
  if (notesTxtPath) evidence.push(...extractFromNotesTxt(notesTxtPath));

  const canonical = mergeEvidence(evidence, candidateId);
  const projectionConfig = config || defaultProjectionConfig();
  const projected = project(canonical, projectionConfig);

  let validationErrors: string[] = [];
  if (!config) {
    validationErrors = validateDefaultProfile(projected);
  } else {
    validationErrors = validateCustomProjection(projected, projectionConfig);
  }

  return { canonical, projected, validation_errors: validationErrors };
}
