/**
 * Encounter Context Engine
 * Smart encounter type detection, auto-modifier application, and denial prevention rules.
 */
export const DEFAULT_ENCOUNTER_CONTEXT = {
    encounterType: 'follow_up',
    isTelehealth: false,
    placeOfService: '21',
    referringProvider: '',
    referringNPI: '',
};
export const ENCOUNTER_TYPES = [
    { id: 'initial_consult', label: 'Initial Consult', icon: '🩺', description: '99221-99223' },
    { id: 'follow_up', label: 'Follow-Up', icon: '📋', description: '99231-99233' },
    { id: 'discharge', label: 'Discharge', icon: '🏠', description: '99238-99239' },
    { id: 'critical_care', label: 'Critical Care', icon: '🚨', description: '99291-99292' },
    { id: 'procedure', label: 'Procedure', icon: '🔧', description: 'Procedure codes' },
    { id: 'telehealth_consult', label: 'Telehealth', icon: '💻', description: 'POS 02 + Mod -95' },
];
export const POS_CODES = [
    { code: '02', label: '02 - Telehealth' },
    { code: '11', label: '11 - Office' },
    { code: '21', label: '21 - Inpatient Hospital' },
    { code: '22', label: '22 - Outpatient Hospital' },
    { code: '23', label: '23 - Emergency Room' },
    { code: '24', label: '24 - Ambulatory Surgical Center' },
    { code: '31', label: '31 - Skilled Nursing' },
    { code: '32', label: '32 - Nursing Facility' },
    { code: '81', label: '81 - Independent Lab' },
];
