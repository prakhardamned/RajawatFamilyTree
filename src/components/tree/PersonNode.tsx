import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Person } from '../../types';
import { Heart, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface PersonNodeProps {
  data: {
    person: Person;
    isSelected: boolean;
    isRoot: boolean;
    hasChildren: boolean;
    isCollapsed: boolean;
    onToggleCollapse?: (personId: string) => void;
    onSelect: (person: Person) => void;
  };
}

export const PersonNode = memo(({ data }: PersonNodeProps) => {
  const { person, isSelected, isRoot, hasChildren, isCollapsed, onToggleCollapse, onSelect } = data;

  const initials = `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase() || '?';

  // Format years
  const birthStr = person.isLiving
    ? (person.birthYear ? `b. ${person.birthYear}` : 'Living')
    : person.birthDate
      ? person.birthDate.substring(0, 4)
      : person.birthYear
        ? String(person.birthYear)
        : '?';

  const deathStr = !person.isLiving
    ? (person.deathDate ? person.deathDate.substring(0, 4) : '?')
    : '';

  const dateDisplay = person.isLiving
    ? (person.birthYear ? `b. ${person.birthYear}` : 'Living')
    : (birthStr === '?' && deathStr === '?' ? 'Deceased' : `${birthStr} – ${deathStr}`);

  // Gender colors
  const genderBorder =
    person.gender === 'male'
      ? 'border-sky-300 hover:border-sky-500'
      : person.gender === 'female'
        ? 'border-rose-300 hover:border-rose-500'
        : 'border-emerald-300 hover:border-emerald-500';

  const genderBg =
    person.gender === 'male'
      ? 'bg-sky-50 text-sky-800'
      : person.gender === 'female'
        ? 'bg-rose-50 text-rose-800'
        : 'bg-emerald-50 text-emerald-800';

  return (
    <div
      onClick={() => onSelect(person)}
      className={`relative w-64 rounded-xl border-2 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md bg-white select-none ${genderBorder} ${
        isSelected ? 'ring-4 ring-amber-400/70 border-amber-500 shadow-lg scale-102' : ''
      } ${isRoot ? 'ring-2 ring-stone-800' : ''}`}
    >
      {/* Target handle on top for receiving parent lineage */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-stone-400 !border-2 !border-white"
      />

      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar Thumbnail or Initials */}
          <div className="relative shrink-0">
            {person.photoThumb ? (
              <img
                src={person.photoThumb}
                alt={person.firstName}
                className="w-12 h-12 rounded-full object-cover border border-stone-200 shadow-inner"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-serif font-bold text-sm border border-stone-200 ${genderBg}`}
              >
                {initials}
              </div>
            )}

            {/* Living status indicator dot */}
            <span
              title={person.isLiving ? 'Living' : 'Deceased'}
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                person.isLiving ? 'bg-emerald-500 ring-1 ring-emerald-200' : 'bg-stone-400'
              }`}
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-stone-900 text-sm truncate tracking-tight">
                {person.firstName} {person.lastName || ''}
              </h3>
              {isRoot && (
                <span
                  title="Root of current view"
                  className="shrink-0 px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider bg-stone-800 text-white rounded"
                >
                  Root
                </span>
              )}
            </div>

            {person.nickname && (
              <p className="text-xs text-stone-500 italic truncate">
                &ldquo;{person.nickname}&rdquo;
              </p>
            )}

            <div className="mt-1 flex items-center justify-between text-xs text-stone-600">
              <span className="font-mono text-[11px] font-medium text-stone-700">
                {dateDisplay}
              </span>
              {person.occupation && (
                <span className="truncate max-w-[100px] text-[10px] text-stone-400 text-right ml-1">
                  {person.occupation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar if has multiple spouses or collapse toggle */}
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-1 text-[11px]">
            {person.spouseIds && person.spouseIds.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-stone-500">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-300" />
                <span>{person.spouseIds.length}</span>
              </span>
            )}
            {person.birthPlace && (
              <span className="truncate max-w-[120px] text-[10px] text-stone-400 ml-1">
                📍 {person.birthPlace}
              </span>
            )}
          </div>

          {hasChildren && onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(person.id);
              }}
              title={isCollapsed ? 'Expand branches' : 'Collapse branches'}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
            >
              {isCollapsed ? (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Expand</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Source handle on bottom for connecting to children or family union */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-stone-400 !border-2 !border-white"
      />
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
