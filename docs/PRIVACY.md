# Privacy Policy & Family Data Guidelines

The Rajawat Family Tree is a private family archive created exclusively for personal, genealogical, and historical preservation. This document describes what data is stored, who can see each piece of information, and how family members can request corrections or deletions.

---

## 🔒 Core Privacy Principles

1. **Family Privacy First**: The application is not public. It is accessible strictly to invited and approved family members who sign in with a verified Google account.
2. **Special Care for Living Relatives**: Sensitive information belonging to living persons (such as exact date of birth, personal telephone number, home address, and private notes) is stored in a separate, isolated database partition accessible exclusively to the designated administrator.
3. **No Commercial Use**: Family data, names, photographs, and records are never sold, rented, monetized, or shared with third parties, data brokers, or advertisers.
4. **Zero-Cost Free Tier**: Built entirely on Google Firebase's free Spark tier without external tracking, advertising cookies, or third-party marketing telemetry.

---

## 📑 What Data Is Stored

### 1. Public Family Records (`persons` collection)
Visible to all approved family members:
- **Names**: First name, last name, and informal nickname or preferred name.
- **Gender**: Male, Female, or Other (used for lineage grouping and card styling).
- **Vital Status**: Living or Deceased indicator.
- **Birth Year**: Approximate or 4-digit calendar year (e.g. `1952` or `1985`).
- **Deceased Records**: For deceased ancestors only, exact date of birth and date of passing may be recorded.
- **Biographical Notes**: Place of birth, occupation, achievements, and family stories.
- **Photographs**: Low-resolution portrait thumbnail compressed directly in the browser (< 100 KB).
- **Lineage Pointers**: Internal database reference IDs for father, mother, and spouses.

### 2. Confidential Living Records (`personPrivate` collection)
Visible **only** to the family administrator:
- Exact date of birth (`YYYY-MM-DD`) for living relatives.
- Personal mobile or residential phone numbers.
- Home or postal addresses.
- Confidential contact or estate administration notes.

### 3. Account Profiles (`members` collection)
- Google display name and verified Google email address.
- Account approval status (`pending`, `approved`, or `blocked`).
- Registration timestamp and suggestion cooldown timestamp.

### 4. Suggestions (`suggestions` collection)
- Submitter's name and email address.
- Proposed field changes and explanation note.
- Review status (`pending`, `approved`, or `rejected`) and optional admin feedback.

---

## 👁️ Who Can See What

| Information Item | Living Person | Deceased Ancestor | Who Can See? |
|---|:---:|:---:|---|
| Full Name & Nickname | ✅ | ✅ | Approved Family Members & Admin |
| Birth Year (e.g. `1975`) | ✅ | ✅ | Approved Family Members & Admin |
| Exact Birth Date (e.g. `1975-04-18`) | ❌ *(Admin only)* | ✅ | Admin only for living; Members for deceased |
| Date of Passing | N/A | ✅ | Approved Family Members & Admin |
| Birth Place & Occupation | ✅ | ✅ | Approved Family Members & Admin |
| Public Stories & Notes | ✅ | ✅ | Approved Family Members & Admin |
| Photo Thumbnail | ✅ | ✅ | Approved Family Members & Admin |
| Phone Number & Address | ❌ *(Admin only)* | ❌ *(Admin only)* | Admin only |
| Family Relationship Links | ✅ | ✅ | Approved Family Members & Admin |
| Entire Tree & Data | ❌ | ❌ | **Hidden** from general public & search engines |

---

## ✏️ How to Request a Correction or Removal

Every family member has the right to inspect, correct, or request the removal of their personal data or that of their minor children.

### 1. Requesting an Edit or Correction
- **Via the App**: While browsing the tree, click on your card (or your relative's card) and select **Suggest Edit**. Submit the correction with a short note. The admin will review and apply the update.
- **Via Direct Contact**: You can speak directly to the family administrator or email them from your registered Google email address.

### 2. Requesting Full Removal or Anonymization
- If you prefer not to have your photograph, living record, or contact details in the family tree, notify the administrator.
- The administrator can immediately:
  - Remove your portrait photo.
  - Anonymize your name (e.g., listing as *"Family Member"*).
  - Delete your record from `persons` and `personPrivate`. (The system automatically cleans up relation links to keep parents and children intact).
  - Revoke or delete your member account from the access list.

---

## 🛡️ Security Measures
- **Database Rules**: Google Cloud Firestore enforces server-side security rules on every query. Unauthenticated or unapproved users receive permission-denied errors.
- **HTTPS Encryption**: All traffic between your browser and Firebase Hosting is encrypted in transit using industry-standard TLS / HTTPS.
- **No Direct HTML Injection**: The application interpolates plain text only, preventing cross-site scripting (XSS) vulnerabilities.
