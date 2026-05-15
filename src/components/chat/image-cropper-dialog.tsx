'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomInIcon, ZoomOutIcon, CheckIcon } from '@/components/icons';

export interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** dataURL de l'image source */
  imageSrc: string;
  /** Ratio largeur/hauteur : 1 = carré, 3 = bannière */
  aspectRatio: number;
  /** 'circle' pour les avatars, 'rect' pour les bannières / icônes */
  shape?: 'circle' | 'rect';
  onCrop: (file: File, previewUrl: string) => void;
}

/* ─── Constantes ─────────────────────────────────────────────────────────── */

const CONTAINER_W = 460;
const V_PAD = 36;

function getCrop(ar: number) {
  const w = ar >= 2 ? 400 : 272;
  return { w, h: Math.round(w / ar) };
}

type View = { scale: number; x: number; y: number };

function clampView(x: number, y: number, scale: number, nw: number, nh: number, cw: number, ch: number): View {
  const mx = Math.max(0, (nw * scale - cw) / 2);
  const my = Math.max(0, (nh * scale - ch) / 2);
  return { scale, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
}

/* ─── Composant ──────────────────────────────────────────────────────────── */

export function ImageCropperDialog({ open, onOpenChange, imageSrc, aspectRatio, shape = 'rect', onCrop }: ImageCropperDialogProps) {
  const crop = getCrop(aspectRatio);
  const containerH = crop.h + V_PAD * 2;

  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastPtRef = useRef({ x: 0, y: 0 });
  // Refs stables pour le wheel handler (évite les closures périmées)
  const natRef = useRef({ w: 0, h: 0 });
  const cropRef = useRef(crop);
  cropRef.current = crop;

  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* Reset à l'ouverture / changement d'image */
  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setView({ scale: 1, x: 0, y: 0 });
    setNat({ w: 0, h: 0 });
    natRef.current = { w: 0, h: 0 };
  }, [open, imageSrc]);

  /* Image chargée → scale initial qui couvre la zone */
  const handleLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const initScale = Math.max(crop.w / nw, crop.h / nh);
    natRef.current = { w: nw, h: nh };
    setNat({ w: nw, h: nh });
    setView({ scale: initScale, x: 0, y: 0 });
    setLoaded(true);
  }, [crop.w, crop.h]);

  /* Wheel non-passif via useEffect → e.preventDefault() fonctionne */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { w: nw, h: nh } = natRef.current;
      const { w: cw, h: ch } = cropRef.current;
      if (nw === 0) return;
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      const minS = Math.max(cw / nw, ch / nh);
      setView((prev) => {
        const next = Math.min(12, Math.max(minS, prev.scale * factor));
        return clampView(prev.x, prev.y, next, nw, nh, cw, ch);
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []); // stable — les valeurs courantes sont lues via refs

  /* Pointer drag avec capture (fonctionne même hors du div) */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = true;
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPtRef.current.x;
    const dy = e.clientY - lastPtRef.current.y;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    const { w: nw, h: nh } = natRef.current;
    const { w: cw, h: ch } = cropRef.current;
    setView((prev) => clampView(prev.x + dx, prev.y + dy, prev.scale, nw, nh, cw, ch));
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  /* Scale depuis slider / boutons */
  const applyScale = useCallback((newS: number) => {
    const { w: nw, h: nh } = natRef.current;
    const { w: cw, h: ch } = cropRef.current;
    if (nw === 0) return;
    const minS = Math.max(cw / nw, ch / nh);
    setView((prev) => clampView(prev.x, prev.y, Math.max(minS, Math.min(12, newS)), nw, nh, cw, ch));
  }, []);

  /* Export canvas */
  const handleCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img || !loaded) return;
    const { w: nw, h: nh } = nat;
    const { x, y, scale } = view;
    const { w: cw, h: ch } = crop;

    const srcX = nw / 2 - cw / (2 * scale) - x / scale;
    const srcY = nh / 2 - ch / (2 * scale) - y / scale;
    const srcW = cw / scale;
    const srcH = ch / scale;

    const outW = aspectRatio >= 2 ? 1200 : 512;
    const outH = Math.round(outW / aspectRatio);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      onCrop(file, url);
      onOpenChange(false);
    }, 'image/jpeg', 0.92);
  }, [loaded, nat, view, crop, aspectRatio, shape, onCrop, onOpenChange]);

  /* Plage du slider */
  const minS = nat.w > 0 ? Math.max(crop.w / nat.w, crop.h / nat.h) : 1;
  const sliderMin = Math.round(minS * 100);
  const sliderMax = Math.max(sliderMin + 100, 600);
  const scalePercent = Math.round(view.scale * 100);

  /* ─── Rendu ──────────────────────────────────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Largeur fixée via style inline pour bypasser sm:max-w-sm du DialogContent */}
      <DialogContent
        className="gap-0 overflow-hidden rounded-2xl p-0"
        style={{ width: CONTAINER_W, maxWidth: 'calc(100vw - 2rem)' }}
      >

        {/* En-tête */}
        <DialogHeader className="border-b border-border/30 px-5 pb-3.5 pt-5">
          <DialogTitle className="text-sm font-semibold">Recadrer l'image</DialogTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Glisser pour déplacer · Molette ou slider pour zoomer
          </p>
        </DialogHeader>

        {/* Zone de recadrage */}
        <div
          ref={wrapRef}
          className="relative select-none overflow-hidden bg-zinc-950 touch-none w-full"
          style={{
            height: containerH,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Image positionnée par CSS transform depuis le centre */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt=""
            onLoad={handleLoad}
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: loaded ? nat.w * view.scale : 1,
              height: loaded ? nat.h * view.scale : 1,
              opacity: loaded ? 1 : 0,
              transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`,
              userSelect: 'none',
              pointerEvents: 'none',
              willChange: 'transform, width, height',
            }}
          />

          {/* Overlay sombre + découpe via box-shadow */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: `calc(50% - ${crop.w / 2}px)`,
              top: V_PAD,
              width: crop.w,
              height: crop.h,
              borderRadius: shape === 'circle' ? '50%' : 10,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
              outline: '2px solid rgba(255,255,255,0.85)',
              zIndex: 2,
            }}
          />

          {/* Grille ⅓ intérieure */}
          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{
              left: `calc(50% - ${crop.w / 2}px)`,
              top: V_PAD,
              width: crop.w,
              height: crop.h,
              borderRadius: shape === 'circle' ? '50%' : 10,
              zIndex: 3,
            }}
          >
            <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.13)' }} />
            <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.13)' }} />
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.13)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.13)' }} />
          </div>

          {/* Spinner de chargement */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
              <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          )}
        </div>

        {/* Contrôles de zoom */}
        <div className="flex items-center gap-3 border-t border-border/20 px-5 py-3">
          <button
            type="button"
            onClick={() => applyScale((scalePercent - 10) / 100)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ZoomOutIcon size={14} />
          </button>

          <Slider
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={[scalePercent]}
            onValueChange={([v]) => applyScale(v / 100)}
            className="flex-1"
          />

          <button
            type="button"
            onClick={() => applyScale((scalePercent + 10) / 100)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ZoomInIcon size={14} />
          </button>

          <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {scalePercent}%
          </span>
        </div>

        {/* Pied de page */}
        <DialogFooter className="gap-2 px-5 pb-4 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleCrop} disabled={!loaded}>
            <CheckIcon size={13} />
            Recadrer
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
