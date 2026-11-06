import React, { useState, useEffect } from 'react';
import { Person, PersonPrivate, RelativeLinkRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTreeData } from '../../context/TreeDataContext';
import { compressPhoto } from '../../utils/imageCompressor';
import { validatePersonRecord, validateProposedData } from '../../utils/schemaValidator';
import { X, Upload, Sparkles, AlertCircle, Lock, Heart } from 'lucide-react';

export type FormMode =
  | 'create'
  | 'edit'
  | 'suggest_edit'
  | 'suggest_relative'
  | 'report_error';

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: FormMode;
  initialPerson?: Person | null;
  relativeLink?: RelativeLinkRequest | null;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialPerson,
  relativeLink,
}) => {
  const { isAdmin } = useAuth();
  const {
    persons,
    createPerson,
    updatePerson,
    submitSuggestion,
    fetchPersonPrivate,
  } = useTreeData();

  // Basic Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [isLiving, setIsLiving] = useState(true);
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [notes, setNotes] = useState('');
  const [photoThumb, setPhotoThumb] = useState<string | undefined>(undefined);

  // Relationships
  const [fatherId, setFatherId] = useState<string>('');
  const [motherId, setMotherId] = useState<string>('');
  const [selectedSpouseIds, setSelectedSpouseIds] = useState<string[]>([]);

  // Private Admin Fields (personPrivate)
  const [fullBirthDate, setFullBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  // Suggestion specific
  const [suggestionMessage, setSuggestionMessage] = useState('');

  // UI state
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate form on open
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (mode === 'edit' || mode === 'suggest_edit') {
      if (initialPerson) {
        setFirstName(initialPerson.firstName || '');
        setLastName(initialPerson.lastName || '');
        setNickname(initialPerson.nickname || '');
        setGender(initialPerson.gender || 'male');
        setIsLiving(initialPerson.isLiving ?? true);
        setBirthYear(initialPerson.birthYear ? String(initialPerson.birthYear) : '');
        setBirthDate(initialPerson.birthDate || '');
        setDeathDate(initialPerson.deathDate || '');
        setBirthPlace(initialPerson.birthPlace || '');
        setOccupation(initialPerson.occupation || '');
        setNotes(initialPerson.notes || '');
        setPhotoThumb(initialPerson.photoThumb);
        setFatherId(initialPerson.fatherId || '');
        setMotherId(initialPerson.motherId || '');
        setSelectedSpouseIds(initialPerson.spouseIds || []);

        if (isAdmin && mode === 'edit') {
          fetchPersonPrivate(initialPerson.id).then((priv) => {
            if (priv) {
              setFullBirthDate(priv.fullBirthDate || '');
              setPhone(priv.phone || '');
              setAddress(priv.address || '');
              setPrivateNotes(priv.privateNotes || '');
            }
          });
        }
      }
    } else if (relativeLink) {
      // Auto-prefill relative relations
      setFirstName('');
      setLastName(relativeLink.targetPerson.lastName || '');
      setNickname('');
      setBirthYear('');
      setBirthDate('');
      setDeathDate('');
      setBirthPlace(relativeLink.targetPerson.birthPlace || '');
      setOccupation('');
      setNotes('');
      setPhotoThumb(undefined);
      setFullBirthDate('');
      setPhone('');
      setAddress('');
      setPrivateNotes('');

      if (relativeLink.relationType === 'father') {
        setGender('male');
        setIsLiving(false);
      } else if (relativeLink.relationType === 'mother') {
        setGender('female');
        setIsLiving(false);
      } else if (relativeLink.relationType === 'spouse') {
        setGender(relativeLink.targetPerson.gender === 'male' ? 'female' : 'male');
        setIsLiving(relativeLink.targetPerson.isLiving);
        setSelectedSpouseIds([relativeLink.targetPerson.id]);
      } else if (relativeLink.relationType === 'child') {
        setGender('male');
        setIsLiving(true);
        if (relativeLink.targetPerson.gender === 'male') {
          setFatherId(relativeLink.targetPerson.id);
          // if target has spouse, set as mother
          if (relativeLink.targetPerson.spouseIds?.[0]) {
            setMotherId(relativeLink.targetPerson.spouseIds[0]);
          }
        } else {
          setMotherId(relativeLink.targetPerson.id);
          if (relativeLink.targetPerson.spouseIds?.[0]) {
            setFatherId(relativeLink.targetPerson.spouseIds[0]);
          }
        }
      } else if (relativeLink.relationType === 'sibling') {
        setGender('male');
        setIsLiving(true);
        if (relativeLink.targetPerson.fatherId) setFatherId(relativeLink.targetPerson.fatherId);
        if (relativeLink.targetPerson.motherId) setMotherId(relativeLink.targetPerson.motherId);
      }
    } else {
      // Reset defaults for clean create
      setFirstName('');
      setLastName('');
      setNickname('');
      setGender('male');
      setIsLiving(true);
      setBirthYear('');
      setBirthDate('');
      setDeathDate('');
      setBirthPlace('');
      setOccupation('');
      setNotes('');
      setPhotoThumb(undefined);
      setFatherId('');
      setMotherId('');
      setSelectedSpouseIds([]);
      setFullBirthDate('');
      setPhone('');
      setAddress('');
      setPrivateNotes('');
      setSuggestionMessage('');
    }
  }, [isOpen, mode, initialPerson, relativeLink, isAdmin, fetchPersonPrivate]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    setErrorMessage(null);
    try {
      const compressedBase64 = await compressPhoto(file);
      setPhotoThumb(compressedBase64);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compress photo.');
    } finally {
      setCompressing(false);
    }
  };

  const handleToggleSpouse = (sId: string) => {
    setSelectedSpouseIds((prev) => {
      if (prev.includes(sId)) {
        return prev.filter((id) => id !== sId);
      }
      if (prev.length >= 10) {
        alert('Maximum 10 spouses allowed.');
        return prev;
      }
      return [...prev, sId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const trimmedBirthYear = birthYear.trim();
      const parsedBirthYear = trimmedBirthYear !== '' ? parseInt(trimmedBirthYear, 10) : null;
      if (parsedBirthYear !== null && (isNaN(parsedBirthYear) || parsedBirthYear < 1000 || parsedBirthYear > 2100)) {
        setErrorMessage('If provided, birth year must be an integer between 1000 and 2100.');
        setSubmitting(false);
        return;
      }

      // Construct person record payload (empty strings and undefined -> null)
      const personPayload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        nickname: nickname.trim() || null,
        gender,
        isLiving,
        birthYear: parsedBirthYear !== null ? parsedBirthYear : null,
        // Privacy rule: if isLiving == true, do NOT store birthDate here
        birthDate: isLiving ? null : (birthDate.trim() || null),
        deathDate: isLiving ? null : (deathDate.trim() || null),
        birthPlace: birthPlace.trim() || null,
        occupation: occupation.trim() || null,
        notes: notes.trim() || null,
        photoThumb: photoThumb || null,
        fatherId: fatherId || null,
        motherId: motherId || null,
        spouseIds: selectedSpouseIds.length > 0 ? selectedSpouseIds : [],
      };

      // Construct private record payload (admin only)
      // Only write personPrivate document if at least one private field has a value
      const hasPrivateValues = Boolean(
        fullBirthDate.trim() || phone.trim() || address.trim() || privateNotes.trim()
      );
      const privatePayload: PersonPrivate | undefined = (isAdmin && hasPrivateValues)
        ? {
            fullBirthDate: fullBirthDate.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
            privateNotes: privateNotes.trim() || null,
          }
        : undefined;

      // Validate matching rules
      const val = validatePersonRecord(personPayload);
      if (!val.valid) {
        setErrorMessage(val.errors.join(' '));
        setSubmitting(false);
        return;
      }

      if (mode === 'create') {
        const newPersonId = await createPerson(personPayload, privatePayload);

        // If auto-linking a relative backwards (e.g. adding father to targetPerson)
        if (relativeLink) {
          if (relativeLink.relationType === 'father') {
            await updatePerson(relativeLink.targetPerson.id, { fatherId: newPersonId });
          } else if (relativeLink.relationType === 'mother') {
            await updatePerson(relativeLink.targetPerson.id, { motherId: newPersonId });
          } else if (relativeLink.relationType === 'spouse') {
            const currentSpouses = relativeLink.targetPerson.spouseIds || [];
            if (!currentSpouses.includes(newPersonId)) {
              await updatePerson(relativeLink.targetPerson.id, {
                spouseIds: [...currentSpouses, newPersonId],
              });
            }
          }
        }
        onClose();
      } else if (mode === 'edit' && initialPerson) {
        await updatePerson(initialPerson.id, personPayload, privatePayload);

        // Also ensure bi-directional spouse links
        for (const sId of selectedSpouseIds) {
          const spouseObj = persons.find((p) => p.id === sId);
          if (spouseObj && (!spouseObj.spouseIds || !spouseObj.spouseIds.includes(initialPerson.id))) {
            const updated = [...(spouseObj.spouseIds || []), initialPerson.id];
            await updatePerson(sId, { spouseIds: updated });
          }
        }
        onClose();
      } else if (mode === 'suggest_edit' && initialPerson) {
        // Calculate diff: save ONLY changed fields in proposedData
        const proposedData: Record<string, any> = {};
        for (const [key, val] of Object.entries(personPayload)) {
          if (val !== undefined && (initialPerson as any)[key] !== val) {
            proposedData[key] = val;
          }
        }

        if (Object.keys(proposedData).length === 0 && !suggestionMessage.trim()) {
          setErrorMessage('No changes were made to suggest.');
          setSubmitting(false);
          return;
        }

        const res = await submitSuggestion(
          'edit_person',
          initialPerson.id,
          proposedData,
          suggestionMessage.trim() || 'Suggested revisions to family member record.'
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit suggestion.');
          setSubmitting(false);
          return;
        }

        alert('Your suggestion has been submitted for admin approval!');
        onClose();
      } else if (mode === 'suggest_relative') {
        const proposedData: Record<string, any> = {
          ...personPayload,
          relationship: relativeLink?.relationType || 'relative',
          relatedPersonId: relativeLink?.targetPerson.id || initialPerson?.id,
        };

        const res = await submitSuggestion(
          'add_person',
          relativeLink?.targetPerson.id || initialPerson?.id || null,
          proposedData,
          suggestionMessage.trim() || `Proposed new relative for ${relativeLink?.targetPerson.firstName || initialPerson?.firstName}`
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit suggestion.');
          setSubmitting(false);
          return;
        }

        alert('Your proposed relative has been submitted for admin review!');
        onClose();
      } else if (mode === 'report_error') {
        const res = await submitSuggestion(
          'general_note',
          initialPerson?.id || null,
          {},
          suggestionMessage.trim() || 'Reported discrepancy in family record.'
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit report.');
          setSubmitting(false);
          return;
        }

        alert('Thank you! Your error report was sent to the family admin.');
        onClose();
      }
    } catch (err: any) {
      console.error('Form submit error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const titleText =
    mode === 'create'
      ? relativeLink
        ? `Add ${relativeLink.relationType} for ${relativeLink.targetPerson.firstName}`
        : 'Add New Family Member'
      : mode === 'edit'
        ? `Edit ${initialPerson?.firstName} ${initialPerson?.lastName || ''}`
        : mode === 'suggest_edit'
          ? `Suggest Edits for ${initialPerson?.firstName}`
          : mode === 'suggest_relative'
            ? `Suggest Relative for ${relativeLink?.targetPerson.firstName || initialPerson?.firstName}`
            : `Report Error for ${initialPerson?.firstName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {titleText}
            </h3>
            <p className="text-xs text-stone-500">
              {mode.startsWith('suggest')
                ? 'Your submission will be queued in the admin review inbox.'
                : 'Manage family record details and relationships.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 mx-5 mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {mode === 'report_error' ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-800">
                Please describe the issue or incorrect information:
              </label>
              <textarea
                rows={5}
                required
                maxLength={2000}
                value={suggestionMessage}
                onChange={(e) => setSuggestionMessage(e.target.value)}
                placeholder="e.g. Great Uncle Arthur's birth year is listed as 1934, but his military service record lists 1932..."
                className="w-full rounded-xl border border-stone-300 p-3 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-stone-400 text-right">
                {suggestionMessage.length} / 2000 characters
              </p>
            </div>
          ) : (
            <>
              {/* Photo & Names Grid */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Photo Upload Thumbnail */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center overflow-hidden group">
                    {photoThumb ? (
                      <img
                        src={photoThumb}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <Upload className="w-5 h-5 text-stone-400 mx-auto mb-1" />
                        <span className="text-[10px] text-stone-500 font-medium">
                          {compressing ? 'Compressing...' : 'Add Photo'}
                        </span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-stone-900/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px] font-semibold">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={compressing}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {photoThumb && (
                    <button
                      type="button"
                      onClick={() => setPhotoThumb(undefined)}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Name Inputs */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Margaret"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Last / Family Name
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Pendelton"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Nickname / Preferred Name
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Peggy"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white text-stone-900"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Living Status & Dates */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">Vital Status</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLiving}
                      onChange={(e) => setIsLiving(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    <span className="ml-2.5 font-semibold text-stone-800">
                      {isLiving ? 'Living Person' : 'Deceased'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Birth Year <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={2100}
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="YYYY (Optional)"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                    />
                  </div>

                  {!isLiving ? (
                    <>
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          Exact Birth Date (Deceased)
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          Death Date (Deceased)
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={deathDate}
                          onChange={(e) => setDeathDate(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex items-center p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <p className="text-[11px] leading-relaxed">
                        🛡️ <strong>Privacy Protection</strong>: Per security rules, exact birth dates for living members are never stored publicly. Only birth year is visible.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Biography & Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Birth Place
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="e.g. Boston, MA"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Occupation / Career
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Master Carpenter & Architect"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Public Family Notes & Stories
                </label>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Memories, stories, military service, cherished traditions..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                />
              </div>

              {/* Relationships Linkage */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-3">
                <span className="font-semibold text-stone-800 block">
                  Family Relationships
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      Father
                    </label>
                    <select
                      value={fatherId}
                      onChange={(e) => setFatherId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white text-stone-900"
                    >
                      <option value="">(None / Unknown)</option>
                      {persons
                        .filter((p) => p.id !== initialPerson?.id && p.gender === 'male')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.firstName} {p.lastName || ''} {p.birthYear ? `(${p.birthYear})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      Mother
                    </label>
                    <select
                      value={motherId}
                      onChange={(e) => setMotherId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white text-stone-900"
                    >
                      <option value="">(None / Unknown)</option>
                      {persons
                        .filter((p) => p.id !== initialPerson?.id && p.gender === 'female')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.firstName} {p.lastName || ''} {p.birthYear ? `(${p.birthYear})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Spouses Multi-select */}
                <div className="pt-2">
                  <label className="block font-medium text-stone-600 mb-1.5 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Spouses / Partners (supports remarriages):</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {persons
                      .filter((p) => p.id !== initialPerson?.id)
                      .map((p) => {
                        const isSelected = selectedSpouseIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleSpouse(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                              isSelected
                                ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold'
                                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {p.firstName} {p.lastName || ''}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Private Living Person Fields (ADMIN ONLY) */}
              {isAdmin && mode !== 'suggest_edit' && mode !== 'suggest_relative' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>Confidential Living Person Data (Admin Only: personPrivate)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Strictly stored in the isolated `personPrivate` collection. Never readable by general members.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">
                        Full Birth Date (Private)
                      </label>
                      <input
                        type="date"
                        value={fullBirthDate}
                        onChange={(e) => setFullBirthDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">
                        Phone Number (Private)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-stone-700 mb-1">
                        Residential Address (Private)
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, City, State/Province, Postal Code"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-stone-700 mb-1">
                        Confidential Admin Notes (Private)
                      </label>
                      <textarea
                        rows={2}
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Private contact or estate notes only visible to administrators..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestion Note field for Members */}
              {(mode === 'suggest_edit' || mode === 'suggest_relative') && (
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Message to Admin explaining this suggestion (optional, max 2000 chars):
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={suggestionMessage}
                    onChange={(e) => setSuggestionMessage(e.target.value)}
                    placeholder="e.g. Found Aunt Sarah's updated occupation certificate..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900"
                  />
                </div>
              )}
            </>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || compressing}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md transition disabled:opacity-50"
            >
              {submitting
                ? 'Saving...'
                : mode.startsWith('suggest') || mode === 'report_error'
                  ? 'Submit for Review'
                  : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
