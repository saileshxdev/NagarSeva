/**
 * src/config/designations.js
 *
 * Vocabulary of valid ULB designations for each department type and system role.
 * Based on Jharkhand Municipal Act, 2011 (Ranchi Municipal Corporation staffing).
 *
 * Structure:
 *   DESIGNATIONS[dept_type][role] → string[]
 *
 * Usage:
 *   const DESIGNATIONS = require('./designations');
 *   const options = DESIGNATIONS['ENGINEERING']['FIELD_WORKER'];
 *   // → ['Junior Engineer (Civil)', 'Junior Engineer (Electrical)', 'Lineman']
 */

const DESIGNATIONS = {
  ENGINEERING: {
    ADMIN: [
      'Assistant Engineer',
      'Executive Engineer',
    ],
    FIELD_WORKER: [
      'Junior Engineer (Civil)',
      'Junior Engineer (Electrical)',
      'Lineman',
    ],
  },

  WATER_SUPPLY: {
    ADMIN: [
      'Assistant Engineer (Water Supply)',
    ],
    FIELD_WORKER: [
      'Junior Engineer (Water Works)',
      'Pump Operator',
    ],
  },

  SANITATION: {
    ADMIN: [
      'Sanitary Supervisor',
      'Health Officer',
    ],
    FIELD_WORKER: [
      'Sanitary Inspector',
      'Safai Mitra',
    ],
  },

  STREET_LIGHTING: {
    ADMIN: [
      'Assistant Engineer (Electrical)',
    ],
    FIELD_WORKER: [
      'Junior Engineer (Electrical)',
      'Lineman',
    ],
  },

  HORTICULTURE: {
    ADMIN: [
      'Horticulture Officer',
    ],
    FIELD_WORKER: [
      'Horticulture Supervisor',
      'Junior Engineer (Civil)',
    ],
  },

  ENCROACHMENT: {
    ADMIN: [
      'Estate Officer',
    ],
    FIELD_WORKER: [
      'Anti-Encroachment Squad Inspector',
      'Enforcement Inspector',
    ],
  },

  ANIMAL_CONTROL: {
    ADMIN: [
      'Chief Health Officer',
    ],
    FIELD_WORKER: [
      'Veterinary Officer',
      'Dog Catching Squad Inspector',
    ],
  },

  GENERAL: {
    ADMIN: [
      'Grievance Redressal Officer',
    ],
    FIELD_WORKER: [
      'Administrative Assistant',
    ],
  },
};

/**
 * Returns valid designation strings for a given dept_type + role combination.
 * Returns null if the dept_type or role is not found.
 *
 * @param {string} deptType  - e.g. 'ENGINEERING'
 * @param {string} role      - 'ADMIN' or 'FIELD_WORKER'
 * @returns {string[] | null}
 */
function getDesignations(deptType, role) {
  return DESIGNATIONS[deptType]?.[role] ?? null;
}

/**
 * Checks whether a given designation string is valid for a dept_type + role combination.
 *
 * @param {string} deptType
 * @param {string} role
 * @param {string} designation
 * @returns {boolean}
 */
function isValidDesignation(deptType, role, designation) {
  const valid = getDesignations(deptType, role);
  return valid !== null && valid.includes(designation);
}

module.exports = { DESIGNATIONS, getDesignations, isValidDesignation };
