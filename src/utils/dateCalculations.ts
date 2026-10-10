import { Phase, Milestone, Task, DependencyAlert } from '../types/project';
import { toLocalYMD } from './localDate';

export { toLocalYMD };

/**
 * Format date to YYYY-MM-DD in local time
 */
export function formatISODate(d: Date = new Date()): string {
  return toLocalYMD(d);
}

/**
 * Parse YYYY-MM-DD to Date object at midnight local time
 */
export function parseISODate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Difference in days between two dates (date2 - date1)
 */
export function diffInDays(date1Str: string, date2Str: string): number {
  const d1 = parseISODate(date1Str);
  const d2 = parseISODate(date2Str);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to an ISO date
 */
export function addDaysToISO(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

/**
 * Inclusive difference in days between two dates (date2 - date1 + 1)
 */
export function inclusiveDays(date1Str: string, date2Str: string): number {
  if (!date1Str || !date2Str) return 1;
  return Math.max(1, diffInDays(date1Str, date2Str) + 1);
}

/**
 * Format decimal hours with a comma and space (e.g. 7,5 h, 10,75 h, 3,25 h)
 */
export function formatHours(val: number | string): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return `${val} h`;
  const str = (Math.round(num * 100) / 100).toString().replace('.', ',');
  return `${str} h`;
}

/**
 * Format time to French hour style: "9 h 49" instead of "09:49"
 */
export function formatFrenchHours(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    return `${h} h ${m}`;
  }
  return timeStr;
}

/**
 * Get avatar initials (First letter of first name + First letter of last name, e.g. "AR" for Alexandre Roy)
 */
export function getAssigneeInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0][0] || '';
    const last = parts[parts.length - 1][0] || '';
    return `${first}${last}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Human friendly French date format (e.g. "12 oct. 2026")
 */
export function formatFrenchDate(dateStr: string, includeYear: boolean = true): string {
  if (!dateStr) return '—';
  try {
    const d = parseISODate(dateStr);
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const day = d.getDate();
    const dayStr = day === 1 ? '1er' : `${day}`;
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return includeYear ? `${dayStr} ${month} ${year}` : `${dayStr} ${month}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get weekday name in French (e.g. "Lundi")
 */
export function getFrenchWeekday(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseISODate(dateStr);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[d.getDay()];
}

/**
 * Calculate phase dates based on start date, deadline date, and percentage distributions.
 * Counts days INCLUSIVELY (e.g. 22 sept. -> 30 sept. = 9 j).
 */
export function recalculatePhaseDates(
  phases: Phase[],
  startDate: string,
  deadlineDate: string
): Phase[] {
  const totalDays = Math.max(1, diffInDays(startDate, deadlineDate) + 1); // Total inclusive days
  let currentStart = startDate;

  return phases.map((phase, idx) => {
    // If phase has fixedEndDate, we respect that for ending
    if (phase.fixedEndDate) {
      const pStart = currentStart;
      // Empêche date inversée : si fixedEndDate < pStart, on ne l'affiche jamais inversée
      const pEnd = phase.fixedEndDate < pStart ? pStart : phase.fixedEndDate;
      const duration = Math.max(1, diffInDays(pStart, pEnd) + 1);
      currentStart = addDaysToISO(pEnd, 1);
      return {
        ...phase,
        nom: phase.nom || phase.name,
        name: phase.nom || phase.name,
        debut: pStart,
        fin: pEnd,
        calculatedStartDate: pStart,
        calculatedEndDate: pEnd,
        durationDays: duration,
      };
    }

    // Proportional calculation based on percentage
    const ratio = Math.max(0, (phase.timePercentage || 0) / 100);
    // Allocate proportional days, with minimum 1 day
    let duration = Math.max(1, Math.round(ratio * totalDays));
    
    // For the last phase, align precisely with deadline if not fixed
    if (idx === phases.length - 1) {
      duration = Math.max(1, diffInDays(currentStart, deadlineDate) + 1);
    }

    const calculatedStart = currentStart;
    const calculatedEnd = idx === phases.length - 1 && currentStart <= deadlineDate
      ? deadlineDate
      : addDaysToISO(calculatedStart, Math.max(0, duration - 1));
    currentStart = addDaysToISO(calculatedEnd, 1);

    const actualDuration = Math.max(1, diffInDays(calculatedStart, calculatedEnd) + 1);

    return {
      ...phase,
      nom: phase.nom || phase.name,
      name: phase.nom || phase.name,
      debut: calculatedStart,
      fin: calculatedEnd,
      calculatedStartDate: calculatedStart,
      calculatedEndDate: calculatedEnd,
      durationDays: actualDuration,
    };
  });
}

/**
 * Recalculate milestones based on backward scheduling (J - X days before deadline)
 */
export function recalculateMilestones(
  milestones: Milestone[],
  deadlineDate: string
): Milestone[] {
  return milestones.map((m) => {
    if (m.useFixedDate && m.fixedDate) {
      return {
        ...m,
        calculatedDate: m.fixedDate,
      };
    }
    const calculated = addDaysToISO(deadlineDate, -Math.abs(m.daysBeforeDeadline));
    return {
      ...m,
      calculatedDate: calculated,
    };
  });
}

/**
 * Status color code classification based on the model's legend:
 * - 'completed' (Ligne verte): Fait / terminé
 * - 'overdue' (Ligne rouge): Échéance dépassée et pas encore faite
 * - 'warning' (Ligne orange): Échéance dans les 7 prochains jours ou tâche bloquée
 * - 'normal' (standard)
 */
export function getTaskRowHighlight(
  task: Task,
  todayISO: string = formatISODate(new Date())
): 'completed' | 'overdue' | 'warning' | 'normal' {
  if (task.status === 'fait') {
    return 'completed';
  }
  if (task.status === 'bloque') {
    return 'warning';
  }
  if (!task.deadline) {
    return 'normal';
  }
  const daysUntilDeadline = diffInDays(todayISO, task.deadline);
  if (daysUntilDeadline < 0) {
    return 'overdue';
  }
  if (daysUntilDeadline <= 7) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Check for dependency issues across tasks:
 * 1. Date conflict: predecessor deadline > task deadline
 * 2. Incomplete prerequisite: task is 'en_cours' or 'fait', but predecessor is not 'fait'
 * 3. Circular dependency: A -> B -> A
 */
export function validateTaskDependencies(tasks: Task[]): DependencyAlert[] {
  const alerts: DependencyAlert[] = [];
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  // 1. Check direct predecessors
  for (const task of tasks) {
    if (!task.dependsOn || task.dependsOn.length === 0) continue;

    for (const predId of task.dependsOn) {
      const pred = taskMap.get(predId);
      if (!pred) continue;

      // Date conflict check: task deadline cannot be earlier than predecessor deadline
      if (task.deadline && pred.deadline && task.deadline < pred.deadline) {
        alerts.push({
          taskId: task.id,
          taskTitle: task.title,
          predecessorId: pred.id,
          predecessorTitle: pred.title,
          type: 'date_conflict',
          severity: 'error',
          message: `Incohérence de date : l'échéance de "${task.title}" (${formatFrenchDate(task.deadline, false)}) est antérieure à celle de son prérequis "${pred.title}" (${formatFrenchDate(pred.deadline, false)}).`,
        });
      }

      // Incomplete prerequisite check: if task is in progress or completed, predecessor must be finished
      if ((task.status === 'en_cours' || task.status === 'fait') && pred.status !== 'fait') {
        alerts.push({
          taskId: task.id,
          taskTitle: task.title,
          predecessorId: pred.id,
          predecessorTitle: pred.title,
          type: 'incomplete_prerequisite',
          severity: task.status === 'fait' ? 'warning' : 'warning',
          message: `Prérequis non validé : "${task.title}" est démarrée mais son prérequis "${pred.title}" n'est pas encore marqué comme « Fait » (${pred.status === 'bloque' ? 'bloqué' : pred.status === 'en_cours' ? 'en cours' : 'à faire'}).`,
        });
      }
    }
  }

  // 2. Circular dependency check using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function checkCycle(currentId: string, path: string[]): boolean {
    visited.add(currentId);
    recursionStack.add(currentId);

    const task = taskMap.get(currentId);
    if (task && task.dependsOn) {
      for (const neighborId of task.dependsOn) {
        if (!visited.has(neighborId)) {
          if (checkCycle(neighborId, [...path, neighborId])) {
            return true;
          }
        } else if (recursionStack.has(neighborId)) {
          const currentTitle = task.title;
          const neighborTask = taskMap.get(neighborId);
          alerts.push({
            taskId: currentId,
            taskTitle: currentTitle,
            predecessorId: neighborId,
            predecessorTitle: neighborTask?.title || neighborId,
            type: 'circular',
            severity: 'error',
            message: `Dépendance circulaire détectée : boucle fermée entre "${currentTitle}" et "${neighborTask?.title || neighborId}".`,
          });
          return true;
        }
      }
    }

    recursionStack.delete(currentId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      checkCycle(task.id, [task.id]);
    }
  }

  return alerts;
}

/**
 * Helper to auto-push successor dates forward if a predecessor's deadline moves
 */
export function autoAdjustSuccessorDates(tasks: Task[], movedTaskId: string): Task[] {
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, { ...t }));

  const movedTask = taskMap.get(movedTaskId);
  if (!movedTask || !movedTask.deadline) return tasks;

  const queue = [movedTaskId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    visited.add(currentId);
    const currentTask = taskMap.get(currentId)!;

    // Find all successors (tasks that depend on currentTask)
    for (const [id, potentialSuccessor] of taskMap.entries()) {
      if (potentialSuccessor.dependsOn?.includes(currentId)) {
        if (potentialSuccessor.deadline && currentTask.deadline && potentialSuccessor.deadline < currentTask.deadline) {
          // Adjust successor deadline to at least match or be 1 day after predecessor
          const newDeadline = addDaysToISO(currentTask.deadline, 1);
          taskMap.set(id, {
            ...potentialSuccessor,
            deadline: newDeadline,
          });
          if (!visited.has(id)) {
            queue.push(id);
          }
        }
      }
    }
  }

  return Array.from(taskMap.values());
}
