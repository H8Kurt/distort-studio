import { useCallback, useEffect, useRef, useState } from "react";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ScissorsIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  PaintBrushIcon,
  BackspaceIcon,
  MinusIcon,
  Square2StackIcon,
  CircleStackIcon,
  LanguageIcon,
  BeakerIcon,
  SwatchIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/solid";
import { api, API_URL } from "../../lib/api";
import type { MediaFile } from "../../types";

interface ImageEditorProps {
  media?: MediaFile | null;
  projectId: number;
  onSaved: (media: MediaFile) => void;
  onClose: () => void;
  initialSize?: { w: number; h: number };
  initialBackground?: string;
}

type Tool = "move" | "brush" | "eraser" | "line" | "rect" | "ellipse" | "text" | "fill" | "eyedropper" | "crop";

interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number;
  blend: GlobalCompositeOperation;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface Filter {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  blur: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Snapshot {
  w: number;
  h: number;
  activeId: string;
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blend: GlobalCompositeOperation;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    dataUrl: string;
  }[];
}

const MAX_W = 1600;

const TOOLS: { id: Tool; label: string; icon: typeof PaintBrushIcon }[] = [
  { id: "move", label: "Перемещение (V)", icon: HandRaisedIcon },
  { id: "brush", label: "Кисть (B)", icon: PaintBrushIcon },
  { id: "eraser", label: "Ластик (E)", icon: BackspaceIcon },
  { id: "line", label: "Линия (L)", icon: MinusIcon },
  { id: "rect", label: "Прямоугольник (R)", icon: Square2StackIcon },
  { id: "ellipse", label: "Эллипс (O)", icon: CircleStackIcon },
  { id: "text", label: "Текст (T)", icon: LanguageIcon },
  { id: "fill", label: "Заливка (G)", icon: BeakerIcon },
  { id: "eyedropper", label: "Пипетка (I)", icon: SwatchIcon },
  { id: "crop", label: "Обрезка (C)", icon: ScissorsIcon },
];

const BLENDS: GlobalCompositeOperation[] = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "hard-light",
  "soft-light",
  "difference",
];

let uid = 0;
const nextId = () => `layer-${Date.now()}-${uid++}`;

function resolve(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Не удалось загрузить изображение"));
    img.src = src;
  });
}

function filterString(f: Filter): string {
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  return parts.length ? parts.join(" ") : "none";
}

export default function ImageEditor({ media, projectId, onSaved, onClose, initialSize, initialBackground }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#c0392b");
  const [size, setSize] = useState(14);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filter, setFilter] = useState<Filter>({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, blur: 0 });
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [exportType, setExportType] = useState<"image/png" | "image/jpeg">("image/png");

  const drawing = useRef(false);
  const lastLocal = useRef<{ x: number; y: number } | null>(null);
  const shapeStartLocal = useRef<{ x: number; y: number } | null>(null);
  const lastStage = useRef<{ x: number; y: number } | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);
  const panning = useRef(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const spaceRef = useRef(false);
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
  const setSizeRef = useRef<(fn: (s: number) => number) => void>(() => {});
  const zoomAtRef = useRef<(x: number, y: number, factor: number) => void>(() => {});

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  const layersRef = useRef<Layer[]>([]);
  layersRef.current = layers;
  const activeRef = useRef<Layer | null>(null);
  activeRef.current = layers.find((l) => l.id === activeId) || null;

  // Инициализация: загрузка файла или пустой холст «с нуля»
  useEffect(() => {
    if (!media) {
      const w = Math.round(initialSize?.w || 1024);
      const h = Math.round(initialSize?.h || 1024);
      const base = makeCanvas(w, h);
      const bctx = base.getContext("2d");
      if (bctx && initialBackground && initialBackground !== "transparent") {
        bctx.fillStyle = initialBackground;
        bctx.fillRect(0, 0, w, h);
      }
      const layer: Layer = {
        id: nextId(),
        name: "Фон",
        canvas: base,
        visible: true,
        opacity: 1,
        blend: "source-over",
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      };
      setStage({ w, h });
      setLayers([layer]);
      setActiveId(layer.id);
      setReady(true);
      undoStack.current = [];
      redoStack.current = [];
      return;
    }

    let objectUrl = "";
    (async () => {
      try {
        const res = await fetch(resolve(media.url));
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        const img = await loadImage(objectUrl);
        const scale = Math.min(1, MAX_W / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const base = makeCanvas(w, h);
        base.getContext("2d")?.drawImage(img, 0, 0, w, h);
        const layer: Layer = {
          id: nextId(),
          name: "Фон",
          canvas: base,
          visible: true,
          opacity: 1,
          blend: "source-over",
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        };
        setStage({ w, h });
        setLayers([layer]);
        setActiveId(layer.id);
        setReady(true);
        undoStack.current = [];
        redoStack.current = [];
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ==== рендер композиции ====
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage.w || !stage.h) return;
    if (canvas.width !== stage.w) canvas.width = stage.w;
    if (canvas.height !== stage.h) canvas.height = stage.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fs = filterString(filter);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.filter = fs;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blend;
      ctx.translate(canvas.width / 2 + layer.x, canvas.height / 2 + layer.y);
      ctx.rotate(layer.rotation);
      ctx.scale(layer.scale, layer.scale);
      ctx.drawImage(layer.canvas, -layer.canvas.width / 2, -layer.canvas.height / 2);
      ctx.restore();
    }
    ctx.filter = "none";

    if (cropRect) {
      ctx.save();
      ctx.strokeStyle = "#e04545";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.restore();
    }
  }, [stage, filter, cropRect]);

  useEffect(() => {
    draw();
  }, [draw, layers]);

  // ==== координаты ====
  const toStage = (layer: Layer, lp: { x: number; y: number }) => {
    const sx = (lp.x - layer.canvas.width / 2) * layer.scale;
    const sy = (lp.y - layer.canvas.height / 2) * layer.scale;
    const cos = Math.cos(layer.rotation);
    const sin = Math.sin(layer.rotation);
    return {
      x: stage.w / 2 + layer.x + sx * cos - sy * sin,
      y: stage.h / 2 + layer.y + sx * sin + sy * cos,
    };
  };

  const toLocal = (layer: Layer, sp: { x: number; y: number }) => {
    const dx = sp.x - (stage.w / 2 + layer.x);
    const dy = sp.y - (stage.h / 2 + layer.y);
    const cos = Math.cos(-layer.rotation);
    const sin = Math.sin(-layer.rotation);
    return {
      x: (dx * cos - dy * sin) / layer.scale + layer.canvas.width / 2,
      y: (dx * sin + dy * cos) / layer.scale + layer.canvas.height / 2,
    };
  };

  // ==== история ====
  const pushHistory = () => {
    undoStack.current.push({
      w: stage.w,
      h: stage.h,
      activeId,
      layers: layersRef.current.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blend: l.blend,
        x: l.x,
        y: l.y,
        scale: l.scale,
        rotation: l.rotation,
        dataUrl: l.canvas.toDataURL("image/png"),
      })),
    });
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  };
  const pushRef = useRef(pushHistory);
  pushRef.current = pushHistory;

  // ==== масштаб холста ====
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nz = Math.min(8, Math.max(0.1, zoom * factor));
    const k = 1 - nz / zoom;
    setPan((p) => ({ x: p.x + (clientX - rect.left) * k, y: p.y + (clientY - rect.top) * k }));
    setZoom(nz);
  };
  zoomAtRef.current = zoomAt;
  setSizeRef.current = setSize;

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const restore = async (snap: Snapshot) => {
    const rebuilt = await Promise.all(
      snap.layers.map(async (l) => {
        const img = await loadImage(l.dataUrl);
        const canvas = makeCanvas(img.naturalWidth || snap.w, img.naturalHeight || snap.h);
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        return { ...l, canvas } as Layer;
      })
    );
    setStage({ w: snap.w, h: snap.h });
    setLayers(rebuilt);
    setActiveId(snap.activeId);
  };

  const undo = async () => {
    if (!undoStack.current.length) return undefined;
    const snap = undoStack.current.pop()!;
    redoStack.current.push(snap);
    const prev = undoStack.current[undoStack.current.length - 1];
    if (prev) await restore(prev);
    else setLayers((prev) => [...prev]);
    return undefined;
  };

  const redo = async () => {
    const snap = redoStack.current.pop();
    if (!snap) return undefined;
    undoStack.current.push(snap);
    await restore(snap);
    return undefined;
  };
  undoRef.current = undo;
  redoRef.current = redo;

  // ==== горячие клавиши ====
  useEffect(() => {
    const toolKeys: Record<string, Tool> = {
      v: "move", m: "move", b: "brush", e: "eraser", l: "line",
      r: "rect", o: "ellipse", t: "text", g: "fill", i: "eyedropper", c: "crop",
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        spaceRef.current = true;
        if (tag !== "INPUT") e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redoRef.current();
          else undoRef.current();
          return;
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redoRef.current();
          return;
        }
        if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomAtRef.current(window.innerWidth / 2, window.innerHeight / 2, 1.2); return; }
        if (e.key === "-") { e.preventDefault(); zoomAtRef.current(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.2); return; }
        return;
      }
      const t = toolKeys[e.key.toLowerCase()];
      if (t) { setTool(t); return; }
      if (e.key === "[") setSizeRef.current((s) => Math.max(2, s - 2));
      if (e.key === "]") setSizeRef.current((s) => Math.min(100, s + 2));
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onUp);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtRef.current(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [ready]);

  // ==== операции со слоями ====
  const addLayerFromFile = async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const scale = Math.min(1, MAX_W / img.naturalWidth);
      const canvas = makeCanvas(img.naturalWidth * scale, img.naturalHeight * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      pushRef.current();
      const layer: Layer = {
        id: nextId(),
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Слой",
        canvas,
        visible: true,
        opacity: 1,
        blend: "source-over",
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      };
      setLayers((prev) => [...prev, layer]);
      setActiveId(layer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка слоя");
    }
  };

  const duplicateLayer = () => {
    const active = activeRef.current;
    if (!active) return;
    pushRef.current();
    const copy = makeCanvas(active.canvas.width, active.canvas.height);
    copy.getContext("2d")?.drawImage(active.canvas, 0, 0);
    const layer: Layer = { ...active, id: nextId(), name: `${active.name} копия`, canvas: copy };
    setLayers((prev) => [...prev, layer]);
    setActiveId(layer.id);
  };

  const renameLayer = (id: string) => {
    const layer = layersRef.current.find((l) => l.id === id);
    if (!layer) return;
    const name = window.prompt("Название слоя", layer.name);
    if (!name || !name.trim()) return;
    pushRef.current();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)));
  };

  const deleteLayer = () => {
    const active = activeRef.current;
    if (!active || layersRef.current.length <= 1) return;
    pushRef.current();
    const rest = layersRef.current.filter((l) => l.id !== active.id);
    setLayers(rest);
    setActiveId(rest[rest.length - 1]?.id || "");
  };

  const moveLayerOrder = (dir: -1 | 1) => {
    const active = activeRef.current;
    if (!active) return;
    const arr = [...layersRef.current];
    const i = arr.findIndex((l) => l.id === active.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    pushRef.current();
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setLayers(arr);
  };

  // ==== pointer ====
  const stagePoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    if (e.button === 1 || spaceRef.current) {
      panning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const active = activeRef.current;
    const sp = stagePoint(e);

    if (tool === "eyedropper") {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const d = ctx.getImageData(Math.min(Math.floor(sp.x), stage.w - 1), Math.min(Math.floor(sp.y), stage.h - 1), 1, 1).data;
        setColor(`#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
      }
      return;
    }
    if (tool === "crop") {
      cropStart.current = sp;
      setCropRect({ x: sp.x, y: sp.y, w: 0, h: 0 });
      return;
    }
    if (!active) return;

    if (tool === "move") {
      drawing.current = true;
      lastStage.current = sp;
      return;
    }
    if (tool === "fill") {
      pushRef.current();
      const ctx = active.canvas.getContext("2d");
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, active.canvas.width, active.canvas.height);
        ctx.globalAlpha = 1;
      }
      setLayers((prev) => [...prev]);
      return;
    }
    if (tool === "text") {
      const text = window.prompt("Введите текст");
      if (!text) return;
      pushRef.current();
      const ctx = active.canvas.getContext("2d");
      const lp = toLocal(active, sp);
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.font = `${Math.max(8, size)}px sans-serif`;
        ctx.fillText(text, lp.x, lp.y);
        ctx.globalAlpha = 1;
      }
      setLayers((prev) => [...prev]);
      return;
    }

    const lp = toLocal(active, sp);
    drawing.current = true;
    lastLocal.current = lp;
    const ctx = active.canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, size / active.scale);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, Math.max(1, size / active.scale) / 2, 0, Math.PI * 2);
      ctx.fill();
      setLayers((prev) => [...prev]);
    } else {
      shapeStartLocal.current = lp;
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    if (panning.current && panStart.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }
    const sp = stagePoint(e);

    if (tool === "crop" && cropStart.current) {
      setCropRect({
        x: Math.min(cropStart.current.x, sp.x),
        y: Math.min(cropStart.current.y, sp.y),
        w: Math.abs(sp.x - cropStart.current.x),
        h: Math.abs(sp.y - cropStart.current.y),
      });
      return;
    }
    if (!drawing.current) return;
    const active = activeRef.current;
    if (!active) return;

    if (tool === "move") {
      if (lastStage.current) {
        active.x += sp.x - lastStage.current.x;
        active.y += sp.y - lastStage.current.y;
        lastStage.current = sp;
        setLayers((prev) => [...prev]);
      }
      return;
    }

    const lp = toLocal(active, sp);
    const ctx = active.canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, size / active.scale);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (tool === "brush" || tool === "eraser") {
      if (lastLocal.current) {
        ctx.beginPath();
        ctx.moveTo(lastLocal.current.x, lastLocal.current.y);
        ctx.lineTo(lp.x, lp.y);
        ctx.stroke();
      }
      lastLocal.current = lp;
      setLayers((prev) => [...prev]);
      return;
    }

    if (shapeStartLocal.current) {
      draw();
      const octx = canvasRef.current?.getContext("2d");
      if (!octx) return;
      const p1 = toStage(active, shapeStartLocal.current);
      octx.save();
      octx.globalAlpha = opacity;
      octx.strokeStyle = color;
      octx.lineWidth = size;
      octx.setLineDash([]);
      if (tool === "line") {
        octx.beginPath();
        octx.moveTo(p1.x, p1.y);
        octx.lineTo(sp.x, sp.y);
        octx.stroke();
      } else if (tool === "rect") {
        octx.strokeRect(p1.x, p1.y, sp.x - p1.x, sp.y - p1.y);
      } else if (tool === "ellipse") {
        octx.beginPath();
        octx.ellipse((p1.x + sp.x) / 2, (p1.y + sp.y) / 2, Math.abs(sp.x - p1.x) / 2, Math.abs(sp.y - p1.y) / 2, 0, 0, Math.PI * 2);
        octx.stroke();
      }
      octx.restore();
    }
  };

  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panning.current) {
      panning.current = false;
      panStart.current = null;
      return;
    }
    if (tool === "crop") {
      cropStart.current = null;
      return;
    }
    if (!drawing.current) return;
    drawing.current = false;
    const active = activeRef.current;
    const start = shapeStartLocal.current;
    if (active && start && (tool === "line" || tool === "rect" || tool === "ellipse")) {
      const end = toLocal(active, stagePoint(e));
      const ctx = active.canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(1, size / active.scale);
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        if (tool === "line") {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        } else if (tool === "rect") {
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else {
          ctx.beginPath();
          ctx.ellipse((start.x + end.x) / 2, (start.y + end.y) / 2, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    shapeStartLocal.current = null;
    lastLocal.current = null;
    lastStage.current = null;
    setLayers((prev) => [...prev]);
  };

  const applyCrop = () => {
    if (!cropRect || cropRect.w < 2 || cropRect.h < 2) return;
    pushRef.current();
    const sel = cropRect;
    const cropped = layersRef.current.map((l) => {
      const nc = makeCanvas(sel.w, sel.h);
      nc.getContext("2d")?.drawImage(l.canvas, l.x - sel.x, l.y - sel.y);
      return { ...l, canvas: nc, x: 0, y: 0 };
    });
    setLayers(cropped);
    setStage({ w: sel.w, h: sel.h });
    setCropRect(null);
  };

  const composite = (): HTMLCanvasElement | null => {
    if (!stage.w || !stage.h) return null;
    const out = makeCanvas(stage.w, stage.h);
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    if (exportType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }
    const fs = filterString(filter);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.filter = fs;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blend;
      ctx.translate(out.width / 2 + layer.x, out.height / 2 + layer.y);
      ctx.rotate(layer.rotation);
      ctx.scale(layer.scale, layer.scale);
      ctx.drawImage(layer.canvas, -layer.canvas.width / 2, -layer.canvas.height / 2);
      ctx.restore();
    }
    return out;
  };

  const save = () => {
    const out = composite();
    if (!out) return;
    setSaving(true);
    setError("");
    out.toBlob(
      async (blob) => {
        if (!blob) {
          setError("Не удалось сохранить изображение");
          setSaving(false);
          return;
        }
        try {
          const ext = exportType === "image/jpeg" ? "jpg" : "png";
          const base = (media?.originalName || "image").replace(/\.[^.]+$/, "");
          const suffix = media ? "-edit" : "";
          const file = new File([blob], `${base}${suffix}.${ext}`, { type: exportType });
          const form = new FormData();
          form.append("file", file);
          const saved = await api.postForm<MediaFile>(`/api/projects/${projectId}/media`, form);
          onSaved(saved);
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Ошибка сохранения");
          setSaving(false);
        }
      },
      exportType,
      exportType === "image/jpeg" ? 0.92 : undefined
    );
  };

  const active = layers.find((l) => l.id === activeId) || null;

  return (
    <div className="command-overlay editor-overlay" onMouseDown={onClose}>
      <div className="editor-modal editor-modal-wide editor-shell" onMouseDown={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <span className="line-clamp-1">
            Редактор: {media ? media.originalName || media.filename : "новое изображение"}
          </span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть">
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {error && <div className="badge badge-warning" style={{ margin: "0 1rem" }}>{error}</div>}

        <div className="image-editor-body">
          <aside className="editor-side">
            <div className="editor-side-title">Инструменты</div>
            <div className="tool-rail">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`tool-rail-btn${tool === t.id ? " active" : ""}`}
                    onClick={() => setTool(t.id)}
                    title={t.label}
                    aria-label={t.label}
                  >
                    <Icon className="tool-rail-icon" />
                  </button>
                );
              })}
            </div>

            <div className="editor-side-title">Фильтры</div>
            <label className="editor-range">
              <span>Яркость · {filter.brightness}%</span>
              <input type="range" min={0} max={200} value={filter.brightness} onChange={(e) => setFilter({ ...filter, brightness: Number(e.target.value) })} />
            </label>
            <label className="editor-range">
              <span>Контраст · {filter.contrast}%</span>
              <input type="range" min={0} max={200} value={filter.contrast} onChange={(e) => setFilter({ ...filter, contrast: Number(e.target.value) })} />
            </label>
            <label className="editor-range">
              <span>Насыщенность · {filter.saturate}%</span>
              <input type="range" min={0} max={200} value={filter.saturate} onChange={(e) => setFilter({ ...filter, saturate: Number(e.target.value) })} />
            </label>
            <label className="editor-range">
              <span>Ч/Б · {filter.grayscale}%</span>
              <input type="range" min={0} max={100} value={filter.grayscale} onChange={(e) => setFilter({ ...filter, grayscale: Number(e.target.value) })} />
            </label>
            <label className="editor-range">
              <span>Блюр · {filter.blur}px</span>
              <input type="range" min={0} max={20} value={filter.blur} onChange={(e) => setFilter({ ...filter, blur: Number(e.target.value) })} />
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, blur: 0 })}>
              Сбросить фильтры
            </button>
          </aside>

          <div className="editor-center">
            <div className="editor-options-bar">
              <span className="editor-options-tool">{TOOLS.find((t) => t.id === tool)?.label || ""}</span>
              <label className="editor-option">
                <span>Цвет</span>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </label>
              <label className="editor-option">
                <span>Размер · {size}px</span>
                <input type="range" min={2} max={100} value={size} onChange={(e) => setSize(Number(e.target.value))} />
              </label>
              <label className="editor-option">
                <span>Непрозрачность · {Math.round(opacity * 100)}%</span>
                <input type="range" min={1} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} />
              </label>
            </div>
            <div className="editor-canvas-wrap">
              <canvas
                ref={canvasRef}
                className="editor-canvas"
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerLeave={up}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  touchAction: "none",
                  transformOrigin: "0 0",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: tool === "move" ? "move" : "crosshair",
                }}
              />
              {!ready && !error && <span className="text-text-tertiary">Загрузка…</span>}
            </div>

            <div className="editor-toolbar">
              <button className="tool-btn" onClick={undo} title="Отменить">
                <ArrowUturnLeftIcon style={{ width: 16, height: 16 }} />
              </button>
              <button className="tool-btn" onClick={redo} title="Повторить">
                <ArrowUturnRightIcon style={{ width: 16, height: 16 }} />
              </button>
              <button className="tool-btn" onClick={applyCrop} disabled={!cropRect || cropRect.w < 2}>
                <ScissorsIcon style={{ width: 16, height: 16 }} /> Обрезать
              </button>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginLeft: "auto" }}>
                <button className="icon-btn sm" title="Уменьшить (−)" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.2)}>
                  <MagnifyingGlassMinusIcon style={{ width: 15, height: 15 }} />
                </button>
                <span className="editor-zoom" style={{ minWidth: 46, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
                <button className="icon-btn sm" title="Увеличить (+)" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2)}>
                  <MagnifyingGlassPlusIcon style={{ width: 15, height: 15 }} />
                </button>
                <button className="icon-btn sm" title="Вписать" onClick={resetView}>
                  <ArrowsPointingOutIcon style={{ width: 15, height: 15 }} />
                </button>
              </span>
              <select className="input" style={{ width: 100 }} value={exportType} onChange={(e) => setExportType(e.target.value as "image/png" | "image/jpeg")}>
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPEG</option>
              </select>
            </div>
          </div>

          <aside className="editor-side">
            <div className="editor-side-title">
              Слои
              <span className="layer-actions">
                <button className="icon-btn sm" onClick={() => fileRef.current?.click()} title="Добавить слой">
                  <PlusIcon style={{ width: 15, height: 15 }} />
                </button>
                <button className="icon-btn sm" onClick={duplicateLayer} title="Дублировать">
                  <DocumentDuplicateIcon style={{ width: 15, height: 16 }} />
                </button>
                <button className="icon-btn sm" onClick={deleteLayer} disabled={layers.length <= 1} title="Удалить">
                  <TrashIcon style={{ width: 15, height: 15 }} />
                </button>
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) addLayerFromFile(f);
                e.target.value = "";
              }}
            />

            <div className="layer-list">
              {[...layers].reverse().map((l) => (
                <div key={l.id} className={`layer-item${l.id === activeId ? " active" : ""}`} onClick={() => setActiveId(l.id)}>
                  <button
                    className="icon-btn sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      pushRef.current();
                      l.visible = !l.visible;
                      setLayers((prev) => [...prev]);
                    }}
                  >
                    {l.visible ? <EyeIcon style={{ width: 14, height: 14 }} /> : <EyeSlashIcon style={{ width: 14, height: 14 }} />}
                  </button>
                  <span className="line-clamp-1" style={{ flex: 1 }} onDoubleClick={() => renameLayer(l.id)}>{l.name}</span>
                  <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); renameLayer(l.id); }} title="Переименовать">
                    <PencilIcon style={{ width: 12, height: 12 }} />
                  </button>
                  <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); moveLayerOrder(1); }} title="Выше">
                    <ArrowUpIcon style={{ width: 13, height: 13 }} />
                  </button>
                  <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); moveLayerOrder(-1); }} title="Ниже">
                    <ArrowDownIcon style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ))}
            </div>

            {active && (
              <div className="layer-props">
                <label className="editor-range">
                  <span>Непрозрачность · {Math.round(active.opacity * 100)}%</span>
                  <input type="range" min={0} max={100} value={Math.round(active.opacity * 100)} onChange={(e) => { active.opacity = Number(e.target.value) / 100; setLayers((prev) => [...prev]); }} />
                </label>
                <label className="editor-range">
                  <span>Масштаб · {Math.round(active.scale * 100)}%</span>
                  <input type="range" min={10} max={300} value={Math.round(active.scale * 100)} onChange={(e) => { active.scale = Number(e.target.value) / 100; setLayers((prev) => [...prev]); }} />
                </label>
                <label className="editor-range">
                  <span>Поворот · {Math.round((active.rotation * 180) / Math.PI)}°</span>
                  <input type="range" min={-180} max={180} value={Math.round((active.rotation * 180) / Math.PI)} onChange={(e) => { active.rotation = (Number(e.target.value) * Math.PI) / 180; setLayers((prev) => [...prev]); }} />
                </label>
                <label className="editor-range">
                  <span>Режим наложения</span>
                  <select className="input" value={active.blend} onChange={(e) => { active.blend = e.target.value as GlobalCompositeOperation; setLayers((prev) => [...prev]); }}>
                    {BLENDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </aside>
        </div>

        <div className="editor-toolbar">
          <span className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>
            {stage.w}×{stage.h} · слоёв: {layers.length}
          </span>
          <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={save} disabled={saving || !ready}>
            <ArrowDownTrayIcon style={{ width: 15, height: 15 }} /> {saving ? "Сохраняем…" : "Сохранить в проект"}
          </button>
        </div>
      </div>
    </div>
  );
}
