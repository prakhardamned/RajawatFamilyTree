import React, { useEffect, useState } from 'react';
import { Person, PersonPrivate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTreeData } from '../../context/TreeDataContext';
import {
  X,
  Edit2,
  Trash2,
  UserPlus,
  Heart,
  Lock,
  MapPin,
  Briefcase,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface PersonDetailSidePanelProps {
  person: Person | null;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onAddRelative: (targetPerson: Person, relationType: 'father' | 'mother' | 'spouse' | 'child' | 'sibling') => void;
  onSuggestEdit: (person: Person) => void;
  onSuggestRelative: (targetPerson: Person) => void;
  onReportError: (person: Person) => void;
}

export const PersonDetailSidePanel: React.FC<PersonDetailSidePanelProps> = ({
  person,
  onClose,
  onEdit,
  onAddRelative,
  onSuggestEdit,
  onSuggestRelative,
  onReportError,
}) => {
  const { isAdmin, isApproved } = useAuth();
  const { persons, deletePerson, fetchPersonPrivate, setSelectedPersonId } = useTreeData();

  const [privateData, setPrivateData] = useState<PersonPrivate | null>(null);
  const [loadingPrivate, setLoadingPrivate] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch admin-only private notes if admin
  useEffect(() => {
    if (!person || !isAdmin) {
      setPrivateData(null);
      return;
    }

    let isMounted = true;
    setLoadingPrivate(true);
    fetchPersonPrivate(person.id)
      .then((data) => {
        if (isMounted) setPrivateData(data);
      })
      .finally(() => {
        if (isMounted) setLoadingPrivate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [person, isAdmin, fetchPersonPrivate]);

  if (!person) return null;

  // Resolve relatives
  const father = persons.find((p) => p.id === person.fatherId);
  const mother = persons.find((p) => p.id === person.motherId);
  const spouses = (person.spouseIds || [])
    .map((sId) => persons.find((p) => p.id === sId))
    .filter(Boolean) as Person[];
  const children = persons.filter(
    (p) => p.fatherId === person.id || p.motherId === person.id
  );
  const siblings = persons.filter(
    (p) =>
      p.id !== person.id &&
      ((person.fatherId && p.fatherId === person.fatherId) ||
        (person.motherId && p.motherId === person.motherId))
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePerson(person.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const initials = `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[420px] bg-white border-l border-stone-200 shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Family Record
          </span>
          {person.isLiving ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Living
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
              Deceased
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-stone-200/60 text-stone-500 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Profile Card */}
        <div className="flex items-start gap-4">
          {person.photoThumb ? (
            <img
              src={person.photoThumb}
              alt={person.firstName}
              className="w-18 h-18 rounded-2xl object-cover border-2 border-stone-200 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-18 h-18 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center font-serif font-bold text-xl text-amber-900 shrink-0">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold font-serif text-stone-900 truncate">
              {person.firstName} {person.lastName || ''}
            </h2>
            {person.nickname && (
              <p className="text-xs font-medium text-stone-500 italic">
                &ldquo;{person.nickname}&rdquo;
              </p>
            )}

            <div className="mt-1 flex items-center gap-2 text-xs text-stone-600">
              <span className="capitalize px-1.5 py-0.5 bg-stone-100 rounded text-stone-700 font-medium">
                {person.gender}
              </span>
              <span className="font-mono text-stone-800 font-semibold">
                {person.isLiving
                  ? person.birthYear ? `b. ${person.birthYear}` : 'Living'
                  : `${person.birthDate || person.birthYear || '?'} – ${person.deathDate || '?'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Vital Info */}
        <div className="bg-stone-50 rounded-xl p-3.5 space-y-2.5 text-xs text-stone-700 border border-stone-200/60">
          {person.birthPlace && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
              <span>Born in {person.birthPlace}</span>
            </div>
          )}
          {person.occupation && (
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-stone-400 shrink-0" />
              <span>{person.occupation}</span>
            </div>
          )}
          {person.notes && (
            <div className="flex items-start gap-2 pt-1 border-t border-stone-200/60">
              <FileText className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <p className="text-stone-600 leading-relaxed whitespace-pre-line">
                {person.notes}
              </p>
            </div>
          )}
        </div>

        {/* Private Data Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-semibold mb-2">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Confidential Admin Records (personPrivate)</span>
            </div>

            {loadingPrivate ? (
              <p className="text-stone-400 italic">Loading private records...</p>
            ) : privateData && Object.values(privateData).some(Boolean) ? (
              <div className="space-y-1.5 text-stone-700">
                {privateData.fullBirthDate && (
                  <div>
                    <span className="text-stone-500 font-medium">Full Birth Date: </span>
                    <span className="font-mono">{privateData.fullBirthDate}</span>
                  </div>
                )}
                {privateData.phone && (
                  <div>
                    <span className="text-stone-500 font-medium">Phone: </span>
                    <span>{privateData.phone}</span>
                  </div>
                )}
                {privateData.address && (
                  <div>
                    <span className="text-stone-500 font-medium">Address: </span>
                    <span>{privateData.address}</span>
                  </div>
                )}
                {privateData.privateNotes && (
                  <div className="pt-1 border-t border-amber-200/60 mt-1">
                    <span className="text-stone-500 font-medium">Admin Notes: </span>
                    <p className="whitespace-pre-line text-stone-800">{privateData.privateNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-stone-500 italic text-[11px]">
                No private contact or address recorded. Click &ldquo;Edit Details&rdquo; to add sensitive fields.
              </p>
            )}
          </div>
        )}

        {/* Relatives Quick Map */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Immediate Family
          </h4>

          {/* Parents */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-stone-400">Parents</div>
            <div className="flex flex-wrap gap-1.5">
              {father && (
                <button
                  type="button"
                  onClick={() => setSelectedPersonId(father.id)}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-medium transition"
                >
                  Father: {father.firstName} {father.lastName || ''}
                </button>
              )}
              {mother && (
                <button
                  type="button"
                  onClick={() => setSelectedPersonId(mother.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-medium transition"
                >
                  Mother: {mother.firstName} {mother.lastName || ''}
                </button>
              )}
              {!father && !mother && (
                <span className="text-xs text-stone-400 italic">No parents recorded</span>
              )}
            </div>
          </div>

          {/* Spouses */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-stone-400">Spouse(s)</div>
            <div className="flex flex-wrap gap-1.5">
              {spouses.length > 0 ? (
                spouses.map((spouse) => (
                  <button
                    key={spouse.id}
                    type="button"
                    onClick={() => setSelectedPersonId(spouse.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium flex items-center gap-1 transition"
                  >
                    <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                    <span>
                      {spouse.firstName} {spouse.lastName || ''}
                    </span>
                  </button>
                ))
              ) : (
                <span className="text-xs text-stone-400 italic">No spouses recorded</span>
              )}
            </div>
          </div>

          {/* Children */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-stone-400">Children ({children.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {children.length > 0 ? (
                children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedPersonId(child.id)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition"
                  >
                    {child.firstName} {child.lastName || ''}
                  </button>
                ))
              ) : (
                <span className="text-xs text-stone-400 italic">No children recorded</span>
              )}
            </div>
          </div>

          {/* Siblings */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-stone-400">Siblings ({siblings.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {siblings.length > 0 ? (
                siblings.map((sib) => (
                  <button
                    key={sib.id}
                    type="button"
                    onClick={() => setSelectedPersonId(sib.id)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition"
                  >
                    {sib.firstName} {sib.lastName || ''}
                  </button>
                ))
              ) : (
                <span className="text-xs text-stone-400 italic">No siblings found</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Add Relative (Admin Only) */}
        {isAdmin && (
          <div className="pt-2 border-t border-stone-200/80">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Immediate Relative</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {!father && (
                <button
                  type="button"
                  onClick={() => onAddRelative(person, 'father')}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 font-medium text-stone-700 text-left transition"
                >
                  + Add Father
                </button>
              )}
              {!mother && (
                <button
                  type="button"
                  onClick={() => onAddRelative(person, 'mother')}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 font-medium text-stone-700 text-left transition"
                >
                  + Add Mother
                </button>
              )}
              <button
                type="button"
                onClick={() => onAddRelative(person, 'spouse')}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 font-medium text-stone-700 text-left transition"
              >
                + Add Spouse
              </button>
              <button
                type="button"
                onClick={() => onAddRelative(person, 'child')}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 font-medium text-stone-700 text-left transition"
              >
                + Add Child
              </button>
              <button
                type="button"
                onClick={() => onAddRelative(person, 'sibling')}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 font-medium text-stone-700 text-left transition col-span-2"
              >
                + Add Sibling
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-stone-200 bg-stone-50/80">
        {isAdmin ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(person)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Person</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl transition"
                title="Delete Person"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                <p className="font-semibold text-rose-900">
                  Delete {person.firstName} {person.lastName || ''}?
                </p>
                <p className="text-rose-700 text-[11px] leading-tight">
                  This will remove this record and automatically clean up links in parents, children, and spouses via batched writes.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 text-stone-600 hover:bg-white rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isApproved ? (
          /* Member Actions */
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-stone-500 mb-1">
              Have info or updates about {person.firstName}?
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSuggestEdit(person)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Suggest Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onSuggestRelative(person)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Suggest Relative</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onReportError(person)}
              className="w-full text-center text-[11px] text-stone-500 hover:text-stone-700 hover:underline pt-1"
            >
              Report an error with this record
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
