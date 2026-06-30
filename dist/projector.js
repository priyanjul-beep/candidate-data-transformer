"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultProjectionConfig = defaultProjectionConfig;
exports.extractPath = extractPath;
exports.setPath = setPath;
exports.project = project;
const normalizers_1 = require("./normalizers");
function defaultProjectionConfig() {
    return {
        fields: [
            { path: 'candidate_id', type: 'string', required: true },
            { path: 'full_name', type: 'string' },
            { path: 'emails', type: 'string[]' },
            { path: 'phones', type: 'string[]', normalize: 'E164' },
            { path: 'location', type: 'object' },
            { path: 'links', type: 'object' },
            { path: 'headline', type: 'string' },
            { path: 'years_experience', type: 'number' },
            { path: 'skills', type: 'object[]' },
            { path: 'experience', type: 'object[]' },
            { path: 'education', type: 'object[]' },
        ],
        include_confidence: true,
        include_provenance: true,
        on_missing: 'null',
    };
}
function extractSimple(obj, parts) {
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined)
            return null;
        if (typeof current === 'object' && current !== null) {
            current = current[part];
        }
        else {
            return null;
        }
    }
    return current;
}
function extractPath(obj, path) {
    if (path.includes('[]')) {
        const [left, ...rightParts] = path.split('[]');
        const rightStr = rightParts.join('[]');
        const leftClean = left.replace(/\.$/, '');
        const rightClean = rightStr.replace(/^\./, '');
        const arr = extractSimple(obj, leftClean.split('.'));
        if (!Array.isArray(arr))
            return null;
        if (!rightClean)
            return arr;
        const result = [];
        for (const item of arr) {
            if (typeof item === 'object' && item !== null) {
                const value = extractSimple(item, rightClean.split('.'));
                if (value !== null)
                    result.push(value);
            }
        }
        return result;
    }
    if (path.includes('[') && path.endsWith(']')) {
        const [base, idxStr] = path.split('[');
        const idx = parseInt(idxStr.slice(0, -1), 10);
        const arr = extractSimple(obj, base.split('.'));
        if (Array.isArray(arr) && arr.length > idx)
            return arr[idx];
        return null;
    }
    return extractSimple(obj, path.split('.'));
}
function setPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
function applyNormalization(value, mode) {
    if (!mode)
        return value;
    if (mode === 'E164') {
        if (typeof value === 'string') {
            return (0, normalizers_1.normalizePhone)(value);
        }
        if (Array.isArray(value)) {
            return value.map(x => (0, normalizers_1.normalizePhone)(String(x))).filter(v => v !== null);
        }
    }
    if (mode === 'canonical') {
        if (Array.isArray(value)) {
            return value.map(x => (0, normalizers_1.normalizeSkill)(String(x)));
        }
        if (typeof value === 'string') {
            return (0, normalizers_1.normalizeSkill)(value);
        }
    }
    return value;
}
function project(canonical, config) {
    const result = {};
    const onMissing = config.on_missing || 'null';
    for (const field of config.fields || []) {
        const outPath = field.path;
        const srcPath = field.from || outPath;
        let value = extractPath(canonical, srcPath);
        value = applyNormalization(value, field.normalize);
        if (value === null || value === undefined) {
            if (onMissing === 'omit') {
                continue;
            }
            if (onMissing === 'error' && field.required) {
                throw new Error(`Required field missing: ${outPath}`);
            }
            if (onMissing === 'null') {
                setPath(result, outPath, null);
                continue;
            }
        }
        setPath(result, outPath, value);
    }
    if (config.include_confidence !== false) {
        result.overall_confidence = canonical.overall_confidence;
    }
    if (config.include_provenance !== false) {
        result.provenance = canonical.provenance || [];
    }
    return result;
}
//# sourceMappingURL=projector.js.map