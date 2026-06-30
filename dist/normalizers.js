"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEmail = normalizeEmail;
exports.normalizePhone = normalizePhone;
exports.normalizeCountry = normalizeCountry;
exports.normalizeSkill = normalizeSkill;
exports.normalizeDateYYYYMM = normalizeDateYYYYMM;
exports.safeFloat = safeFloat;
const skillMap = {
    js: 'javascript',
    node: 'node.js',
    nodejs: 'node.js',
    py: 'python',
    postgres: 'postgresql',
    ml: 'machine learning',
    ai: 'artificial intelligence',
    nlp: 'natural language processing',
};
const countryMap = {
    'united states': 'US',
    usa: 'US',
    us: 'US',
    india: 'IN',
    in: 'IN',
    'united kingdom': 'GB',
    uk: 'GB',
    germany: 'DE',
    canada: 'CA',
};
function normalizeEmail(value) {
    if (!value)
        return null;
    const trimmed = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : null;
}
function normalizePhone(value, defaultRegion = 'US') {
    if (!value)
        return null;
    const cleaned = value.trim().replace(/[^\d+]/g, '');
    if (!cleaned.match(/^(\+)?1?\d{10,}$/))
        return null;
    let digits = cleaned.replace(/^\+/, '').replace(/^1/, '');
    if (digits.length === 10)
        return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1'))
        return `+${digits}`;
    if (digits.length > 10)
        return `+${digits}`;
    return null;
}
function normalizeCountry(value) {
    if (!value)
        return null;
    const key = value.trim().toLowerCase();
    if (countryMap[key])
        return countryMap[key];
    if (value.trim().length === 2)
        return value.trim().toUpperCase();
    return null;
}
function normalizeSkill(value) {
    if (!value)
        return null;
    const key = value.trim().toLowerCase().replace(/\s+/g, ' ');
    return skillMap[key] || key;
}
function normalizeDateYYYYMM(value) {
    if (!value)
        return null;
    const text = value.trim();
    const formats = [
        /^(\d{4})-(\d{2})$/,
        /^(\d{4})\/(\d{2})$/,
        /^(\d{4})-(\d{2})-\d{2}$/,
        /^(\d{4})\/(\d{2})\/\d{2}$/,
    ];
    for (const format of formats) {
        const match = text.match(format);
        if (match)
            return `${match[1]}-${match[2].padStart(2, '0')}`;
    }
    const yearMatch = text.match(/(19|20)\d{2}/);
    if (yearMatch)
        return `${yearMatch[0]}-01`;
    return null;
}
function safeFloat(value) {
    try {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=normalizers.js.map