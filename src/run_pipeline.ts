import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { runPipeline } from './pipeline';

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));

program
  .version(packageJson.version)
  .description('Multi-source Candidate Data Transformer')
  .option('--recruiter-csv <path>', 'Path to recruiter CSV export')
  .option('--ats-json <path>', 'Path to ATS JSON blob')
  .option('--notes <path>', 'Path to recruiter notes TXT')
  .option('--config <path>', 'Optional custom projection config JSON')
  .option('--out <path>', 'Output file path', 'outputs/default_output.json')
  .option('--candidate-id <id>', 'Candidate ID', 'candidate-001')
  .parse(process.argv);

const opts = program.opts();

try {
  let customConfig = null;
  if (opts.config) {
    const configContent = fs.readFileSync(opts.config, 'utf-8');
    customConfig = JSON.parse(configContent);
  }

  const result = runPipeline(opts.recruiterCsv, opts.atsJson, opts.notes, customConfig, opts.candidateId);

  const outDir = path.dirname(opts.out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(opts.out, JSON.stringify(result.projected, null, 2), 'utf-8');

  console.log('Projected profile:');
  console.log(JSON.stringify(result.projected, null, 2));

  if (result.validation_errors.length > 0) {
    console.log('\nValidation errors:');
    for (const err of result.validation_errors) {
      console.log('-', err);
    }
  } else {
    console.log('\nValidation: OK');
  }
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
