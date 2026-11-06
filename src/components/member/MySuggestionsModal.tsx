import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTreeData } from '../../context/TreeDataContext';
import { X, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface MySuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MySuggestionsModal: React.FC<MySuggestionsModalProps> = ({ isOpen, onClose }) => {
  const { user, isDemoMode } = useAuth();
  const { suggestions, persons } = useTreeData();

  if (!isOpen) return null;

  // Filtered strictly to current user's suggestions
  const mySuggestions = suggestions.filter((s) => {
    if (isDemoMode) return true;
    return s.submittedBy?.uid === user?.uid;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">
              My Suggestions &amp; Submissions
            </h3>
            <p className="text-xs text-stone-500">
              Track review status and administrator notes on your contributions.
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

        {/* Rate limit advisory banner */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Note:</strong> To prevent duplicate submissions, suggestions have a 60-second cooldown period.
          </span>
        </div>

        {/* List of submissions */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-4 space-y-2">
          {mySuggestions.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 italic">
              You haven&apos;t submitted any suggestions yet. Click on any relative in the tree and select &ldquo;Suggest Edit&rdquo;.
            </div>
          ) : (
            mySuggestions.map((sug) => {
              const target = sug.targetPersonId
                ? persons.find((p) => p.id === sug.targetPersonId)
                : null;

              return (
                <div
                  key={sug.id}
                  className="p-4 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50/70 transition space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">
                      {target
                        ? `${target.firstName} ${target.lastName || ''}`
                        : sug.type === 'add_person'
                          ? `+ New Person: ${sug.proposedData?.firstName || 'Relative'}`
                          : 'General Family Inquiry'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        sug.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : sug.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sug.status}
                    </span>
                  </div>

                  <p className="text-stone-600 leading-relaxed">
                    {sug.message || 'No description provided.'}
                  </p>

                  {/* Proposed fields preview */}
                  {sug.proposedData && Object.keys(sug.proposedData).length > 0 && (
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex flex-wrap gap-2 text-[11px]">
                      <span className="font-semibold text-stone-500">Proposed:</span>
                      {Object.entries(sug.proposedData).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-white rounded border border-stone-200">
                          <strong>{k}:</strong> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Admin feedback note */}
                  {sug.adminNote && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] block">Admin Feedback:</span>
                        <p className="whitespace-pre-line text-[11px]">{sug.adminNote}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
