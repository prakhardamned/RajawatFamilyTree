import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TreeDataProvider, useTreeData } from './context/TreeDataContext';
import { Navbar } from './components/common/Navbar';
import { FamilyTreeFlow } from './components/tree/FamilyTreeFlow';
import { PersonDetailSidePanel } from './components/person/PersonDetailSidePanel';
import { PersonFormModal, FormMode } from './components/person/PersonFormModal';
import { SuggestionsInboxModal } from './components/admin/SuggestionsInboxModal';
import { MembersModal } from './components/admin/MembersModal';
import { BackupModal } from './components/admin/BackupModal';
import { MySuggestionsModal } from './components/member/MySuggestionsModal';
import {
  AwaitingApprovalView,
  BlockedView,
  SignedOutView,
} from './components/common/AccessScreens';
import { Person, Suggestion, RelativeLinkRequest, TreeViewMode } from './types';
import { AlertCircle } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isApproved, isPending, isBlocked, isDemoMode } = useAuth();
  const { persons, selectedPersonId, setSelectedPersonId, error } = useTreeData();

  // Root & View Modes
  const [rootPersonId, setRootPersonId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TreeViewMode>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formTargetPerson, setFormTargetPerson] = useState<Person | null>(null);
  const [relativeLinkRequest, setRelativeLinkRequest] = useState<RelativeLinkRequest | null>(null);

  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isMySuggestionsOpen, setIsMySuggestionsOpen] = useState(false);

  // Selected person object
  const selectedPerson = selectedPersonId
    ? persons.find((p) => p.id === selectedPersonId) || null
    : null;

  // Handlers for Person actions
  const handleOpenAddPerson = () => {
    setFormMode('create');
    setFormTargetPerson(null);
    setRelativeLinkRequest(null);
    setIsFormModalOpen(true);
  };

  const handleEditPerson = (person: Person) => {
    setFormMode('edit');
    setFormTargetPerson(person);
    setRelativeLinkRequest(null);
    setIsFormModalOpen(true);
  };

  const handleAddRelative = (
    targetPerson: Person,
    relationType: 'father' | 'mother' | 'spouse' | 'child' | 'sibling'
  ) => {
    setFormMode('create');
    setFormTargetPerson(null);
    setRelativeLinkRequest({ targetPerson, relationType });
    setIsFormModalOpen(true);
  };

  const handleSuggestEdit = (person: Person) => {
    setFormMode('suggest_edit');
    setFormTargetPerson(person);
    setRelativeLinkRequest(null);
    setIsFormModalOpen(true);
  };

  const handleSuggestRelative = (targetPerson: Person) => {
    setFormMode('suggest_relative');
    setFormTargetPerson(targetPerson);
    setRelativeLinkRequest(null);
    setIsFormModalOpen(true);
  };

  const handleReportError = (person: Person) => {
    setFormMode('report_error');
    setFormTargetPerson(person);
    setRelativeLinkRequest(null);
    setIsFormModalOpen(true);
  };

  // Edit and Approve handler from Suggestions Inbox
  const handleEditAndApprove = (sug: Suggestion) => {
    const existing = sug.targetPersonId
      ? persons.find((p) => p.id === sug.targetPersonId)
      : null;
    if (existing) {
      setFormMode('edit');
      setFormTargetPerson({ ...existing, ...sug.proposedData });
      setIsInboxOpen(false);
      setIsFormModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 overflow-hidden text-stone-900">
      {/* Top Navigation */}
      <Navbar
        onOpenAddPerson={handleOpenAddPerson}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenMembers={() => setIsMembersOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenMySuggestions={() => setIsMySuggestionsOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Error notification if any */}
        {error && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Access Gates */}
        {!isDemoMode && !user ? (
          <SignedOutView />
        ) : isPending ? (
          <AwaitingApprovalView />
        ) : isBlocked ? (
          <BlockedView />
        ) : isApproved ? (
          <div style={{ width: '100%', height: 'calc(100vh - 72px)' }} className="flex-1 relative">
            <FamilyTreeFlow
              persons={persons}
              selectedPerson={selectedPerson}
              onSelectPerson={(p) => setSelectedPersonId(p.id)}
              onEditPerson={handleEditPerson}
              rootPersonId={rootPersonId}
              setRootPersonId={setRootPersonId}
              viewMode={viewMode}
              setViewMode={setViewMode}
              loadError={error}
            />

            {/* Side Detail Panel */}
            {selectedPerson && (
              <PersonDetailSidePanel
                person={selectedPerson}
                onClose={() => setSelectedPersonId(null)}
                onEdit={handleEditPerson}
                onAddRelative={handleAddRelative}
                onSuggestEdit={handleSuggestEdit}
                onSuggestRelative={handleSuggestRelative}
                onReportError={handleReportError}
              />
            )}
          </div>
        ) : (
          <SignedOutView />
        )}
      </main>

      {/* Modals */}
      <PersonFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        mode={formMode}
        initialPerson={formTargetPerson}
        relativeLink={relativeLinkRequest}
      />

      <SuggestionsInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        onEditAndApprove={handleEditAndApprove}
      />

      <MembersModal
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />

      <MySuggestionsModal
        isOpen={isMySuggestionsOpen}
        onClose={() => setIsMySuggestionsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <TreeDataProvider>
        <MainAppContent />
      </TreeDataProvider>
    </AuthProvider>
  );
}
