import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { WorkSession, SessionType, SessionStatus } from '../../types/project';
import {
  FolderKanban,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Edit2,
  Check,
} from 'lucide-react';
import { formatFrenchDate, formatISODate } from '../../utils/dateCalculations';
import { PHASE_COLORS, getPhaseColor, getSessionTypeLabel } from '../../utils/theme';
import { buildGoogleCalendarUrl } from '../../utils/calendarLink';

export const SessionsTableSection: React.FC = () => {
  const {
    activeProject,
    addSession,
    updateSession,
    deleteSession,
    setActiveTab,
    addLogbookEntry,
  } = useProject();
  const { sessions, settings, phases } = activeProject;
  const todayISO = formatISODate(new Date());

  const [newDate, setNewDate] = useState(todayISO);
  const [newType, setNewType] = useState<SessionType>(
    settings.mode === 'individuel' ? 'individuelle' : 'groupe'
  );
  const [newPhaseId, setNewPhaseId] = useState(phases[0]?.id || 'p1');
  const [newObjective, setNewObjective] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Handle Type Change to auto-fill planned duration
  const getDefaultDurationForType = (type: SessionType) => {
    if (type === 'individuelle') return settings.defaultDurations.individuelle;
    if (type === 'groupe') return settings.defaultDurations.groupe;
    return settings.defaultDurations.encadree;
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjective.trim()) return;

    const plannedHours = getDefaultDurationForType(newType);

    addSession({
      date: newDate,
      type: newType,
      phaseId: newPhaseId,
      objective: newObjective.trim(),
      plannedDurationHours: plannedHours,
      actualDurationHours: undefined,
      attendees: settings.team.map((m) => m.name),
      status: 'planifiee',
    });

    setNewObjective('');
  };

  const handleCreateLogbookForSession = (session: WorkSession) => {
    const author =
      settings.mode === 'individuel'
        ? settings.team[0]?.name || 'Moi-même'
        : settings.team[0]?.name || 'Équipe';

    addLogbookEntry({
      date: session.date,
      sessionId: session.id,
      author,
      phaseId: session.phaseId,
      whatWeDid: `Session ${getSessionTypeLabel(session.type).toLowerCase()} : ${session.objective}`,
      whatWeNoticed: '',
      whatWeDecided: '',
      tags: [getSessionTypeLabel(session.type).toLowerCase()],
    });

    // Mark session as 'realisee'
    updateSession(session.id, {
      status: 'realisee',
      actualDurationHours: session.actualDurationHours || session.plannedDurationHours,
    });

    // Switch to logbook tab
    setActiveTab('journal');
  };

  // Chronological sort ascending (05/10 before 13/10)
  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  // Compute total hours
  const totalPlannedHours = sessions.reduce((s, item) => s + (item.plannedDurationHours || 0), 0);
  const totalActualHours = sessions
    .filter((s) => s.status === 'realisee')
    .reduce((s, item) => s + (item.actualDurationHours || item.plannedDurationHours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats summary row (Information seule : riso-info-box sans ombre) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="riso-info-box p-4 rounded-xl text-xs space-y-1">
          <span className="text-[#5A6A94] block font-medium">Sessions réalisées</span>
          <span className="text-2xl font-mono font-bold text-[#22408F] block">
            {sessions.filter((s) => s.status === 'realisee').length} / {sessions.length}
          </span>
          <span className="text-[11px] text-[#5A6A94]">
            Cible fixée : {settings.targetSessionsCount} sessions
          </span>
        </div>

        <div className="riso-info-box p-4 rounded-xl text-xs space-y-1">
          <span className="text-[#5A6A94] block font-medium">Temps de travail cumulé réel</span>
          <span className="text-2xl font-mono font-bold text-[#22408F] block">
            {totalActualHours} h
          </span>
          <span className="text-[11px] text-[#5A6A94]">Sur les sessions terminées</span>
        </div>

        <div className="riso-info-box p-4 rounded-xl text-xs space-y-1">
          <span className="text-[#5A6A94] block font-medium">Temps prévu total</span>
          <span className="text-2xl font-mono font-bold text-[#22408F] block">
            {totalPlannedHours} h
          </span>
          <span className="text-[11px] text-[#5A6A94]">
            Écart : {Math.round((totalActualHours - totalPlannedHours) * 10) / 10} h
          </span>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border-2 border-[#22408F] rounded-xl overflow-hidden shadow-[0_4px_0_#22408F]">
        <div className="px-5 py-3.5 border-b-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between">
          <h3 className="font-bold text-xs text-[#22408F] uppercase tracking-wider flex items-center gap-2 font-heading">
            <FolderKanban className="w-4 h-4 text-[#22408F]" />
            Registre des sessions ({sessions.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-[#FBFAF6] text-[#22408F] border-b-2 border-[#22408F]">
                <th className="py-2.5 px-3 font-bold w-28">Date</th>
                <th className="py-2.5 px-3 font-bold w-28">Type</th>
                <th className="py-2.5 px-3 font-bold w-32">Phase</th>
                <th className="py-2.5 px-3 font-bold">Objectif de travail</th>
                <th className="py-2.5 px-3 font-bold w-24">Durée prévue</th>
                <th className="py-2.5 px-3 font-bold w-24">Durée réelle</th>
                <th className="py-2.5 px-3 font-bold w-28">Statut</th>
                <th className="py-2.5 px-3 font-bold w-40 text-center">Journal</th>
                <th className="py-2.5 px-3 font-bold w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22408F]/15">
              {sortedSessions.map((s) => {
                const phase = phases.find((p) => p.id === s.phaseId);
                const isRealisee = s.status === 'realisee';
                const isEditing = editingSessionId === s.id;

                const rowClass = isRealisee
                  ? 'bg-[#EAF6EE]/60 text-[#5A6A94]'
                  : s.status === 'annulee'
                  ? 'bg-[#FBFAF6] text-[#5A6A94] line-through'
                  : 'hover:bg-[#EBF1FF]/40 text-[#22408F]';

                return (
                  <tr key={s.id} className={`transition-colors ${rowClass}`}>
                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono font-medium">
                      {isEditing ? (
                        <input
                          type="date"
                          value={s.date}
                          onChange={(e) => updateSession(s.id, { date: e.target.value })}
                          className="bg-white border-2 border-[#22408F] rounded px-1.5 py-0.5 text-xs text-[#22408F]"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingSessionId(s.id)}
                          className="cursor-pointer hover:underline text-[#22408F]"
                        >
                          {formatFrenchDate(s.date, false)}
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <select
                          value={s.type}
                          onChange={(e) => {
                            const newT = e.target.value as SessionType;
                            updateSession(s.id, {
                              type: newT,
                              plannedDurationHours: getDefaultDurationForType(newT),
                            });
                          }}
                          className="bg-white border-2 border-[#22408F] rounded px-1.5 py-0.5 text-xs text-[#22408F]"
                        >
                          <option value="individuelle">Solo</option>
                          {settings.mode === 'groupe' && <option value="groupe">Groupe</option>}
                          <option value="encadree">Tuteur</option>
                        </select>
                      ) : (
                        <span className="font-medium text-[#22408F]">{getSessionTypeLabel(s.type)}</span>
                      )}
                    </td>

                    {/* Phase */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <select
                          value={s.phaseId}
                          onChange={(e) => updateSession(s.id, { phaseId: e.target.value })}
                          className="bg-white border-2 border-[#22408F] rounded px-1.5 py-0.5 text-xs text-[#22408F]"
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
                          {phase ? (phase.shortName || phase.nom || phase.name) : s.phaseId}
                        </span>
                      )}
                    </td>

                    {/* Objective (Wrapped, no truncate) */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={s.objective}
                          onChange={(e) => updateSession(s.id, { objective: e.target.value })}
                          className="w-full bg-white border-2 border-[#22408F] rounded px-2 py-1 text-xs text-[#22408F]"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingSessionId(s.id)}
                          className="cursor-pointer hover:underline text-[#22408F] font-medium leading-snug break-words block"
                        >
                          {s.objective}
                        </span>
                      )}
                    </td>

                    {/* Planned duration */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.5}
                            min={0.5}
                            value={s.plannedDurationHours}
                            onChange={(e) =>
                              updateSession(s.id, { plannedDurationHours: Number(e.target.value) })
                            }
                            className="w-12 text-center bg-white border-2 border-[#22408F] rounded py-0.5 font-bold text-[#22408F] text-xs"
                          />
                          <span className="text-[#5A6A94]">h</span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-[#22408F]">
                          {s.plannedDurationHours} h
                        </span>
                      )}
                    </td>

                    {/* Actual duration */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.25}
                            min={0}
                            placeholder="—"
                            value={s.actualDurationHours !== undefined ? s.actualDurationHours : ''}
                            onChange={(e) =>
                              updateSession(s.id, {
                                actualDurationHours: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-12 text-center bg-white border-2 border-[#22408F] rounded py-0.5 font-bold text-[#22408F] text-xs"
                          />
                          <span className="text-[#5A6A94]">h</span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-[#22408F]">
                          {s.actualDurationHours !== undefined ? `${s.actualDurationHours} h` : '—'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <select
                          value={s.status}
                          onChange={(e) =>
                            updateSession(s.id, { status: e.target.value as SessionStatus })
                          }
                          className="bg-white border-2 border-[#22408F] rounded px-1.5 py-0.5 text-xs text-[#22408F]"
                        >
                          <option value="planifiee">Planifiée</option>
                          <option value="realisee">Réalisée ✓</option>
                          <option value="annulee">Annulée</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            s.status === 'realisee'
                              ? 'bg-[#EAF6EE] text-[#5A6A94] border-[#22408F]/30'
                              : s.status === 'annulee'
                              ? 'bg-[#FBFAF6] text-[#5A6A94] border-[#22408F]/20'
                              : 'bg-[#EBF1FF] text-[#22408F] border-[#22408F]'
                          }`}
                        >
                          {s.status === 'realisee' ? 'Réalisée ✓' : s.status === 'annulee' ? 'Annulée' : 'Planifiée'}
                        </span>
                      )}
                    </td>

                    {/* Logbook action (Lien texte selon consigne) */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleCreateLogbookForSession(s)}
                        className="riso-text-link text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                        title="Consigner cette session dans le journal de bord"
                      >
                        Ouvrir le journal →
                      </button>
                    </td>

                    {/* Actions edit / delete */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={buildGoogleCalendarUrl({
                            title: s.objective,
                            durationMinutes: Math.round((s.plannedDurationHours || 2) * 60),
                            date: s.date,
                            projectName: activeProject.settings.name,
                            phaseName: phase ? (phase.shortName || phase.nom || phase.name) : s.phaseId,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-[#22408F] hover:bg-[#EBF1FF] rounded transition-colors"
                          title="Ajouter à l'Agenda"
                          aria-label="Ajouter à l'Agenda"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </a>

                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="p-1 text-[#22408F] hover:bg-[#EBF1FF] rounded transition-colors"
                            title="Valider"
                            aria-label="Valider les modifications"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(s.id)}
                            className="p-1 text-[#5A6A94] hover:text-[#22408F] rounded transition-colors"
                            title="Modifier"
                            aria-label={`Modifier la session du ${s.date}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteSession(s.id)}
                          className="p-1 text-[#5A6A94] hover:text-[#F0505A] rounded transition-colors"
                          title="Supprimer cette session"
                          aria-label={`Supprimer la session du ${s.date}`}
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

        {/* Add Session Form */}
        <form
          onSubmit={handleAddSession}
          className="p-3.5 bg-[#FBFAF6] border-t-2 border-[#22408F] flex flex-wrap items-center gap-2.5 text-xs"
        >
          <span className="font-bold text-[#22408F] font-heading">+ Nouvelle session :</span>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg font-mono text-xs text-[#22408F]"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as SessionType)}
            className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs text-[#22408F]"
          >
            <option value="individuelle">Solo ({settings.defaultDurations.individuelle} h)</option>
            {settings.mode === 'groupe' && (
              <option value="groupe">Groupe ({settings.defaultDurations.groupe} h)</option>
            )}
            <option value="encadree">Tuteur ({settings.defaultDurations.encadree} h)</option>
          </select>
          <select
            value={newPhaseId}
            onChange={(e) => setNewPhaseId(e.target.value)}
            className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs text-[#22408F]"
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName || p.nom || p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Objectif de travail (ex: Synthèse des 5 interviews)"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs text-[#22408F]"
          />
          <button
            type="submit"
            disabled={!newObjective.trim()}
            className="btn-riso-primary py-1.5 px-3.5 text-xs"
          >
            Ajouter la session
          </button>
        </form>
      </div>
    </div>
  );
};
