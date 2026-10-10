import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Bell, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenDetailedView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onOpenDetailedView,
}) => {
  const {
    unreadNotificationCount,
    dependencyAlerts,
    activeTab,
    activeProject,
  } = useProject();

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
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b-2 border-[#22408F] md:pl-[72px] xl:pl-[240px] transition-all text-[#22408F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Zone 1: Mobile brand vs Desktop Screen Title & Mode badge */}
          <div className="flex items-center gap-3">
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
  );
};
