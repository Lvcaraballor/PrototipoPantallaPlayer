import { useEffect, useRef, useState } from "react";

const GENRES = [
  {
    id: "urbano",
    label: "URBANO",
    sub: "Reguetón · Trap",
    accent: "#FF2D6B",
    accent2: "#BF00FF",
    glow: "rgba(255,45,107,0.35)",
    glow2: "rgba(191,0,255,0.2)",
    gradient: "linear-gradient(135deg, #FF2D6B 0%, #BF00FF 100%)",
    bg: "#0e050a",
    surface: "#180a10",
    palette: ["#FF2D6B", "#BF00FF", "#FF7A00", "#FF2D6B99"],
  },
  {
    id: "afrobeats",
    label: "AFROBEATS",
    sub: "Ritmos africanos contemporáneos",
    accent: "#FF8C00",
    accent2: "#00D97E",
    glow: "rgba(255,140,0,0.3)",
    glow2: "rgba(0,217,126,0.2)",
    gradient: "linear-gradient(135deg, #FF8C00 0%, #00D97E 100%)",
    bg: "#080d05",
    surface: "#0f1a09",
    palette: ["#FF8C00", "#00D97E", "#FFD700", "#FF6B3599"],
  },
  {
    id: "tecno",
    label: "TECNO",
    sub: "Electrónica · Digital",
    accent: "#00F5FF",
    accent2: "#7B2FFF",
    glow: "rgba(0,245,255,0.3)",
    glow2: "rgba(123,47,255,0.2)",
    gradient: "linear-gradient(135deg, #00F5FF 0%, #7B2FFF 100%)",
    bg: "#03080e",
    surface: "#071220",
    palette: ["#00F5FF", "#7B2FFF", "#00FF88", "#FF006699"],
  },
];

const SONGS: Record<string, { title: string; bpm: number; key: string }[]> = {
  urbano: [
    { title: "Track 01", bpm: 96, key: "Dm" },
    { title: "Track 02", bpm: 140, key: "Am" },
  ],
  afrobeats: [
    { title: "Track 01", bpm: 104, key: "Gmaj" },
    { title: "Track 02", bpm: 112, key: "Cmaj" },
  ],
  tecno: [
    { title: "Track 01", bpm: 138, key: "Fmin" },
    { title: "Track 02", bpm: 145, key: "Amin" },
  ],
};

const VIZ_TYPES = ["ONDAS", "BARRAS", "PARTÍCULAS", "ANILLOS"];

// Normaliza a #RRGGBB: las paletas traen un tono con alpha (#RRGGBBAA) que
// rompería `accent + "33"` y `addColorStop` (color inválido -> el loop moría
// y el visualizador desaparecía). Recortando a 6 dígitos todo sigue válido.
const toHex6 = (hex: string) => (hex.length > 7 ? hex.slice(0, 7) : hex);

type Genre = (typeof GENRES)[0];

type VizProps = {
  genre: Genre;
  vizType: number;
  isPlaying: boolean;
  intensity: number;
  speed: number;
  volume: number;
  bpm: number;
  accentOverride: string;
  onTap?: (pos: { x: number; y: number }) => void;
};

/* Simulación de señal musical: capas de senos + pulso de beat por BPM.
   intensity -> amplitud/complejidad, speed -> tiempo, volume -> escala global.
   Click / drag sobre el lienzo -> cambia la vibración: salto de fase + drop de energía + shake. */
function VisualizerCanvas({ genre, vizType, isPlaying, intensity, speed, volume, bpm, accentOverride, onTap }: VizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const params = useRef({ vizType, isPlaying, intensity, speed, volume, bpm, genre, accentOverride });
  params.current = { vizType, isPlaying, intensity, speed, volume, bpm, genre, accentOverride };
  // Estado vivo compartido entre el loop y los eventos de puntero
  const live = useRef({
    time: Math.random() * 100,
    shake: 0,
    drop: 0,
    bursts: [] as { x: number; y: number; age: number; color: string; alt: string }[],
  });
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const spawnBurst = (clientX: number, clientY: number, isTap: boolean) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    const L = live.current;
    const p = params.current;
    const color = toHex6(p.accentOverride || p.genre.accent);
    if (isTap) {
      // Tap: cambia la vibración + dispara cambio de color en App
      L.time += 0.9 + Math.random() * 0.7;
      L.shake = 1;
      L.drop = 1;
      L.bursts.push({ x, y, age: 0, color, alt: toHex6(p.genre.accent2) });
      if (L.bursts.length > 8) L.bursts.shift();
      onTapRef.current?.({ x: x / Math.max(1, r.width), y: y / Math.max(1, r.height) });
    } else {
      // Drag: solo estela visual, sin cambiar color ni sacudir fuerte
      L.drop = Math.max(L.drop, 0.35);
      L.bursts.push({ x, y, age: 0.25, color, alt: toHex6(p.genre.accent2) });
      if (L.bursts.length > 8) L.bursts.shift();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let W = 0;
    let H = 0;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(2, r.width);
      H = Math.max(2, r.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    type P = { bx: number; by: number; r: number; ph: number; sp: number; alt: boolean };
    const dots: P[] = Array.from({ length: 80 }, (_, i) => ({
      bx: (i * 37 + 11) % 100 / 100,
      by: (i * 53 + 7) % 100 / 100,
      r: 1.5 + ((i * 7) % 5),
      ph: (i * 0.7) % (Math.PI * 2),
      sp: 0.4 + ((i * 13) % 10) / 10,
      alt: i % 2 === 0,
    }));
    let ripples: { r: number; a: number }[] = [];
    let lastBeat = 0;

    const frame = (now: number) => {
      try {
      const p = params.current;
      const L = live.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const speedFactor = p.isPlaying ? 0.5 + (p.speed / 100) * 2.2 : 0.25;
      L.time += dt * speedFactor * 2.2;
      const time = L.time;
      // Decaimiento del drop y del shake provocados por el click
      L.drop = Math.max(0, L.drop - dt * 1.1);
      L.shake = Math.max(0, L.shake - dt * 2.4);

      const ampBase = (0.25 + (p.intensity / 100) * 0.75) * (0.35 + (p.volume / 100) * 0.65);
      const amp = (p.isPlaying ? ampBase : ampBase * 0.3) * (1 + L.drop * 0.9);
      const beatPhase = (time * p.bpm) / 60 % 1;
      const rawBeat = p.isPlaying ? Math.pow(1 - beatPhase, 2.4) : 0.12 + 0.06 * Math.sin(time * 1.5);
      const beatPulse = Math.min(1.6, rawBeat * (1 + L.drop * 1.2));

      const accent = toHex6(p.accentOverride || p.genre.accent);
      const accent2 = toHex6(p.genre.accent2);

      ctx.setTransform(canvas.width / Math.max(1, W), 0, 0, canvas.height / Math.max(1, H), 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Sacudida de pantalla: desplaza todo el dibujo y decae
      ctx.save();
      if (L.shake > 0.01) {
        const s = L.shake * L.shake * 12;
        ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }

      if (p.vizType === 0) {
        // ONDAS — 3 capas + relleno con pulso de beat
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, accent2);
        // relleno bajo la onda principal
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const t = x / W;
          const y =
            H / 2 +
            Math.sin(t * Math.PI * 5 + time * 2.4) * H * 0.16 * amp +
            Math.sin(t * Math.PI * 11 - time * 3.1) * H * 0.06 * amp +
            Math.sin(t * 22 + time * 6) * 8 * beatPulse * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const fill = ctx.createLinearGradient(0, H / 2 - 80, 0, H);
        fill.addColorStop(0, accent + "33");
        fill.addColorStop(1, "transparent");
        ctx.save();
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 4) {
            const t = x / W;
            const y =
              H / 2 +
              Math.sin(t * Math.PI * (4 + i * 2.2) + time * (2 + i * 0.9)) * ((H * 0.2 * amp) / (i + 1)) +
              Math.sin(t * 18 - time * 2.2) * 10 * amp * (1 - i * 0.25) +
              beatPulse * 12 * Math.sin(x * 0.05 + time * 5) * amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = i === 0 ? grad : i === 1 ? accent : accent2;
          ctx.globalAlpha = 0.95 - i * 0.28;
          ctx.lineWidth = 2.6 - i * 0.7;
          ctx.shadowBlur = i === 0 && p.isPlaying ? 14 : 0;
          ctx.shadowColor = accent;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
      } else if (p.vizType === 1) {
        // BARRAS — espectro simulado con beat
        const N = 52;
        const gap = 4;
        const bw = (W - 64 - gap * (N - 1)) / N;
        const grad = ctx.createLinearGradient(0, H, 0, H * 0.1);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, accent2);
        // resplandor de fondo al ritmo
        const bg = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, W * 0.55);
        bg.addColorStop(0, accent + Math.floor(30 + beatPulse * 50).toString(16).padStart(2, "0"));
        bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < N; i++) {
          const n =
            Math.sin(i * 0.65 + time * 3.2) * 0.5 +
            Math.sin(i * 0.21 - time * 4.4) * 0.32 +
            Math.sin(i * 1.7 + time * 6.5) * 0.18;
          const v = n * 0.5 + 0.5;
          const boost = 1 + beatPulse * (0.9 + (i % 5) * 0.12);
          const h = 6 + v * H * 0.62 * amp * boost;
          const x = 32 + i * (bw + gap);
          const y = H - 24 - h;
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.65 + (i % 4) * 0.09;
          ctx.shadowBlur = p.isPlaying ? 10 : 0;
          ctx.shadowColor = accent;
          const rr = Math.min(4, bw / 2);
          const c = ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
          if (typeof c.roundRect === "function") {
            c.beginPath();
            c.roundRect(x, y, bw, h, rr);
            c.fill();
          } else {
            ctx.fillRect(x, y, bw, h);
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      } else if (p.vizType === 2) {
        // PARTÍCULAS — deriva + latido
        const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.55);
        bg.addColorStop(0, accent2 + "2e");
        bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        for (const d of dots) {
          const x = (d.bx + 0.035 * Math.sin(time * d.sp * 1.6 + d.ph) + 0.015 * Math.sin(time * 0.6 + d.ph)) * W;
          const y = (d.by + 0.04 * Math.cos(time * d.sp * 1.3 + d.ph * 1.7)) * H;
          const s = d.r * (1 + beatPulse * 1.6 * amp) * (1 + 0.25 * Math.sin(time * 3 + d.ph));
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.6, s), 0, Math.PI * 2);
          ctx.fillStyle = d.alt ? accent : accent2;
          ctx.globalAlpha = 0.35 + ((d.r * 10) % 4) * 0.12;
          ctx.shadowBlur = 8;
          ctx.shadowColor = d.alt ? accent : accent2;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        // anillos expansivos al beat
        if (p.isPlaying && beatPhase < lastBeat) {
          ripples.push({ r: 12, a: 0.7 });
          if (ripples.length > 6) ripples.shift();
        }
        lastBeat = beatPhase;
        ripples = ripples.filter((r) => r.a > 0.02);
        for (const r of ripples) {
          r.r += dt * 160 * (0.6 + p.intensity / 90);
          r.a -= dt * 0.55;
          ctx.beginPath();
          ctx.arc(W / 2, H / 2, r.r, 0, Math.PI * 2);
          ctx.strokeStyle = accent;
          ctx.globalAlpha = Math.max(0, r.a);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const core = 7 + beatPulse * 12 * (0.5 + amp);
        const cg = ctx.createRadialGradient(W / 2, H / 2, 1, W / 2, H / 2, core * 3);
        cg.addColorStop(0, accent);
        cg.addColorStop(1, accent2 + "55");
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, core, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.shadowBlur = 24;
        ctx.shadowColor = accent;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // ANILLOS — respiración + ripples de beat + aro rotatorio
        const cx = W / 2;
        const cy = H / 2;
        const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.5);
        bg.addColorStop(0, accent + "30");
        bg.addColorStop(0.4, accent2 + "1c");
        bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const base = [26, 62, 106, 152, 198];
        base.forEach((s, i) => {
          const breathe = 1 + Math.sin(time * 2 + i * 0.9) * 0.035 + beatPulse * 0.07 * amp;
          ctx.beginPath();
          ctx.arc(cx, cy, (s * Math.min(W, H)) / 420 * breathe, 0, Math.PI * 2);
          ctx.strokeStyle = i % 2 === 0 ? accent : accent2;
          ctx.globalAlpha = 0.14 + i * 0.07;
          ctx.lineWidth = i < 2 ? 1.6 : 1;
          ctx.shadowBlur = i < 2 && p.isPlaying ? 16 : 0;
          ctx.shadowColor = accent;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });
        // aro punteado que gira con la velocidad
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, (132 * Math.min(W, H)) / 420, 0, Math.PI * 2);
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -time * 40;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

        if (p.isPlaying && beatPhase < lastBeat) {
          ripples.push({ r: 14, a: 0.85 });
          if (ripples.length > 5) ripples.shift();
        }
        lastBeat = beatPhase;
        ripples = ripples.filter((r) => r.a > 0.02);
        for (const r of ripples) {
          r.r += dt * 190 * (0.6 + p.intensity / 80);
          r.a -= dt * 0.7;
          ctx.beginPath();
          ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
          ctx.strokeStyle = accent2;
          ctx.globalAlpha = Math.max(0, r.a);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const core = 8 + beatPulse * 10 * (0.5 + amp);
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, core * 2.4);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.25, accent);
        g.addColorStop(1, accent2);
        ctx.beginPath();
        ctx.arc(cx, cy, core, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.shadowBlur = 30;
        ctx.shadowColor = accent;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      // Ondas expansivas donde se hizo click / drag (conservan su color de origen)
      L.bursts = L.bursts.filter((b) => b.age < 1);
      for (const b of L.bursts) {
        b.age += dt * 1.4;
        const rr = 10 + b.age * Math.min(W, H) * 0.55;
        const alpha = Math.max(0, 0.9 * (1 - b.age));
        ctx.beginPath();
        ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.5 * (1 - b.age) + 0.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = b.color;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(b.x, b.y, rr * 0.62, 0, Math.PI * 2);
        ctx.strokeStyle = b.alt;
        ctx.globalAlpha = alpha * 0.7;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      // Destello de drop tras el click
      if (L.drop > 0.02) {
        ctx.fillStyle = accent;
        ctx.globalAlpha = L.drop * 0.08;
        ctx.fillRect(-20, -20, W + 40, H + 40);
        ctx.globalAlpha = 1;
      }
      } catch {
        // Si algo falla un frame, se restaura el estado y el loop sigue:
        // el visualizador nunca debe desaparecer.
        try { ctx.restore(); } catch { /* noop */ }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
      } finally {
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full h-full relative overflow-hidden cursor-crosshair select-none"
      title="Click para cambiar la vibración"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        spawnBurst(e.clientX, e.clientY, true);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) spawnBurst(e.clientX, e.clientY, false);
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <span
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.3em] pointer-events-none whitespace-nowrap"
        style={{ color: `${accentOverride || genre.accent}55` }}
      >
        {VIZ_TYPES[vizType]} · {genre.id.toUpperCase()} · {bpm} BPM · CLICK PARA VIBRAR
      </span>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] tracking-widest font-mono uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
          {label}
        </span>
        <span className="text-[11px] font-mono tabular-nums" style={{ color: accent + "cc" }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[2px] appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accent} ${value}%, rgba(255,255,255,0.08) ${value}%)`,
          borderRadius: 1,
          outline: "none",
          accentColor: accent,
        }}
      />
    </div>
  );
}

export default function App() {
  const [genreIdx, setGenreIdx] = useState(0);
  const [songIdx, setSongIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [intensity, setIntensity] = useState(60);
  const [speed, setSpeed] = useState(50);
  const [vizType, setVizType] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [elapsed, setElapsed] = useState(87);
  const [tapMarker, setTapMarker] = useState<{ x: number; y: number; key: number; color: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const genre = GENRES[genreIdx];
  const songs = SONGS[genre.id];
  const song = songs[songIdx];
  const totalDuration = 210;
  const { accent2, glow, surface, palette } = genre;
  // El color elegido tiñe todo el player (normalizado a 6 dígitos para no romper CSS/canvas)
  const accent = toHex6(palette[colorIdx] ?? genre.accent);
  const gradient = `linear-gradient(135deg, ${accent} 0%, ${accent2} 100%)`;
  const beatInterval = 60 / song.bpm;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const prevGenre = () => { setGenreIdx((i) => (i - 1 + GENRES.length) % GENRES.length); setSongIdx(0); setElapsed(0); };
  const nextGenre = () => { setGenreIdx((i) => (i + 1) % GENRES.length); setSongIdx(0); setElapsed(0); };
  const prevSong = () => { setSongIdx((i) => (i - 1 + songs.length) % songs.length); setElapsed(0); };
  const nextSong = () => { setSongIdx((i) => (i + 1) % songs.length); setElapsed(0); };

  // Click en la pantalla: sacude toda la UI, cambia la vibración y rota el color
  const handleCanvasTap = (pos: { x: number; y: number }) => {
    rootRef.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-7px,4px)" },
        { transform: "translate(6px,-5px)" },
        { transform: "translate(-4px,-3px)" },
        { transform: "translate(3px,2px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 380, easing: "ease-out" }
    );
    // Guarda el color actual para el marcador y luego rota al siguiente de la paleta
    setTapMarker({ x: pos.x, y: pos.y, key: Date.now(), color: accent });
    setColorIdx((i) => (i + 1) % palette.length);
    setIntensity((v) => Math.min(100, Math.max(25, Math.round(v + 8 + Math.random() * 18 - 6))));
  };

  useEffect(() => {
    if (!tapMarker) return;
    const id = setTimeout(() => setTapMarker(null), 650);
    return () => clearTimeout(id);
  }, [tapMarker]);

  // La barra de progreso avanza con la "música"
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= totalDuration) {
          setSongIdx((i) => (i + 1) % songs.length);
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, songs.length, totalDuration]);

  return (
    <div
      ref={rootRef}
      className="w-screen h-screen flex flex-col transition-colors duration-700"
      style={{ background: genre.bg, fontFamily: "'DM Sans', sans-serif", color: "#f0f0f0" }}
    >
      {/* Resplandor ambiental que late al ritmo del BPM */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at 70% 30%, ${genre.glow2} 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, ${glow} 0%, transparent 50%)`,
          transition: "background 0.7s ease",
          opacity: 0.4 + (volume / 100) * 0.6,
          animation: isPlaying ? `glow-beat ${beatInterval}s ease-in-out infinite` : "drift 14s ease-in-out infinite",
        }}
      />

      {/* Top bar */}
      <div
        className="relative z-10 flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${accent}18` }}
      >
        {/* Left: back + genre nav */}
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 transition-colors text-xs tracking-widest font-mono uppercase hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            ← Géneros
          </button>
          <div className="w-px h-4" style={{ background: `${accent}30` }} />
          <div className="flex items-center gap-3">
            <button onClick={prevGenre} className="transition-colors font-mono text-xs hover:scale-125 inline-block" style={{ color: `${accent}60` }}>◁</button>
            <div className="text-center min-w-28">
              <div
                className="text-xs font-bold tracking-[0.2em]"
                style={{
                  background: gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: isPlaying ? `title-float ${beatInterval * 2}s ease-in-out infinite` : "none",
                }}
              >
                {genre.label}
              </div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                {genre.sub}
              </div>
            </div>
            <button onClick={nextGenre} className="transition-colors font-mono text-xs hover:scale-125 inline-block" style={{ color: `${accent}60` }}>▷</button>
          </div>
        </div>

        {/* Center */}
        <div className="text-[11px] tracking-[0.3em] font-mono uppercase hidden sm:flex items-center gap-3" style={{ color: `${accent}35` }}>
          <span
            className="inline-flex items-end gap-[2px] h-3"
            style={{ opacity: isPlaying ? 1 : 0.3 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[2px] rounded-full origin-bottom"
                style={{
                  height: "100%",
                  background: accent,
                  animation: isPlaying ? `eq-bounce ${beatInterval / 2}s ease-in-out infinite` : "none",
                  animationDelay: `${i * 0.09}s`,
                }}
              />
            ))}
          </span>
          SINESTESIA DIGITAL
        </div>

        {/* Right: song selector */}
        <div className="flex items-center gap-3">
          <button onClick={prevSong} className="font-mono text-xs hover:scale-125 transition-transform" style={{ color: `${accent}60` }}>◁</button>
          <div className="text-center">
            <div className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>CANCIÓN</div>
            <div className="text-xs font-semibold tracking-wider tabular-nums" style={{ color: accent }}>{songIdx + 1} / {songs.length}</div>
          </div>
          <button onClick={nextSong} className="font-mono text-xs hover:scale-125 transition-transform" style={{ color: `${accent}60` }}>▷</button>
        </div>
      </div>

      {/* Main area */}
      <div className="relative z-10 flex flex-1 overflow-hidden min-h-0">
        {/* Left panel */}
        <div
          className="w-56 shrink-0 flex flex-col gap-6 p-5 overflow-y-auto transition-colors duration-700"
          style={{ borderRight: `1px solid ${accent}15`, background: `${surface}cc` }}
        >
          <div>
            <div className="text-[9px] tracking-[0.25em] font-mono mb-4 uppercase" style={{ color: `${accent}55` }}>
              Controles visuales
            </div>
            <div className="flex flex-col gap-5">
              <Slider label="Intensidad" value={intensity} onChange={setIntensity} accent={accent} />
              <Slider label="Velocidad" value={speed} onChange={setSpeed} accent={accent2} />
              <Slider label="Volumen" value={volume} onChange={setVolume} accent={accent} />
            </div>
          </div>

          {/* Viz type selector */}
          <div>
            <div className="text-[9px] tracking-[0.25em] font-mono mb-3 uppercase" style={{ color: `${accent}55` }}>
              Visualización
            </div>
            <div className="flex flex-col gap-1">
              {VIZ_TYPES.map((v, i) => (
                <button
                  key={v}
                  onClick={() => setVizType(i)}
                  className="text-left px-3 py-2 rounded text-[10px] font-mono tracking-widest transition-all hover:translate-x-1"
                  style={{
                    background: vizType === i ? `${accent}15` : "transparent",
                    color: vizType === i ? accent : "rgba(255,255,255,0.22)",
                    borderLeft: vizType === i ? `2px solid ${accent}` : "2px solid transparent",
                    textShadow: vizType === i ? `0 0 12px ${accent}` : "none",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Color palette */}
          <div>
            <div className="text-[9px] tracking-[0.25em] font-mono mb-3 uppercase" style={{ color: `${accent}55` }}>
              Color
            </div>
            <div className="flex gap-2 flex-wrap">
              {palette.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColorIdx(i)}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: c,
                    boxShadow: colorIdx === i ? `0 0 10px ${c}, 0 0 20px ${c}60` : "none",
                    border: colorIdx === i ? `2px solid white` : "2px solid transparent",
                    animation: isPlaying && colorIdx === i ? `glow-beat ${beatInterval}s ease-in-out infinite` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div
            className="mt-auto rounded-lg p-3 flex flex-col gap-2"
            style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}
          >
            <div className="flex justify-between">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>BPM</span>
              <span
                className="text-[11px] font-mono font-medium tabular-nums inline-block"
                style={{ color: accent, animation: isPlaying ? `glow-beat ${beatInterval}s ease-in-out infinite` : "none" }}
              >
                {song.bpm}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>KEY</span>
              <span className="text-[11px] font-mono" style={{ color: accent2 }}>{song.key}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>GÉNERO</span>
              <span className="text-[9px] font-mono" style={{ color: accent }}>{genre.id.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Center: visualization canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative overflow-hidden">
            <VisualizerCanvas
              genre={genre}
              vizType={vizType}
              isPlaying={isPlaying}
              intensity={intensity}
              speed={speed}
              volume={volume}
              bpm={song.bpm}
              accentOverride={accent}
              onTap={handleCanvasTap}
            />
            {/* Marca del click: anillo DOM + destello (con el color del tap) */}
            {tapMarker && (
              <div key={tapMarker.key} className="absolute inset-0 pointer-events-none z-20">
                <div
                  className="absolute rounded-full"
                  style={{
                    left: `${tapMarker.x * 100}%`,
                    top: `${tapMarker.y * 100}%`,
                    width: 90,
                    height: 90,
                    border: `2px solid ${tapMarker.color}`,
                    boxShadow: `0 0 24px ${tapMarker.color}, inset 0 0 24px ${tapMarker.color}66`,
                    animation: "tap-ping 0.6s ease-out forwards",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(circle, ${tapMarker.color}30 0%, transparent 60%)`, animation: "drop-flash 0.6s ease-out forwards" }}
                />
              </div>
            )}

            {/* Song title overlay */}
            <div
              className="absolute top-5 left-6 pointer-events-none"
              style={{ animation: isPlaying ? `title-float ${beatInterval * 2}s ease-in-out infinite` : "none" }}
            >
              <div
                className="text-[9px] font-mono tracking-[0.25em] uppercase mb-1"
                style={{ color: `${accent}60` }}
              >
                {genre.label}
              </div>
              <div className="text-2xl font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.85)", textShadow: isPlaying ? `0 0 24px ${glow}` : "none" }}>
                {song.title}
              </div>
              <div className="mt-1 text-[10px] font-mono tabular-nums" style={{ color: `${accent}80` }}>
                {song.bpm} BPM · {song.key}
              </div>
            </div>

            {/* Live indicator */}
            <div
              className="absolute top-5 right-6 flex items-center gap-2 pointer-events-none transition-opacity"
              style={{ opacity: isPlaying ? 1 : 0.25 }}
            >
              <div className="flex items-end gap-[3px] h-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-t origin-bottom"
                    style={{
                      height: "100%",
                      background: accent,
                      animation: isPlaying ? `eq-bounce ${beatInterval / 2}s ease-in-out infinite` : "none",
                      animationDelay: `${i * 0.08}s`,
                      boxShadow: `0 0 6px ${accent}`,
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[9px] font-mono tracking-widest"
                style={{ color: `${accent}80`, animation: isPlaying ? `glow-beat ${beatInterval}s ease-in-out infinite` : "none" }}
              >
                {isPlaying ? "LIVE" : "PAUSA"}
              </span>
            </div>

            {/* Interaction hint */}
            <div
              className="absolute bottom-5 right-6 text-[9px] font-mono tracking-widest pointer-events-none transition-opacity"
              style={{ color: `${accent}55`, opacity: tapMarker ? 0 : 1 }}
            >
              {tapMarker ? "¡VIBRACIÓN + COLOR ALTERADOS!" : "CLICK PARA VIBRAR + CAMBIAR COLOR · DRAG PARA ESTELAS"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom playback bar */}
      <div
        className="relative z-10 shrink-0 px-6 py-4 flex flex-col gap-3 transition-colors duration-700 overflow-hidden"
        style={{ borderTop: `1px solid ${accent}18`, background: `${surface}dd` }}
      >
        {/* Progress */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono w-10 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
            {fmt(elapsed)}
          </span>
          <div className="flex-1 h-[2px] rounded-full relative cursor-pointer overflow-visible" style={{ background: `${accent}18` }}>
            <div
              className="h-full rounded-full relative transition-[width] duration-1000 ease-linear"
              style={{
                background: gradient,
                width: `${(elapsed / totalDuration) * 100}%`,
                boxShadow: `0 0 8px ${glow}`,
              }}
            >
              {isPlaying && (
                <div
                  className="absolute inset-y-0 w-16 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                    animation: "shimmer-x 1.8s linear infinite",
                  }}
                />
              )}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full -mr-1.5"
                style={{
                  background: accent,
                  boxShadow: `0 0 10px ${accent}, 0 0 20px ${glow}`,
                  animation: isPlaying ? `glow-beat ${beatInterval}s ease-in-out infinite` : "none",
                }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono w-10 tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>
            {fmt(totalDuration)}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="w-40" />

          {/* Transport */}
          <div className="flex items-center gap-6">
            <button className="font-mono text-sm transition-opacity hover:opacity-80 hover:-rotate-12 inline-block" style={{ color: `${accent}60` }}>↺</button>
            <button onClick={prevSong} className="font-mono transition-opacity hover:opacity-80 hover:scale-110 inline-block" style={{ color: `${accent}60` }}>◁◁</button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: isPlaying ? `${accent}20` : gradient,
                boxShadow: isPlaying ? `0 0 0 1px ${accent}40, 0 0 24px ${glow}` : `0 0 20px ${glow}, 0 0 40px ${genre.glow2}`,
                animation: isPlaying ? `play-beat ${beatInterval}s ease-in-out infinite` : "none",
              }}
            >
              <span className="text-base font-bold" style={{ color: isPlaying ? accent : "#080808" }}>
                {isPlaying ? "▐▐" : "▶"}
              </span>
            </button>
            <button onClick={nextSong} className="font-mono transition-opacity hover:opacity-80 hover:scale-110 inline-block" style={{ color: `${accent}60` }}>▷▷</button>
            <button
              onClick={nextSong}
              className="font-mono text-sm transition-opacity hover:opacity-80 hover:rotate-12 inline-block"
              style={{ color: `${accent}60` }}
            >
              ⇥
            </button>
          </div>

          {/* Volume */}
          <div className="w-40 flex items-center justify-end gap-3">
            <button
              className="text-xs font-mono transition-opacity hover:opacity-80 inline-block"
              style={{
                color: `${accent}60`,
                animation: isPlaying ? `eq-bounce ${beatInterval}s ease-in-out infinite` : "none",
              }}
            >
              {volume === 0 ? "✕" : "♪"}
            </button>
            <div className="w-20 h-[2px] rounded-full" style={{ background: `${accent}18` }}>
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ background: gradient, width: `${volume}%`, boxShadow: `0 0 6px ${glow}` }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
        input[type=range]::-moz-range-thumb {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
