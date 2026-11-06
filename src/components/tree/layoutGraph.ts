import { Node, Edge } from '@xyflow/react';
import { Person, TreeViewMode } from '../../types';

export const PERSON_NODE_WIDTH = 260;
export const PERSON_NODE_HEIGHT = 110;
export const UNION_NODE_SIZE = 28;
export const SPOUSE_GAP = 50;
export const SIBLING_GAP = 70;
export const FAMILY_GAP = 90;
export const GENERATION_HEIGHT = 240;
export const MARGIN_X = 60;
export const MARGIN_Y = 60;

/**
 * Filter persons based on the root person and view mode (all, ancestors, descendants)
 */
export function getFilteredPersons(
  allPersons: Person[],
  rootPersonId: string | null,
  viewMode: TreeViewMode
): Person[] {
  if (!rootPersonId || viewMode === 'all') {
    return allPersons;
  }

  const personMap = new Map<string, Person>();
  allPersons.forEach((p) => personMap.set(p.id, p));

  const root = personMap.get(rootPersonId);
  if (!root) return allPersons;

  const resultIds = new Set<string>();

  if (viewMode === 'ancestors') {
    // Traverse upwards: father, mother recursively
    const queue: string[] = [rootPersonId];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      if (resultIds.has(currId)) continue;
      resultIds.add(currId);

      const p = personMap.get(currId);
      if (p) {
        if (p.fatherId && personMap.has(p.fatherId)) queue.push(p.fatherId);
        if (p.motherId && personMap.has(p.motherId)) queue.push(p.motherId);
        if (p.spouseIds) {
          p.spouseIds.forEach((sId) => {
            if (personMap.has(sId)) resultIds.add(sId);
          });
        }
      }
    }
  } else if (viewMode === 'descendants') {
    // Traverse downwards: children recursively
    const queue: string[] = [rootPersonId];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      if (resultIds.has(currId)) continue;
      resultIds.add(currId);

      const p = personMap.get(currId);
      if (p && p.spouseIds) {
        p.spouseIds.forEach((sId) => {
          if (personMap.has(sId)) resultIds.add(sId);
        });
      }

      const children = allPersons.filter(
        (child) => child.fatherId === currId || child.motherId === currId
      );
      children.forEach((child) => queue.push(child.id));
    }
  }

  return allPersons.filter((p) => resultIds.has(p.id));
}

/**
 * Filter out descendants of collapsed nodes
 */
function getVisiblePersons(allPersons: Person[], collapsedPersonIds: Set<string>): Person[] {
  if (collapsedPersonIds.size === 0) return allPersons;
  const personMap = new Map<string, Person>();
  allPersons.forEach((p) => personMap.set(p.id, p));

  const hiddenIds = new Set<string>();
  collapsedPersonIds.forEach((collapsedId) => {
    const queue: string[] = [];
    allPersons.forEach((c) => {
      if (c.fatherId === collapsedId || c.motherId === collapsedId) {
        queue.push(c.id);
      }
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (!hiddenIds.has(curr)) {
        hiddenIds.add(curr);
        const pCurr = personMap.get(curr);
        if (pCurr && pCurr.spouseIds) {
          pCurr.spouseIds.forEach((sId) => {
            const spouse = personMap.get(sId);
            if (spouse && !spouse.fatherId && !spouse.motherId) {
              hiddenIds.add(sId);
            }
          });
        }
        allPersons.forEach((c) => {
          if (c.fatherId === curr || c.motherId === curr) {
            queue.push(c.id);
          }
        });
      }
    }
  });

  return allPersons.filter((p) => !hiddenIds.has(p.id));
}

/**
 * 1. Compute each person's generation from their parents.
 *    For anyone with no parents but with spouses, give them the same generation as their spouse.
 *    Spouses with no parents must never be ranked at the top unless their spouse is also at the top.
 */
export function computeGenerations(persons: Person[]): Map<string, number> {
  const personMap = new Map<string, Person>();
  persons.forEach((p) => personMap.set(p.id, p));

  const hasParent = (p: Person) =>
    Boolean((p.fatherId && personMap.has(p.fatherId)) || (p.motherId && personMap.has(p.motherId)));

  // Bidirectional spouse map
  const spouseMap = new Map<string, Set<string>>();
  persons.forEach((p) => spouseMap.set(p.id, new Set()));

  persons.forEach((p) => {
    if (p.spouseIds && Array.isArray(p.spouseIds)) {
      p.spouseIds.forEach((sId) => {
        if (personMap.has(sId) && sId !== p.id) {
          spouseMap.get(p.id)!.add(sId);
          spouseMap.get(sId)!.add(p.id);
        }
      });
    }
    // Also consider co-parents of any child in persons as spouses
    if (p.fatherId && p.motherId && personMap.has(p.fatherId) && personMap.has(p.motherId)) {
      spouseMap.get(p.fatherId)!.add(p.motherId);
      spouseMap.get(p.motherId)!.add(p.fatherId);
    }
  });

  const generations = new Map<string, number>();
  persons.forEach((p) => generations.set(p.id, 0));

  let changed = true;
  let iter = 0;
  while (changed && iter < 100) {
    changed = false;
    iter++;

    // Step A: Propagate generation downwards from parents to children
    for (const p of persons) {
      let maxParentGen = -1;
      if (p.fatherId && personMap.has(p.fatherId)) {
        maxParentGen = Math.max(maxParentGen, generations.get(p.fatherId)!);
      }
      if (p.motherId && personMap.has(p.motherId)) {
        maxParentGen = Math.max(maxParentGen, generations.get(p.motherId)!);
      }
      if (maxParentGen >= 0) {
        const nextGen = maxParentGen + 1;
        if (generations.get(p.id)! < nextGen) {
          generations.set(p.id, nextGen);
          changed = true;
        }
      }
    }

    // Step B: For anyone with no parents but with spouses, give them the same generation as their spouse
    for (const p of persons) {
      if (!hasParent(p)) {
        const spouses = spouseMap.get(p.id);
        if (spouses && spouses.size > 0) {
          let maxSpouseGen = generations.get(p.id)!;
          for (const sId of spouses) {
            const sGen = generations.get(sId)!;
            if (sGen > maxSpouseGen) {
              maxSpouseGen = sGen;
            }
          }
          if (maxSpouseGen > generations.get(p.id)!) {
            generations.set(p.id, maxSpouseGen);
            changed = true;
          }
        }
      }
    }
  }

  // Final assurance: any person with no parents matches their spouse's generation
  for (const p of persons) {
    if (!hasParent(p)) {
      const spouses = spouseMap.get(p.id);
      if (spouses && spouses.size > 0) {
        for (const sId of spouses) {
          const sGen = generations.get(sId)!;
          if (generations.get(p.id)! < sGen) {
            generations.set(p.id, sGen);
          }
        }
      }
    }
  }

  return generations;
}

/**
 * Builds family graph with couple lines, family union nodes, and clean generation layout.
 */
export function buildFamilyGraph(
  allPersons: Person[],
  selectedPersonId: string | null,
  rootPersonId: string | null,
  collapsedPersonIds: Set<string>,
  onToggleCollapse: (personId: string) => void,
  onSelectPerson: (person: Person) => void
): { nodes: Node[]; edges: Edge[] } {
  const persons = getVisiblePersons(allPersons, collapsedPersonIds);

  if (!persons || persons.length === 0) {
    console.log('[Family Tree] 0 persons to build graph from.');
    return { nodes: [], edges: [] };
  }

  const personMap = new Map<string, Person>();
  persons.forEach((p) => personMap.set(p.id, p));

  const hasParent = (p: Person) =>
    Boolean((p.fatherId && personMap.has(p.fatherId)) || (p.motherId && personMap.has(p.motherId)));

  // Identify persons with children
  const personsWithChildren = new Set<string>();
  persons.forEach((p) => {
    if (p.fatherId && personMap.has(p.fatherId)) personsWithChildren.add(p.fatherId);
    if (p.motherId && personMap.has(p.motherId)) personsWithChildren.add(p.motherId);
  });

  // 1. Compute generations
  const generations = computeGenerations(persons);

  // Normalize generations so minGen is 0
  let minGen = Infinity;
  generations.forEach((g) => {
    if (g < minGen) minGen = g;
  });
  if (minGen === Infinity) minGen = 0;
  generations.forEach((g, id) => {
    generations.set(id, g - minGen);
  });

  // 2. Identify couples and parent unions
  // Map from pairKey -> { p1: Person, p2: Person, children: Person[] }
  interface CoupleData {
    p1: Person;
    p2: Person;
    children: Person[];
  }
  const coupleMap = new Map<string, CoupleData>();
  const personToCouples = new Map<string, Set<string>>();

  const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('__');

  // Register explicit spouses
  persons.forEach((p) => {
    if (p.spouseIds && Array.isArray(p.spouseIds)) {
      p.spouseIds.forEach((sId) => {
        const spouse = personMap.get(sId);
        if (spouse && sId !== p.id) {
          const key = getPairKey(p.id, sId);
          if (!coupleMap.has(key)) {
            // Sort: male on left if applicable, otherwise p on left
            let p1 = p;
            let p2 = spouse;
            if (p.gender === 'female' && spouse.gender === 'male') {
              p1 = spouse;
              p2 = p;
            }
            coupleMap.set(key, { p1, p2, children: [] });
          }
          if (!personToCouples.has(p.id)) personToCouples.set(p.id, new Set());
          if (!personToCouples.has(sId)) personToCouples.set(sId, new Set());
          personToCouples.get(p.id)!.add(key);
          personToCouples.get(sId)!.add(key);
        }
      });
    }
  });

  // Associate children with couples (or single parents)
  // Single parents who have children with someone not in graph
  const singleParentChildren = new Map<string, Person[]>();

  persons.forEach((c) => {
    const fId = c.fatherId;
    const mId = c.motherId;
    const hasF = Boolean(fId && personMap.has(fId));
    const hasM = Boolean(mId && personMap.has(mId));

    if (hasF && hasM) {
      const key = getPairKey(fId!, mId!);
      let cData = coupleMap.get(key);
      if (!cData) {
        const father = personMap.get(fId!)!;
        const mother = personMap.get(mId!)!;
        cData = { p1: father, p2: mother, children: [] };
        coupleMap.set(key, cData);
        if (!personToCouples.has(fId!)) personToCouples.set(fId!, new Set());
        if (!personToCouples.has(mId!)) personToCouples.set(mId!, new Set());
        personToCouples.get(fId!)!.add(key);
        personToCouples.get(mId!)!.add(key);
      }
      cData.children.push(c);
    } else if (hasF) {
      if (!singleParentChildren.has(fId!)) singleParentChildren.set(fId!, []);
      singleParentChildren.get(fId!)!.push(c);
    } else if (hasM) {
      if (!singleParentChildren.has(mId!)) singleParentChildren.set(mId!, []);
      singleParentChildren.get(mId!)!.push(c);
    }
  });

  // Helper: get spouse of person if in a single primary couple
  const getPrimarySpouse = (personId: string): Person | null => {
    const coupleKeys = personToCouples.get(personId);
    if (!coupleKeys || coupleKeys.size === 0) return null;
    const firstKey = Array.from(coupleKeys)[0];
    const cData = coupleMap.get(firstKey);
    if (!cData) return null;
    return cData.p1.id === personId ? cData.p2 : cData.p1;
  };

  // 3. Hierarchical Layout Construction
  // We represent nodes as "FamilyUnits" (either a couple [p1, p2] or single [p1])
  // Each unit has children units. We calculate subtree widths and assign coordinates.
  const nodePositions = new Map<string, { x: number; y: number }>();
  const unionPositions = new Map<string, { x: number; y: number }>();
  const placedPersons = new Set<string>();

  // Find root persons (persons with no parents, whose spouses also have no parents)
  const isRootCandidate = (p: Person) => {
    if (hasParent(p)) return false;
    const spouse = getPrimarySpouse(p.id);
    if (spouse && hasParent(spouse)) return false;
    return true;
  };

  // Build tree of FamilyUnits
  interface LayoutUnit {
    id: string;
    primary: Person;
    spouse: Person | null;
    coupleKey: string | null;
    children: LayoutUnit[];
    width: number;
    gen: number;
  }

  const buildUnitTree = (p: Person, visited: Set<string>): LayoutUnit => {
    visited.add(p.id);
    const spouse = getPrimarySpouse(p.id);
    if (spouse) visited.add(spouse.id);

    const coupleKey = spouse ? getPairKey(p.id, spouse.id) : null;
    const cData = coupleKey ? coupleMap.get(coupleKey) : null;

    // Children of this couple + single parent children
    const childPersons = [
      ...(cData ? cData.children : []),
      ...(singleParentChildren.get(p.id) || []),
    ];

    // Filter duplicates
    const uniqueChildrenMap = new Map<string, Person>();
    childPersons.forEach((c) => uniqueChildrenMap.set(c.id, c));
    const uniqueChildren = Array.from(uniqueChildrenMap.values());

    // Recursively build children units
    const childUnits: LayoutUnit[] = [];
    uniqueChildren.forEach((child) => {
      if (!visited.has(child.id)) {
        childUnits.push(buildUnitTree(child, visited));
      }
    });

    const gen = generations.get(p.id) || 0;
    const baseWidth = spouse ? PERSON_NODE_WIDTH * 2 + SPOUSE_GAP : PERSON_NODE_WIDTH;

    let childrenWidth = 0;
    if (childUnits.length > 0) {
      childrenWidth =
        childUnits.reduce((acc, cu) => acc + cu.width, 0) +
        (childUnits.length - 1) * SIBLING_GAP;
    }

    const width = Math.max(baseWidth, childrenWidth);

    return {
      id: p.id,
      primary: p,
      spouse,
      coupleKey,
      children: childUnits,
      width,
      gen,
    };
  };

  const visitedInTree = new Set<string>();
  const rootUnits: LayoutUnit[] = [];

  // Group candidate roots
  persons.forEach((p) => {
    if (isRootCandidate(p) && !visitedInTree.has(p.id)) {
      rootUnits.push(buildUnitTree(p, visitedInTree));
    }
  });

  // Assign coordinates top-down from root units
  const assignUnitPositions = (unit: LayoutUnit, leftX: number) => {
    const gen = unit.gen;
    const y = MARGIN_Y + gen * GENERATION_HEIGHT;

    const baseWidth = unit.spouse ? PERSON_NODE_WIDTH * 2 + SPOUSE_GAP : PERSON_NODE_WIDTH;
    const subtreeCenter = leftX + unit.width / 2;
    const unitStartX = subtreeCenter - baseWidth / 2;

    if (unit.spouse) {
      // Order: male on left if known, or primary on left
      let leftPerson = unit.primary;
      let rightPerson = unit.spouse;
      if (unit.primary.gender === 'female' && unit.spouse.gender === 'male') {
        leftPerson = unit.spouse;
        rightPerson = unit.primary;
      }

      nodePositions.set(leftPerson.id, { x: unitStartX, y });
      nodePositions.set(rightPerson.id, { x: unitStartX + PERSON_NODE_WIDTH + SPOUSE_GAP, y });
      placedPersons.add(leftPerson.id);
      placedPersons.add(rightPerson.id);

      // Union node between them
      if (unit.coupleKey) {
        const unionX = subtreeCenter - UNION_NODE_SIZE / 2;
        const unionY = y + PERSON_NODE_HEIGHT + 35;
        unionPositions.set(unit.coupleKey, { x: unionX, y: unionY });
      }
    } else {
      nodePositions.set(unit.primary.id, { x: unitStartX, y });
      placedPersons.add(unit.primary.id);

      // Single parent union node if has children
      if (unit.children.length > 0) {
        const unionKey = `single_${unit.primary.id}`;
        const unionX = unitStartX + PERSON_NODE_WIDTH / 2 - UNION_NODE_SIZE / 2;
        const unionY = y + PERSON_NODE_HEIGHT + 35;
        unionPositions.set(unionKey, { x: unionX, y: unionY });
      }
    }

    // Position children centered below
    if (unit.children.length > 0) {
      const totalChildrenWidth =
        unit.children.reduce((acc, cu) => acc + cu.width, 0) +
        (unit.children.length - 1) * SIBLING_GAP;

      let childLeftX = subtreeCenter - totalChildrenWidth / 2;
      unit.children.forEach((childUnit) => {
        assignUnitPositions(childUnit, childLeftX);
        childLeftX += childUnit.width + SIBLING_GAP;
      });
    }
  };

  // Lay out all root units horizontally
  let currentRootX = MARGIN_X;
  rootUnits.forEach((ru) => {
    assignUnitPositions(ru, currentRootX);
    currentRootX += ru.width + FAMILY_GAP;
  });

  // Catch any unplaced persons (isolated individuals or disconnected branches)
  const unplaced = persons.filter((p) => !placedPersons.has(p.id));
  if (unplaced.length > 0) {
    // Group by generation
    const byGen = new Map<number, Person[]>();
    unplaced.forEach((p) => {
      const g = generations.get(p.id) || 0;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(p);
    });

    byGen.forEach((pList, g) => {
      const y = MARGIN_Y + g * GENERATION_HEIGHT;
      // Find max X currently used in this generation
      let maxXInGen = MARGIN_X;
      nodePositions.forEach((pos) => {
        if (Math.abs(pos.y - y) < 10) {
          maxXInGen = Math.max(maxXInGen, pos.x + PERSON_NODE_WIDTH);
        }
      });
      let x = maxXInGen + SIBLING_GAP;

      pList.forEach((p) => {
        if (!placedPersons.has(p.id)) {
          const spouse = getPrimarySpouse(p.id);
          if (spouse && !placedPersons.has(spouse.id)) {
            // Place couple side-by-side on same row
            nodePositions.set(p.id, { x, y });
            nodePositions.set(spouse.id, { x: x + PERSON_NODE_WIDTH + SPOUSE_GAP, y });
            placedPersons.add(p.id);
            placedPersons.add(spouse.id);

            const coupleKey = getPairKey(p.id, spouse.id);
            const unionX = x + PERSON_NODE_WIDTH + SPOUSE_GAP / 2 - UNION_NODE_SIZE / 2;
            const unionY = y + PERSON_NODE_HEIGHT + 35;
            unionPositions.set(coupleKey, { x: unionX, y: unionY });

            x += PERSON_NODE_WIDTH * 2 + SPOUSE_GAP + SIBLING_GAP;
          } else {
            nodePositions.set(p.id, { x, y });
            placedPersons.add(p.id);
            x += PERSON_NODE_WIDTH + SIBLING_GAP;
          }
        }
      });
    });
  }

  // 4. Construct React Flow Nodes
  const flowNodes: Node[] = [];

  // Person Nodes
  persons.forEach((person) => {
    const pos = nodePositions.get(person.id) || { x: MARGIN_X, y: MARGIN_Y };
    flowNodes.push({
      id: person.id,
      type: 'personNode',
      position: { x: pos.x, y: pos.y },
      data: {
        person,
        isSelected: person.id === selectedPersonId,
        isRoot: person.id === rootPersonId,
        hasChildren: personsWithChildren.has(person.id),
        isCollapsed: collapsedPersonIds.has(person.id),
        onToggleCollapse,
        onSelect: onSelectPerson,
      },
    });
  });

  // Union Nodes
  unionPositions.forEach((pos, uKey) => {
    const cData = coupleMap.get(uKey);
    const label = cData ? `${cData.p1.firstName} & ${cData.p2.firstName}` : 'Family Union';
    flowNodes.push({
      id: `union_${uKey}`,
      type: 'unionNode',
      position: { x: pos.x, y: pos.y },
      data: { label },
    });
  });

  // 5. Construct React Flow Edges
  const flowEdges: Edge[] = [];
  const processedCouples = new Set<string>();

  // A. Couple Line Edges (connect spouses directly on the same row)
  coupleMap.forEach((cData, pairKey) => {
    if (personMap.has(cData.p1.id) && personMap.has(cData.p2.id)) {
      if (!processedCouples.has(pairKey)) {
        processedCouples.add(pairKey);

        const pos1 = nodePositions.get(cData.p1.id) || { x: 0, y: 0 };
        const pos2 = nodePositions.get(cData.p2.id) || { x: 0, y: 0 };

        // Left spouse is source (right handle), right spouse is target (left handle)
        const leftPerson = pos1.x <= pos2.x ? cData.p1 : cData.p2;
        const rightPerson = pos1.x <= pos2.x ? cData.p2 : cData.p1;

        flowEdges.push({
          id: `e_couple_${pairKey}`,
          source: leftPerson.id,
          sourceHandle: 'right',
          target: rightPerson.id,
          targetHandle: 'left',
          type: 'smoothstep',
          animated: false,
          label: '💍 Couple',
          labelStyle: { fill: '#b45309', fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: '#fffbeb', fillOpacity: 0.85 },
          style: { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '4 4' },
        });

        // B. Parents to Family Union Node
        const unionId = `union_${pairKey}`;
        if (unionPositions.has(pairKey)) {
          flowEdges.push({
            id: `e_p1_${cData.p1.id}_${unionId}`,
            source: cData.p1.id,
            sourceHandle: 'bottom',
            target: unionId,
            targetHandle: 'top',
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#d97706', strokeWidth: 2 },
          });

          flowEdges.push({
            id: `e_p2_${cData.p2.id}_${unionId}`,
            source: cData.p2.id,
            sourceHandle: 'bottom',
            target: unionId,
            targetHandle: 'top',
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#d97706', strokeWidth: 2 },
          });

          // C. Family Union Node to Children
          cData.children.forEach((child) => {
            if (personMap.has(child.id)) {
              flowEdges.push({
                id: `e_child_${unionId}_${child.id}`,
                source: unionId,
                sourceHandle: 'bottom',
                target: child.id,
                targetHandle: 'top',
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#64748b', strokeWidth: 2 },
              });
            }
          });
        }
      }
    }
  });

  // D. Single Parents to Union Node and Children
  singleParentChildren.forEach((children, parentId) => {
    if (personMap.has(parentId)) {
      const unionKey = `single_${parentId}`;
      const unionId = `union_${unionKey}`;
      if (unionPositions.has(unionKey)) {
        flowEdges.push({
          id: `e_single_p_${parentId}_${unionId}`,
          source: parentId,
          sourceHandle: 'bottom',
          target: unionId,
          targetHandle: 'top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#0284c7', strokeWidth: 2 },
        });

        children.forEach((child) => {
          if (personMap.has(child.id)) {
            flowEdges.push({
              id: `e_single_c_${unionId}_${child.id}`,
              source: unionId,
              sourceHandle: 'bottom',
              target: child.id,
              targetHandle: 'top',
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#64748b', strokeWidth: 2 },
            });
          }
        });
      } else {
        // Direct edge fallback if no union position
        children.forEach((child) => {
          if (personMap.has(child.id)) {
            flowEdges.push({
              id: `e_direct_${parentId}_${child.id}`,
              source: parentId,
              sourceHandle: 'bottom',
              target: child.id,
              targetHandle: 'top',
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#64748b', strokeWidth: 2 },
            });
          }
        });
      }
    }
  });

  console.log(`[Family Tree] Created ${flowNodes.length} nodes and ${flowEdges.length} edges.`);

  return { nodes: flowNodes, edges: flowEdges };
}
