# Family Tree 🌳

A production-ready, client-side-only web app for preserving, viewing, and managing family genealogies with interactive tree visualization, suggestions workflow, role-based security, and zero-cost Firebase Spark hosting.

---

## ⚡ Zero-Cost Architecture & Principles

- **Firebase Spark Plan Guaranteed ($0/mo forever)**: Does not require Cloud Functions, Cloud Storage, or Blaze plan.
- **Client-Side Only**: 100% static React + Vite SPA. No Node server backend.
- **Privacy & Security First**: Plain text sanitization, living person privacy protections, and hardened Firestore security rules.
- **Interactive Top-to-Bottom Tree**: Powered by `@xyflow/react` and Dagre with family couple nodes, ancestor/descendant filtering, smooth zoom/pan, minimap, and search-and-jump.
- **Offline / Standalone Demo Mode**: Integrated in-memory 3-generation demo mode allows previewing, editing, exporting, and testing without requiring immediate Firebase configuration.

---

## 🚀 Step-by-Step Setup Guide

Follow these exact steps to launch your Family Tree on Firebase's free Spark plan:

### 1. Create a Firebase Project
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Click **Add project**, name it (e.g. `my-family-tree`), and continue.
- Keep the project on the **Spark plan** (free forever; never upgrade to Blaze).

### 2. Enable Google Authentication Only
- In the Firebase Console sidebar, go to **Build** > **Authentication**.
- Click **Get Started**, choose **Google** under Additional providers.
- Enable the Google provider, set your project support email, and click **Save**.
- Ensure all other providers (Email/Password, Phone, Anonymous) remain **disabled**.

### 3. Create Firestore Database
- Go to **Build** > **Firestore Database**.
- Click **Create database**, select a region close to your family members.
- Start in **Production mode** (we will deploy strict rules in Step 6).

### 4. Register Web App & Configure Environment
- In Project Overview, click the **Web icon (`</>`)** to register an app.
- Name it (e.g. `Family Tree Web`), uncheck Firebase Hosting for now, and register.
- Create a `.env` file in the root directory (copy from `.env.example`):
  ```bash
  cp .env.example .env
  ```
- Copy the Firebase configuration keys from the console into `.env`:
  ```env
  VITE_FIREBASE_API_KEY="AIzaSy..."
  VITE_FIREBASE_AUTH_DOMAIN="my-family-tree.firebaseapp.com"
  VITE_FIREBASE_PROJECT_ID="my-family-tree"
  VITE_FIREBASE_STORAGE_BUCKET="my-family-tree.appspot.com"
  VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
  VITE_FIREBASE_APP_ID="1:123456789012:web:..."
  ```

### 5. Set Your Admin UID
- Run the app locally with `npm run dev`.
- Click **Sign in with Google** once.
- Return to **Firebase Console** > **Authentication** > **Users** tab.
- Copy your user's **User UID** string.
- Paste it in:
  1. `src/config.ts`: Add to `ADMIN_UIDS = ['YOUR_UID_HERE']`
  2. `firestore.rules`: Replace `REPLACE_WITH_ADMIN_UID` with your UID:
     ```javascript
     function isAdmin() {
       return signedIn() && request.auth.uid in ['YOUR_UID_HERE'];
     }
     ```

### 6. Run Rules Tests & Deploy Security Rules
- Install the Firebase CLI if you haven't already:
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase use --add
  ```
- Run the comprehensive rules test suite with the emulator:
  ```bash
  npm run test:rules
  ```
- Deploy the security rules to Firestore:
  ```bash
  firebase deploy --only firestore:rules
  ```

### 7. Restrict API Key in Google Cloud Console
- Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
- Click your Firebase browser key (usually `Browser key (auto created by Firebase)`).
- Under **Application restrictions**, select **Web sites / HTTP referrers**.
- Add authorized referrers:
  - `https://my-family-tree.web.app/*`
  - `https://my-family-tree.firebaseapp.com/*`
  - `http://localhost:*/*`
- Under **API restrictions**, restrict to:
  - Identity Toolkit API
  - Token Service API
  - Cloud Firestore API

### 8. Authorize Hosting Domain in Firebase Auth
- In Firebase Console > **Authentication** > **Settings** > **Authorized domains**.
- Verify that your production hosting domain (`<project-id>.web.app` and `<project-id>.firebaseapp.com`) is present.

### 9. Build and Deploy Hosting
- Build the optimized production bundle:
  ```bash
  npm run build
  ```
- Deploy to Firebase Hosting:
  ```bash
  firebase deploy --only hosting
  ```

### 10. Regular Backup Procedure
- In the app, navigate to **Settings** or the admin controls and click **Export Tree (JSON)** or **Export Tree (GEDCOM)**.
- Store backups on an external drive or secure cloud storage.
- *Reminder: The Firebase Spark (free) plan has no automatic database backups, so exporting backups regularly is essential.*

---

## 🛡️ Security & Privacy Architecture

| Feature | Enforcement Level | Description |
|---|---|---|
| **Admin Rights** | Server-side `firestore.rules` | UI admin controls are cosmetic; real validation and writes require `request.auth.uid in ADMIN_UIDS`. |
| **Living Person Privacy** | Data model & Rules | If `isLiving == true`, exact birth date, address, phone, and private notes are NEVER placed in public `persons/{id}`. Only `birthYear` is visible. |
| **Rate Limiting** | Firestore Security Rules | Submitting suggestions enforces batched write with `members/{uid}.lastSuggestionAt` checked with `+ duration.value(60, 's')`. |
| **Member Verification** | Rules + Auth token | Only Google verified accounts (`email_verified == true`) with status `approved` in `members/{uid}` can read persons. |
| **HTML Sanitization** | React Rendering | Plain-text interpolation only. No `dangerouslySetInnerHTML`. No arbitrary URL clickable redirects. |

---

## 📦 Features Overview

- **Interactive Family Tree Visualizer**:
  - Top-to-bottom hierarchy with parent-child lines and union/couple nodes.
  - Multi-marriage and remarriage support.
  - Ancestors-only, Descendants-only, and All-Family tree filtering modes.
  - Quick Search & Focus on any family member.
  - Collapsible branches and navigation mini-map.
- **Admin Dashboard**:
  - Add Father, Mother, Spouse, Child, or Sibling with one click.
  - Browser-side automatic photo compression to 200x200 JPEG < 100KB.
  - Delete with automatic cascading cleanup of parent/spouse references.
  - Member approval queue (Approve, Block, Remove).
  - Suggestions inbox with side-by-side diff comparison and 1-click apply.
  - Full JSON and standard GEDCOM export / JSON import with schema validator.
- **Family Member Portal**:
  - Suggest an Edit (calculates delta and only proposes changed fields).
  - Suggest a Relative or Report an Error.
  - "My Suggestions" status tracking.
