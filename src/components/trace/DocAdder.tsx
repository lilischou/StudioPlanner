import React, { useRef, useState } from 'react';
import {
  Folder,
  FileText,
  Sheet,
  Presentation,
  Figma,
  Layout,
  FileType,
  Image as ImageIcon,
  Link as LinkIcon,
  File as FileIcon,
  Plus,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { TraceDoc, TraceDocType } from '../../types/project';
import {
  DOC_TYPE_LABELS,
  defaultDocName,
  detectDocType,
  detectFileType,
  domainOf,
  getPreviewUrl,
  normalizeUrl,
} from '../../utils/linkDetect';
import {
  FILE_TOO_BIG_MESSAGE,
  MAX_FILE_BYTES,
  openStoredFile,
  putFile,
} from '../../utils/traceStorage';
import { FIELD_CLS } from './ui';

const ICONS: Record<TraceDocType, React.ElementType> = {
  'drive-folder': Folder,
  'drive-file': FileIcon,
  doc: FileText,
  sheet: Sheet,
  slide: Presentation,
  figma: Figma,
  miro: Layout,
  pdf: FileType,
  image: ImageIcon,
  other: LinkIcon,
};

export const DocTypeIcon: React.FC<{ type: TraceDocType; className?: string }> = ({
  type,
  className = 'w-4 h-4',
}) => {
  const Icon = ICONS[type] || LinkIcon;
  return <Icon className={className} aria-hidden="true" />;
};

const newDocId = () => `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Liste de documents                                                  */
/* ------------------------------------------------------------------ */

interface DocListProps {
  docs: TraceDoc[];
  /** Mode édition : nom modifiable + suppression. */
  editable?: boolean;
  onRename?: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
  emptyText?: string;
}

export const DocList: React.FC<DocListProps> = ({
  docs,
  editable = false,
  onRename,
  onRemove,
  emptyText = 'Rien pour l’instant.',
}) => {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (docs.length === 0) {
    return <p className="text-xs text-[#5A6A94] italic">{emptyText}</p>;
  }

  const open = (d: TraceDoc) => {
    if (d.kind === 'link' && d.url) {
      const u = normalizeUrl(d.url);
      if (u) window.open(u.toString(), '_blank', 'noopener,noreferrer');
    } else if (d.kind === 'file' && d.fileRef) {
      void openStoredFile(d.fileRef);
    }
  };

  return (
    <ul className="space-y-2">
      {docs.map((d) => {
        const preview = d.kind === 'link' && d.url ? getPreviewUrl(d.url, d.docType) : null;
        const isPreviewing = previewId === d.id && !!preview;
        return (
          <li key={d.id} className="bg-white border border-[#DCE2EF] rounded-lg">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <span className="w-7 h-7 rounded-md bg-[#EBF1FF] text-[#22408F] flex items-center justify-center shrink-0">
                <DocTypeIcon type={d.docType} />
              </span>

              {editable ? (
                <input
                  value={d.name}
                  onChange={(e) => onRename?.(d.id, e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-[#22408F]/40 rounded-md px-2 py-1 text-xs text-[#22408F] focus:outline-hidden focus:border-[#22408F]"
                  aria-label="Nom du document"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => open(d)}
                  className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0"
                  title={d.kind === 'link' ? d.url : d.name}
                >
                  <span className="block text-xs font-bold text-[#22408F] truncate underline underline-offset-2">
                    {d.name || DOC_TYPE_LABELS[d.docType]}
                  </span>
                  <span className="block text-[10px] text-[#5A6A94] truncate">
                    {DOC_TYPE_LABELS[d.docType]}
                    {d.kind === 'link' && d.url ? ` · ${domainOf(d.url)}` : ' · fichier'}
                  </span>
                </button>
              )}

              {editable && (
                <button
                  type="button"
                  onClick={() => open(d)}
                  className="text-[11px] font-semibold text-[#22408F] underline underline-offset-2 shrink-0"
                >
                  Ouvrir
                </button>
              )}

              {preview && (
                <button
                  type="button"
                  onClick={() => setPreviewId(isPreviewing ? null : d.id)}
                  className="text-[11px] font-semibold text-[#22408F] underline underline-offset-2 shrink-0 inline-flex items-center gap-1"
                  aria-expanded={isPreviewing}
                >
                  <Eye className="w-3 h-3" />
                  {isPreviewing ? 'Masquer' : 'Aperçu'}
                </button>
              )}

              {editable && (
                <button
                  type="button"
                  onClick={() => onRemove?.(d.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#F0505A] shrink-0"
                  title="Retirer ce document"
                  aria-label="Retirer ce document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Aperçu : l'iframe n'existe dans le DOM (et ne charge rien) qu'après le clic */}
            {isPreviewing && preview && (
              <div className="border-t border-[#DCE2EF] p-2">
                <iframe
                  src={preview}
                  title={`Aperçu : ${d.name}`}
                  className="w-full h-64 rounded-md border border-[#DCE2EF] bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  allowFullScreen
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/* ------------------------------------------------------------------ */
/* Ajout d'un lien ou d'un fichier                                     */
/* ------------------------------------------------------------------ */

interface DocAdderProps {
  onAdd: (doc: TraceDoc) => void;
}

export const DocAdder: React.FC<DocAdderProps> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = normalizeUrl(url);
  const type: TraceDocType = parsed ? detectDocType(url) : 'other';
  const autoName = parsed ? defaultDocName(url, type) : '';
  const shownName = nameTouched ? name : autoName;

  const reset = () => {
    setOpen(false);
    setUrl('');
    setName('');
    setNameTouched(false);
    setError('');
    setBusy(false);
  };

  const addLink = () => {
    if (!parsed) {
      setError('Colle une adresse web valide (https://…).');
      return;
    }
    onAdd({
      id: newDocId(),
      kind: 'link',
      url: parsed.toString(),
      name: shownName.trim() || autoName,
      docType: type,
      addedAt: new Date().toISOString(),
    });
    reset();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(FILE_TOO_BIG_MESSAGE);
      return;
    }
    try {
      setBusy(true);
      const ref = await putFile(file);
      onAdd({
        id: newDocId(),
        kind: 'file',
        fileRef: ref,
        name: file.name,
        docType: detectFileType(file.name, file.type),
        addedAt: new Date().toISOString(),
      });
      reset();
    } catch (err) {
      console.error(err);
      setError('Impossible d’enregistrer ce fichier sur cet appareil.');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-riso-secondary text-xs w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Ajouter un lien ou un fichier</span>
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-[#22408F] rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#22408F]">Ajouter un lien ou un fichier</span>
        <button
          type="button"
          onClick={reset}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#22408F]"
          aria-label="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <input
          type="url"
          inputMode="url"
          autoFocus
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Colle un lien (Drive, Docs, Figma, Miro…)"
          className={FIELD_CLS}
          aria-label="Adresse du lien"
        />
        {parsed && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#22408F]">
            <DocTypeIcon type={type} className="w-3.5 h-3.5" />
            <span>{DOC_TYPE_LABELS[type]} détecté</span>
          </div>
        )}
      </div>

      {parsed && (
        <input
          type="text"
          value={shownName}
          onChange={(e) => {
            setName(e.target.value);
            setNameTouched(true);
          }}
          className={FIELD_CLS}
          aria-label="Nom du document"
          placeholder="Nom du document"
        />
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-[#F0505A]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-riso-primary text-xs"
            onClick={addLink}
            disabled={!parsed || busy}
          >
            Ajouter le lien
          </button>
        </div>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={onFile} aria-label="Choisir un fichier" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="text-xs font-semibold text-[#22408F] underline underline-offset-2"
          >
            {busy ? 'Envoi…' : 'ou choisir un fichier (10 Mo max)'}
          </button>
        </div>
      </div>
    </div>
  );
};
