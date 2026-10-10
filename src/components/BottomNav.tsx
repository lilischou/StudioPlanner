import React from 'react';
import { useProject, TabType } from '../context/ProjectContext';
import {
  Sun,
  Layers,
  Clock,
  BookOpen,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useProject();

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'aujourdhui', label: 'Aujourd\'hui', icon: <Sun className="w-5 h-5" /> },
    { id: 'parcours', label: 'Parcours', icon: <Layers className="w-5 h-5" /> },
    { id: 'sessions', label: 'Sessions', icon: <Clock className="w-5 h-5" /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t-2 border-[#22408F] shadow-[0_-2px_0_#22408F] py-1 md:hidden"
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              aria-label={tab.label}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-[8px] transition-all cursor-pointer ${
                isActive
                  ? 'text-[#22408F] font-bold'
                  : 'text-[#5A6A94] hover:text-[#22408F] font-semibold'
              }`}
            >
              <div className={`p-1 rounded-[8px] transition-transform ${
                isActive ? 'scale-110 text-[#22408F] bg-[#EBF1FF] border-2 border-[#22408F]' : ''
              }`}>
                {tab.icon}
              </div>
              <span className={`text-xs tracking-tight leading-none mt-1 font-bold ${
                isActive ? 'text-[#22408F]' : 'text-[#5A6A94]'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
