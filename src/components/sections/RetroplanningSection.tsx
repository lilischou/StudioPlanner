import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Milestone } from '../../types/project';
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Edit2,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  formatFrenchDate,
  diffInDays,
  parseISODate,
  addDaysToISO,
  formatISODate,
} from '../../utils/dateCalculations';
import { PHASE_COLORS, getPhaseColor } from '../../utils/theme';

export const RetroplanningSection: React.FC = () => {
  const {
    activeProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
  } = useProject();
  const { milestones, settings, phases, sessions, tasks } = activeProject;
  const todayISO = formatISODate(new Date());

  const [newTitle, setNewTitle] = useState('');
  const [newPhaseId, setNewPhaseId] = useState('p1');
  const [newDaysBefore, setNewDaysBefore] = useState(14);
  const [newNotes, setNewNotes] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addMilestone({
      title: newTitle.trim(),
      phaseId: newPhaseId,
      daysBeforeDeadline: Math.max(0, newDaysBefore),
      useFixedDate: false,
      completed: false,
      notes: newNotes.trim() || undefined,
    });

    setNewTitle('');
    setNewNotes('');
  };

  // True Monday-to-Sunday weeks calculation
  const getMondayISO = (isoDate: string): string => {
    try {
      const d = parseISODate(isoDate);
      const day = d.getDay(); // 0 is Sunday, 1 is Monday...
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return formatISODate(monday);
    } catch {
      return isoDate;
    }
  };

  const startMonday = getMondayISO(settings.startDate);
  const totalDays = Math.max(1, diffInDays(startMonday, settings.deadlineDate));
  const weekCount = Math.max(1, Math.ceil((totalDays + 1) / 7));

  const weeksList = Array.from({ length: weekCount }, (_, idx) => {
    const weekStart = addDaysToISO(startMonday, idx * 7);
    const weekEnd = addDaysToISO(weekStart, 6);

    // Milestones falling into this week
    const weekMilestones = milestones.filter(
      (m) => m.calculatedDate >= weekStart && m.calculatedDate <= weekEnd
    );

    // Sessions falling into this week
    const weekSessions = sessions.filter(
      (s) => s.date >= weekStart && s.date <= weekEnd
    );

    // Tasks falling into this week
    const weekTasks = tasks.filter(
      (t) => t.deadline >= weekStart && t.deadline <= weekEnd
    );

    // Active phases this week
    const activePhasesThisWeek = phases.filter((p) => {
      if (!p.calculatedStartDate || !p.calculatedEndDate) return false;
      return !(p.calculatedEndDate < weekStart || p.calculatedStartDate > weekEnd);
    });

    const isCurrentWeek = todayISO >= weekStart && todayISO <= weekEnd;
    const isPastWeek = todayISO > weekEnd;

    return {
      index: idx + 1,
      start: weekStart,
      end: weekEnd,
      milestones: weekMilestones,
      sessions: weekSessions,
      tasks: weekTasks,
      phases: activePhasesThisWeek,
      isCurrentWeek,
      isPastWeek,
    };
  });

  return (
    <div className="space-y-6">
      {/* Milestones Table */}
      <div className="bg-white border-2 border-[#22408F] rounded-xl overflow-hidden shadow-[0_4px_0_#22408F]">
        <div className="px-5 py-3.5 border-b-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between">
          <h3 className="font-bold text-xs text-[#22408F] uppercase tracking-wider flex items-center gap-2 font-heading">
            <Calendar className="w-4 h-4 text-[#22408F]" />
            Objectifs
          </h3>
          <span className="text-xs text-[#5A6A94] font-mono font-bold">
            {milestones.filter((m) => m.completed).length}/{milestones.length} validés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-[#FBFAF6] text-[#22408F] border-b-2 border-[#22408F]">
                <th className="py-2.5 px-3 font-bold w-12 text-center">Fait</th>
                <th className="py-2.5 px-3 font-bold">Objectif</th>
                <th className="py-2.5 px-3 font-bold w-32">Phase</th>
                <th className="py-2.5 px-3 font-bold w-32">Jours avant rendu</th>
                <th className="py-2.5 px-3 font-bold w-36">Date calculée</th>
                <th className="py-2.5 px-3 font-bold">Notes</th>
                <th className="py-2.5 px-3 font-bold w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22408F]/15">
              {milestones.map((m) => {
                const phase = phases.find((p) => p.id === m.phaseId);
                const isOverdue = !m.completed && m.calculatedDate < todayISO;
                const isUrgent =
                  !m.completed &&
                  diffInDays(todayISO, m.calculatedDate) >= 0 &&
                  diffInDays(todayISO, m.calculatedDate) <= 7;
                const isEditing = editingMilestoneId === m.id;

                const rowClass = m.completed
                  ? 'bg-[#EAF6EE]/60 text-[#5A6A94]'
                  : isOverdue
                  ? 'bg-[#FDEEEF]/70 text-[#22408F]'
                  : isUrgent
                  ? 'bg-[#FEF0E9]/70 text-[#22408F]'
                  : 'hover:bg-[#EBF1FF]/40 text-[#22408F]';

                return (
                  <tr key={m.id} className={`transition-colors ${rowClass}`}>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={(e) => updateMilestone(m.id, { completed: e.target.checked })}
                        className="w-4 h-4 rounded border-2 border-[#22408F] text-[#2F6DBB] focus:ring-[#F2D21B] cursor-pointer"
                        title="Marquer comme validé"
                        aria-label={`Valider l'objectif ${m.title}`}
                      />
                    </td>

                    {/* Titre de l'objectif */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                          className="w-full bg-white border-2 border-[#22408F] rounded px-2 py-1 text-xs font-semibold text-[#22408F] focus:outline-none focus:ring-2 focus:ring-[#F2D21B]"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingMilestoneId(m.id)}
                          className={`font-semibold cursor-pointer hover:underline ${
                            m.completed ? 'line-through text-[#5A6A94]' : 'text-[#22408F]'
                          }`}
                          title="Cliquer pour modifier"
                        >
                          {m.title}
                        </span>
                      )}
                    </td>

                    {/* Phase */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <select
                          value={m.phaseId}
                          onChange={(e) => updateMilestone(m.id, { phaseId: e.target.value })}
                          className="bg-white border-2 border-[#22408F] rounded px-2 py-1 text-xs text-[#22408F]"
                        >
                          {phases.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.shortName || p.nom || p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#22408F]/30"
                          style={{
                            backgroundColor: phase ? `${getPhaseColor(phase, phases).hex}20` : '#EBF1FF',
                            color: '#22408F',
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: phase ? getPhaseColor(phase, phases).hex : '#22408F' }}
                          />
                          {phase ? (phase.shortName || phase.nom || phase.name) : m.phaseId}
                        </span>
                      )}
                    </td>

                    {/* Jours avant rendu (J-X) */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-[#22408F]">J-</span>
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={m.daysBeforeDeadline}
                            onChange={(e) =>
                              updateMilestone(m.id, { daysBeforeDeadline: Number(e.target.value) })
                            }
                            className="w-16 px-2 py-1 bg-white border-2 border-[#22408F] rounded font-mono font-bold text-[#22408F] text-xs text-center"
                          />
                          <span className="text-[11px] text-[#5A6A94]">j</span>
                        </div>
                      ) : (
                        <span
                          onClick={() => setEditingMilestoneId(m.id)}
                          className="font-mono font-bold text-[#22408F] bg-[#FBFAF6] px-2 py-0.5 rounded border border-[#22408F]/20 cursor-pointer"
                        >
                          J-{m.daysBeforeDeadline} j
                        </span>
                      )}
                    </td>

                    {/* Date calculée */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#22408F]">
                        <span className="font-semibold">{formatFrenchDate(m.calculatedDate, false)}</span>
                        {m.daysBeforeDeadline === 0 && (
                          <span className="text-[10px] text-[#F0505A] font-bold bg-[#FDEEEF] px-1.5 py-0.5 rounded border border-[#F0505A]">
                            Rendu
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Notes & attendus */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={m.notes || ''}
                          onChange={(e) => updateMilestone(m.id, { notes: e.target.value })}
                          placeholder="Attendus, notes, critères..."
                          className="w-full bg-white border-2 border-[#22408F] rounded px-2 py-1 text-xs text-[#22408F]"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingMilestoneId(m.id)}
                          className="cursor-pointer text-[#5A6A94] hover:text-[#22408F]"
                        >
                          {m.notes || <span className="text-[#5A6A94]/60 italic">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => setEditingMilestoneId(null)}
                            className="p-1 text-[#22408F] hover:bg-[#EBF1FF] rounded transition-colors"
                            title="Valider la modification"
                            aria-label="Valider la modification"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingMilestoneId(m.id)}
                            className="p-1 text-[#5A6A94] hover:text-[#22408F] rounded transition-colors"
                            title="Modifier cet objectif"
                            aria-label={`Modifier l'objectif ${m.title}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteMilestone(m.id)}
                          className="p-1 text-[#5A6A94] hover:text-[#F0505A] rounded transition-colors"
                          title="Supprimer cet objectif"
                          aria-label={`Supprimer l'objectif ${m.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Milestone Form */}
        <form
          onSubmit={handleAddMilestone}
          className="p-3.5 bg-[#FBFAF6] border-t-2 border-[#22408F] flex flex-wrap items-center gap-2.5 text-xs"
        >
          <span className="font-bold text-[#22408F] font-heading">+ Nouvel objectif :</span>
          <input
            type="text"
            placeholder="Intitulé de l'objectif (ex: Validation du prototype papier)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs text-[#22408F] focus:border-[#22408F]"
          />
          <select
            value={newPhaseId}
            onChange={(e) => setNewPhaseId(e.target.value)}
            className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs font-medium text-[#22408F]"
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName || p.nom || p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 font-mono">
            <span className="font-bold text-[#22408F]">J-</span>
            <input
              type="number"
              min={0}
              max={365}
              value={newDaysBefore}
              onChange={(e) => setNewDaysBefore(Number(e.target.value))}
              className="w-16 px-2 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs text-center font-bold text-[#22408F]"
              title="Jours avant le rendu final"
            />
            <span className="text-[#5A6A94] text-[10px]">j</span>
          </div>
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="btn-riso-primary py-1.5 px-3.5 text-xs"
          >
            Ajouter l'objectif
          </button>
        </form>
      </div>

      {/* Automatic Weekly Timeline */}
      <div className="bg-white border-2 border-[#22408F] rounded-xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#22408F]/20 pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
              <Sparkles className="w-4 h-4 text-[#22408F]" />
              Planning
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-[#22408F]">
            <span className="flex items-center gap-1 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2F6DBB]"></span> Semaine en cours
            </span>
          </div>
        </div>

        {/* Weekly Cards Grid */}
        <div className="space-y-3">
          {weeksList.map((week) => (
            <div
              key={week.index}
              className={`p-3.5 rounded-xl border-2 transition-all text-xs cursor-pointer ${
                week.isCurrentWeek
                  ? 'bg-[#EBF1FF] border-[#22408F] shadow-[0_4px_0_#22408F]'
                  : week.isPastWeek
                  ? 'bg-[#FBFAF6] border-[#22408F]/40 opacity-85 hover:bg-[#EBF1FF]/30'
                  : 'bg-white border-[#22408F] hover:bg-[#EBF1FF]/20'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22408F]/20 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs border ${
                      week.isCurrentWeek
                        ? 'bg-[#2F6DBB] text-white border-[#22408F]'
                        : 'bg-[#FBFAF6] text-[#22408F] border-[#22408F]/40'
                    }`}
                  >
                    Semaine {week.index}
                  </span>
                  <span className="text-[#22408F] font-mono text-[11px] font-medium">
                    {formatFrenchDate(week.start, false)} → {formatFrenchDate(week.end, false)}
                  </span>
                  {week.isCurrentWeek && (
                    <span className="text-[10px] font-bold text-white bg-[#F0505A] px-2 py-0.5 rounded-full shadow-sm">
                      EN COURS
                    </span>
                  )}
                </div>

                {/* Phase badges active this week */}
                <div className="flex items-center gap-1.5">
                  {week.phases.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded font-medium text-[11px] border border-[#22408F]/30"
                      style={{
                        backgroundColor: `${getPhaseColor(p, phases).hex}20`,
                        color: '#22408F',
                      }}
                    >
                      P{p.number} : {p.shortName}
                    </span>
                  ))}
                </div>
              </div>

              {/* Items for this week */}
              <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Milestones this week */}
                <div className="space-y-1.5">
                  <span className="font-bold text-[#5A6A94] text-[10px] uppercase tracking-wider block font-heading">
                    Objectifs clés ({week.milestones.length})
                  </span>
                  {week.milestones.length === 0 ? (
                    <span className="text-[#5A6A94]/60 text-[11px]">—</span>
                  ) : (
                    week.milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2 rounded-lg border-2 text-[11px] font-medium flex items-start justify-between gap-2 ${
                          m.completed
                            ? 'bg-[#EAF6EE] text-[#5A6A94] border-[#22408F]/30 line-through'
                            : 'bg-white text-[#22408F] border-[#22408F]'
                        }`}
                      >
                        <span className="leading-snug break-words flex-1">{m.title}</span>
                        <span className="font-mono text-[10px] shrink-0 font-bold bg-[#FBFAF6] px-1.5 py-0.5 rounded border border-[#22408F]/30">
                          J-{m.daysBeforeDeadline}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Sessions this week */}
                <div className="space-y-1.5">
                  <span className="font-bold text-[#5A6A94] text-[10px] uppercase tracking-wider block font-heading">
                    Sessions planifiées ({week.sessions.length})
                  </span>
                  {week.sessions.length === 0 ? (
                    <span className="text-[#5A6A94]/60 text-[11px]">—</span>
                  ) : (
                    week.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 rounded-lg border-2 border-[#22408F] bg-white text-[11px] text-[#22408F] flex items-start justify-between gap-2"
                      >
                        <span className="leading-snug break-words flex-1">
                          <strong className="font-mono">{formatFrenchDate(s.date, false)}</strong> : {s.objective}
                        </span>
                        <span className="font-mono text-[10px] font-bold shrink-0 bg-[#EBF1FF] px-1.5 py-0.5 rounded border border-[#22408F]">
                          {s.plannedDurationHours}h
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Tasks deadlines this week */}
                <div className="space-y-1.5">
                  <span className="font-bold text-[#5A6A94] text-[10px] uppercase tracking-wider block font-heading">
                    Échéances de tâches ({week.tasks.length})
                  </span>
                  {week.tasks.length === 0 ? (
                    <span className="text-[#5A6A94]/60 text-[11px]">—</span>
                  ) : (
                    week.tasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-2 rounded-lg border text-[11px] flex items-start justify-between gap-2 ${
                          t.status === 'fait'
                            ? 'bg-[#FBFAF6] text-[#5A6A94] border-[#22408F]/30 line-through'
                            : 'bg-white border-2 border-[#22408F] text-[#22408F]'
                        }`}
                      >
                        <span className="leading-snug break-words flex-1">
                          <strong className="font-mono">{t.code}</strong> — {t.title}
                        </span>
                        <span className="font-mono text-[10px] font-medium shrink-0 text-[#5A6A94]">
                          {formatFrenchDate(t.deadline, false)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
