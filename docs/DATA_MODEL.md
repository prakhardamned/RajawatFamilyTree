# Firestore Data Model

This document outlines the complete database schema for the Rajawat Family Tree application, covering all collections, document structures, relationship graph linkage, and example records.

---

## 🗄️ Collections Overview

The database uses four top-level collections in Cloud Firestore:

| Collection | Path | Read Access | Write Access | Purpose |
|---|---|---|---|---|
| **`persons`** | `/persons/{personId}` | Approved Members & Admin | Admin only | Public family records, life summaries, and tree relationships. |
| **`personPrivate`** | `/personPrivate/{personId}` | Admin only | Admin only | Confidential data for living persons (exact birth date, phone, address, private notes). |
| **`members`** | `/members/{uid}` | Admin + Owning User | Admin (all) / User (create self & rate limit update) | User profile, approval status, and suggestion rate limiting. |
| **`suggestions`** | `/suggestions/{suggestionId}` | Admin + Owning User | Approved Members (create) / Admin (review) | Proposed edits, new relative requests, or error reports. |

---

## 1. `persons` Collection

Stores the public profile and lineage of every family member.

### Field Definitions

| Field | Type | Required? | Rules & Constraints |
|---|---|---|---|
| `firstName` | `string` | **Yes** | 1 to 100 characters. Cannot be empty. |
| `lastName` | `string` \| `null` | Optional | Up to 100 characters. Empty values stored as `null`. |
| `nickname` | `string` \| `null` | Optional | Up to 100 characters. Familiar or preferred name. |
| `gender` | `string` | **Yes** | Allowed values: `'male'`, `'female'`, `'other'`. |
| `isLiving` | `boolean` | **Yes** | `true` if the person is alive, `false` if deceased. |
| `birthYear` | `integer` \| `null` | Optional | 4-digit integer between `1000` and `2100`. |
| `birthDate` | `string` \| `null` | Optional | Up to 10 chars (e.g. `"1945"` or `"1945-06-12"`). **MUST be `null` if `isLiving == true`**. |
| `deathDate` | `string` \| `null` | Optional | Up to 10 chars (e.g. `"2018"` or `"2018-11-04"`). `null` for living persons. |
| `birthPlace` | `string` \| `null` | Optional | Up to 200 characters (e.g. `"Jaipur, Rajasthan"`). |
| `occupation` | `string` \| `null` | Optional | Up to 200 characters. |
| `notes` | `string` \| `null` | Optional | Up to 5000 characters. Family stories, biographical notes. |
| `photoThumb` | `string` \| `null` | Optional | Base64-encoded JPEG image string under 100 KB (max 110,000 characters). |
| `fatherId` | `string` \| `null` | Optional | Document ID of the person's father in `persons`. |
| `motherId` | `string` \| `null` | Optional | Document ID of the person's mother in `persons`. |
| `spouseIds` | `string[]` | Optional | Array of person IDs (max 10 items). Stores partner IDs. |
| `createdAt` | `timestamp` | **Yes** | Server timestamp matching `request.time`. |
| `updatedAt` | `timestamp` | **Yes** | Server timestamp matching `request.time`. |
| `updatedBy` | `string` | **Yes** | UID of the user who performed the last write. |

> **Privacy Rule**: Per Firestore security rules, if `isLiving == true`, the document cannot contain a `birthDate` string; only `birthYear` is allowed in public view.

### Example Document (`persons/p_sample_01`)
```json
{
  "firstName": "Kalyan",
  "lastName": "Rajawat",
  "nickname": "Babosa",
  "gender": "male",
  "isLiving": false,
  "birthYear": 1928,
  "birthDate": "1928-03-15",
  "deathDate": "2005-09-20",
  "birthPlace": "Dausa, Rajasthan, India",
  "occupation": "Agricultural Landholder & Community Elder",
  "notes": "Patriarch of the elder branch. Oversaw the family estate and village temple restoration.",
  "photoThumb": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "fatherId": null,
  "motherId": null,
  "spouseIds": ["p_sample_02"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "updatedBy": "SAMPLE_ADMIN_UID"
}
```

---

## 2. `personPrivate` Collection

Stores confidential and personally identifiable information (PII) for living family members. Accessible exclusively by administrators.

### Field Definitions

| Field | Type | Required? | Description |
|---|---|---|---|
| `fullBirthDate` | `string` \| `null` | Optional | Exact date of birth (`YYYY-MM-DD`). |
| `phone` | `string` \| `null` | Optional | Mobile or residential telephone number. |
| `address` | `string` \| `null` | Optional | Residential address or postal location. |
| `privateNotes` | `string` \| `null` | Optional | Private contact notes, medical estate notes, or administrator records. |

> **Optimization Rule**: The application only writes a document to `personPrivate/{personId}` if at least one of these four fields contains a non-empty string. If all private fields are blank, the write is skipped.

### Example Document (`personPrivate/p_sample_03`)
```json
{
  "fullBirthDate": "1988-11-24",
  "phone": "+91 98290 12345",
  "address": "B-42 Shyam Nagar, Jaipur, Rajasthan 302019",
  "privateNotes": "Contact via WhatsApp for family reunions."
}
```

---

## 3. `members` Collection

Stores user authorization profiles corresponding to Firebase Authentication UIDs.

### Field Definitions

| Field | Type | Required? | Constraints & Details |
|---|---|---|---|
| `displayName` | `string` | **Yes** | Up to 100 characters. Derived from Google profile. |
| `email` | `string` | **Yes** | Must match `request.auth.token.email`. |
| `status` | `string` | **Yes** | `'pending'`, `'approved'`, or `'blocked'`. Default on creation is always `'pending'`. |
| `requestedAt` | `timestamp` | **Yes** | Server timestamp when the user first signed in. |
| `lastSuggestionAt` | `timestamp` \| `null` | Optional | Updated on each suggestion submission; enforces a 60-second rate limit. |

### Example Document (`members/SAMPLE_USER_UID`)
```json
{
  "displayName": "Vikram Rajawat",
  "email": "vikram.rajawat@example.com",
  "status": "approved",
  "requestedAt": "2024-02-10T14:30:00Z",
  "lastSuggestionAt": "2024-02-10T14:45:00Z"
}
```

---

## 4. `suggestions` Collection

Stores edits and new relative proposals submitted by verified family members awaiting administrator review.

### Field Definitions

| Field | Type | Required? | Details |
|---|---|---|---|
| `type` | `string` | **Yes** | Allowed: `'add_person'`, `'edit_person'`, `'add_relationship'`, `'remove_person'`, `'general_note'`. |
| `targetPersonId` | `string` \| `null` | Optional | Target relative ID if modifying an existing person. Max 64 characters. |
| `proposedData` | `map` | **Yes** | Map of suggested field values (max 20 keys). Can only include person fields + `relationship`, `relatedPersonId`. |
| `message` | `string` | **Yes** | Explanation from submitter. Max 2000 characters. |
| `submittedBy` | `map` | **Yes** | Submitter profile: `{ uid: string, name: string, email: string }`. Must match current user. |
| `status` | `string` | **Yes** | `'pending'`, `'approved'`, or `'rejected'`. Initial status is `'pending'`. |
| `adminNote` | `string` \| `null` | Optional | Feedback note entered by the admin during review. |
| `createdAt` | `timestamp` | **Yes** | Server timestamp matching `request.time`. |
| `reviewedAt` | `timestamp` \| `null` | Optional | Server timestamp when the admin approved or rejected. |

### Example Document (`suggestions/sug_sample_01`)
```json
{
  "type": "edit_person",
  "targetPersonId": "p_sample_01",
  "proposedData": {
    "occupation": "Estate Manager & Community Elder"
  },
  "message": "Updating grandfather's occupation to reflect his formal title.",
  "submittedBy": {
    "uid": "SAMPLE_USER_UID",
    "name": "Vikram Rajawat",
    "email": "vikram.rajawat@example.com"
  },
  "status": "pending",
  "adminNote": null,
  "createdAt": "2024-02-10T14:45:00Z",
  "reviewedAt": null
}
```

---

## 🌳 How `fatherId`, `motherId`, and `spouseIds` Build the Tree

The lineage graph is constructed dynamically in the browser using three core relational pointers:

```
                  ┌──────────────┐          💍 Couple          ┌──────────────┐
                  │ Father (p1)  │ ◄─────────────────────────► │ Mother (p2)  │
                  └──────┬───────┘                             └──────┬───────┘
                         │                                            │
                         └──────────────────┬─────────────────────────┘
                                            ▼
                                  ┌───────────────────┐
                                  │ Union Node (u12)  │
                                  └─────────┬─────────┘
                                            │
                         ┌──────────────────┴──────────────────┐
                         ▼                                     ▼
                  ┌──────────────┐                      ┌──────────────┐
                  │  Child (p3)  │                      │  Child (p4)  │
                  └──────────────┘                      └──────────────┘
```

1. **Parent-Child Linkage (`fatherId` & `motherId`)**:
   - Each person document contains explicit nullable pointers to their father and mother (`fatherId` and `motherId`).
   - If both pointers exist and point to documents in `persons`, they form a **Family Union Node** representing that parental couple.
   - The children connect directly from the union node down to their own card, creating standard genealogical tree branches.
2. **Spousal Linkage (`spouseIds`)**:
   - Stores an array of up to 10 document IDs representing spouses or partners.
   - Supports remarriages or multiple partners across a person's lifetime.
   - The layout algorithm places partners on the exact same vertical generation row and joins them horizontally with the dashed couple edge.
3. **In-Law Generation Alignment**:
   - When a spouse marries into the family (having no recorded `fatherId` or `motherId` in the database), the layout engine detects their partnership via `spouseIds` and sets their generation depth equal to their spouse's generation.
   - This ensures spouses are never misplaced at the top of the tree canvas.
4. **Cascading Relationship Cleanup**:
   - When an administrator deletes a person, an atomic Firestore batch queries all relatives referencing that ID:
     - Sets `fatherId = null` for their children.
     - Sets `motherId = null` for their children.
     - Removes their ID from the `spouseIds` arrays of their partners.
   - This prevents orphaned broken links or dangling references in the visual tree.
