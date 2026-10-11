/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { LegendModal } from './components/LegendBar';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { DetailedViewModal } from './components/modals/DetailedViewModal';
import { ProjectCreationWizardModal } from './components/modals/ProjectCreationWizardModal';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { FocusModeModal } from './components/modals/FocusModeModal';

import { TodaySection } from './components/sections/TodaySection';
import { ParcoursSection } from './components/sections/ParcoursSection';
import { SessionsSection } from './components/sections/SessionsSection';
import { LogbookSection } from './components/sections/LogbookSection';

// Preserved detailed views
import { DashboardSection } from './components/sections/DashboardSection';
import { SettingsSection } from './components/sections/SettingsSection';
import { RoadmapSection } from './components/sections/RoadmapSection';
import { RetroplanningSection } from './components/sections/RetroplanningSection';
import { ChecklistSection } from './components/sections/ChecklistSection';
import { DeliverablesSection } from './components/sections/DeliverablesSection';
import { diffInDays, formatISODate } from './utils/dateCalculations';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, activeProject } = useProject();

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isDetailedViewOpen, setIsDetailedViewOpen] = useState(false);
  const [detailedViewInitialTab, setDetailedViewInitialTab] = useState('tableau_de_bord');

  const todayISO = formatISODate(new Date());
  const daysLeft = diffInDays(todayISO, activeProject.settings.deadlineDate);

  const handleOpenDetailedWithTab = (tabName: string) => {
    setDetailedViewInitialTab(tabName);
    setIsDetailedViewOpen(true);
  };

  // Au changement d'onglet, remonte la page en haut
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Keyboard shortcuts: 1-4 for tabs, N for new item, Escape for closing modals/drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setIsDetailedViewOpen(false);
        setIsNotificationsOpen(false);
        setIsLegendOpen(false);
        setIsProjectManagerOpen(false);
        setIsWizardOpen(false);
        window.dispatchEvent(new CustomEvent('studioplanner:escape'));
        return;
      }

      if (isInput) return;

      if (e.key === '1') {
        setActiveTab('aujourdhui');
      } else if (e.key === '2') {
        setActiveTab('parcours');
      } else if (e.key === '3') {
        setActiveTab('sessions');
      } else if (e.key === '4') {
        setActiveTab('journal');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('studioplanner:new'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen flex flex-col bg-riso-paper text-riso-ink">
      {/* Desktop Fixed Sidebar (>= 768px) */}
      <DesktopSidebar
        onOpenDetailedView={() => handleOpenDetailedWithTab('tableau_de_bord')}
        onOpenLegend={() => setIsLegendOpen(true)}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
      />

      {/* Top Navigation Bar */}
      <Header
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenDetailedView={() => handleOpenDetailedWithTab('tableau_de_bord')}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenHelp={() => setIsLegendOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 md:pb-12 md:pl-[88px] xl:pl-[260px] transition-all">
        {/* Core 4 Screens */}
        {activeTab === 'aujourdhui' && <TodaySection />}
        {activeTab === 'parcours' && <ParcoursSection />}
        {activeTab === 'sessions' && <SessionsSection />}
        {activeTab === 'journal' && <LogbookSection />}

        {/* Detailed direct views if navigated via alert or legacy link */}
        {activeTab === 'tableau_de_bord' && <DashboardSection />}
        {activeTab === 'parametres' && <SettingsSection />}
        {activeTab === 'feuille_de_route' && <RoadmapSection />}
        {activeTab === 'retroplanning' && <RetroplanningSection />}
        {activeTab === 'checklist' && (
          <ChecklistSection
            isInsideModal={false}
            onOpenDetailedView={() => handleOpenDetailedWithTab('checklist')}
          />
        )}
        {activeTab === 'livrables' && <DeliverablesSection />}
      </main>

      {/* Subtle Footer (hidden on small screens, padded on desktop) */}
      <footer className="hidden sm:block border-t-2 border-riso-ink bg-white py-3 md:pl-[88px] xl:pl-[260px] text-[13px] text-riso-ink-secondary transition-all">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-riso-ink">StudioPlanner</span>
            <span>·</span>
            <span>Démarche de projet en design</span>
          </div>

          <div className="flex items-center gap-3 tabular-nums text-[13px]">
            <span className={daysLeft < 0 ? 'text-riso-p4 font-bold' : daysLeft <= 7 ? 'text-riso-p5 font-bold' : 'text-riso-ink font-bold'}>
              {daysLeft >= 0 ? `J-${daysLeft}` : `J+${Math.abs(daysLeft)}`}
            </span>
          </div>
        </div>
      </footer>

      {/* Fixed Bottom Navigation (Mobile < 768px only) */}
      <BottomNav />

      {/* Modals */}
      <FocusModeModal />
      <DetailedViewModal
        isOpen={isDetailedViewOpen}
        onClose={() => setIsDetailedViewOpen(false)}
        initialTab={detailedViewInitialTab}
      />
      <LegendModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
      />
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onOpenWizard={() => {
          setIsNewProjectOpen(false);
          setIsWizardOpen(true);
        }}
      />
      <ProjectCreationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <MainAppContent />
    </ProjectProvider>
  );
}
