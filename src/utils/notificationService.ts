import { ProjectData, ProjectReminder } from '../types/project';
import { formatISODate, diffInDays, formatFrenchDate } from './dateCalculations';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  notifyUpcomingTasks: true,
  upcomingDaysThreshold: 7,
  notifyOverdueTasks: true,
  notifyDependencyConflicts: true,
  notifyProjectChanges: true,
  notifyMilestones: true,
  soundEnabled: false,
};

/**
 * Calcule les rappels du projet.
 * 3 types seulement :
 * 1. Tâche en retard (deadline passée et tâche non terminée)
 * 2. Échéance dans ≤ 48 h (0 <= j <= 2 et tâche non terminée)
 * 3. Rendu dans ≤ 7 j (rendu final du projet ou dépôt de livrable non validé dans 0 <= j <= 7)
 *
 * Triés par urgence (décroissant).
 */
export function computeProjectReminders(
  project: ProjectData,
  todayISO: string = formatISODate(new Date())
): ProjectReminder[] {
  const reminders: ProjectReminder[] = [];

  // 1. Tâches en retard
  if (project.tasks) {
    project.tasks.forEach((task) => {
      if (task.status === 'fait' || !task.deadline) return;
      const daysDiff = diffInDays(todayISO, task.deadline);
      if (daysDiff < 0) {
        const daysOverdue = Math.abs(daysDiff);
        const fDate = formatFrenchDate(task.deadline, false);
        reminders.push({
          id: `reminder_overdue_${task.id}_${task.deadline}`,
          type: 'task_overdue',
          title: `Tâche en retard (${daysOverdue} j)`,
          message: `« ${task.title} » · Échéance dépassée depuis le ${fDate}.`,
          targetTab: 'checklist',
          targetItemId: task.id,
          linkText: 'Voir la tâche →',
          urgency: 10000 + daysOverdue,
          badgeLabel: 'En retard',
          badgeStyle: 'error',
        });
      }
    });
  }

  // 2. Échéance dans ≤ 48 h (entre 0 et 2 jours)
  if (project.tasks) {
    project.tasks.forEach((task) => {
      if (task.status === 'fait' || !task.deadline) return;
      const daysLeft = diffInDays(todayISO, task.deadline);
      if (daysLeft >= 0 && daysLeft <= 2) {
        const fDate = formatFrenchDate(task.deadline, false);
        const title =
          daysLeft === 0
            ? "Échéance aujourd'hui"
            : daysLeft === 1
            ? 'Échéance demain'
            : 'Échéance dans 48 h';
        reminders.push({
          id: `reminder_upcoming_${task.id}_${task.deadline}`,
          type: 'deadline_48h',
          title,
          message: `« ${task.title} » arrive à échéance le ${fDate}.`,
          targetTab: 'checklist',
          targetItemId: task.id,
          linkText: 'Voir la tâche →',
          urgency: 5000 - daysLeft,
          badgeLabel: daysLeft === 0 ? "Aujourd'hui" : daysLeft === 1 ? 'Demain' : '≤ 48 h',
          badgeStyle: 'warning',
        });
      }
    });
  }

  // 3. Rendu dans ≤ 7 j
  // 3a. Rendu final du projet
  if (project.settings && project.settings.deadlineDate) {
    const daysLeftFinal = diffInDays(todayISO, project.settings.deadlineDate);
    if (daysLeftFinal >= 0 && daysLeftFinal <= 7) {
      const fDate = formatFrenchDate(project.settings.deadlineDate, false);
      const title =
        daysLeftFinal === 0
          ? 'Rendu final aujourd\'hui !'
          : daysLeftFinal === 1
          ? 'Rendu final demain'
          : `Rendu final dans ${daysLeftFinal} j`;
      reminders.push({
        id: `reminder_rendu_final_${project.id}_${project.settings.deadlineDate}`,
        type: 'rendu_7d',
        title,
        message: `Le rendu final du projet « ${project.settings.name} » est fixé au ${fDate}.`,
        targetTab: 'livrables',
        targetItemId: 'final',
        linkText: 'Voir les livrables →',
        urgency: 1000 - daysLeftFinal,
        badgeLabel: 'Rendu ≤ 7 j',
        badgeStyle: 'info',
      });
    }
  }

  // 3b. Dépôt de livrables dans ≤ 7 j (non validés)
  if (project.deliverables) {
    project.deliverables.forEach((del) => {
      if (del.status === 'valide' || !del.deadline) return;
      const daysLeftDel = diffInDays(todayISO, del.deadline);
      if (daysLeftDel >= 0 && daysLeftDel <= 7) {
        const fDate = formatFrenchDate(del.deadline, false);
        const title =
          daysLeftDel === 0
            ? `Dépôt aujourd'hui : ${del.title}`
            : daysLeftDel === 1
            ? `Dépôt demain : ${del.title}`
            : `Rendu dans ${daysLeftDel} j : ${del.title}`;
        reminders.push({
          id: `reminder_rendu_del_${del.id}_${del.deadline}`,
          type: 'rendu_7d',
          title,
          message: `Le livrable « ${del.title} » doit être déposé le ${fDate}.`,
          targetTab: 'livrables',
          targetItemId: del.id,
          linkText: 'Voir le livrable →',
          urgency: 1000 - daysLeftDel,
          badgeLabel: 'Rendu ≤ 7 j',
          badgeStyle: 'info',
        });
      }
    });
  }

  // Tri par urgence décroissante
  return reminders.sort((a, b) => b.urgency - a.urgency);
}
