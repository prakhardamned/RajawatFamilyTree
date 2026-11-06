# Product Roadmap & Feature Checklist

This document tracks the current capabilities of the Rajawat Family Tree, documented design considerations, and planned future enhancements.

---

## ✅ Completed & Current Features (v1.0.0)

### Visual Family Tree Engine
- [x] Top-to-bottom hierarchical generational canvas using `@xyflow/react`.
- [x] Spouses positioned on the exact same vertical generation row and side-by-side with a 50px gap.
- [x] Distinctive amber dashed Couple connector line (`💍 Couple`) joining spouse cards.
- [x] Family union nodes (`unionNode`) mediating between parents and their children.
- [x] In-law generation rank calculation: spouses with no parents inherit their partner's generation and never appear at the top.
- [x] Perspective view modes: **All Family**, **Ancestors Only**, and **Descendants Only** relative to any selected root person.
- [x] Branch collapsing and expanding for large family trees.
- [x] Smooth pan, zoom (10% to 200%), minimap preview, fit-to-screen button, and name search-and-jump.
- [x] Alternative **People list** table view showing all members, birth years, and parents.

### Administration & Data Integrity
- [x] Single designated administrator enforced via server-side `firestore.rules`.
- [x] Quick relative addition (Father, Mother, Spouse, Child, Sibling) with automatic reciprocal linkage.
- [x] Client-side image compressor converting portraits to max 200×200 JPEG < 100 KB stored directly in Firestore.
- [x] Atomic batch deletions with cascading cleanup of `fatherId`, `motherId`, and `spouseIds`.
- [x] Two-tier privacy model isolating living persons' exact birth dates, phone, address, and private notes in `personPrivate`.
- [x] Member access management queue (Approve, Block, Remove).
- [x] Full JSON backup export and schema-validated JSON backup import.
- [x] Standard GEDCOM (`.ged`) genealogy file export.

### Member Collaboration & Workflow
- [x] Google Sign-In with verified email verification enforcement.
- [x] "Awaiting Approval" gate for new relatives until approved by admin.
- [x] Suggest an Edit workflow calculating field diffs and proposing changes.
- [x] Suggest a Relative and Report an Error forms.
- [x] Admin Suggestions Inbox with side-by-side comparison, Approve, Edit-then-Approve, and Reject with feedback.
- [x] Submitter "My Suggestions" status tracking.
- [x] 60-second rate-limiting rule to protect database write limits.

---

## 🔍 Known Considerations & Limitations

- **Spark Plan Database Quota**:
  - The Firestore free tier provides 50,000 document reads, 20,000 document writes, and 1 GB of stored data per day.
  - The single-read session caching and thumbnail compression ensure the app stays well within these limits for families with up to 1,000+ members.
- **Client-Side Storage of Thumbnails**:
  - Because Cloud Storage is intentionally omitted to stay zero-cost, photos are limited to compressed 200×200 thumbnails under 100 KB. High-resolution multi-megabyte photo galleries are not supported.
- **Complex Intermarriage / Consanguinity Loops**:
  - While remarriages and multiple spouses per person are fully supported, marriages between cousins across different generations are mapped to the primary spouse's branch to maintain top-to-bottom DAG layout clarity.

---

## 🚀 Future Ideas & Feature Checklist

### Language & Accessibility
- [ ] **Hindi Language Localization (हिंदी)**:
  - Add bilingual toggle (English / Hindi) across all navigation, buttons, and relationship labels (*Pita*, *Mata*, *Bhai*, *Behan*, *Kaka*, *Baisa*, etc.).
  - Support Devanagari script for names and biographies.
- [ ] **Relationship Terminology Calculator**:
  - Display exact traditional kinship terms based on relative position (e.g. *Chacha*, *Bua*, *Mama*, *Masi*, *Tauji*).

### Export & Printing
- [ ] **Printable Poster Export (PDF / High-Res PNG)**:
  - Generate a formatted printable PDF or vector SVG suitable for framing or large-format printing at family gatherings.
  - Optional decorative traditional Rajput / Rajasthani royal scroll border theme.
- [ ] **Family Booklet / Directory Generator**:
  - Export a formatted printable booklet containing member biographies and contact directories (for approved members only).

### Visual & Media Enhancements
- [ ] **Photo Gallery Expansion**:
  - Support up to 3 historical photographs per deceased ancestor using compressed thumbnails.
- [ ] **Historical Timeline & Milestone View**:
  - Chronological timeline showing family births, marriages, and historic milestones side-by-side.
- [ ] **Geographic Migration Map**:
  - Interactive map displaying family migration patterns and hometown locations across Rajasthan and India.

### Social & Notification
- [ ] **Upcoming Birthdays & Anniversaries Widget**:
  - Display upcoming birthdays for living relatives and anniversaries for ancestors in the current calendar month.
- [ ] **Email Notifications via Firebase Extensions**:
  - Optional notification when an admin approves a member or when a suggestion is reviewed (if configured within free quotas).
