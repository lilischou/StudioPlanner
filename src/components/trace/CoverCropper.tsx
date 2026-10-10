import React, { useRef, useState } from 'react';
import { TraceCover } from '../../types/project';
import { CoverImage } from './TraceCover';

interface Props {
  src: string;
  initial: TraceCover['crop'];
  onSave: (crop: TraceCover['crop']) => void;
  onCancel: () => void;
}

/** Recadrage simple dans un cadre 4:3 : glisser pour positionner + curseur de zoom. */
export const CoverCropper: React.FC<Props> = ({ src, initial, onSave, onCancel }) => {
  const [crop, setCrop] = useState(initial);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = frameRef.current;
    if (!d || !el) return;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    // Glisser vers la droite = montrer la partie gauche de l'image (x diminue).
    // Sensibilité réduite quand le zoom augmente.
    const kx = (100 / w) * 1.6;
    const ky = (100 / h) * 1.6;
    setCrop((c) => ({
      ...c,
      x: clamp(d.x - (e.clientX - d.px) * kx / c.zoom),
      y: clamp(d.y - (e.clientY - d.py) * ky / c.zoom),
    }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#22408F]/40 flex items-center justify-center p-4">
      <div className="riso-card w-full max-w-sm p-4 space-y-3">
        <h3 className="font-heading font-bold text-sm text-[#22408F]">Recadrer la couverture</h3>
        <div
          ref={frameRef}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-[#22408F] bg-[#EBF1FF] cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label="Cadre de recadrage 4:3 : glisse pour positionner"
        >
          <CoverImage src={src} crop={crop} />
        </div>
        <p className="text-[11px] text-[#5A6A94]">Glisse l'image pour la positionner, puis ajuste le zoom.</p>
        <label className="flex items-center gap-3 text-xs font-bold text-[#22408F]">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={crop.zoom}
            onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="flex-1 accent-[#2F6DBB]"
            aria-label="Zoom"
          />
          <span className="font-mono w-10 text-right">{crop.zoom.toFixed(2)}×</span>
        </label>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" className="btn-riso-secondary text-xs" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="btn-riso-primary text-xs" onClick={() => onSave(crop)}>
            Valider
          </button>
        </div>
      </div>
    </div>
  );
};
