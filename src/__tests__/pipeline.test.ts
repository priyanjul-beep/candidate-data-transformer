import { runPipeline } from '../pipeline';

describe('Pipeline - Default Schema', () => {
  test('default pipeline has required fields', () => {
    const result = runPipeline(
      'data/samples/recruiter_export.csv',
      'data/samples/ats_blob.json',
      'data/samples/recruiter_notes.txt'
    );
    const output = result.projected;

    expect(output.candidate_id).toBe('candidate-001');
    expect(Array.isArray(output.emails)).toBe(true);
    expect(Array.isArray(output.phones)).toBe(true);
    expect(Array.isArray(output.skills)).toBe(true);
    expect(typeof output.overall_confidence).toBe('number');
    expect(result.validation_errors.length).toBe(0);
  });
});

describe('Pipeline - Custom Projection', () => {
  test('custom projection works', () => {
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('data/samples/custom_config.json', 'utf-8'));
    const result = runPipeline(
      'data/samples/recruiter_export.csv',
      'data/samples/ats_blob.json',
      'data/samples/recruiter_notes.txt',
      config
    );
    const output = result.projected;

    expect('full_name' in output).toBe(true);
    expect('skills' in output).toBe(true);
    expect(Array.isArray(output.skills)).toBe(true);
  });
});
