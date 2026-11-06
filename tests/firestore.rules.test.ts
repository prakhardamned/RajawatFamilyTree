/**
 * Firestore Security Rules Unit Tests
 * Uses @firebase/rules-unit-testing and the Firebase Emulator Suite.
 *
 * Test cases cover:
 * 1. Signed-out read denied
 * 2. Pending member read denied
 * 3. Approved member read allowed
 * 4. Member cannot write persons
 * 5. Member cannot read personPrivate
 * 6. Member cannot read others' suggestions
 * 7. Suggestion with extra fields / status 'approved' / oversized message rejected
 * 8. Second suggestion within 60s rejected
 * 9. Member cannot self-approve in members/{uid}
 * 10. Admin can do all (write persons, read private, review suggestions, manage members)
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = 'family-tree-test-spark';
const ADMIN_UID = 'admin_uid_123';
const MEMBER_UID = 'approved_member_456';
const PENDING_UID = 'pending_user_789';
const OTHER_MEMBER_UID = 'other_member_999';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  let rules = fs.readFileSync(rulesPath, 'utf8');
  // Inject test admin UID into the rules for the test environment
  rules = rules.replace('REPLACE_WITH_ADMIN_UID', ADMIN_UID);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();

    // Seed approved member and pending member using system context (bypasses rules)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Approved member
      await setDoc(doc(db, 'members', MEMBER_UID), {
        displayName: 'Approved Member',
        email: 'member@test.com',
        status: 'approved',
        requestedAt: new Date(),
      });

      // Pending member
      await setDoc(doc(db, 'members', PENDING_UID), {
        displayName: 'Pending User',
        email: 'pending@test.com',
        status: 'pending',
        requestedAt: new Date(),
      });

      // Other approved member
      await setDoc(doc(db, 'members', OTHER_MEMBER_UID), {
        displayName: 'Other Member',
        email: 'other@test.com',
        status: 'approved',
        requestedAt: new Date(),
      });

      // Existing sample person
      await setDoc(doc(db, 'persons', 'person_1'), {
        firstName: 'Arthur',
        lastName: 'Pendelton',
        gender: 'male',
        birthYear: 1940,
        isLiving: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: ADMIN_UID,
      });

      // Existing sensitive private record
      await setDoc(doc(db, 'personPrivate', 'person_1'), {
        fullBirthDate: '1940-06-15',
        phone: '+1-555-0199',
        address: '123 Heritage Way',
        privateNotes: 'Vault code inside will',
      });
    });
  }
});

describe('Firestore Security Rules', () => {
  it('1. Signed-out read is denied on persons', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthedDb, 'persons', 'person_1')));
  });

  it('2. Pending member read is denied on persons', async () => {
    const pendingDb = testEnv.authenticatedContext(PENDING_UID, {
      email: 'pending@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();
    await assertFails(getDoc(doc(pendingDb, 'persons', 'person_1')));
  });

  it('3. Approved member read is allowed on persons', async () => {
    const memberDb = testEnv.authenticatedContext(MEMBER_UID, {
      email: 'member@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();
    await assertSucceeds(getDoc(doc(memberDb, 'persons', 'person_1')));
  });

  it('4. Member cannot create or update persons', async () => {
    const memberDb = testEnv.authenticatedContext(MEMBER_UID, {
      email: 'member@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();

    await assertFails(
      setDoc(doc(memberDb, 'persons', 'new_person'), {
        firstName: 'Unauthorized',
        gender: 'male',
        isLiving: true,
        birthYear: 2000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: MEMBER_UID,
      })
    );
  });

  it('5. Member cannot read personPrivate sensitive data', async () => {
    const memberDb = testEnv.authenticatedContext(MEMBER_UID, {
      email: 'member@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();

    await assertFails(getDoc(doc(memberDb, 'personPrivate', 'person_1')));
  });

  it('6. Member cannot read suggestions submitted by others', async () => {
    // Seed a suggestion by OTHER_MEMBER_UID
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'suggestions', 'sug_other'), {
        type: 'general_note',
        targetPersonId: 'person_1',
        proposedData: {},
        message: 'A note from other member',
        submittedBy: {
          uid: OTHER_MEMBER_UID,
          name: 'Other Member',
          email: 'other@test.com',
        },
        status: 'pending',
        createdAt: new Date(),
      });
    });

    const memberDb = testEnv.authenticatedContext(MEMBER_UID, {
      email: 'member@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();

    await assertFails(getDoc(doc(memberDb, 'suggestions', 'sug_other')));
  });

  it('7. Suggestion with extra fields, status approved, or oversized message is rejected', async () => {
    const memberContext = testEnv.authenticatedContext(MEMBER_UID, {
      email: 'member@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });
    const db = memberContext.firestore();

    // Extra fields rejected
    const batch1 = writeBatch(db);
    batch1.set(doc(db, 'suggestions', 'sug_invalid_fields'), {
      type: 'add_person',
      targetPersonId: null,
      proposedData: { firstName: 'Test' },
      message: 'Hello',
      submittedBy: { uid: MEMBER_UID, name: 'Approved Member', email: 'member@test.com' },
      status: 'pending',
      createdAt: serverTimestamp(),
      extraHackerField: 'bad',
    });
    batch1.update(doc(db, 'members', MEMBER_UID), { lastSuggestionAt: serverTimestamp() });
    await assertFails(batch1.commit());

    // Status 'approved' upon creation rejected
    const batch2 = writeBatch(db);
    batch2.set(doc(db, 'suggestions', 'sug_self_approve'), {
      type: 'add_person',
      targetPersonId: null,
      proposedData: { firstName: 'Test' },
      message: 'Hello',
      submittedBy: { uid: MEMBER_UID, name: 'Approved Member', email: 'member@test.com' },
      status: 'approved',
      createdAt: serverTimestamp(),
    });
    batch2.update(doc(db, 'members', MEMBER_UID), { lastSuggestionAt: serverTimestamp() });
    await assertFails(batch2.commit());

    // Oversized message (>2000 chars) rejected
    const batch3 = writeBatch(db);
    batch3.set(doc(db, 'suggestions', 'sug_too_long'), {
      type: 'general_note',
      targetPersonId: null,
      proposedData: {},
      message: 'x'.repeat(2001),
      submittedBy: { uid: MEMBER_UID, name: 'Approved Member', email: 'member@test.com' },
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    batch3.update(doc(db, 'members', MEMBER_UID), { lastSuggestionAt: serverTimestamp() });
    await assertFails(batch3.commit());
  });

  it('8. Second suggestion within 60s is rejected by rate limit rule', async () => {
    const memberContext = testEnv.authenticatedContext(MEMBER_UID, {
      email: 'member@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });
    const db = memberContext.firestore();

    // First suggestion batch succeeds
    const batch1 = writeBatch(db);
    batch1.set(doc(db, 'suggestions', 'sug_first'), {
      type: 'general_note',
      targetPersonId: null,
      proposedData: {},
      message: 'First valid suggestion',
      submittedBy: { uid: MEMBER_UID, name: 'Approved Member', email: 'member@test.com' },
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    batch1.update(doc(db, 'members', MEMBER_UID), { lastSuggestionAt: serverTimestamp() });
    await assertSucceeds(batch1.commit());

    // Immediate second suggestion (within 60s) fails
    const batch2 = writeBatch(db);
    batch2.set(doc(db, 'suggestions', 'sug_second'), {
      type: 'general_note',
      targetPersonId: null,
      proposedData: {},
      message: 'Second immediate suggestion',
      submittedBy: { uid: MEMBER_UID, name: 'Approved Member', email: 'member@test.com' },
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    batch2.update(doc(db, 'members', MEMBER_UID), { lastSuggestionAt: serverTimestamp() });
    await assertFails(batch2.commit());
  });

  it('9. Member cannot self-approve status in members/{uid}', async () => {
    const pendingDb = testEnv.authenticatedContext(PENDING_UID, {
      email: 'pending@test.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();

    // Try to update status from 'pending' to 'approved'
    await assertFails(
      updateDoc(doc(pendingDb, 'members', PENDING_UID), {
        status: 'approved',
      })
    );
  });

  it('10. Admin can do all operations', async () => {
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, {
      email: 'admin@familytree.local',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();

    // Admin creates person
    await assertSucceeds(
      setDoc(doc(adminDb, 'persons', 'person_by_admin'), {
        firstName: 'Eleanor',
        lastName: 'Pendelton',
        gender: 'female',
        birthYear: 1945,
        isLiving: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: ADMIN_UID,
      })
    );

    // Admin reads personPrivate
    await assertSucceeds(getDoc(doc(adminDb, 'personPrivate', 'person_1')));

    // Admin writes personPrivate
    await assertSucceeds(
      setDoc(doc(adminDb, 'personPrivate', 'person_by_admin'), {
        fullBirthDate: '1945-12-04',
        phone: '+1-555-4321',
        address: '456 Rose Lane',
        privateNotes: 'Only admin can read this',
      })
    );

    // Admin approves pending member
    await assertSucceeds(
      updateDoc(doc(adminDb, 'members', PENDING_UID), {
        status: 'approved',
      })
    );
  });
});
