import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, ShieldAlert, LogIn, RefreshCw, TreeDeciduous, LogOut, Sparkles } from 'lucide-react';

export const AwaitingApprovalView: React.FC = () => {
  const { user, refreshMemberStatus, signOut, toggleDemoMode } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshMemberStatus();
    setTimeout(() => setChecking(false), 800);
  };

  const [copied, setCopied] = useState(false);

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Awaiting Approval
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Welcome, <strong>{user?.displayName || 'Family Member'}</strong>! Your request to access the family tree is pending review by the family genealogist admin.
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 text-xs text-stone-600 space-y-2 text-left font-mono">
          <div><span className="text-stone-400">Account:</span> {user?.email}</div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate"><span className="text-stone-400">UID:</span> {user?.uid}</span>
            <button
              type="button"
              onClick={handleCopyUid}
              className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-sans font-semibold transition shrink-0"
            >
              {copied ? 'Copied!' : 'Copy UID'}
            </button>
          </div>
          <div><span className="text-stone-400">Status:</span> <span className="font-bold text-amber-700">pending</span></div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Approval Status</span>
          </button>

          <button
            type="button"
            onClick={() => toggleDemoMode(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Explore In-Memory Demo Mode</span>
          </button>

          <button
            type="button"
            onClick={signOut}
            className="text-stone-400 hover:text-stone-700 text-xs underline pt-1"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export const BlockedView: React.FC = () => {
  const { signOut, toggleDemoMode } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Access Restricted
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Your family membership account has been placed on hold or blocked by the tree administrator.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => toggleDemoMode(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs transition"
          >
            <span>Switch to Demo Mode</span>
          </button>

          <button
            type="button"
            onClick={signOut}
            className="text-stone-400 hover:text-stone-700 text-xs underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export const SignedOutView: React.FC = () => {
  const { signInWithGoogle, toggleDemoMode } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in was cancelled or failed.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xl p-8 max-w-lg w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center mx-auto shadow-md">
          <TreeDeciduous className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Family Tree Archive
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
            A secure, private lineage archive designed for family members to explore connections, celebrate ancestors, and submit stories.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm shadow-md transition"
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>Sign in with Google</span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400 font-medium">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleDemoMode(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Explore 3-Generation Demo Mode</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-400 pt-2">
          🔒 Private by design. Google OAuth verified accounts only. Running zero-cost on Firebase Spark.
        </p>
      </div>
    </div>
  );
};
