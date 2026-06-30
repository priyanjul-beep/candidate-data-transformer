"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pipeline_1 = require("./pipeline");
const packageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../package.json'), 'utf-8'));
commander_1.program
    .version(packageJson.version)
    .description('Multi-source Candidate Data Transformer')
    .option('--recruiter-csv <path>', 'Path to recruiter CSV export')
    .option('--ats-json <path>', 'Path to ATS JSON blob')
    .option('--notes <path>', 'Path to recruiter notes TXT')
    .option('--config <path>', 'Optional custom projection config JSON')
    .option('--out <path>', 'Output file path', 'outputs/default_output.json')
    .option('--candidate-id <id>', 'Candidate ID', 'candidate-001')
    .parse(process.argv);
const opts = commander_1.program.opts();
try {
    let customConfig = null;
    if (opts.config) {
        const configContent = fs_1.default.readFileSync(opts.config, 'utf-8');
        customConfig = JSON.parse(configContent);
    }
    const result = (0, pipeline_1.runPipeline)(opts.recruiterCsv, opts.atsJson, opts.notes, customConfig, opts.candidateId);
    const outDir = path_1.default.dirname(opts.out);
    if (!fs_1.default.existsSync(outDir)) {
        fs_1.default.mkdirSync(outDir, { recursive: true });
    }
    fs_1.default.writeFileSync(opts.out, JSON.stringify(result.projected, null, 2), 'utf-8');
    console.log('Projected profile:');
    console.log(JSON.stringify(result.projected, null, 2));
    if (result.validation_errors.length > 0) {
        console.log('\nValidation errors:');
        for (const err of result.validation_errors) {
            console.log('-', err);
        }
    }
    else {
        console.log('\nValidation: OK');
    }
}
catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
//# sourceMappingURL=run_pipeline.js.map