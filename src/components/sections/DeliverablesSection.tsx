import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Deliverable, DeliverableCriterion } from '../../types/project';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Pencil,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatFrenchDate } from '../../utils/dateCalculations';
import { getPhaseColor } from '../../utils/theme';

export const DeliverablesSection: React.FC = () => {
  const {
    activeProject,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    toggleDeliverableCriterion,
  } = useProject();
  const { deliverables, settings, phases } = activeProject;

  // Top creation form state
  const [isCreating, setIsCreating] = useState(false);

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form field state (used for create or edit)
  const [newTitle, setNewTitle] = useState('');
  const [newFormat, setNewFormat] = useState('PDF A4 Paysage interactif');
  const [newDeadline, setNewDeadline] = useState(settings.deadlineDate);
  const [newPhaseId, setNewPhaseId] = useState(phases[phases.length - 1]?.id || phases[0]?.id || 'p3');
  const [newRubric, setNewRubric] = useState('Rigueur d\'analyse / 10, Clarté graphique / 10');

  // Collapsed state: collapsed by default, keyed by deliverable id
  const [expandedIds, setExpandedIds] = useState<{ [id: string]: boolean }>({});

  // New criterion inline state
  const [newCriterionText, setNewCriterionText] = useState<{ [deliverableId: string]: string }>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (del: Deliverable) => {
    setIsCreating(false);
    setEditingId(del.id);
    setNewTitle(del.title);
    setNewFormat(del.format);
    setNewDeadline(del.deadline || settings.deadlineDate);
    setNewPhaseId(del.phaseId || phases[0]?.id || 'p1');
    setNewRubric(del.evaluationRubric || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTitle('');
    setNewFormat('PDF A4 Paysage interactif');
    setNewDeadline(settings.deadlineDate);
    setNewPhaseId(phases[phases.length - 1]?.id || phases[0]?.id || 'p3');
    setNewRubric('Rigueur d\'analyse / 10, Clarté graphique / 10');
  };

  const handleToggleCreate = () => {
    if (isCreating) {
      setIsCreating(false);
    } else {
      handleCancelEdit();
      setIsCreating(true);
      setNewTitle('');
      setNewFormat('PDF A4 Paysage interactif');
      setNewDeadline(settings.deadlineDate);
      setNewPhaseId(phases[phases.length - 1]?.id || phases[0]?.id || 'p3');
      setNewRubric('Rigueur d\'analyse / 10, Clarté graphique / 10');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingId) {
      updateDeliverable(editingId, {
        title: newTitle.trim(),
        format: newFormat.trim(),
        deadline: newDeadline,
        phaseId: newPhaseId,
        evaluationRubric: newRubric.trim(),
      });
      handleCancelEdit();
    } else {
      addDeliverable({
        title: newTitle.trim(),
        format: newFormat.trim(),
        deadline: newDeadline,
        phaseId: newPhaseId,
        criteria: [
          { id: `c_${Date.now()}_1`, title: 'Synthèse des données clés et argumentation', verified: false },
          { id: `c_${Date.now()}_2`, title: 'Respect des gabarits et de la charte graphique', verified: false },
        ],
        evaluationRubric: newRubric.trim(),
        status: 'non_commence',
      });
      setNewTitle('');
      setIsCreating(false);
    }
  };

  const handleAddCriterion = (deliverableId: string) => {
    const text = newCriterionText[deliverableId]?.trim();
    if (!text) return;

    const deliverable = deliverables.find((d) => d.id === deliverableId);
    if (!deliverable) return;

    const newCrit: DeliverableCriterion = {
      id: `crit_${Date.now()}`,
      title: text,
      verified: false,
    };

    updateDeliverable(deliverableId, {
      criteria: [...deliverable.criteria, newCrit],
    });

    setNewCriterionText((prev) => ({ ...prev, [deliverableId]: '' }));
  };

  const handleRemoveCriterion = (deliverableId: string, criterionId: string) => {
    const deliverable = deliverables.find((d) => d.id === deliverableId);
    if (!deliverable) return;

    updateDeliverable(deliverableId, {
      criteria: deliverable.criteria.filter((c) => c.id !== criterionId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header : Titre & bouton Ajouter un livrable */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-[#22408F] uppercase tracking-wider font-heading">
          Livrables ({deliverables.length})
        </h2>
        <button
          type="button"
          onClick={handleToggleCreate}
          className="btn-riso-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isCreating ? 'Fermer le formulaire' : 'Ajouter un livrable'}</span>
        </button>
      </div>

      {/* Formulaire « Ajouter un livrable » juste sous le bouton, tout en haut de l'onglet */}
      {isCreating && (
        <div className="p-5 bg-white border-2 border-[#22408F] rounded-xl shadow-[0_4px_0_#22408F] space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-[#22408F] uppercase tracking-wider font-heading">
              Nouveau livrable
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-[#5A6A94] hover:text-[#22408F] flex items-center gap-1 cursor-pointer font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Intitulé */}
              <div className="sm:col-span-5">
                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                  Titre
                </label>
                <input
                  type="text"
                  placeholder="ex: Dossier de synthèse & Benchmark"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                  autoFocus
                />
              </div>

              {/* Champ Phase */}
              <div className="sm:col-span-3">
                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                  Phase
                </label>
                <select
                  value={newPhaseId}
                  onChange={(e) => setNewPhaseId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F] font-medium cursor-pointer"
                >
                  {phases.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.nom || ph.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format */}
              <div className="sm:col-span-2">
                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                  Format
                </label>
                <input
                  type="text"
                  placeholder="ex: PDF A4"
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                />
              </div>

              {/* Date de dépôt */}
              <div className="sm:col-span-2">
                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                  Date de dépôt
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewDeadline(val);
                    if (phases.length > 0) {
                      const lastPhase = phases[phases.length - 1];
                      const firstPhase = phases[0];
                      if (settings.deadlineDate && val >= settings.deadlineDate) {
                        setNewPhaseId(lastPhase.id);
                      } else {
                        const matched = phases.find((ph) => {
                          const s = ph.debut || ph.calculatedStartDate || '';
                          const e = ph.fin || ph.calculatedEndDate || '';
                          return s && e && val >= s && val <= e;
                        });
                        if (matched) {
                          setNewPhaseId(matched.id);
                        } else if (val < (firstPhase.debut || firstPhase.calculatedStartDate || '')) {
                          setNewPhaseId(firstPhase.id);
                        } else {
                          setNewPhaseId(lastPhase.id);
                        }
                      }
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg font-mono text-xs text-[#22408F] focus:border-[#22408F]"
                />
                {newDeadline && settings.deadlineDate && newDeadline > settings.deadlineDate && (
                  <p className="text-[11px] text-[#F0505A] font-semibold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Postérieur au rendu final</span>
                  </p>
                )}
              </div>
            </div>

            {/* Barème optionnel */}
            <div>
              <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                Barème & critères d'évaluation
              </label>
              <input
                type="text"
                placeholder="ex: Rigueur d'analyse / 10, Clarté graphique / 10"
                value={newRubric}
                onChange={(e) => setNewRubric(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn-riso-secondary py-1.5 px-4 text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="btn-riso-primary py-1.5 px-5 text-xs whitespace-nowrap"
              >
                Créer le livrable
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deliverables List Grouped By Phase */}
      <div className="space-y-6">
        {phases.map((phase) => {
          const phaseColor = getPhaseColor(phase, phases);
          const phaseDeliverables = deliverables.filter((d) => d.phaseId === phase.id);

          return (
            <div key={phase.id} className="space-y-3">
              {/* En-tête coloré de la phase */}
              <div
                className="flex items-center justify-between p-3 rounded-xl border-2 border-[#22408F] shadow-[0_2px_0_#22408F]"
                style={{ backgroundColor: phaseColor.bgLight }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full border border-[#22408F] shadow-xs shrink-0"
                    style={{ backgroundColor: phaseColor.hex }}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#22408F] font-heading">
                    {phase.nom || phase.name}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[#22408F]">
                  {phaseDeliverables.length} livrable{phaseDeliverables.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Liste des livrables de la phase */}
              {phaseDeliverables.length === 0 ? (
                <div className="p-4 bg-white border-2 border-dashed border-[#22408F]/25 rounded-xl text-center text-xs text-[#5A6A94] italic">
                  Aucun livrable rattaché à cette phase.
                </div>
              ) : (
                <div className="space-y-3">
                  {phaseDeliverables.map((del) => {
                    const verifiedCount = del.criteria.filter((c) => c.verified).length;
                    const totalCriteria = del.criteria.length;
                    const completionPercent =
                      totalCriteria > 0 ? Math.round((verifiedCount / totalCriteria) * 100) : 0;
                    const isFullyVerified = totalCriteria > 0 && verifiedCount === totalCriteria;
                    const isBeingEdited = editingId === del.id;
                    const isExpanded = !!expandedIds[del.id];

                    // Formulaire d'édition (crayon) : s'ouvre à la place de la carte éditée
                    if (isBeingEdited) {
                      return (
                        <div
                          key={del.id}
                          className="p-5 bg-white border-2 border-[#22408F] rounded-xl shadow-[0_4px_0_#22408F] space-y-4 ring-4 ring-[#2F6DBB]/40 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-xs text-[#22408F] uppercase tracking-wider font-heading">
                              Modifier le livrable
                            </h3>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="text-xs text-[#5A6A94] hover:text-[#22408F] flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Annuler la modification</span>
                            </button>
                          </div>

                          <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-5">
                                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                                  Titre
                                </label>
                                <input
                                  type="text"
                                  value={newTitle}
                                  onChange={(e) => setNewTitle(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                                  autoFocus
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                                  Phase
                                </label>
                                <select
                                  value={newPhaseId}
                                  onChange={(e) => setNewPhaseId(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F] font-medium cursor-pointer"
                                >
                                  {phases.map((ph) => (
                                    <option key={ph.id} value={ph.id}>
                                      {ph.nom || ph.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                                  Format
                                </label>
                                <input
                                  type="text"
                                  value={newFormat}
                                  onChange={(e) => setNewFormat(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                                  Date de dépôt
                                </label>
                                <input
                                  type="date"
                                  value={newDeadline}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewDeadline(val);
                                    if (phases.length > 0) {
                                      const lastPhase = phases[phases.length - 1];
                                      const firstPhase = phases[0];
                                      if (settings.deadlineDate && val >= settings.deadlineDate) {
                                        setNewPhaseId(lastPhase.id);
                                      } else {
                                        const matched = phases.find((ph) => {
                                          const s = ph.debut || ph.calculatedStartDate || '';
                                          const e = ph.fin || ph.calculatedEndDate || '';
                                          return s && e && val >= s && val <= e;
                                        });
                                        if (matched) {
                                          setNewPhaseId(matched.id);
                                        } else if (val < (firstPhase.debut || firstPhase.calculatedStartDate || '')) {
                                          setNewPhaseId(firstPhase.id);
                                        } else {
                                          setNewPhaseId(lastPhase.id);
                                        }
                                      }
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg font-mono text-xs text-[#22408F] focus:border-[#22408F]"
                                />
                                {newDeadline && settings.deadlineDate && newDeadline > settings.deadlineDate && (
                                  <p className="text-[11px] text-[#F0505A] font-semibold flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    <span>Postérieur au rendu final</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[#22408F] font-bold text-[11px] uppercase tracking-wider mb-1">
                                Barème & critères d'évaluation
                              </label>
                              <input
                                type="text"
                                value={newRubric}
                                onChange={(e) => setNewRubric(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="btn-riso-secondary py-1.5 px-4 text-xs"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                disabled={!newTitle.trim()}
                                className="btn-riso-primary py-1.5 px-5 text-xs whitespace-nowrap"
                              >
                                Enregistrer les modifications
                              </button>
                            </div>
                          </form>
                        </div>
                      );
                    }

                    // Carte livrable : repliée par défaut (titre · pastille phase · date · statut). Clic -> déplie attendus + barème.
                    return (
                      <div
                        key={del.id}
                        className={`bg-white border-2 border-[#22408F] rounded-xl overflow-hidden transition-all shadow-[0_4px_0_#22408F] ${
                          del.status === 'valide' ? 'ring-2 ring-[#2E8B4A]' : ''
                        }`}
                      >
                        {/* En-tête de carte (ligne repliée, cliquable pour déplier) */}
                        <div
                          onClick={() => toggleExpand(del.id)}
                          className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-[#FBFAF6] cursor-pointer hover:bg-[#F4F7FC] transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#22408F] shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#5A6A94] shrink-0" />
                            )}

                            {/* Titre */}
                            <span className="font-bold text-sm text-[#22408F] font-heading truncate">
                              {del.title}
                            </span>

                            <span className="text-[#5A6A94]/40 shrink-0">·</span>

                            {/* Pastille phase */}
                            <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-white border border-[#22408F]/20 text-[11px] font-medium text-[#22408F]">
                              <span
                                className="w-2 h-2 rounded-full border border-[#22408F]/40 shrink-0"
                                style={{ backgroundColor: phaseColor.hex }}
                              />
                              <span>{phase.nom || phase.name}</span>
                            </div>

                            <span className="text-[#5A6A94]/40 shrink-0">·</span>

                            {/* Date */}
                            <div className="inline-flex items-center gap-1 text-xs font-mono text-[#22408F] shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-[#5A6A94]" />
                              <span>{formatFrenchDate(del.deadline)}</span>
                              {del.deadline && settings.deadlineDate && del.deadline > settings.deadlineDate && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#F0505A] bg-[#FDEEEF] border border-[#F0505A] rounded px-1.5 py-0.2">
                                  <AlertCircle className="w-3 h-3 text-[#F0505A] shrink-0" />
                                  <span>Postérieur au rendu</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Statut + Crayon + Supprimer */}
                          <div
                            className="flex items-center gap-2 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Statut */}
                            <select
                              value={del.status}
                              onChange={(e) =>
                                updateDeliverable(del.id, {
                                  status: e.target.value as Deliverable['status'],
                                })
                              }
                              className="border-2 border-[#22408F] text-[#22408F] bg-white rounded-[999px] px-3 py-1 text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#F2D21B] cursor-pointer"
                              title="Statut du livrable"
                            >
                              <option value="non_commence">Non commencé</option>
                              <option value="en_redaction">En rédaction</option>
                              <option value="a_revoir">À revoir</option>
                              <option value="valide">Validé ✓</option>
                            </select>

                            {/* Bouton crayon (édition inline) */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(del)}
                              className="p-1.5 rounded-lg border text-[#5A6A94] hover:text-[#2F6DBB] hover:bg-[#EBF1FF] border-transparent transition-colors cursor-pointer"
                              title="Modifier ce livrable"
                              aria-label={`Modifier le livrable ${del.title}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Bouton supprimer */}
                            <button
                              type="button"
                              onClick={() => deleteDeliverable(del.id)}
                              className="p-1.5 text-[#5A6A94] hover:text-[#F0505A] hover:bg-[#FDEEEF] rounded-lg border border-transparent transition-colors cursor-pointer"
                              title="Supprimer ce livrable"
                              aria-label={`Supprimer le livrable ${del.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Contenu déplié : Attendus + Barème */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 border-t-2 border-[#22408F] bg-white space-y-4 animate-in fade-in duration-150">
                            {/* Format */}
                            {del.format && (
                              <div className="flex items-center gap-2 text-xs text-[#5A6A94]">
                                <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px]">
                                  Format attendu :
                                </span>
                                <span className="bg-[#FBFAF6] border border-[#22408F]/30 rounded px-2.5 py-0.5 font-medium text-[#22408F]">
                                  {del.format}
                                </span>
                              </div>
                            )}

                            {/* Grille : Attendus (2 cols) + Barème (1 col) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                              {/* 2 Cols: Checklist des Attendus */}
                              <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-heading">
                                    <CheckCircle2 className="w-4 h-4 text-[#2F6DBB]" />
                                    Attendus du rendu ({verifiedCount}/{totalCriteria} vérifiés)
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-[#22408F]">
                                    {completionPercent}% de conformité
                                  </span>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-[#EBF1FF] rounded-full h-2 overflow-hidden border border-[#22408F]/20">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      isFullyVerified ? 'bg-[#2E8B4A]' : 'bg-[#2F6DBB]'
                                    }`}
                                    style={{ width: `${completionPercent}%` }}
                                  ></div>
                                </div>

                                {/* Criteria Items */}
                                <div className="space-y-1.5 pt-1">
                                  {del.criteria.map((crit) => (
                                    <div
                                      key={crit.id}
                                      className={`p-2.5 rounded-lg border-2 flex items-center justify-between transition-colors ${
                                        crit.verified
                                          ? 'bg-[#EAF6EE] border-[#22408F]/30 text-[#5A6A94]'
                                          : 'bg-white border-[#22408F] text-[#22408F]'
                                      }`}
                                    >
                                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2">
                                        <input
                                          type="checkbox"
                                          checked={crit.verified}
                                          onChange={() => toggleDeliverableCriterion(del.id, crit.id)}
                                          className="w-4 h-4 rounded border-2 border-[#22408F] text-[#2F6DBB] focus:ring-[#F2D21B] cursor-pointer"
                                          aria-label={crit.title}
                                        />
                                        <span
                                          className={`text-xs ${
                                            crit.verified ? 'line-through text-[#5A6A94]' : 'font-medium'
                                          }`}
                                        >
                                          {crit.title}
                                        </span>
                                      </label>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCriterion(del.id, crit.id)}
                                        className="text-[#5A6A94] hover:text-[#F0505A] p-0.5 rounded transition-colors cursor-pointer"
                                        title="Supprimer cet attendu"
                                        aria-label={`Supprimer l'attendu ${crit.title}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add criterion input */}
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    placeholder="+ Ajouter un attendu obligatoire..."
                                    value={newCriterionText[del.id] || ''}
                                    onChange={(e) =>
                                      setNewCriterionText((prev) => ({ ...prev, [del.id]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCriterion(del.id);
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddCriterion(del.id)}
                                    className="btn-riso-secondary py-1.5 px-3.5 text-xs"
                                  >
                                    Ajouter
                                  </button>
                                </div>
                              </div>

                              {/* 1 Col: Barème */}
                              <div className="riso-info-box p-4 rounded-xl space-y-2">
                                <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] block font-heading">
                                  Barème
                                </span>
                                <textarea
                                  rows={4}
                                  value={del.evaluationRubric}
                                  onChange={(e) =>
                                    updateDeliverable(del.id, { evaluationRubric: e.target.value })
                                  }
                                  placeholder="ex: Clarté des insights / 5, Qualité du prototype / 10..."
                                  className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
