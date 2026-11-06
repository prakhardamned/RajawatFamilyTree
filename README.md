# Rajawat Family Tree 🌳

A secure, private, client-side web application built specifically for preserving, exploring, and updating the genealogy of the **Rajawat family** across 6–7 generations. Powered by React, Vite, TypeScript, Tailwind CSS, and React Flow, running entirely on the **Firebase Spark (free) plan** with zero ongoing hosting or backend operational costs.

---

## 🎯 Purpose

The Rajawat Family Tree is designed as a living historical record and private portal for the extended Rajawat family. It allows generations of relatives—from elders to the youngest members across the diaspora—to explore their roots, trace lineage, discover relatives, and contribute verified family information through an administrative review workflow.

---

## ✨ Features

- **Interactive Family Tree Canvas**:
  - Top-to-bottom generational layout powered by `@xyflow/react`.
  - Spouses placed directly side-by-side on the same generational row, joined by an amber dashed couple line (`💍 Couple`).
  - Family union nodes connecting parents down to their children.
  - Generational rank calculation: spouses marrying into the family automatically align to their partner's generation.
  - Interactive controls: smooth zoom, pan, fit-to-screen, minimap, and search-and-jump by name.
  - Perspective filters: **All**, **Ancestors**, and **Descendants** relative to any selected root person.
  - Branch collapsing and expanding for large family lines.
- **Alternative People List View**:
  - Full table view of all family members with birth years, parents, and quick action buttons.
- **Member Collaboration & Suggestions**:
  - Verified family members can submit edit proposals, propose new relatives, or report discrepancies.
  - Rate-limited to 1 suggestion every 60 seconds to protect database write limits.
  - "My Suggestions" status tracking for submitted proposals.
- **Admin Management Portal**:
  - Quick relative addition: Add Father, Mother, Spouse, Child, or Sibling with automatic reciprocal linking.
  - Client-side image compression: Avatars compressed in the browser to max 200×200 JPEG (< 100 KB) and stored directly in Firestore (zero Cloud Storage requirement).
  - Suggestions Inbox: Review submissions with side-by-side visual diffs, with options to Approve, Edit-then-Approve, or Reject with explanatory notes.
  - Member management: Approve, block, or remove registered Google accounts.
  - Safe deletion: Cascading cleanup automatically clears `fatherId`, `motherId`, and `spouseIds` across all related documents in a single atomic batch.
  - Backup & Migration: Export tree data to JSON and standard GEDCOM formats; import validated JSON backups with schema validation.
- **Living Person Privacy Safeguards**:
  - Exact birth dates, residential addresses, phone numbers, and private notes for living members are isolated in restricted admin-only storage. Only birth year and living status are visible to family members.
- **Offline / Standalone Demo Mode**:
  - Built-in multi-generation demo dataset allowing demonstration and testing without configuring cloud credentials.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19 & TypeScript** | Client-side reactive UI, strict typing, and modular state management |
| **Vite** | Fast, modern frontend build tool and static asset bundler |
| **Tailwind CSS** | Styling, responsive layouts, and typography |
| **@xyflow/react (React Flow)** | Interactive node-and-edge canvas for family tree visualization |
| **Firebase Authentication** | Google Sign-In only (`signInWithPopup`), email verification enforced |
| **Cloud Firestore** | Serverless NoSQL document database with granular security rules |
| **Firebase Hosting** | Global static CDN hosting under the free Spark tier |

---

## 👥 User Roles & Access Control

| Role | Access Level | Description |
|---|---|---|
| **Admin** | Full Read & Write | Single designated family administrator defined by UID. Can create, edit, delete, manage members, review suggestions, and view private records. |
| **Approved Member** | Read Tree + Submit Suggestions | Signed-in relative with an approved Google account. Can browse the tree, search members, and propose edits/additions. |
| **Pending Member** | Waiting Room Screen | Signed-in with Google for the first time. Cannot view any family tree records until approved by the admin. |
| **Blocked Member** | Access Denied | Explicitly blocked account. Cannot read or write any family data. |
| **Signed Out** | Landing / Sign-In Screen | Public visitor. No access to names, photos, or family tree information. |

---

## 📚 Project Documentation

Detailed guides and architecture specifications are available in the [`docs/`](./docs) directory:

1. [**System Architecture (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md) – Technical structure, data flow, Mermaid diagram, and zero-cost design rationale.
2. [**Data Model (`docs/DATA_MODEL.md`)**](./docs/DATA_MODEL.md) – Complete Firestore collections schema, field definitions, relationship linkages, and examples.
3. [**Security & Permissions (`docs/SECURITY.md`)**](./docs/SECURITY.md) – Security rules explanation, privacy boundaries for living relatives, and rate limiting.
4. [**Administrator Guide (`docs/ADMIN_GUIDE.md`)**](./docs/ADMIN_GUIDE.md) – Step-by-step instructions for adding relatives, approving members, reviewing suggestions, and handling backups.
5. [**Family Member Guide (`docs/FAMILY_GUIDE.md`)**](./docs/FAMILY_GUIDE.md) – Easy, non-technical instructions for relatives to sign in, explore, and submit suggestions.
6. [**Privacy Policy & Guidelines (`docs/PRIVACY.md`)**](./docs/PRIVACY.md) – What personal data is stored, visibility rules, and data correction/removal procedures.
7. [**Product Roadmap (`docs/ROADMAP.md`)**](./docs/ROADMAP.md) – Current capabilities, known considerations, and upcoming feature checklist (Hindi support, printable charts, etc.).
8. [**Changelog (`CHANGELOG.md`)**](./CHANGELOG.md) – Release history and version notes following Keep a Changelog standards.

---

## 🚀 Quick Setup & Local Development

### Prerequisites
- Node.js 18+ and `npm`
- A Firebase project on the free **Spark plan**

### Installation
```bash
git clone <repository-url>
cd family-tree
npm install
```

### Configuration
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your Firebase web configuration:
   ```env
   VITE_FIREBASE_API_KEY="AIzaSy..."
   VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
   VITE_FIREBASE_APP_ID="1:123456789012:web:..."
   ```
3. Set your admin Google UID in `src/config.ts` and `firestore.rules`.

### Running Locally
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Deploying to Firebase Hosting
```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

---

## 📄 License

This project is licensed under the Apache 2.0 License.
