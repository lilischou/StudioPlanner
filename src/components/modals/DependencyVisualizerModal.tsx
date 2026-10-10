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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full border border-neutral-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                Dépendances
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs">
          {/* Selector of task to inspect */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-800">Tâche sélectionnée :</span>
              <select
                value={activeTaskId}
                onChange={(e) => setActiveTaskId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-medium text-neutral-900 focus:ring-amber-500"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md transition-colors"
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
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    alert.severity === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
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
              <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Prédécesseurs ({predecessors.length})
                  </h3>
                  <span className="text-[11px] text-neutral-600">Prérequis à finir avant</span>
                </div>

                <div className="space-y-2 min-h-[90px]">
                  {predecessors.length === 0 ? (
                    <div className="p-3 text-center text-neutral-600 border border-dashed border-neutral-200 rounded-lg">
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
                          className={`p-2.5 rounded-lg border bg-white shadow-xs space-y-1.5 relative ${
                            hasDateConflict
                              ? 'border-rose-300 ring-1 ring-rose-200'
                              : isComplete
                              ? 'border-emerald-200'
                              : 'border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-neutral-700 text-[11px]">
                              {pred.code}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-neutral-100 text-neutral-700'
                                }`}
                              >
                                {isComplete ? 'Fait' : pred.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDependency(activeTaskId, pred.id)}
                                title="Supprimer ce prérequis"
                                className="text-neutral-400 hover:text-rose-600 p-0.5 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="font-medium text-neutral-900 truncate">{pred.title}</div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-500">
                            {activeProject.settings.mode === 'groupe' ? <span>{pred.assignee}</span> : <span />}
                            <span>Échéance : {formatFrenchDate(pred.deadline, false)}</span>
                          </div>
                          {hasDateConflict && (
                            <div className="text-[10px] text-rose-700 font-medium">
                              ⚠ Échéance postérieure à la tâche active !
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add predecessor select */}
                <div className="pt-2 border-t border-neutral-200/60 flex items-center gap-1.5">
                  <select
                    value={selectedPredToAdd}
                    onChange={(e) => setSelectedPredToAdd(e.target.value)}
                    className="flex-1 px-2 py-1 bg-white border border-neutral-300 rounded text-xs"
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
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 text-white rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 2: CURRENT TASK (FOCAL POINT) */}
              <div className="p-4 bg-amber-50/50 rounded-xl border-2 border-amber-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tâche en cours d'analyse
                  </h3>
                  <span className="font-mono font-bold text-amber-900 text-xs">
                    {currentTask.code}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-amber-200 shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-neutral-900 leading-snug">
                    {currentTask.title}
                  </h4>

                  <div className="space-y-1 text-neutral-600 text-xs">
                    {activeProject.settings.mode === 'groupe' && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Responsable :</span>
                        <span className="font-medium text-neutral-900">{currentTask.assignee}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Échéance :</span>
                      <span className="font-mono font-medium text-neutral-900">
                        {formatFrenchDate(currentTask.deadline, true)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Durée prévue :</span>
                      <span className="font-mono text-neutral-900">
                        {currentTask.durationMinutes} min ({Math.round((currentTask.durationMinutes / 60) * 10) / 10} h)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Statut actuel :</span>
                      <span
                        className={`font-semibold capitalize ${
                          currentTask.status === 'fait'
                            ? 'text-emerald-700'
                            : currentTask.status === 'bloque'
                            ? 'text-orange-700'
                            : currentTask.status === 'en_cours'
                            ? 'text-amber-700'
                            : 'text-neutral-700'
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
                    <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 italic">
                      « {currentTask.notes} »
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-white/70 rounded-lg text-neutral-600 text-[11px]">
                  💡 <strong>Principe de la démarche :</strong> Une tâche bornée (&lt; 4h) ne devrait débuter que lorsque tous ses prérequis sont à l'état « Fait ».
                </div>
              </div>

              {/* Column 3: SUCCESSEURS (Tasks that depend on this one) */}
              <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Successeurs ({successors.length})
                  </h3>
                  <span className="text-[11px] text-neutral-600">Dépendent de cette tâche</span>
                </div>

                <div className="space-y-2 min-h-[90px]">
                  {successors.length === 0 ? (
                    <div className="p-3 text-center text-neutral-600 border border-dashed border-neutral-200 rounded-lg">
                      Aucune tâche ne dépend de celle-ci pour le moment.
                    </div>
                  ) : (
                    successors.map((succ) => {
                      const hasDateConflict =
                        succ.deadline && currentTask.deadline && succ.deadline < currentTask.deadline;

                      return (
                        <div
                          key={succ.id}
                          className={`p-2.5 rounded-lg border bg-white shadow-xs space-y-1.5 ${
                            hasDateConflict
                              ? 'border-rose-300 ring-1 ring-rose-200'
                              : 'border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-neutral-700 text-[11px]">
                              {succ.code}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded">
                                {succ.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDependency(succ.id, activeTaskId)}
                                title="Supprimer ce lien de dépendance"
                                className="text-neutral-400 hover:text-rose-600 p-0.5 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="font-medium text-neutral-900 truncate">{succ.title}</div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-500">
                            {activeProject.settings.mode === 'groupe' ? <span>{succ.assignee}</span> : <span />}
                            <span>Échéance : {formatFrenchDate(succ.deadline, false)}</span>
                          </div>
                          {hasDateConflict && (
                            <div className="text-[10px] text-rose-700 font-medium">
                              ⚠ Échéance antérieure à son prérequis !
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add successor select */}
                <div className="pt-2 border-t border-neutral-200/60 flex items-center gap-1.5">
                  <select
                    value={selectedSuccToAdd}
                    onChange={(e) => setSelectedSuccToAdd(e.target.value)}
                    className="flex-1 px-2 py-1 bg-white border border-neutral-300 rounded text-xs"
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
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 text-white rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-400">
              Aucune tâche créée pour le moment.
            </div>
          )}

          {/* Quick complete dependency matrix summary */}
          <div className="border-t border-neutral-200 pt-4">
            <h4 className="font-semibold text-neutral-900 mb-2">
              Vue synthétique du réseau de tâches ({activeProject.tasks.length} tâches)
            </h4>
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-600 border-b border-neutral-200">
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
                <tbody className="divide-y divide-neutral-100">
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
                        className={`hover:bg-neutral-50 transition-colors ${
                          isSelected ? 'bg-amber-50 font-medium' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-neutral-700">{task.code}</td>
                        <td className="py-2 px-3 text-neutral-900 truncate max-w-[220px]">
                          {task.title}
                        </td>
                        {activeProject.settings.mode === 'groupe' && (
                          <td className="py-2 px-3 text-neutral-600">{task.assignee}</td>
                        )}
                        <td className="py-2 px-3 font-mono text-neutral-600">
                          {formatFrenchDate(task.deadline, false)}
                        </td>
                        <td className="py-2 px-3">
                          {predCodes.length > 0 ? (
                            <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {predCodes.join(', ')}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {succCodes.length > 0 ? (
                            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {succCodes.join(', ')}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setActiveTaskId(task.id)}
                            className="text-xs text-[#22408F] hover:opacity-80 font-bold underline underline-offset-2 cursor-pointer"
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
        <div className="px-6 py-3 bg-neutral-100 border-t border-neutral-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
