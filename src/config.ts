/**
 * Global Configuration for Family Tree
 *
 * NOTE: UI checks are cosmetic only; firestore.rules is the real enforcement.
 * Add your Firebase Google Auth UID here and in firestore.rules.
 */

export const ADMIN_UIDS: string[] = [
  'pTYW4Z5IktaPXSqiZhdB2qbMfdn1',
  'demo-admin-uid',         // Used in Demo Mode
];

export const APP_CONFIG = {
  appName: 'Family Tree',
  version: '1.0.0',
  rateLimitSeconds: 60,
  maxPhotoDimension: 200,
  maxPhotoSizeBytes: 100 * 1024, // 100 KB
  maxBatchSize: 450, // Firestore max is 500 ops per batch
  backupWarningMessage: 'Export a backup regularly — the free plan has no automatic backups.',
};
