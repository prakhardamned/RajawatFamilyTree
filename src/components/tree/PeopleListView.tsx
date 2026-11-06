import React, { useState } from 'react';
import { Person } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Edit2, Eye, User, Heart, Search, Users } from 'lucide-react';

interface PeopleListViewProps {
  persons: Person[];
  onSelectPerson: (person: Person) => void;
  onEditPerson: (person: Person) => void;
}

export const PeopleListView: React.FC<PeopleListViewProps> = ({
  persons,
  onSelectPerson,
  onEditPerson,
}) => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');

  const personMap = new Map<string, Person>();
  persons.forEach((p) => personMap.set(p.id, p));

  const filteredPersons = persons.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const full = `${p.firstName} ${p.lastName || ''} ${p.nickname || ''} ${p.occupation || ''} ${p.birthPlace || ''}`.toLowerCase();
    return full.includes(q);
  });

  return (
    <div className="w-full h-full bg-stone-50 overflow-y-auto p-4 sm:p-6 text-xs">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Search & Counter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-700" />
              <span>Family Directory ({persons.length} relatives)</span>
            </h2>
            <p className="text-stone-500 text-xs mt-0.5">
              Complete list of family records, parentage relationships, and lineage links.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, place..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Directory Table / Cards */}
        {filteredPersons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            {persons.length === 0
              ? 'No persons loaded in the family tree. Add your first relative using the "+ Add Person" button above.'
              : 'No family members matched your search.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-stone-200">
                <thead className="bg-stone-100/70 text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Relative</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Birth Year</th>
                    <th className="py-3 px-4">Father</th>
                    <th className="py-3 px-4">Mother</th>
                    <th className="py-3 px-4">Spouse(s)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredPersons.map((person) => {
                    const father = person.fatherId ? personMap.get(person.fatherId) : null;
                    const mother = person.motherId ? personMap.get(person.motherId) : null;
                    const spouses = (person.spouseIds || [])
                      .map((sId) => personMap.get(sId))
                      .filter(Boolean) as Person[];

                    const initials = `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase() || '?';

                    return (
                      <tr key={person.id} className="hover:bg-amber-50/40 transition">
                        {/* Name & Photo */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {person.photoThumb ? (
                              <img
                                src={person.photoThumb}
                                alt={person.firstName}
                                className="w-9 h-9 rounded-full object-cover border border-stone-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-serif font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onSelectPerson(person)}
                                className="font-semibold text-stone-900 hover:text-amber-700 hover:underline text-left text-sm truncate block"
                              >
                                {person.firstName} {person.lastName || ''}
                              </button>
                              {person.nickname && (
                                <span className="text-stone-400 italic text-[11px]">
                                  &ldquo;{person.nickname}&rdquo;
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Gender */}
                        <td className="py-3 px-4 capitalize text-stone-600">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              person.gender === 'male'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : person.gender === 'female'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {person.gender}
                          </span>
                        </td>

                        {/* Birth Year */}
                        <td className="py-3 px-4 font-mono text-stone-700">
                          {person.isLiving ? (
                            <span>
                              {person.birthYear ? `b. ${person.birthYear}` : 'Living'}
                              <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-emerald-500" title="Living" />
                            </span>
                          ) : (
                            <span>
                              {person.birthYear || (person.birthDate ? person.birthDate.substring(0, 4) : '—')}
                              {person.deathDate && ` – ${person.deathDate.substring(0, 4)}`}
                            </span>
                          )}
                        </td>

                        {/* Father */}
                        <td className="py-3 px-4">
                          {father ? (
                            <button
                              type="button"
                              onClick={() => onSelectPerson(father)}
                              className="text-sky-700 font-medium hover:underline text-left"
                            >
                              {father.firstName} {father.lastName || ''}
                            </button>
                          ) : (
                            <span className="text-stone-400 italic">—</span>
                          )}
                        </td>

                        {/* Mother */}
                        <td className="py-3 px-4">
                          {mother ? (
                            <button
                              type="button"
                              onClick={() => onSelectPerson(mother)}
                              className="text-rose-700 font-medium hover:underline text-left"
                            >
                              {mother.firstName} {mother.lastName || ''}
                            </button>
                          ) : (
                            <span className="text-stone-400 italic">—</span>
                          )}
                        </td>

                        {/* Spouses */}
                        <td className="py-3 px-4">
                          {spouses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {spouses.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => onSelectPerson(s)}
                                  className="text-amber-800 font-medium hover:underline flex items-center gap-1"
                                >
                                  <span>💍 {s.firstName} {s.lastName || ''}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectPerson(person)}
                            className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 font-medium text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onEditPerson(person)}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] shadow-xs transition inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
