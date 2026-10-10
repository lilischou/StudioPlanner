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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-xl w-full border-2 border-[#22408F] shadow-[0_4px_0_#22408F] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#22408F]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#22408F] bg-[#FBFAF6] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EBF1FF] text-[#22408F] rounded-[8px] border-2 border-[#22408F]">
              <Bell className="w-4 h-4 text-[#22408F]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#22408F] flex items-center gap-2 font-heading">
                Rappels
                {reminderCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-[999px] bg-[#F0505A] text-white border-2 border-[#22408F] font-bold tabular-nums">
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
              className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] hover:bg-[#EBF1FF] transition-colors border border-transparent hover:border-[#22408F] cursor-pointer"
              aria-label="Fermer"
              title="Fermer la fenêtre"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto text-[13px] bg-[#FBFAF6]">
          {reminderCount === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-[#2E8B4A]" />
              <p className="font-bold text-base text-[#22408F] font-heading">
                Rien d'urgent.
              </p>
              <p className="text-xs text-[#5A6A94]">
                Aucune tâche en retard, aucune échéance dans les 48 h et aucun rendu dans les 7 prochains jours.
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-[#22408F]/15 bg-white">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  onClick={() => handleReminderClick(rem)}
                  className="p-4 hover:bg-[#EBF1FF]/60 transition-colors cursor-pointer flex items-start gap-3.5"
                >
                  <div className="shrink-0 mt-0.5">
                    {rem.type === 'task_overdue' && (
                      <div className="w-8 h-8 rounded-[8px] bg-[#FDEEEF] text-[#F0505A] border-2 border-[#22408F] flex items-center justify-center">
                        <Clock className="w-4 h-4 text-[#F0505A]" />
                      </div>
                    )}
                    {rem.type === 'deadline_48h' && (
                      <div className="w-8 h-8 rounded-[8px] bg-[#FEFCE8] text-[#22408F] border-2 border-[#22408F] flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-[#22408F]" />
                      </div>
                    )}
                    {rem.type === 'rendu_7d' && (
                      <div className="w-8 h-8 rounded-[8px] bg-[#EBF1FF] text-[#2F6DBB] border-2 border-[#22408F] flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-[#2F6DBB]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#22408F] truncate">
                        {rem.title}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[999px] border shrink-0 ${
                          rem.badgeStyle === 'error'
                            ? 'bg-[#FDEEEF] text-[#F0505A] border-[#F0505A]'
                            : rem.badgeStyle === 'warning'
                            ? 'bg-[#FEFCE8] text-[#22408F] border-[#22408F]'
                            : 'bg-[#EBF1FF] text-[#2F6DBB] border-[#2F6DBB]'
                        }`}
                      >
                        {rem.badgeLabel}
                      </span>
                    </div>

                    <p className="text-xs text-[#5A6A94] mt-1 leading-snug">
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
        <div className="px-6 py-3.5 bg-[#FBFAF6] border-t-2 border-[#22408F] flex justify-between items-center text-xs shrink-0">
          <span className="text-[#5A6A94] tabular-nums font-bold">
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
