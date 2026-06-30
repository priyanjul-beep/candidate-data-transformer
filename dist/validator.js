"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCHEMA = void 0;
exports.validateDefaultProfile = validateDefaultProfile;
exports.validateCustomProjection = validateCustomProjection;
exports.DEFAULT_SCHEMA = {
    type: 'object',
    required: [
        'candidate_id',
        'full_name',
        'emails',
        'phones',
        'location',
        'links',
        'headline',
        'years_experience',
        'skills',
        'experience',
        'education',
        'provenance',
        'overall_confidence',
    ],
    properties: {
        candidate_id: { type: 'string' },
        full_name: { type: ['string', 'null'] },
        emails: { type: 'array', items: { type: 'string' } },
        phones: { type: 'array', items: { type: 'string' } },
        location: {
            type: 'object',
            properties: { city: { type: ['string', 'null'] }, region: { type: ['string', 'null'] }, country: { type: ['string', 'null'] } },
        },
        links: {
            type: 'object',
            properties: {
                linkedin: { type: ['string', 'null'] },
                github: { type: ['string', 'null'] },
                portfolio: { type: ['string', 'null'] },
                other: { type: 'array', items: { type: 'string' } },
            },
        },
        headline: { type: ['string', 'null'] },
        years_experience: { type: ['number', 'null'] },
        skills: { type: 'array', items: { type: 'object' } },
        experience: { type: 'array', items: { type: 'object' } },
        education: { type: 'array', items: { type: 'object' } },
        provenance: { type: 'array', items: { type: 'object' } },
        overall_confidence: { type: 'number' },
    },
};
function validateDefaultProfile(record) {
    const errors = [];
    // Basic required fields check
    for (const field of exports.DEFAULT_SCHEMA.required) {
        if (!(field in record)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    // Type checks
    if (record.candidate_id && typeof record.candidate_id !== 'string')
        errors.push('candidate_id must be string');
    if (record.full_name && typeof record.full_name !== 'string')
        errors.push('full_name must be string or null');
    if (!Array.isArray(record.emails))
        errors.push('emails must be array');
    if (!Array.isArray(record.phones))
        errors.push('phones must be array');
    if (typeof record.location !== 'object')
        errors.push('location must be object');
    if (typeof record.links !== 'object')
        errors.push('links must be object');
    if (record.headline && typeof record.headline !== 'string')
        errors.push('headline must be string or null');
    if (record.years_experience && typeof record.years_experience !== 'number')
        errors.push('years_experience must be number or null');
    if (!Array.isArray(record.skills))
        errors.push('skills must be array');
    if (!Array.isArray(record.experience))
        errors.push('experience must be array');
    if (!Array.isArray(record.education))
        errors.push('education must be array');
    if (!Array.isArray(record.provenance))
        errors.push('provenance must be array');
    if (typeof record.overall_confidence !== 'number')
        errors.push('overall_confidence must be number');
    return errors;
}
function validateCustomProjection(projected, config) {
    const errors = [];
    const typeMap = {
        string: 'string',
        number: 'number',
        object: 'object',
        'string[]': 'array',
        'object[]': 'array',
    };
    function getPath(obj, path) {
        let current = obj;
        for (const part of path.split('.')) {
            if (typeof current !== 'object' || !(part in current))
                return null;
            current = current[part];
        }
        return current;
    }
    for (const field of config.fields || []) {
        const path = field.path;
        const expected = field.type;
        const value = getPath(projected, path);
        if (value === null || value === undefined) {
            if (field.required) {
                errors.push(`Missing required field: ${path}`);
            }
            continue;
        }
        const expectedType = typeMap[expected];
        if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Field ${path} expected ${expected}, got ${typeof value}`);
        }
        else if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field ${path} expected ${expected}, got ${typeof value}`);
        }
        else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field ${path} expected ${expected}, got ${typeof value}`);
        }
        else if (expectedType === 'object' && typeof value !== 'object') {
            errors.push(`Field ${path} expected ${expected}, got ${typeof value}`);
        }
    }
    return errors;
}
//# sourceMappingURL=validator.js.map