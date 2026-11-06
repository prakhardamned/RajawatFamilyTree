import { Person } from '../types';

/**
 * Generates a valid GEDCOM 5.5.1 text representation of the family tree.
 */
export function exportToGedcom(persons: Person[]): string {
  const lines: string[] = [];

  // Header
  lines.push('0 HEAD');
  lines.push('1 SOUR FamilyTree');
  lines.push('2 VERS 1.0.0');
  lines.push('1 DEST ANY');
  lines.push('1 DATE ' + new Date().toISOString().split('T')[0]);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  // Map to group families:
  // key: sorted pair of parent IDs "p1_p2" or single parent
  const familyMap = new Map<string, {
    famId: string;
    parent1Id?: string;
    parent2Id?: string;
    childrenIds: string[];
  }>();

  let famCounter = 1;

  // First, identify all marriages from spouseIds
  const processedCouples = new Set<string>();

  for (const person of persons) {
    if (person.spouseIds && person.spouseIds.length > 0) {
      for (const spouseId of person.spouseIds) {
        const pairKey = [person.id, spouseId].sort().join('__');
        if (!processedCouples.has(pairKey)) {
          processedCouples.add(pairKey);
          const famId = `F${famCounter++}`;
          // Identify genders for HUSB / WIFE if possible
          const spouse = persons.find((p) => p.id === spouseId);
          let husbandId = person.gender === 'male' ? person.id : spouse?.gender === 'male' ? spouseId : person.id;
          let wifeId = person.gender === 'female' ? person.id : spouse?.gender === 'female' ? spouseId : spouseId;
          
          if (husbandId === wifeId) {
            husbandId = person.id;
            wifeId = spouseId;
          }

          familyMap.set(pairKey, {
            famId,
            parent1Id: husbandId,
            parent2Id: wifeId,
            childrenIds: [],
          });
        }
      }
    }
  }

  // Link children to families
  for (const person of persons) {
    if (person.fatherId || person.motherId) {
      const fId = person.fatherId || '';
      const mId = person.motherId || '';
      let pairKey = '';
      if (fId && mId) {
        pairKey = [fId, mId].sort().join('__');
      } else {
        pairKey = fId ? `${fId}__single` : `${mId}__single`;
      }

      if (!familyMap.has(pairKey)) {
        const famId = `F${famCounter++}`;
        familyMap.set(pairKey, {
          famId,
          parent1Id: fId || undefined,
          parent2Id: mId || undefined,
          childrenIds: [],
        });
      }

      const fam = familyMap.get(pairKey);
      if (fam && !fam.childrenIds.includes(person.id)) {
        fam.childrenIds.push(person.id);
      }
    }
  }

  // Map person to their spouse family IDs (FAMS) and child family ID (FAMC)
  const personFams = new Map<string, string[]>();
  const personFamc = new Map<string, string>();

  for (const [, fam] of familyMap) {
    if (fam.parent1Id) {
      const list = personFams.get(fam.parent1Id) || [];
      list.push(fam.famId);
      personFams.set(fam.parent1Id, list);
    }
    if (fam.parent2Id) {
      const list = personFams.get(fam.parent2Id) || [];
      list.push(fam.famId);
      personFams.set(fam.parent2Id, list);
    }
    for (const childId of fam.childrenIds) {
      personFamc.set(childId, fam.famId);
    }
  }

  // Individuals (INDI)
  for (const person of persons) {
    const indiId = `I${person.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    lines.push(`0 @${indiId}@ INDI`);

    const firstName = person.firstName || '';
    const lastName = person.lastName ? `/${person.lastName}/` : '';
    lines.push(`1 NAME ${firstName} ${lastName}`.trim());
    if (firstName) lines.push(`2 GIVN ${firstName}`);
    if (person.lastName) lines.push(`2 SURN ${person.lastName}`);
    if (person.nickname) lines.push(`2 NICK ${person.nickname}`);

    const sex = person.gender === 'male' ? 'M' : person.gender === 'female' ? 'F' : 'U';
    lines.push(`1 SEX ${sex}`);

    // Birth
    const birthVal = person.isLiving
      ? (person.birthYear ? String(person.birthYear) : '')
      : (person.birthDate || (person.birthYear ? String(person.birthYear) : ''));
    
    if (birthVal || person.birthPlace) {
      lines.push('1 BIRT');
      if (birthVal) lines.push(`2 DATE ${birthVal}`);
      if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`);
    }

    // Death
    if (!person.isLiving) {
      lines.push('1 DEAT Y');
      if (person.deathDate) lines.push(`2 DATE ${person.deathDate}`);
    }

    if (person.occupation) {
      lines.push(`1 OCCU ${person.occupation}`);
    }

    if (person.notes) {
      // GEDCOM note continuation if long
      const sanitized = person.notes.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const noteLines = sanitized.split('\n');
      if (noteLines.length > 0) {
        lines.push(`1 NOTE ${noteLines[0]}`);
        for (let i = 1; i < noteLines.length; i++) {
          lines.push(`2 CONT ${noteLines[i]}`);
        }
      }
    }

    // FAMS
    const fams = personFams.get(person.id) || [];
    for (const fId of fams) {
      lines.push(`1 FAMS @${fId}@`);
    }

    // FAMC
    const famc = personFamc.get(person.id);
    if (famc) {
      lines.push(`1 FAMC @${famc}@`);
    }
  }

  // Families (FAM)
  for (const [, fam] of familyMap) {
    lines.push(`0 @${fam.famId}@ FAM`);
    if (fam.parent1Id) {
      lines.push(`1 HUSB @I${fam.parent1Id.replace(/[^a-zA-Z0-9]/g, '_')}@`);
    }
    if (fam.parent2Id) {
      lines.push(`1 WIFE @I${fam.parent2Id.replace(/[^a-zA-Z0-9]/g, '_')}@`);
    }
    for (const childId of fam.childrenIds) {
      lines.push(`1 CHIL @I${childId.replace(/[^a-zA-Z0-9]/g, '_')}@`);
    }
  }

  // Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
}
