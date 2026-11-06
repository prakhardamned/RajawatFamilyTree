import React, { useState } from 'react';
import { useTreeData } from '../../context/TreeDataContext';
import { Member, MemberStatus } from '../../types';
import { X, Check, Ban, Trash2, Clock, Shield, UserCheck, AlertTriangle } from 'lucide-react';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MembersModal: React.FC<MembersModalProps> = ({ isOpen, onClose }) => {
  const { members, updateMemberStatus, removeMember } = useTreeData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('pending');
  const [actionUid, setActionUid] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdate = async (uid: string, status: MemberStatus) => {
    setActionUid(uid);
    try {
      await updateMemberStatus(uid, status);
    } catch (err: any) {
      alert(`Failed to update member status: ${err.message}`);
    } finally {
      setActionUid(null);
    }
  };

  const handleRemove = async (uid: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from members?`)) return;
    setActionUid(uid);
    try {
      await removeMember(uid);
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message}`);
    } finally {
      setActionUid(null);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const pendingCount = members.filter((m) => m.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-700" />
              <span>Family Membership Access</span>
            </h3>
            <p className="text-xs text-stone-500">
              Approve relatives, manage viewer access, or block unauthorized accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation */}
        <div className="px-5 py-2.5 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between text-xs">
          <div className="flex rounded-lg bg-stone-200/80 p-0.5 font-medium">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'pending'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Pending Approval ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('approved')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'approved'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Approved ({members.filter((m) => m.status === 'approved').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('blocked')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'blocked'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Blocked ({members.filter((m) => m.status === 'blocked').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'all'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({members.length})
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-4">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 italic">
              No members in &ldquo;{filter}&rdquo; list.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isBusy = actionUid === member.uid;

              return (
                <div
                  key={member.uid}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 rounded-xl transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 text-sm">
                        {member.displayName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          member.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : member.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 font-mono mt-0.5">
                      {member.email}
                    </div>

                    <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>UID: {member.uid}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 text-xs">
                    {member.status === 'pending' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdate(member.uid, 'approved')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {member.status !== 'blocked' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdate(member.uid, 'blocked')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 font-medium transition"
                        title="Block member from reading tree data"
                      >
                        <Ban className="w-3.5 h-3.5 text-stone-500" />
                        <span>Block</span>
                      </button>
                    )}

                    {member.status === 'blocked' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdate(member.uid, 'approved')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRemove(member.uid, member.displayName)}
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove Member Doc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
