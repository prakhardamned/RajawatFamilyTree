import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Person, PersonPrivate, Member, Suggestion, MemberStatus } from '../types';
import {
  INITIAL_DEMO_PERSONS,
  INITIAL_DEMO_MEMBERS,
  INITIAL_DEMO_SUGGESTIONS,
} from '../demo/sampleData';
import { validatePersonRecord } from '../utils/schemaValidator';
import { APP_CONFIG } from '../config';

interface TreeDataContextType {
  persons: Person[];
  members: Member[];
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  selectedPersonId: string | null;
  setSelectedPersonId: (id: string | null) => void;
  refreshPersons: () => Promise<void>;
  createPerson: (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, privateData?: PersonPrivate) => Promise<string>;
  updatePerson: (personId: string, personData: Partial<Person>, privateData?: PersonPrivate) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  fetchPersonPrivate: (personId: string) => Promise<PersonPrivate | null>;
  submitSuggestion: (
    type: Suggestion['type'],
    targetPersonId: string | null,
    proposedData: Record<string, any>,
    message: string
  ) => Promise<{ success: boolean; error?: string }>;
  reviewSuggestion: (
    suggestionId: string,
    action: 'approve' | 'reject',
    adminNote?: string,
    modifiedData?: Record<string, any>
  ) => Promise<void>;
  updateMemberStatus: (uid: string, status: MemberStatus) => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
  importPersonsJson: (importedPersons: Person[]) => Promise<{ count: number; errors: string[] }>;
}

const TreeDataContext = createContext<TreeDataContextType | undefined>(undefined);

// Helper to convert empty strings and undefined to null
export const toFirestoreNullable = (val: any) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }
  return val;
};

// Check if any private field has a non-empty string value
export const hasAnyPrivateField = (data?: PersonPrivate | null): boolean => {
  if (!data) return false;
  const fields = [data.fullBirthDate, data.phone, data.address, data.privateNotes];
  return fields.some((v) => typeof v === 'string' && v.trim().length > 0);
};

export const TreeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isApproved, isDemoMode } = useAuth();

  const [persons, setPersons] = useState<Person[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Load persons once per session
  const fetchPersonsFromFirestore = useCallback(async () => {
    if (!db || !isApproved) return;
    setLoading(true);
    setError(null);
    try {
      const personsCol = collection(db, 'persons');
      const snap = await getDocs(personsCol);
      const list: Person[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Person);
      });
      console.log(`[Family Tree] Loaded ${list.length} persons from Firestore:`, list.map(p => `${p.firstName} ${p.lastName || ''} (id: ${p.id}, fatherId: ${p.fatherId || 'none'}, motherId: ${p.motherId || 'none'})`));
      setPersons(list);
    } catch (err: any) {
      console.error('[Family Tree] Failed to fetch persons from Firestore:', err);
      setError(err.message || 'Permission denied or Firestore read error.');
    } finally {
      setLoading(false);
    }
  }, [isApproved]);

  // Load suggestions
  const fetchSuggestions = useCallback(async () => {
    if (isDemoMode) {
      setSuggestions(INITIAL_DEMO_SUGGESTIONS);
      return;
    }
    if (!db || !isApproved || !user) return;

    try {
      const suggestionsCol = collection(db, 'suggestions');
      let q;
      if (isAdmin) {
        q = query(suggestionsCol);
      } else {
        // Critical requirement: query MUST filter where('submittedBy.uid', '==', currentUid)
        q = query(suggestionsCol, where('submittedBy.uid', '==', user.uid));
      }
      const snap = await getDocs(q);
      const list: Suggestion[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Suggestion);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setSuggestions(list);
    } catch (err: any) {
      console.error('Failed to fetch suggestions:', err);
    }
  }, [isDemoMode, isApproved, isAdmin, user]);

  // Load members (admin only)
  const fetchMembers = useCallback(async () => {
    if (isDemoMode) {
      setMembers(INITIAL_DEMO_MEMBERS);
      return;
    }
    if (!db || !isAdmin) return;

    try {
      const snap = await getDocs(collection(db, 'members'));
      const list: Member[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as Member);
      });
      setMembers(list);
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
    }
  }, [isDemoMode, isAdmin]);

  // Initial load
  useEffect(() => {
    if (isDemoMode) {
      setPersons(INITIAL_DEMO_PERSONS);
      setMembers(INITIAL_DEMO_MEMBERS);
      setSuggestions(INITIAL_DEMO_SUGGESTIONS);
      setLoading(false);
      return;
    }

    if (isApproved) {
      fetchPersonsFromFirestore();
      fetchSuggestions();
      if (isAdmin) {
        fetchMembers();
      }
    } else {
      setPersons([]);
      setSuggestions([]);
      setMembers([]);
      setLoading(false);
    }
  }, [isDemoMode, isApproved, isAdmin, fetchPersonsFromFirestore, fetchSuggestions, fetchMembers]);

  const refreshPersons = async () => {
    if (isDemoMode) {
      setPersons([...INITIAL_DEMO_PERSONS]);
      return;
    }
    await fetchPersonsFromFirestore();
  };

  // Fetch private notes & sensitive info for living person (ADMIN ONLY)
  const fetchPersonPrivate = async (personId: string): Promise<PersonPrivate | null> => {
    if (!isAdmin) return null;
    if (isDemoMode) {
      return {
        id: personId,
        fullBirthDate: '1962-09-14',
        phone: '+1 (555) 234-5678',
        address: '42 Beacon Street, Boston MA',
        privateNotes: 'Confidential admin note: Living person private records protected under Spark security rules.',
      };
    }
    if (!db) return null;

    try {
      const snap = await getDoc(doc(db, 'personPrivate', personId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as PersonPrivate;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch personPrivate:', err);
      return null;
    }
  };

  // CREATE PERSON
  const createPerson = async (
    personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>,
    privateData?: PersonPrivate
  ): Promise<string> => {
    // Client-side validation matching rules
    const validation = validatePersonRecord(personData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' '));
    }

    if (isDemoMode) {
      const newId = `p_demo_${Date.now()}`;
      const newPerson: Person = {
        ...personData,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'demo-admin-uid',
      };
      setPersons((prev) => [...prev, newPerson]);
      return newId;
    }

    if (!db || !user || !isAdmin) {
      throw new Error('Unauthorized: only admin can create persons.');
    }

    const newPersonRef = doc(collection(db, 'persons'));
    const batch = writeBatch(db);

    // Prepare clean data matching rule keys strictly (empty strings and undefined -> null)
    const cleanPersonData: Record<string, any> = {
      firstName: personData.firstName.trim(),
      lastName: toFirestoreNullable(personData.lastName),
      nickname: toFirestoreNullable(personData.nickname),
      gender: personData.gender,
      isLiving: Boolean(personData.isLiving),
      birthYear:
        personData.birthYear !== undefined &&
        personData.birthYear !== null &&
        (personData.birthYear as any) !== '' &&
        !isNaN(Number(personData.birthYear))
          ? Number(personData.birthYear)
          : null,
      birthDate: personData.isLiving ? null : toFirestoreNullable(personData.birthDate),
      deathDate: personData.isLiving ? null : toFirestoreNullable(personData.deathDate),
      birthPlace: toFirestoreNullable(personData.birthPlace),
      occupation: toFirestoreNullable(personData.occupation),
      notes: toFirestoreNullable(personData.notes),
      photoThumb: toFirestoreNullable(personData.photoThumb),
      fatherId: toFirestoreNullable(personData.fatherId),
      motherId: toFirestoreNullable(personData.motherId),
      spouseIds: Array.isArray(personData.spouseIds) ? personData.spouseIds : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    batch.set(newPersonRef, cleanPersonData);

    // Only write personPrivate document if at least one private field has a value
    if (hasAnyPrivateField(privateData) && privateData) {
      const privateRef = doc(db, 'personPrivate', newPersonRef.id);
      const cleanPrivate: Record<string, any> = {
        fullBirthDate: toFirestoreNullable(privateData.fullBirthDate),
        phone: toFirestoreNullable(privateData.phone),
        address: toFirestoreNullable(privateData.address),
        privateNotes: toFirestoreNullable(privateData.privateNotes),
      };
      batch.set(privateRef, cleanPrivate);
    }

    await batch.commit();

    // Update in-memory cache
    const created: Person = {
      ...personData,
      id: newPersonRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: user.uid,
    };
    setPersons((prev) => [...prev, created]);
    return newPersonRef.id;
  };

  // UPDATE PERSON
  const updatePerson = async (
    personId: string,
    personData: Partial<Person>,
    privateData?: PersonPrivate
  ): Promise<void> => {
    const existing = persons.find((p) => p.id === personId);
    if (!existing) throw new Error('Person not found.');

    const merged = { ...existing, ...personData };
    const validation = validatePersonRecord(merged);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' '));
    }

    if (isDemoMode) {
      setPersons((prev) =>
        prev.map((p) => (p.id === personId ? { ...merged, updatedAt: new Date() } : p))
      );
      return;
    }

    if (!db || !user || !isAdmin) {
      throw new Error('Unauthorized: only admin can update persons.');
    }

    const batch = writeBatch(db);
    const personRef = doc(db, 'persons', personId);

    const updateFields: Record<string, any> = {
      firstName: merged.firstName.trim(),
      lastName: toFirestoreNullable(merged.lastName),
      nickname: toFirestoreNullable(merged.nickname),
      gender: merged.gender,
      isLiving: Boolean(merged.isLiving),
      birthYear:
        merged.birthYear !== undefined &&
        merged.birthYear !== null &&
        (merged.birthYear as any) !== '' &&
        !isNaN(Number(merged.birthYear))
          ? Number(merged.birthYear)
          : null,
      birthDate: merged.isLiving ? null : toFirestoreNullable(merged.birthDate),
      deathDate: merged.isLiving ? null : toFirestoreNullable(merged.deathDate),
      birthPlace: toFirestoreNullable(merged.birthPlace),
      occupation: toFirestoreNullable(merged.occupation),
      notes: toFirestoreNullable(merged.notes),
      photoThumb: toFirestoreNullable(merged.photoThumb),
      fatherId: toFirestoreNullable(merged.fatherId),
      motherId: toFirestoreNullable(merged.motherId),
      spouseIds: Array.isArray(merged.spouseIds) ? merged.spouseIds : [],
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    batch.set(personRef, updateFields, { merge: true });

    // Only write personPrivate document if at least one private field has a value
    if (hasAnyPrivateField(privateData) && privateData) {
      const privateRef = doc(db, 'personPrivate', personId);
      const cleanPrivate: Record<string, any> = {
        fullBirthDate: toFirestoreNullable(privateData.fullBirthDate),
        phone: toFirestoreNullable(privateData.phone),
        address: toFirestoreNullable(privateData.address),
        privateNotes: toFirestoreNullable(privateData.privateNotes),
      };
      batch.set(privateRef, cleanPrivate, { merge: true });
    }

    await batch.commit();

    setPersons((prev) =>
      prev.map((p) => (p.id === personId ? { ...merged, updatedAt: new Date(), updatedBy: user.uid } : p))
    );
  };

  // DELETE PERSON WITH CASCADE CLEANUP
  const deletePerson = async (personId: string): Promise<void> => {
    if (isDemoMode) {
      setPersons((prev) =>
        prev
          .filter((p) => p.id !== personId)
          .map((p) => ({
            ...p,
            fatherId: p.fatherId === personId ? null : p.fatherId,
            motherId: p.motherId === personId ? null : p.motherId,
            spouseIds: (p.spouseIds || []).filter((sId) => sId !== personId),
          }))
      );
      if (selectedPersonId === personId) setSelectedPersonId(null);
      return;
    }

    if (!db || !user || !isAdmin) {
      throw new Error('Unauthorized: only admin can delete persons.');
    }

    // Cascade clean-up in batch (≤ 500 ops)
    const batch = writeBatch(db);
    batch.delete(doc(db, 'persons', personId));
    batch.delete(doc(db, 'personPrivate', personId));

    // Find persons whose fatherId, motherId, or spouseIds point to this personId
    const affected = persons.filter(
      (p) =>
        p.fatherId === personId ||
        p.motherId === personId ||
        (p.spouseIds && p.spouseIds.includes(personId))
    );

    for (const rel of affected) {
      const relRef = doc(db, 'persons', rel.id);
      const updates: Record<string, any> = {
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };
      if (rel.fatherId === personId) updates.fatherId = null;
      if (rel.motherId === personId) updates.motherId = null;
      if (rel.spouseIds && rel.spouseIds.includes(personId)) {
        updates.spouseIds = rel.spouseIds.filter((id) => id !== personId);
      }
      batch.update(relRef, updates);
    }

    await batch.commit();

    // Update local state
    setPersons((prev) =>
      prev
        .filter((p) => p.id !== personId)
        .map((p) => ({
          ...p,
          fatherId: p.fatherId === personId ? null : p.fatherId,
          motherId: p.motherId === personId ? null : p.motherId,
          spouseIds: (p.spouseIds || []).filter((sId) => sId !== personId),
        }))
    );
    if (selectedPersonId === personId) setSelectedPersonId(null);
  };

  // SUBMIT SUGGESTION (MEMBER)
  const submitSuggestion = async (
    type: Suggestion['type'],
    targetPersonId: string | null,
    proposedData: Record<string, any>,
    message: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (message.length > 2000) {
      return { success: false, error: 'Message cannot exceed 2000 characters.' };
    }

    if (isDemoMode) {
      const newSug: Suggestion = {
        id: `sug_demo_${Date.now()}`,
        type,
        targetPersonId,
        proposedData,
        message,
        submittedBy: {
          uid: 'demo-member-uid',
          name: 'Cousin Emily',
          email: 'emily@familytree.demo',
        },
        status: 'pending',
        createdAt: new Date(),
      };
      setSuggestions((prev) => [newSug, ...prev]);
      return { success: true };
    }

    if (!db || !user) {
      return { success: false, error: 'Must be signed in to submit suggestions.' };
    }

    try {
      // Submitting a suggestion MUST be a single batched write that:
      // (a) creates the suggestion
      // (b) updates members/{uid}.lastSuggestionAt = serverTimestamp()
      const batch = writeBatch(db);
      const suggestionRef = doc(collection(db, 'suggestions'));
      const memberRef = doc(db, 'members', user.uid);

      batch.set(suggestionRef, {
        type,
        targetPersonId: targetPersonId || null,
        proposedData,
        message,
        submittedBy: {
          uid: user.uid,
          name: user.displayName || 'Family Member',
          email: user.email || '',
        },
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      batch.update(memberRef, {
        lastSuggestionAt: serverTimestamp(),
      });

      await batch.commit();

      // Refresh suggestions
      await fetchSuggestions();
      return { success: true };
    } catch (err: any) {
      console.error('Error submitting suggestion:', err);
      if (err.message && (err.message.includes('permission-denied') || err.message.includes('PERMISSION_DENIED'))) {
        return {
          success: false,
          error: 'Rate limit active: Please wait 60 seconds between suggestions or check input fields.',
        };
      }
      return { success: false, error: err.message || 'Failed to submit suggestion.' };
    }
  };

  // REVIEW SUGGESTION (ADMIN)
  const reviewSuggestion = async (
    suggestionId: string,
    action: 'approve' | 'reject',
    adminNote?: string,
    modifiedData?: Record<string, any>
  ): Promise<void> => {
    const sug = suggestions.find((s) => s.id === suggestionId);
    if (!sug) return;

    const dataToApply = modifiedData || sug.proposedData;

    if (isDemoMode) {
      // In demo mode, apply locally if approved
      if (action === 'approve') {
        if (sug.type === 'edit_person' && sug.targetPersonId) {
          setPersons((prev) =>
            prev.map((p) => (p.id === sug.targetPersonId ? { ...p, ...dataToApply } : p))
          );
        } else if (sug.type === 'add_person') {
          const newId = `p_approved_${Date.now()}`;
          setPersons((prev) => [
            ...prev,
            {
              id: newId,
              firstName: dataToApply.firstName || 'New Relative',
              gender: dataToApply.gender || 'other',
              isLiving: dataToApply.isLiving ?? true,
              ...dataToApply,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Person,
          ]);
        }
      }
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                status: action === 'approve' ? 'approved' : 'rejected',
                adminNote: adminNote || undefined,
                reviewedAt: new Date(),
              }
            : s
        )
      );
      return;
    }

    if (!db || !isAdmin || !user) {
      throw new Error('Unauthorized.');
    }

    const batch = writeBatch(db);
    const sugRef = doc(db, 'suggestions', suggestionId);

    batch.update(sugRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminNote: adminNote || null,
      reviewedAt: serverTimestamp(),
    });

    if (action === 'approve') {
      if (sug.type === 'edit_person' && sug.targetPersonId) {
        const targetRef = doc(db, 'persons', sug.targetPersonId);
        const updates: Record<string, any> = {
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        for (const [k, v] of Object.entries(dataToApply)) {
          if (['relationship', 'relatedPersonId'].includes(k)) continue;
          if (k === 'birthYear') {
            updates[k] = (v !== undefined && v !== null && (v as any) !== '' && !isNaN(Number(v))) ? Number(v) : null;
          } else if (k === 'spouseIds') {
            updates[k] = Array.isArray(v) ? v : [];
          } else if (k === 'isLiving') {
            updates[k] = Boolean(v);
          } else {
            updates[k] = toFirestoreNullable(v);
          }
        }
        if (updates.isLiving) {
          updates.birthDate = null;
          updates.deathDate = null;
        }
        batch.update(targetRef, updates);
      } else if (sug.type === 'add_person') {
        const newRef = doc(collection(db, 'persons'));
        const cleanData: Record<string, any> = {
          firstName: (dataToApply.firstName || 'New Relative').trim(),
          lastName: toFirestoreNullable(dataToApply.lastName),
          nickname: toFirestoreNullable(dataToApply.nickname),
          gender: dataToApply.gender || 'other',
          isLiving: Boolean(dataToApply.isLiving ?? true),
          birthYear: (dataToApply.birthYear !== undefined && dataToApply.birthYear !== null && (dataToApply.birthYear as any) !== '' && !isNaN(Number(dataToApply.birthYear)))
            ? Number(dataToApply.birthYear)
            : null,
          birthDate: dataToApply.isLiving ? null : toFirestoreNullable(dataToApply.birthDate),
          deathDate: dataToApply.isLiving ? null : toFirestoreNullable(dataToApply.deathDate),
          birthPlace: toFirestoreNullable(dataToApply.birthPlace),
          occupation: toFirestoreNullable(dataToApply.occupation),
          notes: toFirestoreNullable(dataToApply.notes),
          photoThumb: toFirestoreNullable(dataToApply.photoThumb),
          fatherId: toFirestoreNullable(dataToApply.fatherId),
          motherId: toFirestoreNullable(dataToApply.motherId),
          spouseIds: Array.isArray(dataToApply.spouseIds) ? dataToApply.spouseIds : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        batch.set(newRef, cleanData);
      }
    }

    await batch.commit();
    await fetchPersonsFromFirestore();
    await fetchSuggestions();
  };

  // MEMBERS MANAGEMENT (ADMIN)
  const updateMemberStatus = async (uid: string, status: MemberStatus) => {
    if (isDemoMode) {
      setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, status } : m)));
      return;
    }
    if (!db || !isAdmin) throw new Error('Unauthorized.');
    await updateDoc(doc(db, 'members', uid), { status });
    await fetchMembers();
  };

  const removeMember = async (uid: string) => {
    if (isDemoMode) {
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
      return;
    }
    if (!db || !isAdmin) throw new Error('Unauthorized.');
    await deleteDoc(doc(db, 'members', uid));
    await fetchMembers();
  };

  // IMPORT JSON (ADMIN ONLY)
  const importPersonsJson = async (
    importedPersons: Person[]
  ): Promise<{ count: number; errors: string[] }> => {
    const errors: string[] = [];
    const validRecords: Person[] = [];

    // Validate every record against schema
    importedPersons.forEach((p, idx) => {
      const result = validatePersonRecord(p);
      if (!result.valid) {
        errors.push(`Row ${idx + 1} (${p.firstName || 'Unnamed'}): ${result.errors.join(', ')}`);
      } else {
        validRecords.push(p);
      }
    });

    if (errors.length > 0) {
      return { count: 0, errors };
    }

    if (isDemoMode) {
      setPersons(validRecords);
      return { count: validRecords.length, errors: [] };
    }

    if (!db || !isAdmin || !user) {
      throw new Error('Unauthorized to import data.');
    }

    // Write in chunks <= 450 ops
    const chunkSize = APP_CONFIG.maxBatchSize;
    for (let i = 0; i < validRecords.length; i += chunkSize) {
      const chunk = validRecords.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const p of chunk) {
        const personRef = p.id ? doc(db, 'persons', p.id) : doc(collection(db, 'persons'));
        batch.set(personRef, {
          firstName: p.firstName.trim(),
          lastName: toFirestoreNullable(p.lastName),
          nickname: toFirestoreNullable(p.nickname),
          gender: p.gender,
          isLiving: Boolean(p.isLiving),
          birthYear: (p.birthYear !== undefined && p.birthYear !== null && (p.birthYear as any) !== '' && !isNaN(Number(p.birthYear)))
            ? Number(p.birthYear)
            : null,
          birthDate: p.isLiving ? null : toFirestoreNullable(p.birthDate),
          deathDate: p.isLiving ? null : toFirestoreNullable(p.deathDate),
          birthPlace: toFirestoreNullable(p.birthPlace),
          occupation: toFirestoreNullable(p.occupation),
          notes: toFirestoreNullable(p.notes),
          photoThumb: toFirestoreNullable(p.photoThumb),
          fatherId: toFirestoreNullable(p.fatherId),
          motherId: toFirestoreNullable(p.motherId),
          spouseIds: Array.isArray(p.spouseIds) ? p.spouseIds : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }

      await batch.commit();
    }

    await fetchPersonsFromFirestore();
    return { count: validRecords.length, errors: [] };
  };

  return (
    <TreeDataContext.Provider
      value={{
        persons,
        members,
        suggestions,
        loading,
        error,
        selectedPersonId,
        setSelectedPersonId,
        refreshPersons,
        createPerson,
        updatePerson,
        deletePerson,
        fetchPersonPrivate,
        submitSuggestion,
        reviewSuggestion,
        updateMemberStatus,
        removeMember,
        importPersonsJson,
      }}
    >
      {children}
    </TreeDataContext.Provider>
  );
};

export const useTreeData = () => {
  const context = useContext(TreeDataContext);
  if (!context) {
    throw new Error('useTreeData must be used within a TreeDataProvider');
  }
  return context;
};
