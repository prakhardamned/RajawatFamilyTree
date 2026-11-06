import React, { useState } from 'react';
import { Suggestion, Person } from '../../types';
import { useTreeData } from '../../context/TreeDataContext';
import {
  X,
  Check,
  XCircle,
  Edit3,
  Clock,
  User,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface SuggestionsInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditAndApprove?: (suggestion: Suggestion) => void;
}

export const SuggestionsInboxModal: React.FC<SuggestionsInboxModalProps> = ({
  isOpen,
  onClose,
  onEditAndApprove,
}) => {
  const { suggestions, persons, reviewSuggestion } = useTreeData();

  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === 'pending') return s.status === 'pending';
    if (filter === 'reviewed') return s.status !== 'pending';
    return true;
  });

  const activeSuggestion =
    suggestions.find((s) => s.id === selectedSuggestionId) ||
    filteredSuggestions[0] ||
    null;

  const targetPerson = activeSuggestion?.targetPersonId
    ? persons.find((p) => p.id === activeSuggestion.targetPersonId)
    : null;

  const handleApprove = async () => {
    if (!activeSuggestion) return;
    setProcessing(true);
    try {
      await reviewSuggestion(activeSuggestion.id, 'approve', adminNote.trim() || undefined);
      setAdminNote('');
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activeSuggestion) return;
    setProcessing(true);
    try {
      await reviewSuggestion(activeSuggestion.id, 'reject', adminNote.trim() || undefined);
      setAdminNote('');
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Suggestions Review Inbox
            </h2>
            <p className="text-xs text-stone-500">
              Review member suggestions, compare diffs side-by-side, and apply edits with 1-click.
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

        {/* Filter bar */}
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
              Pending ({suggestions.filter((s) => s.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('reviewed')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'reviewed'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Reviewed ({suggestions.filter((s) => s.status !== 'pending').length})
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
              All ({suggestions.length})
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Suggestions List */}
          <div className="w-1/3 border-r border-stone-200 overflow-y-auto divide-y divide-stone-100 bg-stone-50/50">
            {filteredSuggestions.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 italic">
                No {filter} suggestions found.
              </div>
            ) : (
              filteredSuggestions.map((sug) => {
                const isSelected = sug.id === (activeSuggestion?.id || '');
                const person = sug.targetPersonId
                  ? persons.find((p) => p.id === sug.targetPersonId)
                  : null;

                return (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => {
                      setSelectedSuggestionId(sug.id);
                      setAdminNote(sug.adminNote || '');
                    }}
                    className={`w-full text-left p-3.5 transition text-xs flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-amber-50/90 border-l-4 border-amber-600 shadow-xs'
                        : 'hover:bg-stone-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 truncate">
                        {person
                          ? `${person.firstName} ${person.lastName || ''}`
                          : sug.type === 'add_person'
                            ? `+ New Relative: ${sug.proposedData?.firstName || 'Person'}`
                            : 'General Family Note'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
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

                    <p className="text-stone-600 line-clamp-2 text-[11px] leading-tight">
                      {sug.message || 'No explanatory message provided.'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                      <span>By {sug.submittedBy?.name || 'Member'}</span>
                      <span className="capitalize">{sug.type.replace('_', ' ')}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Side-by-side Diff Detail */}
          <div className="w-2/3 flex flex-col overflow-hidden bg-white">
            {activeSuggestion ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Header Information */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Suggestion Type: {activeSuggestion.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        activeSuggestion.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : activeSuggestion.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Status: {activeSuggestion.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-700">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      Submitted by <strong>{activeSuggestion.submittedBy.name}</strong> (
                      {activeSuggestion.submittedBy.email})
                    </span>
                  </div>

                  {activeSuggestion.message && (
                    <div className="pt-2 border-t border-stone-200/60 text-xs text-stone-800">
                      <span className="font-semibold text-stone-600 block mb-0.5">
                        Member Message:
                      </span>
                      <p className="whitespace-pre-line bg-white p-2.5 rounded-lg border border-stone-200 text-stone-800">
                        {activeSuggestion.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Diff */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Side-by-Side Comparison
                  </h4>

                  {activeSuggestion.type === 'edit_person' && targetPerson ? (
                    <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-200 text-xs">
                      {/* Diff Table Header */}
                      <div className="grid grid-cols-3 bg-stone-100 px-4 py-2 font-semibold text-stone-700">
                        <div>Field</div>
                        <div>Current Value</div>
                        <div className="text-amber-800">Proposed Value</div>
                      </div>

                      {/* Compare Fields */}
                      {Object.keys(activeSuggestion.proposedData || {}).map((fieldKey) => {
                        const currentVal = (targetPerson as any)[fieldKey];
                        const proposedVal = activeSuggestion.proposedData[fieldKey];

                        return (
                          <div
                            key={fieldKey}
                            className="grid grid-cols-3 px-4 py-2.5 items-center hover:bg-stone-50"
                          >
                            <div className="font-semibold text-stone-700 capitalize">
                              {fieldKey}
                            </div>
                            <div className="text-stone-500 font-mono text-[11px] truncate pr-2">
                              {currentVal !== undefined && currentVal !== null
                                ? String(currentVal)
                                : '—'}
                            </div>
                            <div className="text-amber-900 font-semibold font-mono text-[11px] bg-amber-50/70 p-1 rounded border border-amber-200 truncate">
                              {proposedVal !== undefined && proposedVal !== null
                                ? String(proposedVal)
                                : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : activeSuggestion.type === 'add_person' ? (
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs space-y-2">
                      <div className="font-semibold text-stone-800">
                        New Person Record Payload:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {Object.entries(activeSuggestion.proposedData || {}).map(([k, v]) => (
                          <div key={k} className="p-2 rounded bg-white border border-stone-200">
                            <span className="text-stone-500 capitalize">{k}: </span>
                            <span className="font-semibold text-stone-800 font-mono">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                      General note suggestion with no direct field changes.
                    </div>
                  )}
                </div>

                {/* Admin Note Input */}
                <div className="space-y-1.5 text-xs">
                  <label className="block font-semibold text-stone-700">
                    Admin Feedback / Note (visible to submitter):
                  </label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Verified with church census archive. Thank you!"
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-stone-400 text-xs italic">
                Select a suggestion from the list to view comparison.
              </div>
            )}

            {/* Admin Action Buttons */}
            {activeSuggestion && (
              <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                {activeSuggestion.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={handleReject}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold transition"
                    >
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Reject</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {onEditAndApprove && (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => onEditAndApprove(activeSuggestion)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit & Approve</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={processing}
                        onClick={handleApprove}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md transition"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Apply</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-stone-500 italic text-xs">
                    This suggestion was already {activeSuggestion.status}.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
