import { useState } from "react";

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

type Genre = (typeof GENRES)[0];

function VisualizerPlaceholder({
  genre,
  vizType,
  isPlaying,
}: {
  genre: Genre;
  vizType: number;
  isPlaying: boolean;
}) {
  const bars = Array.from({ length: 32 });
  const { accent, accent2, glow, glow2 } = genre;

  if (vizType === 0) {
    // Waveform
    return (
      <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent2} stopOpacity="0.9" />
          </linearGradient>
          <filter id="glow-f">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {[0, 1, 2].map((i) => (
          <polyline
            key={i}
            points={Array.from({ length: 25 }, (_, x) => {
              const t = x / 24;
              const y = 100 + Math.sin(t * Math.PI * (4 + i * 2)) * (45 - i * 12);
              return `${t * 400},${y}`;
            }).join(" ")}
            fill="none"
            stroke={i === 0 ? "url(#wg1)" : i === 1 ? accent : accent2}
            strokeWidth={i === 0 ? 2.5 : 1.5 - i * 0.3}
            opacity={0.9 - i * 0.25}
            filter={i === 0 ? "url(#glow-f)" : undefined}
            style={
              isPlaying
                ? { animation: `waveform ${1.2 + i * 0.4}s ease-in-out infinite alternate` }
                : {}
            }
          />
        ))}
        <text x="200" y="186" textAnchor="middle" fill={accent} fillOpacity="0.2" fontSize="10" fontFamily="DM Mono" letterSpacing="4">
          WAVEFORM · {genre.id.toUpperCase()}
        </text>
      </svg>
    );
  }

  if (vizType === 1) {
    // Bars
    return (
      <div className="w-full h-full flex items-end justify-center gap-[3px] px-8 pb-8 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${glow} 0%, transparent 60%)`,
          }}
        />
        {bars.map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: isPlaying ? undefined : "15%",
              minHeight: 4,
              background: `linear-gradient(to top, ${accent}, ${accent2})`,
              boxShadow: isPlaying ? `0 -4px 12px ${glow}` : "none",
              animation: isPlaying
                ? `bar-dance ${0.4 + (i % 7) * 0.08}s ease-in-out infinite`
                : "none",
              animationDelay: `${(i % 5) * 0.05}s`,
              opacity: 0.7 + (i % 3) * 0.1,
            }}
          />
        ))}
      </div>
    );
  }

  if (vizType === 2) {
    // Particles
    const dots = Array.from({ length: 48 });
    return (
      <div className="w-full h-full relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${glow2} 0%, transparent 65%)`,
          }}
        />
        {dots.map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + (i % 5),
              height: 2 + (i % 5),
              left: `${(i * 37 + 10) % 90}%`,
              top: `${(i * 53 + 5) % 85}%`,
              background: i % 2 === 0 ? accent : accent2,
              opacity: 0.3 + (i % 5) * 0.1,
              boxShadow: `0 0 ${4 + (i % 4) * 3}px ${i % 2 === 0 ? accent : accent2}`,
              animation: isPlaying
                ? `pulse-ring ${0.8 + (i % 6) * 0.3}s ease-in-out infinite`
                : "none",
              animationDelay: `${(i % 8) * 0.1}s`,
            }}
          />
        ))}
        {[180, 130, 80].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full left-1/2 top-1/2"
            style={{
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              border: `1px solid ${i === 0 ? accent : accent2}`,
              opacity: 0.12 + i * 0.05,
              animation: isPlaying ? `pulse-ring ${1.5 + i * 0.4}s ease-in-out infinite` : "none",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        <span
          className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest"
          style={{ color: `${accent}40` }}
        >
          PARTÍCULAS · {genre.id.toUpperCase()}
        </span>
      </div>
    );
  }

  // Rings
  const rings = [200, 154, 108, 64, 28];
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${glow} 0%, ${glow2} 30%, transparent 65%)`,
        }}
      />
      {rings.map((size, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            border: `1px solid ${i % 2 === 0 ? accent : accent2}`,
            opacity: 0.1 + i * 0.07,
            boxShadow: i < 2 ? `0 0 20px ${glow}, inset 0 0 20px ${glow2}` : "none",
            animation: isPlaying
              ? `pulse-ring ${1 + i * 0.25}s ease-in-out infinite`
              : "none",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <div
        className="w-4 h-4 rounded-full"
        style={{
          background: genre.gradient,
          boxShadow: `0 0 20px ${glow}, 0 0 40px ${glow2}`,
        }}
      />
      <span
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest"
        style={{ color: `${accent}40` }}
      >
        ANILLOS · {genre.id.toUpperCase()}
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
        <span className="text-[11px] font-mono" style={{ color: accent + "cc" }}>
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
  const elapsed = 87;

  const genre = GENRES[genreIdx];
  const songs = SONGS[genre.id];
  const song = songs[songIdx];
  const totalDuration = 210;
  const { accent, accent2, glow, gradient, surface, palette } = genre;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const prevGenre = () => { setGenreIdx((i) => (i - 1 + GENRES.length) % GENRES.length); setSongIdx(0); };
  const nextGenre = () => { setGenreIdx((i) => (i + 1) % GENRES.length); setSongIdx(0); };
  const prevSong = () => setSongIdx((i) => (i - 1 + songs.length) % songs.length);
  const nextSong = () => setSongIdx((i) => (i + 1) % songs.length);

  return (
    <div
      className="w-screen h-screen flex flex-col transition-colors duration-700"
      style={{ background: genre.bg, fontFamily: "'DM Sans', sans-serif", color: "#f0f0f0" }}
    >
      {/* Ambient glow behind everything */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at 70% 30%, ${genre.glow2} 0%, transparent 55%)`,
          transition: "background 0.7s ease",
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
            <button onClick={prevGenre} className="transition-colors font-mono text-xs" style={{ color: `${accent}60` }}>◁</button>
            <div className="text-center">
              <div
                className="text-xs font-bold tracking-[0.2em]"
                style={{
                  background: gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {genre.label}
              </div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                {genre.sub}
              </div>
            </div>
            <button onClick={nextGenre} className="transition-colors font-mono text-xs" style={{ color: `${accent}60` }}>▷</button>
          </div>
        </div>

        {/* Center */}
        <div className="text-[11px] tracking-[0.3em] font-mono uppercase" style={{ color: `${accent}35` }}>
          SINESTESIA DIGITAL
        </div>

        {/* Right: song selector */}
        <div className="flex items-center gap-3">
          <button onClick={prevSong} className="font-mono text-xs" style={{ color: `${accent}60` }}>◁</button>
          <div className="text-center">
            <div className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>CANCIÓN</div>
            <div className="text-xs font-semibold tracking-wider" style={{ color: accent }}>{songIdx + 1} / {songs.length}</div>
          </div>
          <button onClick={nextSong} className="font-mono text-xs" style={{ color: `${accent}60` }}>▷</button>
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
                  className="text-left px-3 py-2 rounded text-[10px] font-mono tracking-widest transition-all"
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
                  className="w-7 h-7 rounded-full transition-all hover:scale-110"
                  style={{
                    background: c,
                    boxShadow: colorIdx === i ? `0 0 10px ${c}, 0 0 20px ${c}60` : "none",
                    border: colorIdx === i ? `2px solid white` : "2px solid transparent",
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
              <span className="text-[11px] font-mono font-medium" style={{ color: accent }}>{song.bpm}</span>
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
            <VisualizerPlaceholder genre={genre} vizType={vizType} isPlaying={isPlaying} />

            {/* Song title overlay */}
            <div className="absolute top-5 left-6 pointer-events-none">
              <div
                className="text-[9px] font-mono tracking-[0.25em] uppercase mb-1"
                style={{ color: `${accent}60` }}
              >
                {genre.label}
              </div>
              <div className="text-2xl font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>
                {song.title}
              </div>
              <div className="mt-1 text-[10px] font-mono" style={{ color: `${accent}80` }}>
                {song.bpm} BPM · {song.key}
              </div>
            </div>

            {/* Live indicator */}
            {isPlaying && (
              <div className="absolute top-5 right-6 flex items-center gap-2 pointer-events-none">
                <div className="flex items-end gap-[3px] h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-t"
                      style={{
                        background: accent,
                        animation: `bar-dance ${0.4 + i * 0.1}s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`,
                        boxShadow: `0 0 6px ${accent}`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono tracking-widest" style={{ color: `${accent}80` }}>
                  LIVE
                </span>
              </div>
            )}

            {/* Interaction hint */}
            <div
              className="absolute bottom-5 right-6 text-[9px] font-mono tracking-widest pointer-events-none"
              style={{ color: `${accent}25` }}
            >
              CLICK · DRAG · EXPLORE
            </div>
          </div>
        </div>
      </div>

      {/* Bottom playback bar */}
      <div
        className="relative z-10 shrink-0 px-6 py-4 flex flex-col gap-3 transition-colors duration-700"
        style={{ borderTop: `1px solid ${accent}18`, background: `${surface}dd` }}
      >
        {/* Progress */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono w-10 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>
            {fmt(elapsed)}
          </span>
          <div className="flex-1 h-[2px] rounded-full relative cursor-pointer" style={{ background: `${accent}18` }}>
            <div
              className="h-full rounded-full relative"
              style={{
                background: gradient,
                width: `${(elapsed / totalDuration) * 100}%`,
                boxShadow: `0 0 8px ${glow}`,
              }}
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full -mr-1.5"
                style={{
                  background: accent,
                  boxShadow: `0 0 10px ${accent}, 0 0 20px ${glow}`,
                }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono w-10" style={{ color: "rgba(255,255,255,0.2)" }}>
            {fmt(totalDuration)}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="w-40" />

          {/* Transport */}
          <div className="flex items-center gap-6">
            <button className="font-mono text-sm transition-opacity hover:opacity-80" style={{ color: `${accent}60` }}>↺</button>
            <button className="font-mono transition-opacity hover:opacity-80" style={{ color: `${accent}60` }}>◁◁</button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: isPlaying ? `${accent}20` : gradient,
                boxShadow: isPlaying ? `0 0 0 1px ${accent}40` : `0 0 20px ${glow}, 0 0 40px ${genre.glow2}`,
              }}
            >
              <span className="text-base font-bold" style={{ color: isPlaying ? accent : "#080808" }}>
                {isPlaying ? "▐▐" : "▶"}
              </span>
            </button>
            <button className="font-mono transition-opacity hover:opacity-80" style={{ color: `${accent}60` }}>▷▷</button>
            <button
              onClick={nextSong}
              className="font-mono text-sm transition-opacity hover:opacity-80"
              style={{ color: `${accent}60` }}
            >
              ⇥
            </button>
          </div>

          {/* Volume */}
          <div className="w-40 flex items-center justify-end gap-3">
            <button className="text-xs font-mono transition-opacity hover:opacity-80" style={{ color: `${accent}60` }}>
              {volume === 0 ? "✕" : "♪"}
            </button>
            <div className="w-20 h-[2px] rounded-full" style={{ background: `${accent}18` }}>
              <div
                className="h-full rounded-full"
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
