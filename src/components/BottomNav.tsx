import React from 'react';
import { useProject, TabType } from '../context/ProjectContext';
import {
  Sun,
  Layers,
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
      <div className="pointer-events-auto bg-riso-card border-2 border-riso-ink shadow-riso rounded-full px-3 py-1.5 flex items-center justify-between gap-1 w-full max-w-[380px]">
        {/* 1. aujourd'hui */}
        <button
          type="button"
          onClick={() => setActiveTab('aujourdhui')}
          aria-label="aujourd'hui"
          className={`flex-1 flex flex-col items-center justify-center py-0.5 px-1 rounded-full transition-all cursor-pointer ${
            activeTab === 'aujourdhui'
              ? 'text-riso-ink font-bold'
              : 'text-riso-ink-secondary hover:text-riso-ink font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'aujourdhui'
                ? 'scale-110 text-riso-ink bg-riso-p1-tint'
                : ''
            }`}
          >
            <Sun className="w-4 h-4" />
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
              ? 'text-riso-ink font-bold'
              : 'text-riso-ink-secondary hover:text-riso-ink font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'parcours'
                ? 'scale-110 text-riso-ink bg-riso-p1-tint'
                : ''
            }`}
          >
            <Layers className="w-4 h-4" />
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
          className="w-10 h-10 rounded-full bg-riso-p4 text-white border-2 border-riso-ink flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform mx-1 shadow-riso-press"
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
              ? 'text-riso-ink font-bold'
              : 'text-riso-ink-secondary hover:text-riso-ink font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'sessions'
                ? 'scale-110 text-riso-ink bg-riso-p1-tint'
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
              ? 'text-riso-ink font-bold'
              : 'text-riso-ink-secondary hover:text-riso-ink font-semibold'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              activeTab === 'journal'
                ? 'scale-110 text-riso-ink bg-riso-p1-tint'
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
