import React from 'react';
import { useProject, TabType } from '../context/ProjectContext';
import {
  Sparkles,
  Clock,
  BookOpen,
  Plus,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useProject();

  const handleOpenNew = () => {
    window.dispatchEvent(new CustomEvent('studioplanner:new'));
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-3 left-4 right-4 z-40 md:hidden flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto bg-[#FFFFFF] border-2 border-[#22408F] shadow-[0_4px_0_#22408F] rounded-full px-3 py-1.5 flex items-center justify-between gap-1 w-full max-w-[380px]">
        {/* 1. aujourd'hui */}
        <button
          type="button"
          onClick={() => setActiveTab('aujourdhui')}
          aria-label="aujourd'hui"
          className={`flex-1 flex flex-col items-center justify-center py-0.5 px-1 rounded-full transition-all cursor-pointer ${
            activeTab === 'aujourdhui'
              ? 'text-[#22408F] font-bold'
              : 'text-[#5A6A94] hover:text-[#22408F] font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'aujourdhui'
                ? 'scale-110 text-[#22408F] bg-[#D1DFF0]'
                : ''
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[11px] tracking-tight leading-none mt-0.5 lowercase font-bold">
            aujourd'hui
          </span>
        </button>

        {/* 2. parcours */}
        <button
          type="button"
          onClick={() => setActiveTab('parcours')}
          aria-label="parcours"
          className={`flex-1 flex flex-col items-center justify-center py-0.5 px-1 rounded-full transition-all cursor-pointer ${
            activeTab === 'parcours'
              ? 'text-[#22408F] font-bold'
              : 'text-[#5A6A94] hover:text-[#22408F] font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'parcours'
                ? 'scale-110 text-[#22408F] bg-[#D1DFF0]'
                : ''
            }`}
          >
            <span className="text-sm leading-none font-bold block px-0.5">◇</span>
          </div>
          <span className="text-[11px] tracking-tight leading-none mt-0.5 lowercase font-bold">
            parcours
          </span>
        </button>

        {/* 3. Bouton central rouge (+) */}
        <button
          type="button"
          onClick={handleOpenNew}
          title="Ajouter un élément (N)"
          aria-label="Ajouter un élément"
          className="w-10 h-10 rounded-full bg-[#F0505A] text-white border-2 border-[#22408F] flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform mx-1 shadow-[0_2px_0_#22408F]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* 4. sessions */}
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          aria-label="sessions"
          className={`flex-1 flex flex-col items-center justify-center py-0.5 px-1 rounded-full transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'text-[#22408F] font-bold'
              : 'text-[#5A6A94] hover:text-[#22408F] font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'sessions'
                ? 'scale-110 text-[#22408F] bg-[#D1DFF0]'
                : ''
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[11px] tracking-tight leading-none mt-0.5 lowercase font-bold">
            sessions
          </span>
        </button>

        {/* 5. journal */}
        <button
          type="button"
          onClick={() => setActiveTab('journal')}
          aria-label="journal"
          className={`flex-1 flex flex-col items-center justify-center py-0.5 px-1 rounded-full transition-all cursor-pointer ${
            activeTab === 'journal'
              ? 'text-[#22408F] font-bold'
              : 'text-[#5A6A94] hover:text-[#22408F] font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'journal'
                ? 'scale-110 text-[#22408F] bg-[#D1DFF0]'
                : ''
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[11px] tracking-tight leading-none mt-0.5 lowercase font-bold">
            journal
          </span>
        </button>
      </div>
    </nav>
  );
};
