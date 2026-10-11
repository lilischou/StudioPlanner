import React from 'react';
import { useProject, TabType } from '../context/ProjectContext';
import { ProjectReminder } from '../types/project';
import {
  X,
  Bell,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    reminders,
    reminderCount,
    dismissAllReminders,
    setActiveTab,
  } = useProject();

  if (!isOpen) return null;

  const handleReminderClick = (rem: ProjectReminder) => {
    setActiveTab(rem.targetTab as TabType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-riso-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-xl w-full border-2 border-riso-ink shadow-riso max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-riso-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-riso-ink bg-riso-paper shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-riso-p1-light text-riso-ink rounded-[8px] border-2 border-riso-ink">
              <Bell className="w-4 h-4 text-riso-ink" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-riso-ink flex items-center gap-2 font-heading">
                Rappels
                {reminderCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-[999px] bg-riso-p4 text-white border-2 border-riso-ink font-bold tabular-nums">
                    {reminderCount}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {reminderCount > 0 && (
              <button
                type="button"
                onClick={dismissAllReminders}
                className="btn-riso-secondary text-xs py-1 px-3 cursor-pointer"
                title="Masquer les rappels actuels sans supprimer de données"
              >
                Tout effacer
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] hover:bg-riso-p1-light transition-colors border border-transparent hover:border-riso-ink cursor-pointer"
              aria-label="Fermer"
              title="Fermer la fenêtre"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto text-[13px] bg-riso-paper">
          {reminderCount === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-riso-p2" />
              <p className="font-bold text-base text-riso-ink font-heading">
                Rien d'urgent.
              </p>
              <p className="text-xs text-riso-ink-secondary">
                Aucune tâche en retard, aucune échéance dans les 48 h et aucun rendu dans les 7 prochains jours.
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-riso-ink/15 bg-white">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  onClick={() => handleReminderClick(rem)}
                  className="p-4 hover:bg-riso-p1-light/60 transition-colors cursor-pointer flex items-start gap-3.5"
                >
                  <div className="shrink-0 mt-0.5">
                    {rem.type === 'task_overdue' && (
                      <div className="w-8 h-8 rounded-[8px] bg-riso-p4-light text-riso-p4 border-2 border-riso-ink flex items-center justify-center">
                        <Clock className="w-4 h-4 text-riso-p4" />
                      </div>
                    )}
                    {rem.type === 'deadline_48h' && (
                      <div className="w-8 h-8 rounded-[8px] bg-riso-p3-light text-riso-ink border-2 border-riso-ink flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-riso-ink" />
                      </div>
                    )}
                    {rem.type === 'rendu_7d' && (
                      <div className="w-8 h-8 rounded-[8px] bg-riso-p1-light text-riso-p1 border-2 border-riso-ink flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-riso-p1" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-riso-ink truncate">
                        {rem.title}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[999px] border shrink-0 ${
                          rem.badgeStyle === 'error'
                            ? 'bg-riso-p4-light text-riso-p4 border-riso-p4'
                            : rem.badgeStyle === 'warning'
                            ? 'bg-riso-p3-light text-riso-ink border-riso-ink'
                            : 'bg-riso-p1-light text-riso-p1 border-riso-p1'
                        }`}
                      >
                        {rem.badgeLabel}
                      </span>
                    </div>

                    <p className="text-xs text-riso-ink-secondary mt-1 leading-snug">
                      {rem.message}
                    </p>

                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReminderClick(rem);
                        }}
                        className="riso-text-link text-xs font-bold inline-flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        {rem.linkText}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-riso-paper border-t-2 border-riso-ink flex justify-between items-center text-xs shrink-0">
          <span className="text-riso-ink-secondary tabular-nums font-bold">
            {reminderCount > 0
              ? `${reminderCount} rappel${reminderCount > 1 ? 's' : ''}`
              : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-riso-secondary py-1.5 px-4 text-xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
