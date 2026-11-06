import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase';
import { ADMIN_UIDS } from '../config';
import { Member, MemberStatus } from '../types';

export type DemoRole = 'admin' | 'member' | 'pending';

interface AuthContextType {
  user: User | null;
  memberRecord: Member | null;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isBlocked: boolean;
  loading: boolean;
  isDemoMode: boolean;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
  toggleDemoMode: (enabled: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshMemberStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Demo mode if Firebase is not yet configured with real API keys
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return !isFirebaseConfigured;
  });
  const [demoRole, setDemoRole] = useState<DemoRole>('admin');

  const [user, setUser] = useState<User | null>(null);
  const [memberRecord, setMemberRecord] = useState<Member | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync Firebase Auth state
  useEffect(() => {
    if (!auth || !db || isDemoMode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadOrCreateMember(currentUser);
      } else {
        setMemberRecord(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const loadOrCreateMember = async (currentUser: User) => {
    if (!db) return;
    try {
      const memberRef = doc(db, 'members', currentUser.uid);
      const memberSnap = await getDoc(memberRef);

      const isUserAdmin = ADMIN_UIDS.includes(currentUser.uid);

      if (memberSnap.exists()) {
        const data = memberSnap.data() as Omit<Member, 'uid'>;
        setMemberRecord({
          ...data,
          uid: currentUser.uid,
        });
      } else {
        // Under firestore.rules:
        // allow create: if signedIn() && request.auth.uid == uid
        //               && request.resource.data.keys().hasOnly(['displayName','email','status','requestedAt'])
        //               && request.resource.data.status == 'pending'
        //               && request.resource.data.email == request.auth.token.email
        //               && request.resource.data.displayName is string
        //               && request.resource.data.displayName.size() <= 100
        //               && request.resource.data.requestedAt == request.time;
        //
        // NOTE: Document payload MUST have EXACTLY these 4 keys. Do NOT include 'uid' in the document map!
        // NOTE: Status MUST be 'pending' upon creation according to security rules.
        const displayName = (currentUser.displayName || 'Family Member').slice(0, 100);
        const email = currentUser.email || '';

        const newMemberDoc = {
          displayName,
          email,
          status: 'pending' as MemberStatus,
          requestedAt: serverTimestamp(),
        };

        await setDoc(memberRef, newMemberDoc);

        setMemberRecord({
          uid: currentUser.uid,
          displayName,
          email,
          status: 'pending',
          requestedAt: new Date(),
        });

        // If the user's UID is in ADMIN_UIDS, attempt to update status to approved (succeeds if admin in rules)
        if (isUserAdmin) {
          try {
            await updateDoc(memberRef, { status: 'approved' });
            setMemberRecord((prev) => (prev ? { ...prev, status: 'approved' } : null));
          } catch {
            // Admin UID might not be in firestore.rules yet
          }
        }
      }
    } catch (err) {
      console.error('Failed to load or create member doc:', err);
    }
  };

  const refreshMemberStatus = async () => {
    if (user && db) {
      await loadOrCreateMember(user);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase is not configured yet. You can use Demo Mode in the top-right corner.');
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (auth) {
      await fbSignOut(auth);
    }
    setUser(null);
    setMemberRecord(null);
  };

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
  };

  // Derived role status
  const roleCalculations = useMemo(() => {
    if (isDemoMode) {
      return {
        isAdmin: demoRole === 'admin',
        isApproved: demoRole === 'admin' || demoRole === 'member',
        isPending: demoRole === 'pending',
        isBlocked: false,
      };
    }

    if (!user) {
      return {
        isAdmin: false,
        isApproved: false,
        isPending: false,
        isBlocked: false,
      };
    }

    const isAdmin = ADMIN_UIDS.includes(user.uid);
    const status = memberRecord?.status;

    return {
      isAdmin,
      isApproved: isAdmin || status === 'approved',
      isPending: !isAdmin && status !== 'approved' && status !== 'blocked',
      isBlocked: !isAdmin && status === 'blocked',
    };
  }, [isDemoMode, demoRole, user, memberRecord]);

  return (
    <AuthContext.Provider
      value={{
        user,
        memberRecord,
        loading,
        isDemoMode,
        demoRole,
        setDemoRole,
        toggleDemoMode,
        signInWithGoogle,
        signOut,
        refreshMemberStatus,
        ...roleCalculations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
