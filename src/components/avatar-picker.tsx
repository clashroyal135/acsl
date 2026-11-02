"use client";

import { Camera, Check, ImagePlus, Loader2, Minus, Plus, RotateCcw, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cropAvatar, MAX_AVATAR_ZOOM, squareCrop, type CropCenter } from "@/lib/avatar-crop";
import { validateAvatar } from "@/lib/profile";

type ImageSource = { image: HTMLImageElement; url: string };

export function AvatarPicker({ disabled, hasAvatar, onApply }: { disabled: boolean; hasAvatar: boolean; onApply: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<ImageSource | null>(null);
  const [reading, setReading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<CropCenter>({ x: 0.5, y: 0.5 });
  const [viewportSize, setViewportSize] = useState(320);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const pointer = useRef<{ id: number; x: number; y: number; center: CropCenter } | null>(null);
  const mounted = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function close() {
    if (applying) return;
    setOpen(false); setFile(null); setSource(null); setError(""); setDraggingFile(false); pointer.current = null;
  }

  // File drops anywhere on the profile screen open the same picker as the button.
  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const clearDrag = () => { dragDepth.current = 0; setDraggingFile(false); };
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (disabled || applying) return;
      dragDepth.current += 1; setDraggingFile(true);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = disabled || applying ? "none" : "copy";
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event) && !dragDepth.current) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDraggingFile(false);
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault(); clearDrag();
      if (disabled || applying) return;
      setOpen(true); setError("");
      const files = event.dataTransfer?.files;
      if (!files || files.length !== 1) { setError("Drop one picture at a time."); return; }
      setFile(files[0]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("dragend", clearDrag);
    window.addEventListener("blur", clearDrag);
    return () => {
      window.removeEventListener("dragenter", enter); window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave); window.removeEventListener("drop", drop);
      window.removeEventListener("dragend", clearDrag); window.removeEventListener("blur", clearDrag);
    };
  }, [disabled, applying]);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open]);

  useEffect(() => {
    if (!file) { setSource(null); setReading(false); return; }
    let active = true;
    let url: string | null = null;
    setSource(null); setReading(true); setError(""); setZoom(1); setCenter({ x: 0.5, y: 0.5 }); pointer.current = null;
    async function load() {
      try {
        await validateAvatar(file!);
        if (!active) return;
        url = URL.createObjectURL(file!);
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!active) return;
        squareCrop(image.naturalWidth, image.naturalHeight, 1, { x: 0.5, y: 0.5 });
        setSource({ image, url });
      } catch (error) {
        if (active) setError(error instanceof Error && /^(Choose|This image)/.test(error.message) ? error.message : "This image could not be opened. Choose another picture.");
      } finally { if (active) setReading(false); }
    }
    void load();
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    if (!source || !viewport.current) return;
    const element = viewport.current;
    const resize = () => setViewportSize(element.getBoundingClientRect().width);
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    return () => observer.disconnect();
  }, [source]);

  const crop = source ? squareCrop(source.image.naturalWidth, source.image.naturalHeight, zoom, center) : null;
  const scale = crop ? viewportSize / crop.size : 1;
  function moveCenter(next: CropCenter) {
    if (source) setCenter(squareCrop(source.image.naturalWidth, source.image.naturalHeight, zoom, next).center);
  }
  function changeZoom(value: number) {
    const next = Math.min(MAX_AVATAR_ZOOM, Math.max(1, value));
    setZoom(next);
    if (source) setCenter(squareCrop(source.image.naturalWidth, source.image.naturalHeight, next, center).center);
  }
  function stopPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function apply() {
    if (!source || reading || applying) return;
    setApplying(true); setError("");
    try {
      const cropped = await cropAvatar(source.image, zoom, center);
      if (!mounted.current) return;
      onApply(cropped); setOpen(false); setFile(null); setSource(null);
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : "Unable to crop this picture."); }
    finally { if (mounted.current) setApplying(false); }
  }

  return <>
    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => { setError(""); setOpen(true); }}><Camera className="h-3.5 w-3.5" /> {hasAvatar ? "Change picture" : "Add profile picture"}</Button>
    {draggingFile && <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center border-4 border-primary bg-background/90 p-8 text-center backdrop-blur-sm" aria-live="polite"><div><ImagePlus className="mx-auto h-12 w-12 text-primary" /><p className="mt-4 text-2xl font-black">Drop your profile picture</p><p className="mt-2 text-sm text-muted-foreground">You can zoom and crop it next.</p></div></div>}
    {open && <dialog ref={dialog} aria-labelledby="picture-title" aria-describedby="picture-details" className={`fixed inset-0 m-auto max-w-none overflow-hidden rounded-2xl border bg-card p-0 text-foreground shadow-soft backdrop:bg-black/60 backdrop:backdrop-blur-sm ${draggingFile ? "border-primary ring-4 ring-primary/20" : "border-border"}`} style={{ width: "min(32rem, calc(100vw - 2rem))", maxHeight: "calc(100dvh - 2rem)" }} onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="flex flex-col" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6"><div><h2 id="picture-title" className="text-xl font-black">{source ? "Adjust your picture" : "Add a profile picture"}</h2><p id="picture-details" className="mt-1.5 text-sm text-muted-foreground">JPG, PNG, or WebP · Up to 2 MB</p></div><Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={applying} aria-label="Close picture window" onClick={close}><X className="h-4 w-4" /></Button></div>
        <div className="min-h-0 overflow-y-auto px-5 sm:px-6">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile picture from computer" className="sr-only" disabled={applying} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) setFile(selected); event.target.value = ""; }} />
        {reading ? <div role="status" className="mt-5 grid min-h-64 place-items-center rounded-xl bg-muted/50"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Opening picture…</span></div> : source && crop ? <div className="mt-5">
          <div ref={viewport} role="group" tabIndex={0} aria-label="Crop preview. Drag to reposition or use the arrow keys." aria-describedby="crop-help" className="relative mx-auto aspect-square w-full max-w-[320px] touch-none select-none overflow-hidden rounded-xl bg-muted outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary" style={{ cursor: applying ? "wait" : "grab" }} onPointerDown={(event) => {
            if (applying || event.button !== 0) return;
            event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
            pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, center: crop.center };
          }} onPointerMove={(event) => {
            const start = pointer.current;
            if (!start || applying || start.id !== event.pointerId) return;
            moveCenter({ x: start.center.x - (event.clientX - start.x) / scale / source.image.naturalWidth, y: start.center.y - (event.clientY - start.y) / scale / source.image.naturalHeight });
          }} onPointerUp={stopPointer} onPointerCancel={stopPointer} onLostPointerCapture={() => { pointer.current = null; }} onKeyDown={(event) => {
            const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
            if (!direction || applying) return;
            event.preventDefault();
            moveCenter({ x: crop.center.x + direction[0] * crop.size * 0.03 / source.image.naturalWidth, y: crop.center.y + direction[1] * crop.size * 0.03 / source.image.naturalHeight });
          }}>
            <img src={source.url} alt="Your picture inside the square crop" draggable={false} className="pointer-events-none absolute select-none" style={{ maxWidth: "none", width: source.image.naturalWidth * scale, height: source.image.naturalHeight * scale, left: -crop.x * scale, top: -crop.y * scale }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">{Array.from({ length: 9 }, (_, index) => <div key={index} className="border border-white/20" />)}</div>
          </div>
          <p id="crop-help" className="mt-3 text-center text-xs text-muted-foreground">Drag to reposition. Zoom to frame your picture.</p>
          <div className="mt-4 flex items-center gap-3"><Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" aria-label="Zoom out" disabled={applying || zoom <= 1} onClick={() => changeZoom(zoom - 0.1)}><Minus className="h-4 w-4" /></Button><label className="min-w-0 flex-1"><span className="mb-1.5 flex justify-between text-xs font-semibold"><span>Zoom</span><span>{Math.round(zoom * 100)}%</span></span><input type="range" min={1} max={MAX_AVATAR_ZOOM} step={0.01} value={zoom} aria-label="Picture zoom" disabled={applying} onChange={(event) => changeZoom(Number(event.target.value))} className="w-full accent-primary" /></label><Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" aria-label="Zoom in" disabled={applying || zoom >= MAX_AVATAR_ZOOM} onClick={() => changeZoom(zoom + 0.1)}><Plus className="h-4 w-4" /></Button></div>
          <div className="mt-4 flex flex-wrap justify-center gap-2"><Button type="button" size="sm" variant="ghost" disabled={applying} onClick={() => { setZoom(1); setCenter({ x: 0.5, y: 0.5 }); }}><RotateCcw className="h-3.5 w-3.5" /> Reset crop</Button><Button type="button" size="sm" variant="ghost" disabled={applying} onClick={() => input.current?.click()}><Upload className="h-3.5 w-3.5" /> Choose another picture</Button></div>
        </div> : <div className={`mt-5 rounded-xl border-2 border-dashed px-5 py-10 text-center ${draggingFile ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}><ImagePlus className="mx-auto h-10 w-10 text-primary" /><p className="mt-4 font-bold">Drag a picture into this window</p><p className="mt-1 text-sm text-muted-foreground">or choose one from your computer.</p><Button type="button" className="mt-5" onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> Upload from computer</Button></div>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border p-5 sm:p-6"><p className="max-w-56 text-xs text-muted-foreground">Your picture is saved when you save your profile.</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={applying} onClick={close}>Cancel</Button>{source && <Button type="button" disabled={applying || reading} onClick={apply}>{applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {applying ? "Preparing…" : "Use picture"}</Button>}</div></div>
      </div>
    </dialog>}
  </>;
}
