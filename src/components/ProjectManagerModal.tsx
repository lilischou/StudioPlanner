import React, { useState, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import {
  X,
  FolderKanban,
  Download,
  Upload,
  Trash2,
} from 'lucide-react';
import { formatFrenchDate } from '../utils/dateCalculations';
import { ImportProjectsModal } from './modals/ImportProjectsModal';
import { extractProjectsListFromJSON, RawProjectInput } from '../utils/projectImporter';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    deleteProject,
    exportProjectJSON,
    importProjectJSON,
    importProjectsList,
  } = useProject();

  const [importError, setImportError] = useState<string | null>(null);
  const [pendingProjects, setPendingProjects] = useState<RawProjectInput[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Détection d'une liste "projets"
        const projectsList = extractProjectsListFromJSON(parsed);
        if (projectsList && projectsList.length > 0) {
          setPendingProjects(projectsList);
          return;
        }

        const success = importProjectJSON(text);
        if (success) {
          setImportError(null);
          onClose();
        } else {
          setImportError('Fichier de projet invalide. Assurez-vous d\'importer un fichier .json exporté de StudioPlanner.');
        }
      } catch {
        setImportError('Erreur de lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-riso-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-2xl w-full border-2 border-riso-ink shadow-riso max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-riso-ink bg-riso-paper shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-riso-p1-light text-riso-ink rounded-[8px] border-2 border-riso-ink">
              <FolderKanban className="w-5 h-5 text-riso-ink" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-riso-ink font-heading">
                Gérer les projets
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] hover:bg-riso-p1-light transition-colors border border-transparent hover:border-riso-ink cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto text-[13px] bg-riso-paper">
          {/* Projects List */}
          <div>
            <h3 className="text-xs font-bold text-riso-ink uppercase tracking-wider mb-2.5 font-heading">
              Projets actuels ({projects.length})
            </h3>
            <div className="divide-y-2 divide-riso-ink/20 border-2 border-riso-ink rounded-[8px] overflow-hidden bg-white shadow-riso-press">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                return (
                  <div
                    key={proj.id}
                    className={`p-3.5 flex items-center justify-between transition-colors ${
                      isActive ? 'bg-riso-p1-light' : 'hover:bg-riso-paper'
                    }`}
                  >
                    <div
                      className="cursor-pointer flex-1 min-w-0 pr-3"
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-riso-ink truncate">
                          {proj.settings.name}
                        </span>
                        {isActive && (
                          <span className="text-[13px] font-bold text-riso-ink bg-riso-p3 px-2 py-0.5 rounded-[999px] border-2 border-riso-ink">
                            Actif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-riso-ink-secondary text-[13px] mt-0.5 tabular-nums">
                        <span className="font-semibold">
                          {proj.settings.mode === 'individuel' ? 'Solo' : 'Groupe'}
                        </span>
                        <span>·</span>
                        <span>Rendu : {formatFrenchDate(proj.settings.deadlineDate, false)}</span>
                        <span>·</span>
                        <span>{proj.tasks.length} tâche{proj.tasks.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          onClose();
                        }}
                        className="btn-riso-secondary text-[13px] py-1 px-3 cursor-pointer"
                      >
                        Ouvrir
                      </button>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer définitivement le projet "${proj.settings.name}" ?`)) {
                              deleteProject(proj.id);
                            }
                          }}
                          title="Supprimer ce projet"
                          aria-label={`Supprimer le projet ${proj.settings.name}`}
                          className="p-1.5 text-riso-ink-secondary hover:text-riso-p4 hover:bg-riso-p4-light rounded-[8px] border-2 border-transparent hover:border-riso-p4 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sauvegarde JSON (Import / Export) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-white border-2 border-riso-ink rounded-[8px] shadow-riso-press space-y-2">
              <span className="font-bold text-riso-ink block font-heading">Télécharger une sauvegarde</span>
              <p className="text-riso-ink-secondary text-[13px]">
                Téléchargez l'intégralité du projet en fichier JSON pour archivage ou partage.
              </p>
              <button
                type="button"
                onClick={exportProjectJSON}
                className="btn-riso-secondary w-full cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter le JSON
              </button>
            </div>

            <div className="p-3.5 bg-white border-2 border-riso-ink rounded-[8px] shadow-riso-press space-y-2">
              <span className="font-bold text-riso-ink block font-heading">Restaurer une sauvegarde</span>
              <p className="text-riso-ink-secondary text-[13px]">
                Restaurez un projet StudioPlanner depuis un fichier JSON sauvegardé.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-riso-secondary w-full cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Importer un JSON
              </button>
              {importError && (
                <p className="text-riso-p4 text-[13px] font-bold mt-1">{importError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-riso-paper border-t-2 border-riso-ink flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-riso-secondary cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal de sélection et import des projets */}
      <ImportProjectsModal
        isOpen={!!pendingProjects}
        rawProjects={pendingProjects || []}
        onClose={() => setPendingProjects(null)}
        onConfirmImport={(selected) => {
          importProjectsList(selected);
          setPendingProjects(null);
          onClose();
        }}
      />
    </div>
  );
};
