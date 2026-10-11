import React, { useState } from 'react';
import { useProject, TabType } from '../context/ProjectContext';
import {
  Sparkles,
  Clock,
  BookOpen,
  TableProperties,
  HelpCircle,
  FolderKanban,
  ChevronDown,
  Settings,
} from 'lucide-react';

interface DesktopSidebarProps {
  onOpenDetailedView: () => void;
  onOpenLegend: () => void;
  onOpenProjectManager: () => void;
  onOpenNewProject: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  onOpenDetailedView,
  onOpenLegend,
  onOpenProjectManager,
  onOpenNewProject,
}) => {
  const {
    activeTab,
    setActiveTab,
    activeProject,
    projects,
    setActiveProjectId,
  } = useProject();

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'aujourdhui', label: "aujourd'hui", icon: <Sparkles className="w-5 h-5" />, shortcut: '1' },
    { id: 'parcours', label: 'parcours', icon: <span className="text-base font-bold leading-none w-5 h-5 flex items-center justify-center">◇</span>, shortcut: '2' },
    { id: 'sessions', label: 'sessions', icon: <Clock className="w-5 h-5" />, shortcut: '3' },
    { id: 'journal', label: 'journal', icon: <BookOpen className="w-5 h-5" />, shortcut: '4' },
  ];

  return (
    <aside
      aria-label="Navigation latérale"
      className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-40 bg-riso-card border-r-2 border-riso-ink w-[72px] xl:w-[240px] transition-all select-none text-riso-ink"
    >
      {/* 1. Header: Logo & App / Project Title */}
      <div className="h-16 px-3.5 xl:px-4 border-b-2 border-riso-ink flex items-center justify-between shrink-0 bg-riso-paper">
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded-[8px] bg-white overflow-hidden shrink-0 flex items-center justify-center border-2 border-riso-ink shadow-riso-press mx-auto xl:mx-0">
            <img
              src="/logo.png"
              alt="StudioPlanner"
              className="w-full h-full object-contain"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.hasFailed) {
                  img.dataset.hasFailed = 'true';
                  img.src = '/logo.svg';
                }
              }}
            />
          </div>

          <div className="hidden xl:flex flex-col truncate">
            <span className="font-bold text-sm tracking-tight text-riso-ink leading-tight font-heading">
              StudioPlanner
            </span>
            <span className="text-xs text-riso-ink-secondary font-medium truncate">
              Démarche design
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sélecteur de projet tout en haut sous le logo */}
      <div className="p-2 xl:p-3 border-b-2 border-riso-ink bg-riso-paper shrink-0 relative">
        <button
          type="button"
          onClick={() => setProjectMenuOpen(!projectMenuOpen)}
          title={`Projet : ${activeProject.settings.name}`}
          aria-label={`Projet actif : ${activeProject.settings.name}`}
          className="w-full flex items-center justify-between gap-2 p-2.5 bg-white hover:bg-riso-p1-light rounded-[8px] border-2 border-riso-ink shadow-riso hover:-translate-y-0.5 hover:shadow-riso active:translate-y-1 active:shadow-none transition-all cursor-pointer text-left"
        >
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-riso-ink mt-0.5 mx-auto xl:mx-0 shadow-xs"
              style={{ backgroundColor: activeProject.settings.color || '#2F6DBB' }}
              title={`Couleur du projet : ${activeProject.settings.name}`}
            />
            <div className="hidden xl:flex flex-col min-w-0 flex-1 gap-1">
              <span className="font-bold text-riso-ink text-[13px] leading-snug line-clamp-2 break-words font-heading">
                {activeProject.settings.name || 'Projet'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-riso-ink bg-riso-p3 px-1.5 py-0.5 rounded-[999px] border-2 border-riso-ink font-bold shrink-0">
                  {activeProject.settings.mode === 'individuel' ? 'Solo' : 'Groupe'}
                </span>
              </div>
            </div>
          </div>
          <ChevronDown className="hidden xl:block w-4 h-4 text-riso-ink shrink-0" />
        </button>

        {/* Project Dropdown */}
        {projectMenuOpen && (
          <div
            className="absolute top-full left-2 w-64 bg-white rounded-[8px] shadow-riso border-2 border-riso-ink py-2 z-50 text-xs animate-in fade-in duration-150"
            onClick={() => setProjectMenuOpen(false)}
          >
            <div className="px-3 py-1 font-bold text-riso-ink-secondary text-[11px] uppercase tracking-wider">
              Projets ({projects.length})
            </div>

            <div className="max-h-52 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProjectId(p.id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-riso-p1-light transition-colors cursor-pointer ${
                    p.id === activeProject.id
                      ? 'bg-riso-p1-light text-riso-ink font-bold border-l-2 border-riso-ink'
                      : 'text-riso-ink'
                  }`}
                >
                  <span className="truncate pr-2 font-bold">{p.settings.name}</span>
                  <span className="text-[11px] text-riso-ink bg-riso-p3 px-1.5 py-0.5 rounded-[999px] border-2 border-riso-ink font-bold">
                    {p.settings.mode === 'individuel' ? 'Solo' : 'Groupe'}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t-2 border-riso-ink mt-1 pt-1 space-y-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuOpen(false);
                  onOpenNewProject();
                }}
                className="w-full text-left px-3 py-2 hover:bg-riso-p1-light flex items-center gap-2 text-riso-ink font-bold transition-colors cursor-pointer"
              >
                <span>+ Nouveau projet</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuOpen(false);
                  onOpenProjectManager();
                }}
                className="w-full text-left px-3 py-2 hover:bg-riso-p1-light flex items-center gap-2 text-riso-ink font-medium border-t border-riso-line pt-1 transition-colors cursor-pointer"
              >
                <FolderKanban className="w-3.5 h-3.5 text-riso-ink" />
                <span>Gérer les projets</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation items (4 tabs) */}
      <nav className="flex-1 px-2 xl:px-3 py-4 space-y-2 overflow-visible xl:overflow-y-auto">
        <div className="hidden xl:block px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-riso-ink-secondary">
          Navigation
        </div>

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              aria-label={tab.label}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs transition-all cursor-pointer group focus-visible:outline-none ${
                isActive
                  ? 'bg-riso-p1-light text-riso-ink font-bold border-2 border-riso-ink shadow-riso-press'
                  : 'text-riso-ink-secondary hover:text-riso-ink hover:bg-riso-paper font-semibold border-2 border-transparent'
              }`}
            >
              <div
                className={`shrink-0 flex items-center justify-center transition-transform ${
                  isActive ? 'scale-105 text-riso-ink' : 'group-hover:scale-105'
                }`}
              >
                {tab.icon}
              </div>

              <span className="hidden xl:inline-block flex-1 text-left truncate font-bold text-xs">
                {tab.label}
              </span>

              {/* Infobulle en mode réduit (< xl) */}
              <div
                role="tooltip"
                className="hidden md:flex xl:hidden pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-riso-ink text-white text-xs font-bold rounded-[8px] shadow-riso-press whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 items-center gap-1.5"
              >
                <span>{tab.label}</span>
                <span className="text-[10px] text-riso-p3 font-mono">[{tab.shortcut}]</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* 4. Bottom Utility Area: Vue détaillée, Réglages et Aide */}
      <div className="p-2 xl:p-3 border-t-2 border-riso-ink space-y-2 bg-riso-paper shrink-0">
        <button
          type="button"
          onClick={onOpenDetailedView}
          title="Vue détaillée"
          aria-label="Vue détaillée"
          className="btn-riso-secondary w-full justify-center xl:justify-start"
        >
          <TableProperties className="w-4 h-4 text-riso-ink shrink-0 mx-auto xl:mx-0" />
          <span className="hidden xl:inline truncate text-left flex-1 font-bold">Vue détaillée</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parametres')}
          title="Réglages"
          aria-label="Réglages"
          className={`w-full flex items-center justify-center xl:justify-start gap-2 p-2 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'parametres'
              ? 'bg-riso-p1-light text-riso-ink border-2 border-riso-ink shadow-riso-press'
              : 'text-riso-ink-secondary hover:text-riso-ink hover:bg-white border-2 border-transparent'
          }`}
        >
          <Settings className="w-4 h-4 text-riso-ink shrink-0 mx-auto xl:mx-0" />
          <span className="hidden xl:inline truncate flex-1 text-left font-bold">Réglages</span>
        </button>

        <button
          type="button"
          onClick={onOpenLegend}
          title="Aide"
          aria-label="Aide"
          className="w-full flex items-center justify-center xl:justify-start gap-1.5 py-1 px-1.5 text-[13px] text-riso-ink-secondary hover:text-riso-ink hover:underline cursor-pointer font-medium transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline truncate">Aide</span>
        </button>
      </div>
    </aside>
  );
};
