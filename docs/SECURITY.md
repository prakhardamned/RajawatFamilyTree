# Security & Permissions Guide

This document explains the security architecture, role-based authorization model, rate-limiting protections, and a plain-English breakdown of all rules defined in `firestore.rules`.

---

## 🛡️ User Roles & Privilege Matrix

The system enforces five mutually exclusive authorization levels:

| Role | Verification Method | Can View Tree? | Can Submit Suggestions? | Can Manage Members? | Can View Private Living Data? | Can Write/Delete Records? |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Admin** | UID listed in `firestore.rules` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Approved Member** | `members/{uid}.status == 'approved'` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Pending Member** | `members/{uid}.status == 'pending'` | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Blocked Member** | `members/{uid}.status == 'blocked'` | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Signed Out** | Unauthenticated visitor | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🔒 Plain-English Breakdown of `firestore.rules`

Firestore Security Rules run on Google's cloud infrastructure prior to executing any read, write, update, or delete request. Client-side checks are merely for user convenience; the security rules are the true authoritative gatekeeper.

### 1. Helper Functions
- **`signedIn()`**: Verifies that the request originates from an authenticated user whose sign-in provider is strictly Google (`google.com`) and whose Google account email is verified (`email_verified == true`).
- **`isAdmin()`**: Verifies that the user is signed in and their unique authentication UID matches the administrator UID hardcoded in the security rules.
- **`isMember()`**: Checks that a document exists at `/members/{uid}` and that its `status` field equals `'approved'`.
- **`canView()`**: Returns `true` if the requester is either the Admin or an Approved Member.
- **`isOptString(d, k, max)`**: Validates that an optional field `k` in map `d` is either missing, explicitly `null`, or a string whose length is less than or equal to `max`.
- **`personStringsOk(d)`**: Runs `isOptString` on all optional text fields (first name, last name, nickname, birth place, notes, photo thumbnail, etc.) against maximum character limits.
- **`validPerson(d)`**: Enforces strict document structure:
  - Contains **only** allowed fields (no arbitrary injected properties).
  - `firstName` must be a non-empty string under 100 characters.
  - `gender` must be `'male'`, `'female'`, or `'other'`.
  - `isLiving` must be a boolean.
  - `birthYear` must be an integer between `1000` and `2100` (or `null`).
  - `spouseIds` must be a list of at most 10 string IDs.
  - **Living Privacy Restriction**: If `isLiving == true`, `birthDate` cannot exist or must be `null`.
  - `updatedAt` must match the server timestamp (`request.time`).
  - `updatedBy` must match the admin's UID.

---

### 2. Collection Rules

#### `/persons/{personId}`
- **Read**: Permitted only if `canView()` is true (Admin or Approved Member). Signed-out visitors and pending members cannot read any person data.
- **Create**: Permitted only if `isAdmin()` is true, the document satisfies `validPerson()`, and `createdAt` matches `request.time`.
- **Update**: Permitted only if `isAdmin()` is true, the document satisfies `validPerson()`, and the original `createdAt` timestamp is preserved unchanged.
- **Delete**: Permitted exclusively by the Admin.

#### `/personPrivate/{personId}`
- **Read & Write**: Permitted **exclusively by the Admin**.
- Approved members cannot query, read, or list documents in `personPrivate`. Living relatives' exact birth dates, phone numbers, home addresses, and private notes are completely shielded from general member queries.

#### `/members/{uid}`
- **Read**: Permitted if the user is the Admin or if the user is querying their own user profile document (`request.auth.uid == uid`).
- **Create**: A newly signed-in user can create their own member record if:
  - The document ID matches their authenticated UID.
  - The payload has **only** four keys: `['displayName', 'email', 'status', 'requestedAt']`.
  - `status` is strictly `'pending'`.
  - `email` matches their verified Google email.
  - `requestedAt` matches `request.time`.
- **Update**:
  - The Admin can update any field (e.g. promoting `status` to `'approved'` or setting `'blocked'`).
  - An Approved Member can update **only** the `lastSuggestionAt` field on their own profile document, subject to the rate limit: the new timestamp must be at least 60 seconds after the previous `lastSuggestionAt`.
- **Delete**: Permitted exclusively by the Admin.

#### `/suggestions/{id}`
- **Read**: Permitted for the Admin, or for the member who originally submitted the suggestion (`resource.data.submittedBy.uid == request.auth.uid`).
- **Create**: An Approved Member can submit a suggestion if:
  - Document fields match the permitted suggestion schema.
  - Status is strictly `'pending'`.
  - The message is under 2000 characters.
  - Submitter metadata (`uid`, `email`) matches the caller's auth token.
  - Creation is performed via a **single batched write** that simultaneously updates `members/{uid}.lastSuggestionAt` to `request.time` (verified by `getAfter(memberPath()).data.lastSuggestionAt == request.time`).
- **Update & Delete**: Permitted exclusively by the Admin.

---

## 🛡️ Living Person Privacy Protections

Family trees contain sensitive information about both deceased ancestors and living relatives. The application applies a two-tiered architectural boundary:

1. **Schema Partitioning**:
   - Deceased family members can have exact dates of birth, dates of passing, and detailed public biographies stored directly in `persons`.
   - For living family members, exact birth dates, mobile phone numbers, residential addresses, and private contact notes are stored in the separate `/personPrivate` collection.
2. **Server-Side Enforcement**:
   - If an administrator accidentally enters a birth date string for a person with `isLiving == true`, the Firestore rule `(!d.isLiving || !('birthDate' in d) || d.birthDate == null)` automatically rejects the write on the server.
   - The `/personPrivate` collection rules reject all non-admin read attempts with a `PERMISSION_DENIED` error.

---

## ⏱️ Rate Limiting Mechanism

To prevent malicious spam or accidental looping submissions from exhausting free Spark quotas:
- Member suggestion submissions enforce a **60-second cooldown period**.
- The rule enforces that `request.time > resource.data.lastSuggestionAt + duration.value(60, 's')`.
- The submission must be an atomic batch containing both the new suggestion and the timestamp update. If the user attempts to submit a second suggestion within 60 seconds, the transaction is rejected by the database.

---

## 🔑 What Is (and Is NOT) a Secret in Firebase

There is a common misconception that web API keys in frontend code are secret credentials.

### What is NOT Secret:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_APP_ID`

These parameters are **public client identifiers** designed to be visible in client-side HTML and JavaScript bundles so the browser can connect to the Firebase endpoint. **They do not grant database access.** Database access is governed exclusively by `firestore.rules` and authenticated user sessions.

### What IS Secret (Never expose or commit):
- Administrator credentials and Google account passwords.
- Cloud IAM Service Account JSON keys (not used in this client-side app).
- Private family PII (phone numbers, residential addresses).
- Deployment access tokens (`FIREBASE_TOKEN`).
