import { runPipeline } from '../pipeline';

describe('Pipeline - Edge Cases', () => {
  test('missing source does not crash', () => {
    const result = runPipeline('data/samples/recruiter_export.csv', null, null);
    expect(typeof result.projected).toBe('object');
  });

  test('invalid JSON source degrades gracefully', () => {
    const fs = require('fs');
    const tmpDir = '/tmp';
    const badJson = `${tmpDir}/bad.json`;
    fs.writeFileSync(badJson, '{not-valid', 'utf-8');

    const result = runPipeline(
      'data/samples/recruiter_export.csv',
      badJson,
      'data/samples/recruiter_notes.txt'
    );
    expect(typeof result.projected).toBe('object');
    
    fs.unlinkSync(badJson);
  });
});
