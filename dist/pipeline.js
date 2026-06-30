"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const extractors_1 = require("./extractors");
const merger_1 = require("./merger");
const projector_1 = require("./projector");
const validator_1 = require("./validator");
function runPipeline(recruiterCsvPath, atsJsonPath, notesTxtPath, config, candidateId = 'candidate-001') {
    const evidence = [];
    if (recruiterCsvPath)
        evidence.push(...(0, extractors_1.extractFromRecruiterCsv)(recruiterCsvPath));
    if (atsJsonPath)
        evidence.push(...(0, extractors_1.extractFromAtsJson)(atsJsonPath));
    if (notesTxtPath)
        evidence.push(...(0, extractors_1.extractFromNotesTxt)(notesTxtPath));
    const canonical = (0, merger_1.mergeEvidence)(evidence, candidateId);
    const projectionConfig = config || (0, projector_1.defaultProjectionConfig)();
    const projected = (0, projector_1.project)(canonical, projectionConfig);
    let validationErrors = [];
    if (!config) {
        validationErrors = (0, validator_1.validateDefaultProfile)(projected);
    }
    else {
        validationErrors = (0, validator_1.validateCustomProjection)(projected, projectionConfig);
    }
    return { canonical, projected, validation_errors: validationErrors };
}
//# sourceMappingURL=pipeline.js.map