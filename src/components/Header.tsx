import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import {
  Bell,
  AlertTriangle,
  Menu,
  X,
  Plus,
  TableProperties,
  Settings,
  HelpCircle,
  Check,
} from 'lucide-react';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenDetailedView?: () => void;
  onOpenNewProject?: () => void;
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onOpenDetailedView,
  onOpenNewProject,
  onOpenHelp,
}) => {
  const {
    unreadNotificationCount,
    dependencyAlerts,
    activeTab,
    setActiveTab,
    activeProject,
    projects,
    setActiveProjectId,
  } = useProject();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = () => setIsMenuOpen(false);
    window.addEventListener('studioplanner:escape', handleEscape);
    return () => window.removeEventListener('studioplanner:escape', handleEscape);
  }, []);

  const tabTitles: Record<string, string> = {
    aujourdhui: "Aujourd'hui",
    parcours: 'Parcours',
    sessions: 'Sessions',
    journal: 'Journal',
    tableau_de_bord: 'Synthèse',
    parametres: 'Réglages',
    feuille_de_route: 'Phases',
    retroplanning: 'Planning',
    checklist: 'Checklist',
    livrables: 'Livrables',
  };

  const currentTabLabel = tabTitles[activeTab] || 'Projet';

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b-2 border-[#22408F] md:pl-[72px] xl:pl-[240px] transition-all text-[#22408F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Zone 1: Menu (< 1024px) + Mobile brand vs Desktop Screen Title & Mode badge */}
            <div className="flex items-center gap-3">
              {/* Bouton menu (≡) pour largeur < 1024 px */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-[8px] border-2 border-[#22408F] bg-white text-[#22408F] shadow-[0_2px_0_#22408F] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Menu principal"
                title="Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Mobile-only Logo and Brand */}
              <div className="flex md:hidden items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-white overflow-hidden shrink-0 flex items-center justify-center border-2 border-[#22408F] shadow-[0_4px_0_#22408F]">
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
                <span className="font-bold text-base text-[#22408F] tracking-tight flex items-center">
                  StudioPlanner
                </span>
                <span className="text-[11px] text-[#22408F] bg-[#F2D21B] px-2 py-0.5 rounded-[999px] border-2 border-[#22408F] font-bold">
                  {activeProject.settings.mode === 'individuel' ? 'Solo' : 'Groupe'}
                </span>
              </div>

              {/* Desktop-only Screen Title & Mode badge */}
              <div className="hidden md:flex items-center gap-2.5 text-sm">
                <span className="font-bold text-base text-[#22408F] tracking-tight">
                  {currentTabLabel}
                </span>
                <span className="text-[11px] text-[#22408F] bg-[#F2D21B] px-2 py-0.5 rounded-[999px] border-2 border-[#22408F] font-bold">
                  {activeProject.settings.mode === 'individuel' ? 'Solo' : 'Groupe'}
                </span>
              </div>
            </div>

            {/* Zone 2: Actions (Alerte dépendances & Notifications) */}
            <div className="flex items-center gap-2">
              {dependencyAlerts.length > 0 && onOpenDetailedView && (
                <button
                  type="button"
                  onClick={onOpenDetailedView}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#22408F] bg-[#FFF9D6] hover:bg-[#FFDD00] rounded-[8px] border-2 border-[#22408F] shadow-[0_4px_0_#22408F] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#22408F] active:translate-y-1 active:shadow-none transition-all font-semibold cursor-pointer"
                  title={`${dependencyAlerts.length} conflit(s) de dépendance détecté(s)`}
                  aria-label={`${dependencyAlerts.length} conflit(s) de dépendance détecté(s)`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#22408F] shrink-0" />
                  <span className="tabular-nums font-bold">{dependencyAlerts.length}</span>
                </button>
              )}

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 text-[#22408F] bg-white hover:bg-[#EBF1FF] rounded-[8px] border-2 border-[#22408F] shadow-[0_4px_0_#22408F] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#22408F] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                title="Rappels"
                aria-label="Rappels"
              >
                <Bell className="w-4 h-4 text-[#22408F]" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[11px] font-bold text-white bg-[#F0505A] rounded-[999px] border-2 border-[#22408F]">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tiroir Mobile / Tablette (< 1024 px) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#22408F]/40 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-150"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="w-[300px] max-w-[85vw] h-full bg-[#FBFAF6] border-r-2 border-[#22408F] shadow-[4px_0_0_#22408F] flex flex-col animate-in slide-in-from-left duration-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Entête du tiroir */}
            <div className="p-4 border-b-2 border-[#22408F] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-white overflow-hidden shrink-0 flex items-center justify-center border-2 border-[#22408F] shadow-[0_2px_0_#22408F]">
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
                <span className="font-bold text-base text-[#22408F] tracking-tight">StudioPlanner</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu du tiroir */}
            <div className="p-4 space-y-6 flex-1">
              {/* 1. Sélecteur de projet */}
              <div>
                <span className="text-[11px] font-bold text-[#5A6A94] uppercase tracking-wider block mb-2">
                  Projet actif
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {projects.map((proj) => {
                    const isCurrent = proj.id === activeProject.id;
                    const projColor = proj.settings?.color || '#2F6DBB';
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-[8px] border-2 transition-all cursor-pointer text-left ${
                          isCurrent
                            ? 'bg-white border-[#22408F] shadow-[0_2px_0_#22408F]'
                            : 'border-transparent hover:bg-white/70 text-[#5A6A94]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-[#22408F]"
                          style={{ backgroundColor: projColor }}
                        />
                        <span className={`flex-1 text-xs truncate ${isCurrent ? 'font-bold text-[#22408F]' : 'font-medium'}`}>
                          {proj.settings?.name || 'Sans titre'}
                        </span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#2E8B4A] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Actions : + Nouveau projet, Vue détaillée, Réglages, Aide */}
              <div className="space-y-2.5 pt-3 border-t-2 border-[#DCE2EF]">
                {/* + Nouveau projet */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenNewProject?.();
                  }}
                  className="btn-riso-primary w-full text-xs justify-center py-2.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Nouveau projet</span>
                </button>

                {/* Vue détaillée */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenDetailedView?.();
                  }}
                  className="btn-riso-secondary w-full text-xs justify-center py-2.5 cursor-pointer"
                >
                  <TableProperties className="w-4 h-4 text-[#22408F]" />
                  <span>Vue détaillée</span>
                </button>

                {/* Réglages */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveTab('parametres');
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-[8px] text-xs font-bold border-2 border-[#22408F] bg-white text-[#22408F] shadow-[0_2px_0_#22408F] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#22408F]" />
                  <span>Réglages</span>
                </button>

                {/* Aide */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenHelp?.();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[#5A6A94] hover:text-[#22408F] font-bold hover:underline cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-[#5A6A94]" />
                  <span>Aide & Légende</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
