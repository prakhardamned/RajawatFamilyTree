# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-06

### Added
- **Interactive Family Tree Visualizer**:
  - Top-to-bottom hierarchical canvas powered by `@xyflow/react` and family unit layout.
  - Generational rank calculation engine that automatically aligns in-law spouses to their partner's generation.
  - Spouses positioned on the exact same row directly adjacent to each other with a 50px horizontal gap.
  - Golden union nodes (`unionNode`) mediating parental connections to children.
  - Distinctive amber dashed Couple connector line (`💍 Couple`) joining spouse cards.
  - Multi-perspective filtering: **All Family**, **Ancestors Only**, and **Descendants Only** relative to any selected root person.
  - Branch collapsing and expanding for large family trees spanning 6–7 generations.
  - Search-and-jump capability to locate relatives instantly by first name, last name, or nickname.
  - Mini-map, zoom controls (10% to 200%), and single-click **Fit View** screen centering.
  - Alternative **People list** table view showing all relatives, birth years, and parentage with quick edit buttons.
- **Role-Based Access Control & Security**:
  - Google Sign-In authentication with verified email enforcement.
  - Single designated administrator hardcoded in `firestore.rules` and `src/config.ts`.
  - Member registration queue holding new sign-ins in a pending state until administrator approval.
  - Two-tier privacy model isolating living relatives' exact birth dates, phone numbers, home addresses, and private notes into `/personPrivate` accessible exclusively to the administrator.
  - Public `/persons` collection restricted to living birth year only (exact birth date prohibited for living persons on the server).
- **Administrator Capabilities**:
  - Side panel with one-click quick relative addition: Add Father, Add Mother, Add Spouse, Add Child, Add Sibling with automatic reciprocal link creation.
  - Client-side image compression converting portrait uploads into compact JPEG thumbnails (< 100 KB, max 200×200 pixels) stored directly in Firestore documents.
  - Atomic batch deletion with automatic cascading cleanup of `fatherId`, `motherId`, and `spouseIds` across all related documents.
  - Member management panel to approve, block, or remove member accounts.
  - Suggestions review inbox featuring side-by-side visual diffs (current vs proposed values) with Approve, Edit-then-Approve, and Reject with feedback.
  - Data migration: JSON tree export, standard GEDCOM (`.ged`) export, and schema-validated JSON backup import.
- **Family Member Suggestions**:
  - Suggest an Edit workflow calculating field deltas and submitting only modified properties.
  - Propose a Relative and Report an Error forms.
  - "My Suggestions" status tracking for submitted proposals.
  - 60-second submission cooldown rate limit enforced at the database level.
- **Zero-Cost Hosting Architecture**:
  - 100% client-side React SPA with zero server container dependencies.
  - Fully compatible with the free Firebase Spark plan (no Cloud Storage, no Cloud Functions, no Blaze billing required).
  - Single read session caching loading all persons once per session to stay well below Firestore free daily read limits.
  - In-memory offline Demo Mode with a sample 3-generation family dataset.

### Fixed
- **In-Law Generation Placement**: Resolved layout issue where spouses marrying into the family without recorded parents were placed at the top generation of the tree.
- **Firestore Write Sanitization**: Configured `initializeFirestore` with `{ ignoreUndefinedProperties: true }` and converted all empty strings and `undefined` properties to `null` prior to Firestore document writes.
- **Conditional Private Writes**: Optimized `personPrivate` writes so documents are only created or updated if at least one confidential field contains a non-empty string.
