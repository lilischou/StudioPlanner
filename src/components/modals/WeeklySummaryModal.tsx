import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { WeeklySummary } from '../../ai/gemini';

interface WeeklySummaryModalProps {
  isOpen: boolean;
  summary: WeeklySummary | null;
  onClose: () => void;
}

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  isOpen,
  summary,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !summary) return null;

  const getFormattedText = (): string => {
    return `Bilan de la semaine\n\nFait\n${summary.fait}\n\nConstaté\n${summary.constate}\n\nProchaine étape\n${summary.prochaineEtape}`;
  };

  const copyToClipboard = async (): Promise<boolean> => {
    const text = getFormattedText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch (err) {
      console.error('Erreur lors de la copie du bilan', err);
      return false;
    }
  };

  const handleCopyOnly = async () => {
    await copyToClipboard();
  };

  const handleOpenGoogleDocs = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    await copyToClipboard();
    // L'ancre standard href="https://docs.new" target="_blank" rel="noopener noreferrer" s'ouvre naturellement dans un nouvel onglet
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="riso-card w-full max-w-xl bg-white flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 shadow-[0_4px_0_#22408F]"
        role="dialog"
        aria-modal="true"
        aria-label="Bilan de la semaine"
      >
        {/* En-tête */}
        <div className="px-5 py-4 flex items-center justify-between border-b-2 border-[#DCE2EF] bg-[#FBFAF6] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F6DBB] shrink-0" aria-hidden="true" />
            <h2 className="font-heading font-bold text-base text-[#22408F] lowercase">
              bilan de la semaine
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#22408F] hover:bg-[#EBF1FF] transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu : 3 parties Fait · Constaté · Prochaine étape */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* 1. Fait */}
          <div className="p-4 rounded-xl border border-[#DCE2EF] bg-[#FBFAF6] space-y-1.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#2E8B4A] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2E8B4A]" aria-hidden="true" />
              Fait
            </h3>
            <p className="text-[13px] sm:text-sm text-[#22408F] leading-relaxed whitespace-pre-wrap">
              {summary.fait}
            </p>
          </div>

          {/* 2. Constaté */}
          <div className="p-4 rounded-xl border border-[#DCE2EF] bg-[#FBFAF6] space-y-1.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#2F6DBB] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2F6DBB]" aria-hidden="true" />
              Constaté
            </h3>
            <p className="text-[13px] sm:text-sm text-[#22408F] leading-relaxed whitespace-pre-wrap">
              {summary.constate}
            </p>
          </div>

          {/* 3. Prochaine étape */}
          <div className="p-4 rounded-xl border border-[#DCE2EF] bg-[#FBFAF6] space-y-1.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#F2661F] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F2661F]" aria-hidden="true" />
              Prochaine étape
            </h3>
            <p className="text-[13px] sm:text-sm text-[#22408F] leading-relaxed whitespace-pre-wrap">
              {summary.prochaineEtape}
            </p>
          </div>
        </div>

        {/* Pied de page : 2 boutons Copier et Ouvrir dans Google Docs */}
        <div className="px-5 py-3.5 border-t-2 border-[#DCE2EF] bg-[#FBFAF6] flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyOnly}
            className="btn-riso-secondary py-2 px-3.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#2E8B4A]" />
            ) : (
              <Copy className="w-4 h-4 text-[#22408F]" />
            )}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>

          <a
            href="https://docs.new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenGoogleDocs}
            className="btn-riso-primary py-2 px-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer text-white no-underline inline-flex"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ouvrir dans Google Docs</span>
          </a>
        </div>
      </div>
    </div>
  );
};
