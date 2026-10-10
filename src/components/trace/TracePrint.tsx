import React from 'react';
import { LogbookEntry, TraceDoc } from '../../types/project';
import { DOC_TYPE_LABELS } from '../../utils/linkDetect';
import {
  getResultDocs,
  getResultText,
  getWorkDocs,
} from '../../utils/trace';
import { PHASE_COLORS } from '../../utils/theme';
import { TraceCover, useCoverSrc } from './TraceCover';

/** Ligne imprimée d'un document : nom + URL imprimée (les fichiers n'ont pas d'URL). */
const PrintDocLine: React.FC<{ doc: TraceDoc }> = ({ doc }) => (
  <li className="leading-snug break-words">
    <span className="font-bold text-[#22408F]">{doc.name || DOC_TYPE_LABELS[doc.docType]}</span>
    <span className="text-[#5A6A94]"> ({DOC_TYPE_LABELS[doc.docType]})</span>
    {doc.kind === 'link' && doc.url ? (
      <span className="block font-mono text-[10px] text-[#22408F] break-all">{doc.url}</span>
    ) : (
      <span className="block text-[10px] text-[#5A6A94] italic">Fichier joint dans l’application</span>
    )}
  </li>
);

/** Couverture de la planche (rien si la trace n'a pas de photo). */
export const PrintCover: React.FC<{ entry: LogbookEntry; alt: string }> = ({ entry, alt }) => {
  const src = useCoverSrc(entry);
  if (!src) return null;
  const colors = PHASE_COLORS[entry.phaseId] || PHASE_COLORS.p1;
  return (
    <div className="rounded-xl overflow-hidden border-2 border-[#22408F] max-h-[380px]">
      <TraceCover entry={entry} phaseHex={colors.hex} className="w-full aspect-[4/3] max-h-[380px]" alt={alt} />
    </div>
  );
};

/** Documents de travail + « Ce que j'ai produit » pour chaque planche imprimée. */
export const TracePrintExtras: React.FC<{ entry: LogbookEntry }> = ({ entry }) => {
  const work = getWorkDocs(entry);
  const text = getResultText(entry).trim();
  const resultDocs = getResultDocs(entry);
  if (work.length === 0 && !text && resultDocs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      {work.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FBFAF6] border-2 border-[#22408F]/30 space-y-2">
          <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] block">
            Documents de travail
          </span>
          <ul className="space-y-1.5 list-none p-0 m-0">
            {work.map((d) => (
              <PrintDocLine key={d.id} doc={d} />
            ))}
          </ul>
        </div>
      )}
      {(text || resultDocs.length > 0) && (
        <div className="p-4 rounded-xl bg-[#FBFAF6] border-2 border-[#22408F]/30 space-y-2">
          <span className="font-bold text-[#22408F] uppercase tracking-wider text-[11px] block">
            Ce que j’ai produit
          </span>
          {text && <p className="text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">{text}</p>}
          {resultDocs.length > 0 && (
            <ul className="space-y-1.5 list-none p-0 m-0">
              {resultDocs.map((d) => (
                <PrintDocLine key={d.id} doc={d} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/** Texte Markdown des documents d'une trace (export .md). */
export function docsToMarkdown(entry: LogbookEntry): string {
  const line = (d: TraceDoc) =>
    `- ${d.name || DOC_TYPE_LABELS[d.docType]}${d.kind === 'link' && d.url ? ` — ${d.url}` : ' — (fichier joint dans l’application)'}\n`;
  let md = '';
  const work = getWorkDocs(entry);
  if (work.length) md += `**Documents de travail :**\n${work.map(line).join('')}\n`;
  const text = getResultText(entry).trim();
  const rdocs = getResultDocs(entry);
  if (text || rdocs.length) {
    md += `**Ce que j’ai produit :**\n`;
    if (text) md += `${text}\n`;
    md += rdocs.map(line).join('');
    md += '\n';
  }
  return md;
}
