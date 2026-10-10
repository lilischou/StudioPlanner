import React from 'react';
import { ChevronRight, Link as LinkIcon } from 'lucide-react';
import { LogbookEntry, Phase } from '../../types/project';
import { formatFrenchDate } from '../../utils/dateCalculations';
import { PHASE_COLORS, getPhaseColor } from '../../utils/theme';
import { getDocCount, getObserved, getDone, getTraceTitle, hasResult } from '../../utils/trace';
import { TraceCover } from './TraceCover';

interface Props {
  entry: LogbookEntry;
  phase?: Phase;
  variant?: 'card' | 'row';
  linkLabel?: string;
  onClick: () => void;
}

/** Compteurs discrets : « 📎 3 docs · ✓ résultat » (uniquement s'ils existent). */
const Counters: React.FC<{ entry: LogbookEntry }> = ({ entry }) => {
  const docs = getDocCount(entry);
  const result = hasResult(entry);
  if (!docs && !result) return null;
  return (
    <p className="text-[11px] text-[#5A6A94] font-medium">
      {docs > 0 && <span>{docs} doc{docs > 1 ? 's' : ''}</span>}
      {docs > 0 && result && <span> · </span>}
      {result && <span>✓ résultat</span>}
    </p>
  );
};

export const TraceCard: React.FC<Props> = ({ entry, phase, variant = 'card', linkLabel, onClick }) => {
  const colors = getPhaseColor(phase || entry.phaseId);
  const title = getTraceTitle(entry);
  const excerpt = getObserved(entry) || getDone(entry);
  const phaseName = phase?.nom || phase?.name || phase?.shortName || 'Phase';

  const keyHandler = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  if (variant === 'row') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={keyHandler}
        className="bg-white border-2 border-[#22408F] rounded-lg p-3 shadow-[0_4px_0_#22408F] hover:bg-[#EBF1FF] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex gap-4 items-center group"
      >
        <TraceCover
          entry={entry}
          phaseHex={colors.hex}
          className="w-20 h-20 rounded-md shrink-0 border-2 border-[#22408F]"
          dotSize={8}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.hex }} />
            <span className="font-bold text-[#22408F]">{phaseName}</span>
            <span className="text-[#5A6A94]">·</span>
            <span className="text-[#5A6A94] font-mono text-[11px]">{formatFrenchDate(entry.date)}</span>
          </div>
          <h3 className="font-bold text-sm text-[#22408F] truncate">{title}</h3>
          {excerpt && <p className="text-xs text-[#5A6A94] line-clamp-2 leading-relaxed">{excerpt}</p>}
          <Counters entry={entry} />
        </div>
        <ChevronRight className="w-5 h-5 text-[#22408F] group-hover:translate-x-1 transition-transform shrink-0" />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={keyHandler}
      className="bg-white border-2 border-[#22408F] rounded-lg overflow-hidden shadow-[0_4px_0_#22408F] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all cursor-pointer group flex flex-col h-full"
    >
      {/* Couverture : photo ou trame de points, sans aucun texte superposé */}
      <TraceCover
        entry={entry}
        phaseHex={colors.hex}
        className="w-full aspect-[4/3] border-b-2 border-[#22408F]"
        alt={title}
      />

      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
        {/* Phase + date (une seule fois) */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.hex }} />
            <span className="font-bold text-[#22408F] truncate">{phaseName}</span>
          </span>
          <span className="text-[#5A6A94] font-mono shrink-0">{formatFrenchDate(entry.date, false)}</span>
        </div>

        <h4 className="font-bold text-sm text-[#22408F] group-hover:text-[#2F6DBB] transition-colors line-clamp-2 leading-snug">
          {title}
        </h4>
        {excerpt && <p className="text-xs text-[#5A6A94] line-clamp-2 leading-relaxed">{excerpt}</p>}

        <div className="mt-auto pt-1 space-y-1">
          <Counters entry={entry} />
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-2 text-xs text-[#5A6A94] font-medium">
              {entry.tags.slice(0, 3).map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
          {linkLabel && (
            <span className="text-[11px] text-[#8C9BBD] flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              <span className="truncate max-w-[160px]">{linkLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
