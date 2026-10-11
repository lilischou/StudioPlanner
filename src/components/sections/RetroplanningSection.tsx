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
      <div className="bg-white border-2 border-riso-ink rounded-[16px] overflow-hidden shadow-riso">
        <div className="px-5 py-3.5 border-b-2 border-riso-ink bg-riso-paper flex items-center justify-between">
          <h3 className="font-bold text-xs text-riso-ink uppercase tracking-wider flex items-center gap-2 font-heading">
            <Calendar className="w-4 h-4 text-riso-ink" />
            Objectifs
          </h3>
          <span className="text-xs text-riso-ink-secondary font-mono font-bold">
            {milestones.filter((m) => m.completed).length}/{milestones.length} validés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-riso-paper text-riso-ink border-b-2 border-riso-ink">
                <th className="py-2.5 px-3 font-bold w-12 text-center">Fait</th>
                <th className="py-2.5 px-3 font-bold">Objectif</th>
                <th className="py-2.5 px-3 font-bold w-32">Phase</th>
                <th className="py-2.5 px-3 font-bold w-32">Jours avant rendu</th>
                <th className="py-2.5 px-3 font-bold w-36">Date calculée</th>
                <th className="py-2.5 px-3 font-bold">Notes</th>
                <th className="py-2.5 px-3 font-bold w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-riso-ink/15">
              {milestones.map((m) => {
                const phase = phases.find((p) => p.id === m.phaseId);
                const isOverdue = !m.completed && m.calculatedDate < todayISO;
                const isUrgent =
                  !m.completed &&
                  diffInDays(todayISO, m.calculatedDate) >= 0 &&
                  diffInDays(todayISO, m.calculatedDate) <= 7;
                const isEditing = editingMilestoneId === m.id;

                const rowClass = m.completed
                  ? 'bg-riso-p2-light/60 text-riso-ink-secondary'
                  : isOverdue
                  ? 'bg-riso-p4-light/70 text-riso-ink'
                  : isUrgent
                  ? 'bg-riso-p5-light/70 text-riso-ink'
                  : 'hover:bg-riso-p1-light/40 text-riso-ink';

                return (
                  <tr key={m.id} className={`transition-colors ${rowClass}`}>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={(e) => updateMilestone(m.id, { completed: e.target.checked })}
                        className="w-4 h-4 rounded-[8px] border-2 border-riso-ink text-riso-p1 focus:ring-riso-p3 cursor-pointer"
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
                          className="w-full bg-white border-2 border-riso-ink rounded-[8px] px-2 py-1 text-xs font-semibold text-riso-ink focus:outline-none focus:ring-2 focus:ring-riso-p3"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingMilestoneId(m.id)}
                          className={`font-semibold cursor-pointer hover:underline ${
                            m.completed ? 'line-through text-riso-ink-secondary' : 'text-riso-ink'
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
                          className="bg-white border-2 border-riso-ink rounded-[8px] px-2 py-1 text-xs text-riso-ink"
                        >
                          {phases.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.shortName || p.nom || p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border border-riso-line"
                          style={{
                            backgroundColor: phase ? `${getPhaseColor(phase, phases).hex}20` : 'var(--riso-p1-light)',
                            color: 'var(--riso-ink)',
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: phase ? getPhaseColor(phase, phases).hex : 'var(--riso-ink)' }}
                          />
                          {phase ? (phase.shortName || phase.nom || phase.name) : m.phaseId}
                        </span>
                      )}
                    </td>

                    {/* Jours avant rendu (J-X) */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-riso-ink">J-</span>
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={m.daysBeforeDeadline}
                            onChange={(e) =>
                              updateMilestone(m.id, { daysBeforeDeadline: Number(e.target.value) })
                            }
                            className="w-16 px-2 py-1 bg-white border-2 border-riso-ink rounded-[8px] font-mono font-bold text-riso-ink text-xs text-center"
                          />
                          <span className="text-[11px] text-riso-ink-secondary">j</span>
                        </div>
                      ) : (
                        <span
                          onClick={() => setEditingMilestoneId(m.id)}
                          className="font-mono font-bold text-riso-ink bg-riso-paper px-2 py-0.5 rounded-[8px] border border-riso-line cursor-pointer"
                        >
                          J-{m.daysBeforeDeadline} j
                        </span>
                      )}
                    </td>

                    {/* Date calculée */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-riso-ink">
                        <span className="font-semibold">{formatFrenchDate(m.calculatedDate, false)}</span>
                        {m.daysBeforeDeadline === 0 && (
                          <span className="text-[10px] text-riso-p4 font-bold bg-riso-p4-light px-1.5 py-0.5 rounded-[8px] border border-riso-p4">
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
                          className="w-full bg-white border-2 border-riso-ink rounded-[8px] px-2 py-1 text-xs text-riso-ink"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingMilestoneId(m.id)}
                          className="cursor-pointer text-riso-ink-secondary hover:text-riso-ink"
                        >
                          {m.notes || <span className="text-riso-ink-secondary/60 italic">—</span>}
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
                            className="p-1 text-riso-ink hover:bg-riso-p1-light rounded-[8px] transition-colors"
                            title="Valider la modification"
                            aria-label="Valider la modification"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingMilestoneId(m.id)}
                            className="p-1 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] transition-colors"
                            title="Modifier cet objectif"
                            aria-label={`Modifier l'objectif ${m.title}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteMilestone(m.id)}
                          className="p-1 text-riso-ink-secondary hover:text-riso-p4 rounded-[8px] transition-colors"
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
          className="p-3.5 bg-riso-paper border-t-2 border-riso-ink flex flex-wrap items-center gap-2.5 text-xs"
        >
          <span className="font-bold text-riso-ink font-heading">+ Nouvel objectif :</span>
          <input
            type="text"
            placeholder="Intitulé de l'objectif (ex: Validation du prototype papier)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border-2 border-riso-line rounded-[8px] text-xs text-riso-ink focus:border-riso-ink"
          />
          <select
            value={newPhaseId}
            onChange={(e) => setNewPhaseId(e.target.value)}
            className="px-2.5 py-1.5 bg-white border-2 border-riso-line rounded-[8px] text-xs font-medium text-riso-ink"
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName || p.nom || p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 font-mono">
            <span className="font-bold text-riso-ink">J-</span>
            <input
              type="number"
              min={0}
              max={365}
              value={newDaysBefore}
              onChange={(e) => setNewDaysBefore(Number(e.target.value))}
              className="w-16 px-2 py-1.5 bg-white border-2 border-riso-line rounded-[8px] text-xs text-center font-bold text-riso-ink"
              title="Jours avant le rendu final"
            />
            <span className="text-riso-ink-secondary text-[10px]">j</span>
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
      <div className="bg-white border-2 border-riso-ink rounded-[16px] p-5 shadow-riso space-y-4">
        <div className="flex items-center justify-between border-b-2 border-riso-line pb-3">
          <div>
            <h3 className="font-bold text-sm text-riso-ink flex items-center gap-2 font-heading">
              <Sparkles className="w-4 h-4 text-riso-ink" />
              Planning
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-riso-ink">
            <span className="flex items-center gap-1 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-riso-p1"></span> Semaine en cours
            </span>
          </div>
        </div>

        {/* Weekly Cards Grid */}
        <div className="space-y-3">
          {weeksList.map((week) => (
            <div
              key={week.index}
              className={`p-3.5 rounded-[16px] border-2 transition-all text-xs cursor-pointer ${
                week.isCurrentWeek
                  ? 'bg-riso-p1-light border-riso-ink shadow-riso'
                  : week.isPastWeek
                  ? 'bg-riso-paper border-riso-line opacity-85 hover:bg-riso-p1-light/30'
                  : 'bg-white border-riso-ink hover:bg-riso-p1-light/20'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-riso-line pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-[8px] font-mono font-bold text-xs border ${
                      week.isCurrentWeek
                        ? 'bg-riso-p1 text-white border-riso-ink'
                        : 'bg-riso-paper text-riso-ink border-riso-line'
                    }`}
                  >
                    Semaine {week.index}
                  </span>
                  <span className="text-riso-ink font-mono text-[11px] font-medium">
                    {formatFrenchDate(week.start, false)} → {formatFrenchDate(week.end, false)}
                  </span>
                  {week.isCurrentWeek && (
                    <span className="text-[10px] font-bold text-white bg-riso-p4 px-2 py-0.5 rounded-full shadow-sm">
                      EN COURS
                    </span>
                  )}
                </div>

                {/* Phase badges active this week */}
                <div className="flex items-center gap-1.5">
                  {week.phases.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-[8px] font-medium text-[11px] border border-riso-line"
                      style={{
                        backgroundColor: `${getPhaseColor(p, phases).hex}20`,
                        color: 'var(--riso-ink)',
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
                  <span className="font-bold text-riso-ink-secondary text-[10px] uppercase tracking-wider block font-heading">
                    Objectifs clés ({week.milestones.length})
                  </span>
                  {week.milestones.length === 0 ? (
                    <span className="text-riso-ink-secondary/60 text-[11px]">—</span>
                  ) : (
                    week.milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2 rounded-[8px] border-2 text-[11px] font-medium flex items-start justify-between gap-2 ${
                          m.completed
                            ? 'bg-riso-p2-light text-riso-ink-secondary border-riso-line line-through'
                            : 'bg-white text-riso-ink border-riso-ink'
                        }`}
                      >
                        <span className="leading-snug break-words flex-1">{m.title}</span>
                        <span className="font-mono text-[10px] shrink-0 font-bold bg-riso-paper px-1.5 py-0.5 rounded-[8px] border border-riso-line">
                          J-{m.daysBeforeDeadline}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Sessions this week */}
                <div className="space-y-1.5">
                  <span className="font-bold text-riso-ink-secondary text-[10px] uppercase tracking-wider block font-heading">
                    Sessions planifiées ({week.sessions.length})
                  </span>
                  {week.sessions.length === 0 ? (
                    <span className="text-riso-ink-secondary/60 text-[11px]">—</span>
                  ) : (
                    week.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 rounded-[8px] border-2 border-riso-ink bg-white text-[11px] text-riso-ink flex items-start justify-between gap-2"
                      >
                        <span className="leading-snug break-words flex-1">
                          <strong className="font-mono">{formatFrenchDate(s.date, false)}</strong> : {s.objective}
                        </span>
                        <span className="font-mono text-[10px] font-bold shrink-0 bg-riso-p1-light px-1.5 py-0.5 rounded-[8px] border-2 border-riso-ink">
                          {s.plannedDurationHours}h
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Tasks deadlines this week */}
                <div className="space-y-1.5">
                  <span className="font-bold text-riso-ink-secondary text-[10px] uppercase tracking-wider block font-heading">
                    Échéances de tâches ({week.tasks.length})
                  </span>
                  {week.tasks.length === 0 ? (
                    <span className="text-riso-ink-secondary/60 text-[11px]">—</span>
                  ) : (
                    week.tasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-2 rounded-[8px] border text-[11px] flex items-start justify-between gap-2 ${
                          t.status === 'fait'
                            ? 'bg-riso-paper text-riso-ink-secondary border-riso-line line-through'
                            : 'bg-white border-2 border-riso-ink text-riso-ink'
                        }`}
                      >
                        <span className="leading-snug break-words flex-1">
                          <strong className="font-mono">{t.code}</strong> — {t.title}
                        </span>
                        <span className="font-mono text-[10px] font-medium shrink-0 text-riso-ink-secondary">
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
