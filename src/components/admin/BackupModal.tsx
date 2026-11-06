import React, { useState } from 'react';
import { useTreeData } from '../../context/TreeDataContext';
import { exportToGedcom } from '../../utils/gedcom';
import { APP_CONFIG } from '../../config';
import {
  X,
  Download,
  Upload,
  AlertTriangle,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { persons, importPersonsJson } = useTreeData();

  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<{ count: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  // Export JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(persons, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family_tree_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export GEDCOM 5.5.1
  const handleExportGedcom = () => {
    const gedcomStr = exportToGedcom(persons);
    const blob = new Blob([gedcomStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family_tree_${new Date().toISOString().split('T')[0]}.ged`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle JSON Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportReport(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setImportReport({ count: 0, errors: ['Failed to read selected file.'] });
      setImporting(false);
    };

    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          setImportReport({
            count: 0,
            errors: ['Invalid format: JSON file must contain an array of person records.'],
          });
          setImporting(false);
          return;
        }

        const report = await importPersonsJson(parsed);
        setImportReport(report);
      } catch (err: any) {
        setImportReport({
          count: 0,
          errors: [`JSON parsing error: ${err.message}`],
        });
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Data Backup &amp; Transfer
            </h3>
            <p className="text-xs text-stone-500">
              Export lineage records or import validated tree archives.
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

        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* CRITICAL REMINDER BANNER */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-0.5">
                Spark Free Plan Backup Advisory
              </h4>
              <p className="text-amber-800 leading-relaxed font-medium">
                {APP_CONFIG.backupWarningMessage}
              </p>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-stone-500">
              Export Tree Archive
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="p-4 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group"
              >
                <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800 group-hover:scale-105 transition">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-sm">
                    Export JSON Backup
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Complete tree snapshot with exact fields and relations ({persons.length} persons).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportGedcom}
                className="p-4 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group"
              >
                <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800 group-hover:scale-105 transition">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-sm">
                    Export GEDCOM 5.5.1
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Universal genealogy standard compatible with Ancestry, MyHeritage &amp; Gramps.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Import JSON */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <h4 className="font-bold uppercase tracking-wider text-stone-500">
              Import Tree (JSON)
            </h4>
            <p className="text-stone-600 text-xs">
              Upload a previously exported JSON backup. Every person record is strictly validated against security rules and written in atomic batches of ≤450 operations.
            </p>

            <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center bg-stone-50/50 hover:bg-stone-50 transition">
              <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold shadow-xs transition">
                <span>{importing ? 'Validating & Importing...' : 'Choose JSON Backup File'}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-stone-400 mt-2">
                Accepts .json files created with Family Tree export.
              </p>
            </div>

            {/* Import Status Report */}
            {importReport && (
              <div
                className={`p-4 rounded-xl border ${
                  importReport.errors.length === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {importReport.errors.length === 0 ? (
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>
                      Successfully validated and imported {importReport.count} family records!
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                      <span>Import validation failed ({importReport.errors.length} errors):</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] max-h-40 overflow-y-auto">
                      {importReport.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
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
