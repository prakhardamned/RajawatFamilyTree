import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { Person, TreeViewMode } from '../../types';

export const PERSON_NODE_WIDTH = 260;
export const PERSON_NODE_HEIGHT = 110;

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
 * Builds Dagre Graph and returns laid-out Nodes & Edges for React Flow
 * - Every person is guaranteed a node.
 * - Edges created from fatherId, motherId, and spouseIds (skipping any ID not found).
 * - Dagre rankdir 'TB' top-to-bottom layout.
 */
export function buildFamilyGraph(
  persons: Person[],
  selectedPersonId: string | null,
  rootPersonId: string | null,
  collapsedPersonIds: Set<string>,
  onToggleCollapse: (personId: string) => void,
  onSelectPerson: (person: Person) => void
): { nodes: Node[]; edges: Edge[] } {
  if (!persons || persons.length === 0) {
    console.log('[Family Tree] 0 persons to build graph from.');
    return { nodes: [], edges: [] };
  }

  const personMap = new Map<string, Person>();
  persons.forEach((p) => personMap.set(p.id, p));

  // Identify persons with children
  const personsWithChildren = new Set<string>();
  persons.forEach((p) => {
    if (p.fatherId && personMap.has(p.fatherId)) personsWithChildren.add(p.fatherId);
    if (p.motherId && personMap.has(p.motherId)) personsWithChildren.add(p.motherId);
  });

  // Setup Dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // 1. Add every person as a node in Dagre
  persons.forEach((p) => {
    g.setNode(p.id, {
      width: PERSON_NODE_WIDTH,
      height: PERSON_NODE_HEIGHT,
    });
  });

  const rawEdges: Edge[] = [];
  const processedSpouses = new Set<string>();

  // 2. Add edges: fatherId, motherId, spouseIds (skipping any ID not found)
  persons.forEach((p) => {
    // Father edge: father -> child (top to bottom)
    if (p.fatherId && personMap.has(p.fatherId)) {
      g.setEdge(p.fatherId, p.id);
      rawEdges.push({
        id: `e_father_${p.fatherId}_${p.id}`,
        source: p.fatherId,
        target: p.id,
        type: 'smoothstep',
        animated: false,
        label: 'Father',
        labelStyle: { fill: '#0369a1', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#f0f9ff', fillOpacity: 0.8 },
        style: { stroke: '#0284c7', strokeWidth: 2 },
      });
    }

    // Mother edge: mother -> child (top to bottom)
    if (p.motherId && personMap.has(p.motherId)) {
      g.setEdge(p.motherId, p.id);
      rawEdges.push({
        id: `e_mother_${p.motherId}_${p.id}`,
        source: p.motherId,
        target: p.id,
        type: 'smoothstep',
        animated: false,
        label: 'Mother',
        labelStyle: { fill: '#be123c', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#fff1f2', fillOpacity: 0.8 },
        style: { stroke: '#e11d48', strokeWidth: 2 },
      });
    }

    // Spouse edges: connect spouses with distinctive amber dashed edge
    if (p.spouseIds && Array.isArray(p.spouseIds)) {
      p.spouseIds.forEach((spouseId) => {
        if (personMap.has(spouseId)) {
          const pairKey = [p.id, spouseId].sort().join('__');
          if (!processedSpouses.has(pairKey)) {
            processedSpouses.add(pairKey);
            rawEdges.push({
              id: `e_spouse_${pairKey}`,
              source: p.id,
              target: spouseId,
              type: 'smoothstep',
              animated: false,
              label: '💍 Couple',
              labelStyle: { fill: '#b45309', fontSize: 10, fontWeight: 600 },
              labelBgStyle: { fill: '#fffbeb', fillOpacity: 0.85 },
              style: { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '4 4' },
            });
          }
        }
      });
    }
  });

  // 3. Execute Dagre layout
  dagre.layout(g);

  // 4. Construct React Flow nodes
  const flowNodes: Node[] = persons.map((person) => {
    const nodeWithPos = g.node(person.id);
    const x = nodeWithPos ? nodeWithPos.x - PERSON_NODE_WIDTH / 2 : 0;
    const y = nodeWithPos ? nodeWithPos.y - PERSON_NODE_HEIGHT / 2 : 0;

    return {
      id: person.id,
      type: 'personNode',
      position: { x, y },
      data: {
        person,
        isSelected: person.id === selectedPersonId,
        isRoot: person.id === rootPersonId,
        hasChildren: personsWithChildren.has(person.id),
        isCollapsed: collapsedPersonIds.has(person.id),
        onToggleCollapse,
        onSelect: onSelectPerson,
      },
    };
  });

  console.log(`[Family Tree] Created ${flowNodes.length} nodes and ${rawEdges.length} edges.`);

  return { nodes: flowNodes, edges: rawEdges };
}
