import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task } from '../../types/project';
import {
  X,
  GitBranch,
  ArrowRight,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import { formatFrenchDate } from '../../utils/dateCalculations';

interface DependencyVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTaskId?: string;
}

export const DependencyVisualizerModal: React.FC<DependencyVisualizerModalProps> = ({
  isOpen,
  onClose,
  selectedTaskId: initialTaskId,
}) => {
  const {
    activeProject,
    addDependency,
    removeDependency,
    autoFixSuccessorDeadlines,
    dependencyAlerts,
  } = useProject();

  const [activeTaskId, setActiveTaskId] = useState<string>(
    initialTaskId || activeProject.tasks[0]?.id || ''
  );
  const [selectedPredToAdd, setSelectedPredToAdd] = useState<string>('');
  const [selectedSuccToAdd, setSelectedSuccToAdd] = useState<string>('');

  if (!isOpen) return null;

  const currentTask = activeProject.tasks.find((t) => t.id === activeTaskId);

  // Compute predecessors of currentTask
  const predecessors = currentTask?.dependsOn
    ? activeProject.tasks.filter((t) => currentTask.dependsOn.includes(t.id))
    : [];

  // Compute successors of currentTask (tasks that depend on currentTask)
  const successors = activeProject.tasks.filter((t) =>
    t.dependsOn?.includes(activeTaskId)
  );

  // Alerts concerning currentTask
  const taskAlerts = dependencyAlerts.filter(
    (a) => a.taskId === activeTaskId || a.predecessorId === activeTaskId
  );

  // Potential predecessors (not already a pred, not itself)
  const availablePreds = activeProject.tasks.filter(
    (t) => t.id !== activeTaskId && !currentTask?.dependsOn?.includes(t.id)
  );

  // Potential successors (not already a successor, not itself)
  const availableSuccs = activeProject.tasks.filter(
    (t) => t.id !== activeTaskId && !t.dependsOn?.includes(activeTaskId)
  );

  const handleAddPredecessor = () => {
    if (!selectedPredToAdd || !activeTaskId) return;
    addDependency(activeTaskId, selectedPredToAdd);
    setSelectedPredToAdd('');
  };

  const handleAddSuccessor = () => {
    if (!selectedSuccToAdd || !activeTaskId) return;
    // Adding successor means the chosen task depends on currentTask
    addDependency(selectedSuccToAdd, activeTaskId);
    setSelectedSuccToAdd('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-riso-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[16px] max-w-4xl w-full border border-riso-line shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-riso-line bg-riso-paper shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-riso-p3-light text-riso-ink rounded-[8px]">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-riso-ink flex items-center gap-2">
                Dépendances
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-riso-ink-subtle hover:text-riso-ink-secondary rounded-[8px] hover:bg-riso-p1-light transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs">
          {/* Selector of task to inspect */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-riso-paper p-3.5 rounded-[8px] border border-riso-line">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-riso-ink">Tâche sélectionnée :</span>
              <select
                value={activeTaskId}
                onChange={(e) => setActiveTaskId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-riso-line rounded-[8px] text-xs font-medium text-riso-ink focus:ring-riso-p3"
              >
                {activeProject.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code || '•'} - {t.title} {activeProject.settings.mode === 'groupe' ? `(${t.assignee})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {currentTask && (
              <button
                type="button"
                onClick={() => autoFixSuccessorDeadlines(activeTaskId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-riso-p5 hover:bg-riso-p5-text text-white font-medium rounded-[8px] transition-colors"
                title="Ajuste automatiquement les dates des successeurs pour qu'ils commencent après la fin de cette tâche"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ajuster les dates des successeurs
              </button>
            )}
          </div>

          {/* Dependency Alerts for this task if any */}
          {taskAlerts.length > 0 && (
            <div className="space-y-2">
              {taskAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-[8px] border flex items-start gap-2.5 ${
                    alert.severity === 'error'
                      ? 'bg-riso-p4-light border-riso-p4 text-riso-p4-text'
                      : 'bg-riso-p3-light border-riso-p3-tint text-riso-ink'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visual 3-Column Pipeline: [Prédécesseurs] -> [Tâche Actuelle] -> [Successeurs] */}
          {currentTask ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Column 1: PRÉDÉCESSEURS (Must be finished before) */}
              <div className="p-4 bg-riso-paper/80 rounded-[16px] border border-riso-line space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-riso-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-riso-p1"></span>
                    Prédécesseurs ({predecessors.length})
                  </h3>
                  <span className="text-[11px] text-riso-ink-secondary">Prérequis à finir avant</span>
                </div>

                <div className="space-y-2 min-h-[90px]">
                  {predecessors.length === 0 ? (
                    <div className="p-3 text-center text-riso-ink-secondary border border-dashed border-riso-line rounded-[8px]">
                      Aucun prérequis. Cette tâche peut débuter librement.
                    </div>
                  ) : (
                    predecessors.map((pred) => {
                      const isComplete = pred.status === 'fait';
                      const hasDateConflict =
                        currentTask.deadline && pred.deadline && currentTask.deadline < pred.deadline;

                      return (
                        <div
                          key={pred.id}
                          className={`p-2.5 rounded-[8px] border bg-white shadow-xs space-y-1.5 relative ${
                            hasDateConflict
                              ? 'border-riso-p4 ring-1 ring-riso-p4-tint'
                              : isComplete
                              ? 'border-riso-p2-tint'
                              : 'border-riso-line'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-riso-ink-secondary text-[11px]">
                              {pred.code}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded-[8px] ${
                                  isComplete
                                    ? 'bg-riso-p2-light text-riso-p2-text'
                                    : 'bg-riso-p1-light text-riso-ink-secondary'
                                }`}
                              >
                                {isComplete ? 'Fait' : pred.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDependency(activeTaskId, pred.id)}
                                title="Supprimer ce prérequis"
                                className="text-riso-ink-subtle hover:text-riso-p4-text p-0.5 rounded-[8px]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="font-medium text-riso-ink truncate">{pred.title}</div>
                          <div className="flex items-center justify-between text-[11px] text-riso-ink-subtle">
                            {activeProject.settings.mode === 'groupe' ? <span>{pred.assignee}</span> : <span />}
                            <span>Échéance : {formatFrenchDate(pred.deadline, false)}</span>
                          </div>
                          {hasDateConflict && (
                            <div className="text-[10px] text-riso-p4-text font-medium">
                              ⚠ Échéance postérieure à la tâche active !
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add predecessor select */}
                <div className="pt-2 border-t border-riso-line flex items-center gap-1.5">
                  <select
                    value={selectedPredToAdd}
                    onChange={(e) => setSelectedPredToAdd(e.target.value)}
                    className="flex-1 px-2 py-1 bg-white border border-riso-line rounded-[8px] text-xs"
                  >
                    <option value="">+ Ajouter un prérequis...</option>
                    {availablePreds.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddPredecessor}
                    disabled={!selectedPredToAdd}
                    className="p-1.5 bg-riso-ink hover:bg-riso-p1 disabled:opacity-30 text-white rounded-[8px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 2: CURRENT TASK (FOCAL POINT) */}
              <div className="p-4 bg-riso-p3-light/50 rounded-[16px] border-2 border-riso-p3-tint shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-riso-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-riso-p5"></span>
                    Tâche en cours d'analyse
                  </h3>
                  <span className="font-mono font-bold text-riso-ink text-xs">
                    {currentTask.code}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-[8px] border border-riso-p3-tint shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-riso-ink leading-snug">
                    {currentTask.title}
                  </h4>

                  <div className="space-y-1 text-riso-ink-secondary text-xs">
                    {activeProject.settings.mode === 'groupe' && (
                      <div className="flex justify-between">
                        <span className="text-riso-ink-secondary">Responsable :</span>
                        <span className="font-medium text-riso-ink">{currentTask.assignee}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-riso-ink-secondary">Échéance :</span>
                      <span className="font-mono font-medium text-riso-ink">
                        {formatFrenchDate(currentTask.deadline, true)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-riso-ink-secondary">Durée prévue :</span>
                      <span className="font-mono text-riso-ink">
                        {currentTask.durationMinutes} min ({Math.round((currentTask.durationMinutes / 60) * 10) / 10} h)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-riso-ink-secondary">Statut actuel :</span>
                      <span
                        className={`font-semibold capitalize ${
                          currentTask.status === 'fait'
                            ? 'text-riso-p2-text'
                            : currentTask.status === 'bloque'
                            ? 'text-riso-p5-text'
                            : currentTask.status === 'en_cours'
                            ? 'text-riso-ink'
                            : 'text-riso-ink-secondary'
                        }`}
                      >
                        {currentTask.status === 'a_faire'
                          ? 'À faire'
                          : currentTask.status === 'en_cours'
                          ? 'En cours'
                          : currentTask.status === 'bloque'
                          ? 'Bloqué'
                          : 'Fait'}
                      </span>
                    </div>
                  </div>

                  {currentTask.notes && (
                    <div className="pt-2 border-t border-riso-line text-[11px] text-riso-ink-subtle italic">
                      « {currentTask.notes} »
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-white/70 rounded-[8px] text-riso-ink-secondary text-[11px]">
                  💡 <strong>Principe de la démarche :</strong> Une tâche bornée (&lt; 4h) ne devrait débuter que lorsque tous ses prérequis sont à l'état « Fait ».
                </div>
              </div>

              {/* Column 3: SUCCESSEURS (Tasks that depend on this one) */}
              <div className="p-4 bg-riso-paper/80 rounded-[16px] border border-riso-line space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-riso-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-riso-p2"></span>
                    Successeurs ({successors.length})
                  </h3>
                  <span className="text-[11px] text-riso-ink-secondary">Dépendent de cette tâche</span>
                </div>

                <div className="space-y-2 min-h-[90px]">
                  {successors.length === 0 ? (
                    <div className="p-3 text-center text-riso-ink-secondary border border-dashed border-riso-line rounded-[8px]">
                      Aucune tâche ne dépend de celle-ci pour le moment.
                    </div>
                  ) : (
                    successors.map((succ) => {
                      const hasDateConflict =
                        succ.deadline && currentTask.deadline && succ.deadline < currentTask.deadline;

                      return (
                        <div
                          key={succ.id}
                          className={`p-2.5 rounded-[8px] border bg-white shadow-xs space-y-1.5 ${
                            hasDateConflict
                              ? 'border-riso-p4 ring-1 ring-riso-p4-tint'
                              : 'border-riso-line'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-riso-ink-secondary text-[11px]">
                              {succ.code}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-medium bg-riso-p1-light text-riso-ink-secondary px-1.5 py-0.2 rounded-[8px]">
                                {succ.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDependency(succ.id, activeTaskId)}
                                title="Supprimer ce lien de dépendance"
                                className="text-riso-ink-subtle hover:text-riso-p4-text p-0.5 rounded-[8px]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="font-medium text-riso-ink truncate">{succ.title}</div>
                          <div className="flex items-center justify-between text-[11px] text-riso-ink-subtle">
                            {activeProject.settings.mode === 'groupe' ? <span>{succ.assignee}</span> : <span />}
                            <span>Échéance : {formatFrenchDate(succ.deadline, false)}</span>
                          </div>
                          {hasDateConflict && (
                            <div className="text-[10px] text-riso-p4-text font-medium">
                              ⚠ Échéance antérieure à son prérequis !
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add successor select */}
                <div className="pt-2 border-t border-riso-line flex items-center gap-1.5">
                  <select
                    value={selectedSuccToAdd}
                    onChange={(e) => setSelectedSuccToAdd(e.target.value)}
                    className="flex-1 px-2 py-1 bg-white border border-riso-line rounded-[8px] text-xs"
                  >
                    <option value="">+ Ajouter un successeur...</option>
                    {availableSuccs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSuccessor}
                    disabled={!selectedSuccToAdd}
                    className="p-1.5 bg-riso-ink hover:bg-riso-p1 disabled:opacity-30 text-white rounded-[8px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-riso-ink-subtle">
              Aucune tâche créée pour le moment.
            </div>
          )}

          {/* Quick complete dependency matrix summary */}
          <div className="border-t border-riso-line pt-4">
            <h4 className="font-semibold text-riso-ink mb-2">
              Vue synthétique du réseau de tâches ({activeProject.tasks.length} tâches)
            </h4>
            <div className="overflow-x-auto border border-riso-line rounded-[8px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-riso-p1-light text-riso-ink-secondary border-b border-riso-line">
                    <th className="py-2 px-3 font-semibold w-16">Réf.</th>
                    <th className="py-2 px-3 font-semibold">Tâche</th>
                    {activeProject.settings.mode === 'groupe' && (
                      <th className="py-2 px-3 font-semibold">Responsable</th>
                    )}
                    <th className="py-2 px-3 font-semibold">Échéance</th>
                    <th className="py-2 px-3 font-semibold">Prérequis (Prédécesseurs)</th>
                    <th className="py-2 px-3 font-semibold">Successeurs</th>
                    <th className="py-2 px-3 font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-riso-line">
                  {activeProject.tasks.map((task) => {
                    const isSelected = task.id === activeTaskId;
                    const predCodes = task.dependsOn?.map((pId) => {
                      const p = activeProject.tasks.find((t) => t.id === pId);
                      return p?.code || pId;
                    }) || [];
                    const succCodes = activeProject.tasks
                      .filter((t) => t.dependsOn?.includes(task.id))
                      .map((t) => t.code || t.title);

                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-riso-paper transition-colors ${
                          isSelected ? 'bg-riso-p3-light font-medium' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-riso-ink-secondary">{task.code}</td>
                        <td className="py-2 px-3 text-riso-ink truncate max-w-[220px]">
                          {task.title}
                        </td>
                        {activeProject.settings.mode === 'groupe' && (
                          <td className="py-2 px-3 text-riso-ink-secondary">{task.assignee}</td>
                        )}
                        <td className="py-2 px-3 font-mono text-riso-ink-secondary">
                          {formatFrenchDate(task.deadline, false)}
                        </td>
                        <td className="py-2 px-3">
                          {predCodes.length > 0 ? (
                            <span className="font-mono text-riso-p1 bg-riso-p1-light px-1.5 py-0.5 rounded-[8px] border border-riso-p1-tint">
                              {predCodes.join(', ')}
                            </span>
                          ) : (
                            <span className="text-riso-ink-subtle">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {succCodes.length > 0 ? (
                            <span className="font-mono text-riso-p2-text bg-riso-p2-light px-1.5 py-0.5 rounded-[8px] border border-riso-p2-tint">
                              {succCodes.join(', ')}
                            </span>
                          ) : (
                            <span className="text-riso-ink-subtle">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setActiveTaskId(task.id)}
                            className="text-xs text-riso-ink hover:opacity-80 font-bold underline underline-offset-2 cursor-pointer"
                          >
                            Inspecter →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-riso-p1-light border-t border-riso-line flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-riso-ink-secondary bg-white hover:bg-riso-paper border border-riso-line rounded-[8px] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
