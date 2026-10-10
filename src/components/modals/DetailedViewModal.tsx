import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  X,
  LayoutDashboard,
  Settings,
  Layers,
  Calendar,
  FolderKanban,
  CheckSquare,
  FileCheck,
  TableProperties,
} from 'lucide-react';
import { DashboardSection } from '../sections/DashboardSection';
import { SettingsSection } from '../sections/SettingsSection';
import { RoadmapSection } from '../sections/RoadmapSection';
import { RetroplanningSection } from '../sections/RetroplanningSection';
import { SessionsTableSection } from '../sections/SessionsTableSection';
import { ChecklistSection } from '../sections/ChecklistSection';
import { DeliverablesSection } from '../sections/DeliverablesSection';

interface DetailedViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const DetailedViewModal: React.FC<DetailedViewModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'tableau_de_bord',
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<string>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setSelectedSubTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const views = [
    { id: 'tableau_de_bord', label: 'Synthèse', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'retroplanning', label: 'Planning', icon: <Calendar className="w-4 h-4" /> },
    { id: 'sessions_table', label: 'Sessions', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'checklist', label: 'Tâches', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'livrables', label: 'Livrables', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'feuille_de_route', label: 'Phases', icon: <Layers className="w-4 h-4" /> },
    { id: 'parametres', label: 'Réglages', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleTabChange = (tabId: string) => {
    setSelectedSubTab(tabId);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] border-2 border-[#22408F] shadow-[0_4px_0_#22408F] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#2F6DBB] text-white rounded-[8px] border-2 border-[#22408F]">
              <TableProperties className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#22408F] font-heading">
                Vue détaillée
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] hover:bg-[#EBF1FF] transition-colors border border-transparent hover:border-[#22408F] cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs toolbar (Style onglet souligné 3px, sans barre bleue épaisse ni contour pastille) */}
        <div className="px-6 bg-white border-b border-[#DCE2EF] overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2 min-w-max">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleTabChange(v.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[13px] border-b-[3px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedSubTab === v.id
                    ? 'border-[#2F6DBB] text-[#22408F] font-bold'
                    : 'border-transparent text-[#5A6A94] hover:text-[#22408F] hover:border-[#DCE2EF] font-semibold'
                }`}
              >
                {v.icon}
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area (remonte en haut au changement d'onglet) */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-[#FBFAF6]">
          {selectedSubTab === 'tableau_de_bord' && <DashboardSection />}
          {selectedSubTab === 'retroplanning' && <RetroplanningSection />}
          {selectedSubTab === 'sessions_table' && <SessionsTableSection />}
          {selectedSubTab === 'checklist' && <ChecklistSection isInsideModal={true} />}
          {selectedSubTab === 'livrables' && <DeliverablesSection />}
          {selectedSubTab === 'feuille_de_route' && <RoadmapSection />}
          {selectedSubTab === 'parametres' && <SettingsSection />}
        </div>
      </div>
    </div>
  );
};
