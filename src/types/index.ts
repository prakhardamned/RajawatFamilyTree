/**
 * Type definitions strictly adhering to the Firestore schema and app state.
 */

export type Gender = 'male' | 'female' | 'other';

export interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  gender: Gender;
  birthYear?: number | null;
  birthDate?: string | null; // Partial string like "1920" or "1920-05-14", max 10 chars. ONLY present if isLiving == false!
  deathDate?: string | null;
  isLiving: boolean;
  birthPlace?: string;
  occupation?: string;
  notes?: string;
  photoThumb?: string; // Base64 JPEG <= 200x200, under 100KB, max 110,000 characters
  fatherId?: string | null;
  motherId?: string | null;
  spouseIds?: string[]; // Array of person IDs, max 10
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

export interface PersonPrivate {
  id?: string;
  fullBirthDate?: string | null;
  privateNotes?: string | null;
  phone?: string | null;
  address?: string | null;
}

export type MemberStatus = 'pending' | 'approved' | 'blocked';

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  status: MemberStatus;
  requestedAt: any;
  lastSuggestionAt?: any;
}

export type SuggestionType =
  | 'add_person'
  | 'edit_person'
  | 'add_relationship'
  | 'remove_person'
  | 'general_note';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  targetPersonId?: string | null;
  proposedData: Record<string, any>; // Limited to valid person fields + 'relationship', 'relatedPersonId'
  message: string;
  submittedBy: {
    uid: string;
    name: string;
    email: string;
  };
  status: SuggestionStatus;
  adminNote?: string;
  createdAt: any;
  reviewedAt?: any;
}

export type TreeViewMode = 'all' | 'ancestors' | 'descendants';

export interface RelativeLinkRequest {
  targetPerson: Person;
  relationType: 'father' | 'mother' | 'spouse' | 'child' | 'sibling';
}
