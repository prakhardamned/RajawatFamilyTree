import React from 'react';
import { useAuth, DemoRole } from '../../context/AuthContext';
import { useTreeData } from '../../context/TreeDataContext';
import { isFirebaseConfigured } from '../../firebase';
import {
  TreeDeciduous,
  Plus,
  Inbox,
  Users,
  Database,
  RefreshCw,
  LogOut,
  LogIn,
  ShieldAlert,
  Sparkles,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  onOpenAddPerson: () => void;
  onOpenInbox: () => void;
  onOpenMembers: () => void;
  onOpenBackup: () => void;
  onOpenMySuggestions: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddPerson,
  onOpenInbox,
  onOpenMembers,
  onOpenBackup,
  onOpenMySuggestions,
}) => {
  const {
    user,
    isAdmin,
    isApproved,
    isDemoMode,
    demoRole,
    setDemoRole,
    toggleDemoMode,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const { refreshPersons, loading, suggestions, members } = useTreeData();

  const pendingSuggestionsCount = suggestions.filter((s) => s.status === 'pending').length;
  const pendingMembersCount = members.filter((m) => m.status === 'pending').length;

  return (
    <header className="bg-white border-b border-stone-200/90 sticky top-0 z-40 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center shadow-sm">
            <TreeDeciduous className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-stone-900 tracking-tight leading-none">
              Family Tree
            </h1>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5 hidden sm:block">
              Preserving Generations &amp; Lineage
            </p>
          </div>
        </div>

        {/* Center: Admin & Member Navigation */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onOpenAddPerson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Add Person</span>
              </button>

              <button
                type="button"
                onClick={onOpenInbox}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                title="Review Suggestions"
              >
                <Inbox className="w-4 h-4 text-amber-700" />
                <span className="hidden lg:inline">Inbox</span>
                {pendingSuggestionsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                    {pendingSuggestionsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenMembers}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                title="Manage Members"
              >
                <Users className="w-4 h-4 text-stone-600" />
                <span className="hidden lg:inline">Members</span>
                {pendingMembersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                    {pendingMembersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                title="Backup & Export"
              >
                <Database className="w-4 h-4 text-stone-600" />
                <span className="hidden lg:inline">Backup</span>
              </button>
            </>
          )}

          {isApproved && !isAdmin && (
            <button
              type="button"
              onClick={onOpenMySuggestions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
            >
              <FileText className="w-4 h-4 text-amber-700" />
              <span>My Suggestions</span>
            </button>
          )}

          {/* Manual Refresh (minimizes reads) */}
          {isApproved && (
            <button
              type="button"
              onClick={() => refreshPersons()}
              disabled={loading}
              title="Manual Tree Refresh (Cached in memory to save Firestore reads)"
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Right: Demo Mode Toggle & User Auth */}
        <div className="flex items-center gap-3">
          {/* Demo Mode Badge & Role Switcher */}
          <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="font-semibold text-stone-700 hidden sm:inline flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Mode:
            </span>

            {isDemoMode ? (
              <select
                value={demoRole}
                onChange={(e) => setDemoRole(e.target.value as DemoRole)}
                className="bg-transparent font-semibold text-amber-900 focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="admin">Demo (Admin)</option>
                <option value="member">Demo (Member)</option>
                <option value="pending">Demo (Pending)</option>
              </select>
            ) : (
              <span className="text-emerald-700 font-semibold">Live Firebase</span>
            )}

            {isFirebaseConfigured && (
              <button
                type="button"
                onClick={() => toggleDemoMode(!isDemoMode)}
                className="ml-1 text-[10px] text-stone-500 hover:text-stone-900 underline"
              >
                {isDemoMode ? 'Switch to Live' : 'Demo'}
              </button>
            )}
          </div>

          {/* User Profile or Google Sign In */}
          {!isDemoMode && user ? (
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-stone-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !isDemoMode && !user ? (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Google Sign-In</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};
