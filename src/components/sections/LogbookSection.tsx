import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { LogbookEntry, DEFAULT_OPERATION_TAGS } from '../../types/project';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Share2,
  Camera,
  Image as ImageIcon,
  Grid,
  List,
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Tag,
  Clock,
  Printer,
  ChevronRight,
  Link as LinkIcon,
  Filter,
} from 'lucide-react';
import { formatFrenchDate, formatISODate } from '../../utils/dateCalculations';
import { getFileRefs, getDone, getObserved, getDecided, getTraceTitle, getResultText, getWorkDocs, getResultDocs } from '../../utils/trace';
import { deleteFile } from '../../utils/traceStorage';
import { TraceCard } from '../trace/TraceCard';
import { TracePanel } from '../trace/TracePanel';
import { TraceCreateModal, NewTrace } from '../trace/TraceCreateModal';
import { TraceCover } from '../trace/TraceCover';
import { PrintCover, TracePrintExtras, docsToMarkdown } from '../trace/TracePrint';
import { PHASE_COLORS } from './TodaySection';
import { getPhaseColor } from '../../utils/theme';

export const LogbookSection: React.FC = () => {
  const {
    activeProject,
    projects,
    addLogbookEntry,
    updateLogbookEntry,
    deleteLogbookEntry,
    journalDraft,
    clearJournalDraft,
    setActiveTab,
  } = useProject();

  const { logbook, settings, phases, sessions, tasks } = activeProject;
  const availableTags = settings.customTags !== undefined ? settings.customTags : DEFAULT_OPERATION_TAGS;

  // View mode: 'list' (cartes avec photos 4:3 et texte) ou 'wall' (mur de photos/planche contact)
  const [viewMode, setViewMode] = useState<'list' | 'wall'>('list');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // La fiche lit toujours la version à jour de la trace (sauvegarde automatique)
  const selectedEntry = selectedId ? logbook.find((e) => e.id === selectedId) ?? null : null;
  const setSelectedEntry = (e: LogbookEntry | null) => setSelectedId(e ? e.id : null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<Partial<LogbookEntry> | null>(null);

  // Handle incoming draft from Sessions or Focus Mode
  useEffect(() => {
    if (journalDraft) {
      setModalDraft(journalDraft);
      setIsAddModalOpen(true);
      clearJournalDraft();
    }
  }, [journalDraft, clearJournalDraft]);

  // Phase pré-remplie : la phase en cours à la date du jour (sinon la dernière commencée, sinon la première)
  const getDefaultPhaseId = () => {
    const today = formatISODate(new Date());
    const current = phases.find(
      (p) => p.calculatedStartDate && p.calculatedEndDate && today >= p.calculatedStartDate && today <= p.calculatedEndDate
    );
    if (current) return current.id;
    const started = phases.filter((p) => p.calculatedStartDate && today >= p.calculatedStartDate);
    return started[started.length - 1]?.id || phases[0]?.id || 'p1';
  };

  // Open add modal manually
  const handleOpenAddModal = () => {
    setModalDraft(null);
    setIsAddModalOpen(true);
  };

  const handleCreateTrace = (trace: NewTrace) => {
    addLogbookEntry(trace);
    setIsAddModalOpen(false);
  };

  // Suppression des fichiers IndexedDB devenus orphelins (jamais ceux encore utilisés par une trace, même d'un autre projet)
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const releaseFiles = (refs: string[]) => {
    const unique = Array.from(new Set(refs.filter(Boolean)));
    if (unique.length === 0) return;
    setTimeout(() => {
      const inUse = new Set<string>();
      projectsRef.current.forEach((p) =>
        (p.logbook || []).forEach((e) => getFileRefs(e).forEach((r) => inUse.add(r)))
      );
      unique.forEach((r) => {
        if (!inUse.has(r)) void deleteFile(r);
      });
    }, 400);
  };

  const handleDeleteTrace = (entry: LogbookEntry) => {
    deleteLogbookEntry(entry.id);
    setSelectedEntry(null);
    releaseFiles(getFileRefs(entry));
  };

  const getLinkLabel = (entry: LogbookEntry) => {
    const s = sessions.find((x) => x.id === entry.sessionId);
    const t = tasks.find((x) => x.id === entry.taskId);
    return s ? s.objective : t?.title;
  };

  // Filter entries
  const filteredEntries = [...logbook]
    .filter((entry) => {
      // Phase filter
      if (selectedPhaseFilter !== 'all' && entry.phaseId !== selectedPhaseFilter) {
        return false;
      }
      // Tag filter
      if (selectedTagFilter !== 'all') {
        if (!entry.tags || !entry.tags.includes(selectedTagFilter)) {
          return false;
        }
      }
      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const haystack = [
          entry.title,
          getDone(entry),
          getObserved(entry),
          getDecided(entry),
          getResultText(entry),
          ...getWorkDocs(entry).map((d) => d.name),
          ...getResultDocs(entry).map((d) => d.name),
          ...(entry.tags || []),
        ]
          .filter(Boolean)
          .join(' \n ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    })
    // Most recent to oldest
    .sort((a, b) => b.date.localeCompare(a.date));

  // Group entries by Month ("Octobre 2026", "Septembre 2026", etc.)
  const groupedByMonth = filteredEntries.reduce<Record<string, LogbookEntry[]>>((acc, entry) => {
    const d = new Date(entry.date);
    const monthKey = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
    if (!acc[capitalizedMonth]) acc[capitalizedMonth] = [];
    acc[capitalizedMonth].push(entry);
    return acc;
  }, {});

  // Full Markdown export fallback
  const handleExportMarkdown = () => {
    let md = `# Carnet de Démarche & Journal de Bord — ${settings.name}\n`;
    md += `**Projet :** ${settings.name}\n`;
    md += `**Période :** Du ${formatFrenchDate(settings.startDate)} au ${formatFrenchDate(settings.deadlineDate)}\n\n`;
    md += `---\n\n`;

    filteredEntries.forEach((entry) => {
      const phase = phases.find((p) => p.id === entry.phaseId);
      md += `## ${getTraceTitle(entry)} · ${formatFrenchDate(entry.date)} (${phase ? phase.name : 'Phase'})\n\n`;
      if (entry.tags && entry.tags.length > 0) {
        md += `*Opérations :* ${entry.tags.join(', ')}\n\n`;
      }
      md += `**1. Ce que j'ai fait :**\n${getDone(entry) || '—'}\n\n`;
      md += `**2. Ce que je constate :**\n${getObserved(entry) || '—'}\n\n`;
      if (getDecided(entry)) {
        md += `**3. Ce que je décide :**\n${getDecided(entry)}\n\n`;
      }
      md += docsToMarkdown(entry);
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carnet_recherche_${settings.name.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };


  // Listen to keyboard shortcuts from App.tsx
  React.useEffect(() => {
    const handleNew = () => {
      handleOpenAddModal();
    };
    const handleEscape = () => {
      setSelectedEntry(null);
      setIsAddModalOpen(false);
      setIsPrintModalOpen(false);
    };
    window.addEventListener('studioplanner:new', handleNew);
    window.addEventListener('studioplanner:escape', handleEscape);
    return () => {
      window.removeEventListener('studioplanner:new', handleNew);
      window.removeEventListener('studioplanner:escape', handleEscape);
    };
  }, []);

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE VIEW (< 768px) - Strictly identical to before     */}
      {/* ============================================================ */}
      <div className="block md:hidden max-w-md mx-auto py-2 sm:py-4 px-2 space-y-6 animate-in fade-in duration-200 relative pb-20">
      
      {/* 1. En-tête : Sélecteur 2 vues + Exporter + Nouvelle trace */}
      <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border-2 border-[#22408F] shadow-[0_4px_0_#22408F]">
        {/* Switcher Liste / Mur (contrôle segmenté contour bleu) */}
        <div className="flex items-center bg-white p-0.5 rounded-xl border-2 border-[#22408F]">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#22408F] text-white shadow-2xs'
                : 'text-[#5A6A94] hover:text-[#22408F]'
            }`}
            title="Vue Liste chronologique"
          >
            <List className="w-3.5 h-3.5" />
            <span>Liste</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('wall')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'wall'
                ? 'bg-[#22408F] text-white shadow-2xs'
                : 'text-[#5A6A94] hover:text-[#22408F]'
            }`}
            title="Vue Mur de photos (Planche contact)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Mur</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Exporter le carnet imprimable (bouton secondaire) */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="btn-riso-secondary text-xs px-2.5 py-1.5"
            title="Générer la mise en page imprimable du carnet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exporter</span>
            <span className="sm:hidden">Export</span>
          </button>

          {/* Nouvelle trace */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn-riso-primary text-xs px-2.5 py-1.5"
            title="Nouvelle trace"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Nouvelle trace</span>
          </button>
        </div>
      </div>

      {/* 2. Barre de recherche discrète et Filtres en pastilles */}
      <div className="space-y-3">
        {/* Recherche texte */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une trace, un constat, une étiquette..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtres par Phase et par Étiquette (Pastilles horizontales défilables) */}
        <div className="flex flex-col gap-2">
          {/* Ligne 1 : Phases */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
              Phase :
            </span>
            <button
              type="button"
              onClick={() => setSelectedPhaseFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedPhaseFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Toutes
            </button>
            {phases.map((p) => {
              const pColor = getPhaseColor(p, phases);
              const isSelected = selectedPhaseFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPhaseFilter(isSelected ? 'all' : p.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pColor.hex }}
                  />
                  <span>{p.nom || p.name || p.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Ligne 2 : Étiquettes d'opération */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
              Opération :
            </span>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedTagFilter === 'all'
                  ? 'bg-purple-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Toutes
            </button>
            {availableTags.map((tag) => {
              const isSelected = selectedTagFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTagFilter(isSelected ? 'all' : tag)}
                  className={`px-2.5 py-1 rounded-[999px] text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] shadow-[0_2px_0_#22408F]'
                      : 'bg-white border-2 border-[#22408F]/30 text-[#5A6A94] hover:border-[#22408F] hover:text-[#22408F]'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}#{tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Contenu principal : État vide OU Liste groupée par mois OU Mur */}
      {filteredEntries.length === 0 ? (
        /* État vide demandé : Mascotte en 96 px + texte exact */
        <div className="bg-white border border-neutral-200/90 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-2xs my-4">
          <div className="w-24 h-24 rounded-2xl bg-white border border-neutral-200/80 p-2 shadow-2xs flex items-center justify-center">
            <img
              src="/logo.png"
              alt=""
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
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-base font-bold text-neutral-900">
              Ton carnet est vide.
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Ajoute ta première trace après ta prochaine session.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn-riso-primary text-xs mt-2"
            title="Nouvelle trace"
            aria-label="Nouvelle trace"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouvelle trace</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* Vue 1 : LISTE CHRONOLOGIQUE GROUPÉE PAR MOIS */
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([monthTitle, entries]) => (
            <div key={monthTitle} className="space-y-3">
              {/* Titre du mois */}
              <div className="sticky top-16 z-10 bg-neutral-50/90 backdrop-blur-xs py-1.5 px-1 border-b border-neutral-200/60 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  {monthTitle}
                </h2>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {entries.length} trace{entries.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Cartes d'entrées du mois */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entries.map((entry) => (
                  <TraceCard
                    key={entry.id}
                    entry={entry}
                    phase={phases.find((p) => p.id === entry.phaseId)}
                    linkLabel={getLinkLabel(entry)}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vue 2 : MUR DE PHOTOS (Planche contact) */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredEntries.map((entry) => {
              const phaseColor = getPhaseColor(entry.phaseId, phases);
              return (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEntry(entry);
                    }
                  }}
                  className="relative rounded-lg overflow-hidden border-2 border-[#22408F] shadow-[0_3px_0_#22408F] cursor-pointer group"
                >
                  <TraceCover
                    entry={entry}
                    phaseHex={phaseColor.hex}
                    className="w-full aspect-[4/3]"
                    dotSize={8}
                    alt={getTraceTitle(entry)}
                    placeholder={
                      <p className="absolute inset-0 p-2.5 text-xs font-bold text-[#22408F] line-clamp-4 leading-snug">
                        {getTraceTitle(entry)}
                      </p>
                    }
                  />
                  {/* Titre et date au survol / au toucher */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#22408F]/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                    <span className="text-[10px] opacity-80 font-mono">{formatFrenchDate(entry.date, false)}</span>
                    <h4 className="text-xs font-bold line-clamp-2 leading-tight">{getTraceTitle(entry)}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Bouton rond flottant « + » en bas à droite (Toujours facile à toucher - Mobile uniquement) */}
      <div className="fixed bottom-20 right-6 z-20 md:hidden">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="w-13 h-13 rounded-[999px] bg-[#2F6DBB] hover:bg-[#22408F] active:translate-y-1 text-white border-2 border-[#22408F] shadow-[0_4px_0_#F0505A] active:shadow-none flex items-center justify-center transition-all cursor-pointer"
          title="Nouvelle trace"
          aria-label="Nouvelle trace"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP / TABLET VIEW (>= 768px)                         */}
      {/* ============================================================ */}
      <div className="hidden md:block max-w-[1280px] mx-auto py-4 px-4 space-y-6 animate-in fade-in duration-200">
        {/* Top Bar Header */}
        <div className="bg-white border-2 border-[#22408F] rounded-2xl p-3.5 shadow-[0_4px_0_#22408F] flex items-center justify-between gap-4">
          {/* Switcher Grille / Liste : contrôle segmenté à contour bleu */}
          <div className="flex items-center bg-white p-0.5 rounded-xl border-2 border-[#22408F]">
            <button
              type="button"
              onClick={() => setViewMode('wall')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'wall'
                  ? 'bg-[#22408F] text-white shadow-2xs'
                  : 'text-[#5A6A94] hover:text-[#22408F]'
              }`}
              title="Vue Grille de photos"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grille</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#22408F] text-white shadow-2xs'
                  : 'text-[#5A6A94] hover:text-[#22408F]'
              }`}
              title="Vue Liste chronologique"
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Exporter : bouton secondaire */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="btn-riso-secondary text-xs"
              title="Exporter le carnet imprimable"
              aria-label="Exporter le carnet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Exporter</span>
            </button>

            {/* Bouton texte Nouvelle trace (Style principal Riso) */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-riso-primary text-xs"
              title="Nouvelle trace"
              aria-label="Nouvelle trace"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nouvelle trace</span>
            </button>
          </div>
        </div>

        {/* 2 Colonnes : Filtres à gauche, Grille de photos à droite */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Colonne Filtres (Gauche) */}
          <div className="col-span-4 xl:col-span-3 sticky top-20 space-y-4 bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Filtres
              </span>
              {(selectedPhaseFilter !== 'all' || selectedTagFilter !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhaseFilter('all');
                    setSelectedTagFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#22408F] underline underline-offset-2 font-bold cursor-pointer hover:opacity-80"
                >
                  Réinitialiser →
                </button>
              )}
            </div>

            {/* Recherche textuelle */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une trace..."
                className="w-full pl-8 pr-7 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filtre par Phase */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                Phases du projet
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedPhaseFilter('all')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                    selectedPhaseFilter === 'all'
                      ? 'bg-neutral-900 text-white font-bold'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span>Toutes les phases</span>
                  <span className="font-mono text-[10px] opacity-75">{logbook.length}</span>
                </button>
                {phases.map((p) => {
                  const pColor = getPhaseColor(p, phases);
                  const isSelected = selectedPhaseFilter === p.id;
                  const count = logbook.filter((e) => e.phaseId === p.id).length;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPhaseFilter(isSelected ? 'all' : p.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white font-bold'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: pColor.hex }}
                        />
                        <span className="truncate">{p.nom || p.name || p.shortName}</span>
                      </div>
                      <span className="font-mono text-[10px] opacity-75 shrink-0 ml-1">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtre par Opération / Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Opérations
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTagFilter('all')}
                    className={`px-2.5 py-1 rounded-[999px] text-[11px] font-bold transition-all cursor-pointer ${
                      selectedTagFilter === 'all'
                        ? 'bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] shadow-[0_2px_0_#22408F]'
                        : 'bg-white border-2 border-[#22408F]/30 text-[#5A6A94] hover:border-[#22408F] hover:text-[#22408F]'
                    }`}
                  >
                    {selectedTagFilter === 'all' ? '✓ ' : ''}Toutes
                  </button>
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTagFilter(isSelected ? 'all' : tag)}
                        className={`px-2.5 py-1 rounded-[999px] text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] shadow-[0_2px_0_#22408F]'
                            : 'bg-white border-2 border-[#22408F]/30 text-[#5A6A94] hover:border-[#22408F] hover:text-[#22408F]'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}#{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total / Stats */}
            <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 font-mono">
              {filteredEntries.length} trace{filteredEntries.length > 1 ? 's' : ''} affichée{filteredEntries.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Colonne Grille / Contenu (Droite) */}
          <div className="col-span-8 xl:col-span-9 space-y-4">
            {filteredEntries.length === 0 ? (
              /* État vide demandé : Mascotte en 96 px */
              <div className="bg-white border border-neutral-200/90 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
                <div className="w-24 h-24 rounded-2xl bg-white border border-neutral-200/80 p-2 shadow-2xs flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt=""
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
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-base font-bold text-neutral-900">
                    Ton carnet est vide.
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Ajoute ta première trace après ta prochaine session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="btn-riso-primary text-xs mt-2"
                  title="Nouvelle trace"
                  aria-label="Nouvelle trace"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nouvelle trace</span>
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* Vue Liste Desktop */
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <TraceCard
                    key={entry.id}
                    variant="row"
                    entry={entry}
                    phase={phases.find((p) => p.id === entry.phaseId)}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            ) : (
              /* Vue Grille Desktop : 2 cols (768-1199px) ou 3 cols (>= 1200px) */
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredEntries.map((entry) => (
                  <TraceCard
                    key={entry.id}
                    entry={entry}
                    phase={phases.find((p) => p.id === entry.phaseId)}
                    linkLabel={getLinkLabel(entry)}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. CRÉATION RAPIDE D'UNE TRACE : un seul écran */}
      {isAddModalOpen && (
        <TraceCreateModal
          phases={phases}
          defaultPhaseId={getDefaultPhaseId()}
          defaultDate={formatISODate(new Date())}
          author={settings.team[0]?.name || 'Moi-même'}
          availableTags={availableTags}
          draft={modalDraft}
          onSave={handleCreateTrace}
          onCancel={() => setIsAddModalOpen(false)}
          onReleaseFiles={releaseFiles}
        />
      )}

      {/* 6. FICHE D'UNE TRACE (panneau latéral, plein écran sur mobile) */}
      {selectedEntry && (
        <TracePanel
          key={selectedEntry.id}
          entry={selectedEntry}
          phases={phases}
          availableTags={availableTags}
          onUpdate={(patch) => updateLogbookEntry(selectedEntry.id, patch)}
          onClose={() => setSelectedEntry(null)}
          onDelete={() => handleDeleteTrace(selectedEntry)}
          onReleaseFiles={releaseFiles}
          onOpenLinked={() => {
            const sessId = selectedEntry.sessionId;
            setSelectedEntry(null);
            if (sessId) {
              setActiveTab('sessions');
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('studioplanner:open-session', { detail: { sessionId: sessId } })
                );
              }, 50);
            } else {
              setActiveTab('aujourdhui');
            }
          }}
        />
      )}

      {/* 7. MODAL D'EXPORT IMPRIMABLE DU CARNET (Une entrée par page) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl max-w-4xl w-full border-2 border-[#22408F] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
            
            {/* Header du modal d'export (caché à l'impression) */}
            <div className="px-6 py-4 border-b-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between print:hidden">
              <div>
                <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
                  <Printer className="w-4 h-4 text-[#22408F]" />
                  Mise en page imprimable du carnet de recherche
                </h3>
                <p className="text-xs text-[#5A6A94]">
                  Une entrée par page A4 portrait, format standard d'évaluation et de rendu d'atelier.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="btn-riso-secondary text-xs"
                  title="Télécharger en format texte Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger en texte (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-riso-primary text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#22408F] hover:bg-[#EBF1FF] transition-colors cursor-pointer"
                  title="Fermer (Échap)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenu imprimable : Chaque entrée forme une feuille complète */}
            <div className="p-6 overflow-y-auto space-y-12 print:p-0 print:space-y-0">
              {filteredEntries.map((entry, idx) => {
                const phase = phases.find((p) => p.id === entry.phaseId);
                const pColor = getPhaseColor(phase || entry.phaseId, phases);

                return (
                  <div
                    key={entry.id}
                    className="print-plate border-2 border-[#22408F] rounded-2xl p-6 sm:p-8 bg-white space-y-6 print:border-2 print:border-[#22408F] print:rounded-none print:p-8 print:break-after-page print:min-h-screen print:flex print:flex-col print:justify-between"
                  >
                    {/* En-tête de la planche de carnet */}
                    <div className="flex items-center justify-between border-b-2 border-[#22408F]/20 pb-4">
                      <div>
                        <span className="text-xs font-mono text-[#5A6A94] uppercase tracking-widest block font-bold">
                          Projet {settings.name} · Planche {idx + 1}/{filteredEntries.length}
                        </span>
                        <h2 className="text-xl font-bold text-[#22408F] mt-1 font-heading">
                          {getTraceTitle(entry)}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-xs font-bold px-2.5 py-0.5 rounded-[999px] inline-block mb-1 border border-[#22408F]"
                          style={{
                            backgroundColor: `${pColor.hex}20`,
                            color: '#22408F',
                          }}
                        >
                          {phase?.nom || phase?.name || 'Phase'}
                        </span>
                        <span className="text-xs font-mono text-[#5A6A94] block">
                          {formatFrenchDate(entry.date)}
                        </span>
                      </div>
                    </div>

                    {/* Photo en grand format 4:3 */}
                    <PrintCover entry={entry} alt={getTraceTitle(entry)} />

                    {/* Bloc 3 champs : 1. Ce que j'ai fait, 2. Ce que je constate, 3. Ce que je décide */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                      <div className="p-4 rounded-xl bg-[#FBFAF6] border-2 border-[#22408F]/30 space-y-1.5">
                        <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] block">
                          1. Ce que j'ai fait
                        </span>
                        <p className="text-neutral-800 leading-relaxed font-medium">
                          {getDone(entry) || '—'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#FBFAF6] border-2 border-[#22408F]/30 space-y-1.5">
                        <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] block">
                          2. Ce que je constate
                        </span>
                        <p className="text-neutral-800 leading-relaxed font-medium">
                          {getObserved(entry) || '—'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#FBFAF6] border-2 border-[#22408F]/30 space-y-1.5">
                        <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] block">
                          3. Ce que je décide
                        </span>
                        <p className="text-neutral-800 leading-relaxed font-medium">
                          {getDecided(entry) || '—'}
                        </p>
                      </div>
                    </div>

                    <TracePrintExtras entry={entry} />

                    {/* Pied de planche : Opérations & Auteur */}
                    <div className="flex items-center justify-between text-xs pt-4 border-t-2 border-[#22408F]/20">
                      <div className="flex items-center gap-2">
                        <span className="text-[#5A6A94] font-bold">Opérations :</span>
                        {entry.tags && entry.tags.length > 0 ? (
                          <div className="flex gap-2">
                            {entry.tags.map((t) => (
                              <span key={t} className="text-[#22408F] font-bold">
                                #{t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#5A6A94] italic">Aucune</span>
                        )}
                      </div>

                      <div className="text-[#5A6A94] text-xs font-mono font-medium">
                        Rédigé par <strong className="text-[#22408F]">{entry.author}</strong> · planche {idx + 1}/{filteredEntries.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </>
  );
};
