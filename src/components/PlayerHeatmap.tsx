import React, { useState, useEffect, useRef } from 'react';
import { HeatmapPoint, PlayerActionPoint, Player } from '../types/scouting';
import { Layers, Activity, Crosshair, RefreshCw, Flame, Loader2 } from 'lucide-react';
import { generateTacticalHeatmap } from '../utils/heatmapUtils';

interface PlayerHeatmapProps {
  heatmapPoints?: HeatmapPoint[];
  actionPoints?: PlayerActionPoint[];
  playerName?: string;
  position?: string;
  player?: Player;
  matchId?: string;
}

export const PlayerHeatmap: React.FC<PlayerHeatmapProps> = ({
  heatmapPoints = [],
  actionPoints = [],
  playerName,
  position,
  player,
  matchId,
}) => {
  const [activeTab, setActiveTab] = useState<'heatmap' | 'positions' | 'actions'>('heatmap');
  const [invertPitch, setInvertPitch] = useState<boolean>(false);
  const [livePoints, setLivePoints] = useState<HeatmapPoint[] | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // On-demand fetch of real Sofascore heatmap points if available
  const fetchLiveHeatmap = React.useCallback(() => {
    if (!player || player.minutesPlayed === 0) return;

    // Check if player already has real heatpoints loaded from Sofascore
    if (player.hasRealHeatmap && player.heatmapPoints && player.heatmapPoints.length > 0) {
      setLivePoints(player.heatmapPoints);
      return;
    }

    // Try fetching from API if event ID is known
    const eventIdMatch = matchId?.match(/(\d+)/);
    const eventId = eventIdMatch ? eventIdMatch[1] : null;

    if (eventId && player.id && /^\d+$/.test(player.id)) {
      setIsLoadingLive(true);
      const scraperKey = typeof window !== 'undefined' ? localStorage.getItem('sofascore_scraper_key') || undefined : undefined;
      const scraperProvider = typeof window !== 'undefined' ? localStorage.getItem('sofascore_proxy_provider') || 'scraperapi' : 'scraperapi';
      const customProxy = typeof window !== 'undefined' ? localStorage.getItem('sofascore_custom_proxy') || undefined : undefined;

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (scraperKey) headers['X-Scraper-Key'] = scraperKey;
      if (scraperProvider) headers['X-Scraper-Provider'] = scraperProvider;
      if (customProxy) headers['X-Custom-Proxy'] = customProxy;

      fetch(`/api/sofascore/event/${eventId}/player/${player.id}/heatmap`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (Array.isArray(data.heatmap) || Array.isArray(data.points) || Array.isArray(data))) {
            const raw = data.heatmap || data.points || data;
            const pts: HeatmapPoint[] = raw.map((pt: any) => {
              let x = Number(pt.x ?? pt.posX ?? 50);
              let y = Number(pt.y ?? pt.posY ?? 50);
              // Handle 0..1 scale if returned
              if (x > 0 && x <= 1 && y > 0 && y <= 1) {
                x = x * 100;
                y = y * 100;
              }
              // Opta/Sofascore Y-axis (0 = right touchline / bottom, 100 = left touchline / top) -> Screen Y (0 = top, 100 = bottom)
              y = 100 - y;
              return {
                x: Math.max(2, Math.min(98, x)),
                y: Math.max(2, Math.min(98, y)),
                intensity: typeof pt.count === 'number' ? Math.min(1, 0.4 + pt.count * 0.2) : 0.85,
              };
            });
            if (pts.length > 0) {
              setLivePoints(pts);
              player.heatmapPoints = pts;
              player.hasRealHeatmap = true;
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingLive(false);
        });
    }
  }, [player, matchId]);

  useEffect(() => {
    setLivePoints(null);
    fetchLiveHeatmap();
  }, [player?.id, matchId, fetchLiveHeatmap]);

  // Compute effective points
  const effectivePoints: HeatmapPoint[] = React.useMemo(() => {
    if (livePoints && livePoints.length > 0) return livePoints;
    if (heatmapPoints && heatmapPoints.length > 0) return heatmapPoints;
    if (player && player.minutesPlayed > 0) {
      return generateTacticalHeatmap(
        player.position,
        player.positionLabel,
        true,
        player.statistics,
        player.minutesPlayed
      );
    }
    return [];
  }, [livePoints, heatmapPoints, player]);

  // Compute zone density metrics
  const zoneStats = React.useMemo(() => {
    if (effectivePoints.length === 0) return null;
    let defThird = 0;
    let midThird = 0;
    let attThird = 0;

    effectivePoints.forEach((pt) => {
      const x = invertPitch ? 100 - pt.x : pt.x;
      if (x < 33.3) defThird++;
      else if (x < 66.6) midThird++;
      else attThird++;
    });

    const total = effectivePoints.length || 1;
    return {
      defThirdPct: Math.round((defThird / total) * 100),
      midThirdPct: Math.round((midThird / total) * 100),
      attThirdPct: Math.round((attThird / total) * 100),
      totalTouches: effectivePoints.length,
    };
  }, [effectivePoints, invertPitch]);

  // Authentic Sofascore Gaussian Colormap Heatmap Renderer
  useEffect(() => {
    if (activeTab !== 'heatmap') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (effectivePoints.length === 0) return;

    // Step 1: Create an offscreen canvas for smooth density accumulation
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.clearRect(0, 0, width, height);

    effectivePoints.forEach((pt) => {
      const xVal = invertPitch ? 100 - pt.x : pt.x;
      const yVal = invertPitch ? 100 - pt.y : pt.y;
      const px = (xVal / 100) * width;
      const py = (yVal / 100) * height;
      const intensity = pt.intensity || 0.8;
      const radius = Math.max(20, Math.min(52, 32 * intensity));

      const radGrad = offCtx.createRadialGradient(px, py, 0, px, py, radius);
      radGrad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(1.0, 0.52 * intensity)})`);
      radGrad.addColorStop(0.35, `rgba(0, 0, 0, ${Math.min(0.7, 0.28 * intensity)})`);
      radGrad.addColorStop(0.7, `rgba(0, 0, 0, ${Math.min(0.35, 0.12 * intensity)})`);
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      offCtx.beginPath();
      offCtx.arc(px, py, radius, 0, Math.PI * 2);
      offCtx.fillStyle = radGrad;
      offCtx.fill();
    });

    // Step 2: Sofascore-compliant thermal colormap gradient mapping
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sofascore Thermal Color Ramp:
    // Low: Warm Lime / Amber Glow -> Mid: Bright Gold/Orange -> Peak: Deep Crimson Red
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) continue;

      const norm = alpha / 255;
      let r = 0, g = 0, b = 0, outAlpha = 0;

      if (norm < 0.22) {
        // Low: Warm golden-lime glow
        const t = norm / 0.22;
        r = Math.round(180 + t * 50);
        g = Math.round(200 + t * 25);
        b = Math.round(60 - t * 30);
        outAlpha = Math.round(alpha * 0.65);
      } else if (norm < 0.5) {
        // Mid-low: Golden Amber to Warm Yellow
        const t = (norm - 0.22) / 0.28;
        r = Math.round(230 + t * 20);
        g = Math.round(225 - t * 45);
        b = Math.round(30 - t * 20);
        outAlpha = Math.round(alpha * 0.82);
      } else if (norm < 0.75) {
        // Mid-high: Yellow to Rich Orange
        const t = (norm - 0.5) / 0.25;
        r = Math.round(250 - t * 8);
        g = Math.round(180 - t * 90);
        b = Math.round(10 - t * 10);
        outAlpha = Math.round(alpha * 0.94);
      } else {
        // Peak: Intense Crimson Scarlet Red (identical to Sofascore)
        const t = (norm - 0.75) / 0.25;
        r = Math.round(242 - t * 20);
        g = Math.round(90 - t * 55);
        b = Math.round(0);
        outAlpha = Math.round(Math.min(255, alpha * 1.05));
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = outAlpha;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [effectivePoints, activeTab, invertPitch]);

  return (
    <div className="space-y-3.5">
      {/* Tab Selector & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Mapa de calor del partido</span>
          </span>
          {isLoadingLive ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>Extrayendo de Sofascore...</span>
            </span>
          ) : player?.hasRealHeatmap ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Telemetría Oficial Sofascore</span>
            </span>
          ) : zoneStats ? (
            <button
              onClick={() => {
                if (player) {
                  player.hasRealHeatmap = false;
                  player.heatmapPoints = undefined;
                }
                fetchLiveHeatmap();
              }}
              title="Reintentar descarga de telemetría de Sofascore"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Estimación Táctica</span>
              <RefreshCw className="w-2.5 h-2.5 ml-0.5 text-amber-400" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Invert direction button */}
          <button
            type="button"
            onClick={() => setInvertPitch(!invertPitch)}
            title="Invertir dirección de ataque"
            className={`p-1.5 rounded border text-[10px] font-mono transition-colors flex items-center gap-1 ${
              invertPitch
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-white'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Girar</span>
          </button>

          {/* Tab selector */}
          <div className="flex items-center bg-[#0F172A] p-0.5 rounded border border-[#334155]/80 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('heatmap')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'heatmap'
                  ? 'bg-[#1E293B] text-cyan-300 font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Térmico</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('positions')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'positions'
                  ? 'bg-[#1E293B] text-cyan-300 font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Nodos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'actions'
                  ? 'bg-[#1E293B] text-cyan-300 font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>Acciones</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sofascore Authentic Turf Pitch Display */}
      <div className="relative w-full aspect-[16/10] bg-[#436d40] rounded-2xl border-2 border-[#335531] overflow-hidden select-none shadow-xl">
        {/* Subtle grass turf gradient and lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4a7746] to-[#3d653a] pointer-events-none"></div>

        {/* Attack Direction Arrow Indicator (Sofascore Authentic Top Center Arrow) */}
        <div className="absolute top-2.5 inset-x-0 flex justify-center items-center pointer-events-none z-10">
          <svg className="w-12 h-4 text-black/75" viewBox="0 0 50 16" fill="currentColor">
            {invertPitch ? (
              <path d="M 12 8 L 24 1 L 24 6 L 48 6 L 48 10 L 24 10 L 24 15 Z" />
            ) : (
              <path d="M 38 8 L 26 1 L 26 6 L 2 6 L 2 10 L 26 10 L 26 15 Z" />
            )}
          </svg>
        </div>

        {/* Pitch Markings SVG (Sofascore Style Clean Crisp Lines) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none stroke-white/45"
          strokeWidth="1.2"
          fill="none"
          viewBox="0 0 100 65"
          preserveAspectRatio="none"
        >
          {/* Pitch boundary */}
          <rect x="3" y="3" width="94" height="59" rx="1.5" />

          {/* Halfway line */}
          <line x1="50" y1="3" x2="50" y2="62" />

          {/* Center circle & spot */}
          <circle cx="50" cy="32.5" r="9.15" />
          <circle cx="50" cy="32.5" r="0.6" fill="white" fillOpacity="0.8" />

          {/* Left Penalty Box */}
          <rect x="3" y="14.5" width="16.5" height="36" />
          <rect x="3" y="23.5" width="5.5" height="18" />
          <circle cx="12" cy="32.5" r="0.6" fill="white" fillOpacity="0.8" />
          <path d="M 19.5 25.5 A 9.15 9.15 0 0 1 19.5 39.5" />

          {/* Right Penalty Box */}
          <rect x="80.5" y="14.5" width="16.5" height="36" />
          <rect x="91.5" y="23.5" width="5.5" height="18" />
          <circle cx="88" cy="32.5" r="0.6" fill="white" fillOpacity="0.8" />
          <path d="M 80.5 25.5 A 9.15 9.15 0 0 0 80.5 39.5" />

          {/* Goals */}
          <rect x="1" y="28.5" width="2" height="8" stroke="white" strokeOpacity="0.6" />
          <rect x="97" y="28.5" width="2" height="8" stroke="white" strokeOpacity="0.6" />

          {/* Corner Arcs */}
          <path d="M 3 5 A 2 2 0 0 0 5 3" />
          <path d="M 95 3 A 2 2 0 0 0 97 5" />
          <path d="M 3 60 A 2 2 0 0 1 5 62" />
          <path d="M 95 62 A 2 2 0 0 1 97 60" />
        </svg>

        {/* VIEW 1: THERMAL HEATMAP CANVAS */}
        {activeTab === 'heatmap' && (
          <>
            {effectivePoints.length > 0 ? (
              <canvas
                ref={canvasRef}
                width={500}
                height={325}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70 font-mono bg-black/20">
                No hay datos de mapa de calor disponibles para este jugador
              </div>
            )}
          </>
        )}

        {/* VIEW 2: POSITIONAL DENSITY NODES */}
        {activeTab === 'positions' && (
          <div className="absolute inset-0 p-2">
            {effectivePoints.length > 0 ? (
              effectivePoints.slice(0, 48).map((pt, idx) => {
                const xVal = invertPitch ? 100 - pt.x : pt.x;
                const yVal = invertPitch ? 100 - pt.y : pt.y;
                return (
                  <div
                    key={idx}
                    style={{
                      left: `${xVal}%`,
                      top: `${yVal}%`,
                      opacity: pt.intensity,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-400/80 border border-white flex items-center justify-center pointer-events-none shadow-md"
                  >
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/70 font-mono">
                Sin coordenadas registradas
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: MATCH ACTIONS */}
        {activeTab === 'actions' && (
          <div className="absolute inset-0 p-2">
            {actionPoints.length > 0 ? (
              actionPoints.map((act) => {
                const xVal = invertPitch ? 100 - act.x : act.x;
                const yVal = invertPitch ? 100 - act.y : act.y;
                return (
                  <div
                    key={act.id}
                    style={{
                      left: `${xVal}%`,
                      top: `${yVal}%`,
                    }}
                    title={`${act.label} (${act.minute}')`}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono cursor-pointer transition-transform hover:scale-150 shadow-lg ${
                      act.type === 'shot'
                        ? 'bg-rose-500 text-white shadow-[0_0_8px_#EF4444]'
                        : act.type === 'pass'
                        ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_#06B6D4]'
                        : 'bg-emerald-500 text-black font-bold'
                    }`}
                  >
                    {act.type === 'shot' ? '⚽' : act.type === 'pass' ? 'P' : 'T'}
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/70 font-mono">
                No hay acciones individuales disponibles
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone Analytics Metrics Bar */}
      {zoneStats && (
        <div className="grid grid-cols-3 gap-2 bg-[#0F172A] p-2.5 rounded-lg border border-[#334155] text-xs font-mono">
          <div className="space-y-0.5 text-center">
            <div className="text-[10px] text-[#64748B] uppercase">Tercio Defensivo</div>
            <div className="text-white font-bold text-sm text-cyan-400">{zoneStats.defThirdPct}%</div>
          </div>
          <div className="space-y-0.5 text-center border-x border-[#334155]">
            <div className="text-[10px] text-[#64748B] uppercase">Medio Campo</div>
            <div className="text-white font-bold text-sm text-yellow-400">{zoneStats.midThirdPct}%</div>
          </div>
          <div className="space-y-0.5 text-center">
            <div className="text-[10px] text-[#64748B] uppercase">Tercio Ofensivo</div>
            <div className="text-white font-bold text-sm text-rose-400">{zoneStats.attThirdPct}%</div>
          </div>
        </div>
      )}
    </div>
  );
};
