# Administrator Guide

Welcome to the Administrator Guide for the Rajawat Family Tree. As the family admin, you have full control over managing relatives, approving family members, reviewing submitted suggestions, and taking backups.

---

## 📋 Table of Contents
1. [Signing In as Administrator](#1-signing-in-as-administrator)
2. [Adding the First Relative](#2-adding-the-first-relative)
3. [Building the Family Tree (Quick Actions)](#3-building-the-family-tree-quick-actions)
4. [Editing a Relative's Information](#4-editing-a-relatives-information)
5. [Deleting a Record Safely](#5-deleting-a-record-safely)
6. [Managing Family Members (Approve / Block)](#6-managing-family-members-approve--block)
7. [Reviewing the Suggestions Inbox](#7-reviewing-the-suggestions-inbox)
8. [Exporting Backups & Restoring Data](#8-exporting-backups--restoring-data)

---

## 1. Signing In as Administrator

1. Open the Family Tree website in your browser.
2. In the top-right corner, click **Sign In with Google**.
3. Choose your Google account that was configured as the admin UID in `src/config.ts` and `firestore.rules`.
4. Once signed in, you will see an **Admin** badge in the header, along with administrator buttons: **Add Person**, **Inbox**, **Members**, and **Backups**.

---

## 2. Adding the First Relative

If the tree is brand new and empty:

1. Click the **Add Person** button in the top navigation bar.
2. Enter the relative's details:
   - **First Name** (required).
   - **Last Name** (e.g. *Rajawat*).
   - **Gender** (*Male*, *Female*, or *Other*).
   - **Vital Status**: Toggle between **Living Person** and **Deceased**.
   - **Birth Year**: Enter their 4-digit birth year (e.g. `1935`).
   - If deceased: You can also enter exact birth date (`YYYY-MM-DD`) and death date.
   - **Birth Place** and **Occupation**.
   - **Public Family Notes**: Any cherished memories, stories, or achievements.
3. *(Optional)* **Add a Photo**: Click the photo thumbnail box to upload a portrait. The browser automatically compresses the image to a compact size under 100 KB.
4. Click **Save Record**. The new relative will appear on the canvas.

---

## 3. Building the Family Tree (Quick Actions)

Instead of manually connecting ID numbers, you can add family relationships with one click:

1. Click on any relative's card on the tree canvas. A side panel will slide open displaying their details.
2. In the side panel, look for the **Quick Relative Actions** section:
   - **Add Father**: Opens the form with gender pre-selected to Male and sets them as the person's father.
   - **Add Mother**: Opens the form with gender pre-selected to Female and sets them as the person's mother.
   - **Add Spouse**: Opens the form and automatically creates a mutual marriage link between both cards.
   - **Add Child**: Opens the form and automatically sets the selected person (and their spouse) as parents.
   - **Add Sibling**: Opens the form and shares the same father and mother.
3. Fill in the relative's name and details, then click **Save Record**.
4. The canvas immediately redraws: spouses are placed side-by-side, union circles are created, and lineage lines connect down to children.

---

## 4. Editing a Relative's Information

1. Click on the relative's card in the tree.
2. In the side panel, click **Edit Details** (or the pencil icon).
3. Update any public fields (name, birth year, stories, occupation).
4. **Confidential Living Person Data**:
   - For living relatives, a yellow **Confidential Living Person Data (Admin Only)** section will appear.
   - You can record their exact date of birth, personal phone number, home address, and private notes.
   - This information is stored securely in `personPrivate` and will **never** be shown to regular family members.
5. Click **Save Record**.

---

## 5. Deleting a Record Safely

1. Click on the relative's card you wish to remove.
2. In the side panel, click the red **Delete Person** button.
3. A confirmation dialog will appear warning you that the action is permanent.
4. Click **Confirm Delete**.
5. **Automatic Cleanup**: The app automatically performs a clean cascade in a single batch:
   - Removes the person from their children's `fatherId` or `motherId`.
   - Removes the person from their partner's `spouseIds`.
   - Removes any confidential record in `personPrivate`.
   - Your tree remains balanced without broken connections.

---

## 6. Managing Family Members (Approve / Block)

When relatives sign in with their Google account for the first time, they enter an *Awaiting Approval* holding area until you confirm their identity.

1. Click **Members** in the top navigation bar.
2. You will see a list of all registered accounts grouped by status:
   - **Pending Approval**: New relatives awaiting access.
   - **Approved Members**: Family members who can view the tree.
   - **Blocked**: Accounts restricted from viewing the tree.
3. To approve a relative: Click **Approve** (green checkmark). They will immediately be able to browse the tree and submit suggestions.
4. To block or revoke access: Click **Block** or **Remove**.

---

## 7. Reviewing the Suggestions Inbox

When family members submit edit proposals or report errors, a badge appears on the **Inbox** button.

1. Click **Inbox** in the top navigation bar.
2. Select any pending suggestion to view details:
   - **Submitter Info**: Name, email, and submission timestamp.
   - **Message**: The note explaining why the change was proposed.
   - **Side-by-Side Comparison**: For edits, the left column shows current information and the right column highlights proposed changes in green.
3. Choose an action:
   - **Approve**: Immediately applies the changes to the database and marks the suggestion as approved.
   - **Edit & Approve**: Allows you to tweak or correct details before applying them to the tree.
   - **Reject**: Rejects the suggestion without modifying the database. You can optionally include an admin feedback note explaining why.

---

## 8. Exporting Backups & Restoring Data

Because the Firebase Spark (free) plan does not include automated server-side database backups, you should download backup copies regularly (e.g. after adding new branches).

### Exporting Backups:
1. Click **Backups** in the top navigation bar.
2. Choose your preferred format:
   - **Export JSON**: Downloads the full database including all persons and relationship IDs. Best for full application restore.
   - **Export GEDCOM**: Downloads a standardized `.ged` file compatible with external genealogy software (Ancestry, Gramps, MyHeritage).
3. Save the downloaded file to a safe location (e.g. an external hard drive or secure cloud storage).

### Importing a Backup:
1. Click **Backups** > **Import Backup (JSON)**.
2. Select your previously exported JSON file.
3. The importer validates every single record against the strict schema to prevent corrupt data from reaching Firestore.
4. Once verified, the database is restored in atomic batches.
