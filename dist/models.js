"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCanonicalProfile = defaultCanonicalProfile;
function defaultCanonicalProfile(candidateId = 'candidate-001') {
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
//# sourceMappingURL=models.js.map