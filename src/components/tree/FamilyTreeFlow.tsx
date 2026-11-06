import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import { UnionNode } from './UnionNode';
import { PeopleListView } from './PeopleListView';
import {
  buildFamilyGraph,
  getFilteredPersons,
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
} from './layoutGraph';
import { Person, TreeViewMode } from '../../types';
import {
  Maximize2,
  Users,
  Search,
  GitFork,
  LayoutGrid,
  Network,
  AlertCircle,
} from 'lucide-react';

const nodeTypes = {
  personNode: PersonNode,
  unionNode: UnionNode,
};

interface FamilyTreeFlowInnerProps {
  persons: Person[];
  selectedPerson: Person | null;
  onSelectPerson: (person: Person) => void;
  onEditPerson: (person: Person) => void;
  rootPersonId: string | null;
  setRootPersonId: (id: string | null) => void;
  viewMode: TreeViewMode;
  setViewMode: (mode: TreeViewMode) => void;
  loadError?: string | null;
}

const FamilyTreeFlowInner: React.FC<FamilyTreeFlowInnerProps> = ({
  persons,
  selectedPerson,
  onSelectPerson,
  onEditPerson,
  rootPersonId,
  setRootPersonId,
  viewMode,
  setViewMode,
  loadError,
}) => {
  const { fitView, setCenter } = useReactFlow();

  // Display mode: 'tree' or 'list' (People list toggle)
  const [displayMode, setDisplayMode] = useState<'tree' | 'list'>('tree');
  const [collapsedPersonIds, setCollapsedPersonIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Toggle collapse/expand on a person's branch
  const handleToggleCollapse = useCallback((personId: string) => {
    setCollapsedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  // Filter persons by viewMode & root
  const filteredPersons = useMemo(() => {
    return getFilteredPersons(persons, rootPersonId, viewMode);
  }, [persons, rootPersonId, viewMode]);

  // Build nodes and edges via Dagre
  const { nodes: computedNodes, edges: computedEdges } = useMemo(() => {
    return buildFamilyGraph(
      filteredPersons,
      selectedPerson?.id || null,
      rootPersonId,
      collapsedPersonIds,
      handleToggleCollapse,
      onSelectPerson
    );
  }, [
    filteredPersons,
    selectedPerson?.id,
    rootPersonId,
    collapsedPersonIds,
    handleToggleCollapse,
    onSelectPerson,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Sync state and run fitView() after nodes render
  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);

    // Call fitView() after nodes render
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 150);
    return () => clearTimeout(timer);
  }, [computedNodes, computedEdges, fitView, setNodes, setEdges]);

  // Center on selected person
  const centerOnPerson = useCallback(
    (personId: string) => {
      const node = nodes.find((n) => n.id === personId);
      if (node) {
        setCenter(
          node.position.x + PERSON_NODE_WIDTH / 2,
          node.position.y + PERSON_NODE_HEIGHT / 2,
          { zoom: 1.15, duration: 600 }
        );
      }
    },
    [nodes, setCenter]
  );

  // Search results for search-and-jump
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return persons
      .filter((p) => {
        const full = `${p.firstName} ${p.lastName || ''} ${p.nickname || ''}`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 8);
  }, [searchQuery, persons]);

  const handleSelectSearchResult = (p: Person) => {
    onSelectPerson(p);
    setSearchQuery('');
    setIsSearchOpen(false);
    centerOnPerson(p.id);
  };

  return (
    <div
      style={{ width: '100%', height: 'calc(100vh - 72px)' }}
      className="relative bg-stone-100/60 overflow-hidden select-none flex flex-col"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: View Mode (Tree vs People list) & Perspective */}
        <div className="flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-md pointer-events-auto">
          {/* Tree vs List View Toggle */}
          <div className="flex rounded-lg bg-stone-200/80 p-0.5 text-xs font-semibold mr-1">
            <button
              type="button"
              onClick={() => setDisplayMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                displayMode === 'tree'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-amber-600" />
              <span>Tree View</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                displayMode === 'list'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
              <span>People list</span>
            </button>
          </div>

          {/* Perspective filters (visible during tree mode) */}
          {displayMode === 'tree' && (
            <>
              <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-stone-500 pl-1 border-l border-stone-200">
                <GitFork className="w-3.5 h-3.5 text-stone-400" />
                <span>Filter:</span>
              </div>

              <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    viewMode === 'all'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All ({persons.length})
                </button>
                <button
                  type="button"
                  disabled={!rootPersonId}
                  onClick={() => setViewMode('ancestors')}
                  className={`px-2.5 py-1 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    viewMode === 'ancestors'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Ancestors
                </button>
                <button
                  type="button"
                  disabled={!rootPersonId}
                  onClick={() => setViewMode('descendants')}
                  className={`px-2.5 py-1 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    viewMode === 'descendants'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Descendants
                </button>
              </div>

              {/* Root Person Dropdown */}
              <div className="flex items-center pl-2 border-l border-stone-200 text-xs">
                <span className="text-stone-500 mr-1.5 hidden md:inline">Root:</span>
                <select
                  value={rootPersonId || ''}
                  onChange={(e) => setRootPersonId(e.target.value || null)}
                  className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-hidden max-w-[130px] truncate cursor-pointer"
                >
                  <option value="">(Select Root)</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName || ''} {p.birthYear ? `(${p.birthYear})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Right: Search & Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search Box */}
          <div className="relative">
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-stone-200/80 shadow-md px-3 py-1.5">
              <Search className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Find relative..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="w-28 sm:w-44 text-xs bg-transparent focus:outline-hidden text-stone-900 placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 hover:text-stone-600 text-xs ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1.5 right-0 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-30">
                <div className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1 tracking-wider">
                  Matching Family Members
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center justify-between text-xs transition"
                  >
                    <span className="font-medium text-stone-900 truncate">
                      {result.firstName} {result.lastName || ''}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono shrink-0 ml-2">
                      {result.birthYear ? result.birthYear : result.isLiving ? 'Living' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fit Screen Button (tree mode) */}
          {displayMode === 'tree' && (
            <button
              type="button"
              onClick={() => fitView({ padding: 0.25, duration: 400 })}
              title="Fit View"
              className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md hover:bg-stone-50 text-stone-700 px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-md text-xs font-medium transition"
            >
              <Maximize2 className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Fit View</span>
            </button>
          )}
        </div>
      </div>

      {/* Load Error Banner */}
      {loadError && (
        <div className="absolute top-18 left-4 right-4 z-20 pointer-events-auto">
          <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded-xl shadow-md text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">Firestore Load Error:</span>
            <span>{loadError}</span>
          </div>
        </div>
      )}

      {/* Main View Area: Either Tree View or Fallback People List */}
      {displayMode === 'list' ? (
        <div className="pt-18 flex-1 overflow-hidden">
          <PeopleListView
            persons={persons}
            onSelectPerson={onSelectPerson}
            onEditPerson={onEditPerson}
          />
        </div>
      ) : (
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2.0}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onPaneClick={() => setIsSearchOpen(false)}
          >
            <Background color="#cbd5e1" gap={24} size={1.2} />
            <Controls
              showInteractive={false}
              className="!bg-white !rounded-xl !border !border-stone-200 !shadow-md overflow-hidden"
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'unionNode') return '#d97706';
                const person = (node.data as any)?.person as Person | undefined;
                if (person?.gender === 'female') return '#fda4af';
                if (person?.gender === 'male') return '#7dd3fc';
                return '#6ee7b7';
              }}
              className="!bottom-4 !right-4 !rounded-xl !border !border-stone-200 !shadow-lg !bg-white/90 !overflow-hidden hidden sm:block"
              zoomable
              pannable
            />
          </ReactFlow>

          {/* Empty State Banner if no persons */}
          {persons.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200 p-8 max-w-md text-center shadow-xl pointer-events-auto">
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">
                  Family Tree is Empty
                </h3>
                <p className="text-stone-600 text-sm mb-5">
                  Add your first family member to begin mapping generations, or toggle Demo Mode above to explore sample records.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FamilyTreeFlow: React.FC<FamilyTreeFlowInnerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FamilyTreeFlowInner {...props} />
    </ReactFlowProvider>
  );
};
