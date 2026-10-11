import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { FormulationSuggestion } from '../../ai/gemini';

interface Props {
  suggestion: FormulationSuggestion;
  onApplyTitle: (titre: string) => void;
  onApplyObserved: (constat: string) => void;
  onApplyTags: (tags: string[]) => void;
  onClose: () => void;
}

export const FormulationSuggestionsCard: React.FC<Props> = ({
  suggestion,
  onApplyTitle,
  onApplyObserved,
  onApplyTags,
  onClose,
}) => {
  const [titleApplied, setTitleApplied] = useState(false);
  const [observedApplied, setObservedApplied] = useState(false);
  const [tagsApplied, setTagsApplied] = useState(false);

  return (
    <div className="p-3.5 bg-white border-2 border-riso-ink rounded-[8px] shadow-riso space-y-3 animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-riso-line">
        <span className="font-heading font-bold text-xs text-riso-ink">
          ✦ Propositions de reformulation
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] cursor-pointer"
          aria-label="Fermer les suggestions"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Titre court */}
      {suggestion.titre && (
        <div className="p-2.5 bg-riso-paper border border-riso-line rounded-[8px] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-riso-ink-secondary">
              Titre suggéré
            </span>
            {titleApplied ? (
              <span className="text-xs font-bold text-riso-p2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Utilisé
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onApplyTitle(suggestion.titre);
                  setTitleApplied(true);
                }}
                className="btn-riso-secondary py-0.5 px-2.5 text-xs font-bold cursor-pointer"
              >
                Utiliser
              </button>
            )}
          </div>
          <p className="text-xs font-bold text-riso-ink">{suggestion.titre}</p>
        </div>
      )}

      {/* 2. Constat clair */}
      {suggestion.constat && (
        <div className="p-2.5 bg-riso-paper border border-riso-line rounded-[8px] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-riso-ink-secondary">
              Reformulation du constat
            </span>
            {observedApplied ? (
              <span className="text-xs font-bold text-riso-p2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Utilisé
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onApplyObserved(suggestion.constat);
                  setObservedApplied(true);
                }}
                className="btn-riso-secondary py-0.5 px-2.5 text-xs font-bold cursor-pointer"
              >
                Utiliser
              </button>
            )}
          </div>
          <p className="text-xs text-riso-ink leading-relaxed whitespace-pre-wrap">{suggestion.constat}</p>
        </div>
      )}

      {/* 3. Tags existants */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="p-2.5 bg-riso-paper border border-riso-line rounded-[8px] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-riso-ink-secondary">
              Tags suggérés ({suggestion.tags.length})
            </span>
            {tagsApplied ? (
              <span className="text-xs font-bold text-riso-p2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Utilisé
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onApplyTags(suggestion.tags);
                  setTagsApplied(true);
                }}
                className="btn-riso-secondary py-0.5 px-2.5 text-xs font-bold cursor-pointer"
              >
                Utiliser
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-xs font-bold bg-riso-p1-light text-riso-ink border border-riso-line"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
