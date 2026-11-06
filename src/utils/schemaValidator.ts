import { Person } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ALLOWED_PERSON_FIELDS = new Set([
  'id',
  'firstName',
  'lastName',
  'nickname',
  'gender',
  'birthYear',
  'birthDate',
  'deathDate',
  'isLiving',
  'birthPlace',
  'occupation',
  'notes',
  'photoThumb',
  'fatherId',
  'motherId',
  'spouseIds',
  'createdAt',
  'updatedAt',
  'updatedBy',
]);

export function validatePersonRecord(data: Partial<Person>): ValidationResult {
  const errors: string[] = [];

  // Check forbidden fields
  for (const key of Object.keys(data)) {
    if (!ALLOWED_PERSON_FIELDS.has(key)) {
      errors.push(`Disallowed field: ${key}`);
    }
  }

  // Required firstName
  if (typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
    errors.push('First name is required.');
  } else if (data.firstName.length > 100) {
    errors.push('First name cannot exceed 100 characters.');
  }

  // Optional string limits
  if (data.lastName && (typeof data.lastName !== 'string' || data.lastName.length > 100)) {
    errors.push('Last name cannot exceed 100 characters.');
  }
  if (data.nickname && (typeof data.nickname !== 'string' || data.nickname.length > 100)) {
    errors.push('Nickname cannot exceed 100 characters.');
  }
  if (data.birthPlace && (typeof data.birthPlace !== 'string' || data.birthPlace.length > 200)) {
    errors.push('Birth place cannot exceed 200 characters.');
  }
  if (data.occupation && (typeof data.occupation !== 'string' || data.occupation.length > 200)) {
    errors.push('Occupation cannot exceed 200 characters.');
  }
  if (data.notes && (typeof data.notes !== 'string' || data.notes.length > 5000)) {
    errors.push('Notes cannot exceed 5000 characters.');
  }
  if (data.photoThumb && (typeof data.photoThumb !== 'string' || data.photoThumb.length > 110000)) {
    errors.push('Photo thumb is too large (max 100KB / 110,000 characters).');
  }

  // Gender
  if (!['male', 'female', 'other'].includes(data.gender || '')) {
    errors.push('Gender must be "male", "female", or "other".');
  }

  // isLiving
  if (typeof data.isLiving !== 'boolean') {
    errors.push('isLiving status must be true or false.');
  }

  // BirthYear
  if (data.birthYear !== undefined && data.birthYear !== null) {
    if (!Number.isInteger(data.birthYear) || data.birthYear < 1000 || data.birthYear > 2100) {
      errors.push('Birth year must be an integer between 1000 and 2100.');
    }
  }

  // CRITICAL PRIVACY RULE: if isLiving is true, birthDate must NOT be stored
  if (data.isLiving) {
    if (data.birthDate && data.birthDate.trim().length > 0) {
      errors.push('Privacy rule: Exact birth date cannot be stored for living persons. Store birth year only.');
    }
  } else {
    if (data.birthDate && (typeof data.birthDate !== 'string' || data.birthDate.length > 10)) {
      errors.push('Birth date string cannot exceed 10 characters (e.g. YYYY or YYYY-MM-DD).');
    }
  }

  if (data.deathDate && (typeof data.deathDate !== 'string' || data.deathDate.length > 10)) {
    errors.push('Death date string cannot exceed 10 characters (e.g. YYYY or YYYY-MM-DD).');
  }

  // Relations
  if (data.fatherId && (typeof data.fatherId !== 'string' || data.fatherId.length > 64)) {
    errors.push('Father ID cannot exceed 64 characters.');
  }
  if (data.motherId && (typeof data.motherId !== 'string' || data.motherId.length > 64)) {
    errors.push('Mother ID cannot exceed 64 characters.');
  }
  if (data.spouseIds) {
    if (!Array.isArray(data.spouseIds)) {
      errors.push('spouseIds must be an array of IDs.');
    } else if (data.spouseIds.length > 10) {
      errors.push('Maximum 10 spouses allowed per person.');
    } else {
      for (const sId of data.spouseIds) {
        if (typeof sId !== 'string' || sId.length > 64) {
          errors.push('Each spouse ID must be a string up to 64 characters.');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates proposedData in a suggestion
 */
export function validateProposedData(data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const keys = Object.keys(data);

  if (keys.length > 20) {
    errors.push('Proposed data cannot have more than 20 properties.');
  }

  const allowedProposedFields = new Set([
    'firstName',
    'lastName',
    'nickname',
    'gender',
    'birthYear',
    'birthDate',
    'deathDate',
    'isLiving',
    'birthPlace',
    'occupation',
    'notes',
    'photoThumb',
    'fatherId',
    'motherId',
    'spouseIds',
    'relationship',
    'relatedPersonId',
  ]);

  for (const k of keys) {
    if (!allowedProposedFields.has(k)) {
      errors.push(`Field '${k}' is not allowed in proposed data.`);
    }
  }

  if (data.relationship && (typeof data.relationship !== 'string' || data.relationship.length > 20)) {
    errors.push('Relationship label cannot exceed 20 characters.');
  }
  if (data.relatedPersonId && (typeof data.relatedPersonId !== 'string' || data.relatedPersonId.length > 64)) {
    errors.push('Related person ID cannot exceed 64 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
