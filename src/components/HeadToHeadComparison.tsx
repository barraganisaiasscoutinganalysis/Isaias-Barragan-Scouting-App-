import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Player, Team, MatchDetails, HeatmapPoint } from '../types/scouting';
import { getCountryFlagUrl, sanitizePlayerName } from '../utils/countryFlags';
import { 
  Swords, 
  Sparkles, 
  Flame, 
  Layers, 
  ArrowRightLeft, 
  Shield, 
  Target, 
  Zap, 
  Award,
  ChevronDown,
  UserCheck
} from 'lucide-react';

interface HeadToHeadComparisonProps {
  match: MatchDetails;
  initialPlayerA?: Player;
  initialPlayerB?: Player;
  onClose?: () => void;
}

export const HeadToHeadComparison: React.FC<HeadToHeadComparisonProps> = ({
  match,
  initialPlayerA,
  initialPlayerB,
  onClose,
}) => {
  const allHomePlayers = useMemo(() => [...match.homeTeam.starters, ...match.homeTeam.substitutes], [match.homeTeam]);
  const allAwayPlayers = useMemo(() => [...match.awayTeam.starters, ...match.awayTeam.substitutes], [match.awayTeam]);
  const allPlayers = useMemo(() => [...allHomePlayers, ...allAwayPlayers], [allHomePlayers, allAwayPlayers]);

  const [playerAId, setPlayerAId] = useState<string>(
    initialPlayerA?.id || match.homeTeam.starters[0]?.id || ''
  );
  const [playerBId, setPlayerBId] = useState<string>(
    initialPlayerB?.id || match.awayTeam.starters[0]?.id || ''
  );

  const [viewMode, setViewMode] = useState<'stats' | 'heatmaps' | 'collision'>('stats');

  const playerA = useMemo(() => allPlayers.find((p) => p.id === playerAId) || match.homeTeam.starters[0], [allPlayers, playerAId, match]);
  const playerB = useMemo(() => allPlayers.find((p) => p.id === playerBId) || match.awayTeam.starters[0], [allPlayers, playerBId, match]);

  const playerATeam = useMemo(() => {
    if (!playerA) return match.homeTeam;
    return allHomePlayers.some((p) => p.id === playerA.id) ? match.homeTeam : match.awayTeam;
  }, [playerA, allHomePlayers, match]);

  const playerBTeam = useMemo(() => {
    if (!playerB) return match.awayTeam;
    return allHomePlayers.some((p) => p.id === playerB.id) ? match.homeTeam : match.awayTeam;
  }, [playerB, allHomePlayers, match]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Suggested direct duels
  const matchupPresets = useMemo(() => {
    const presets: Array<{ title: string; a: Player; b: Player }> = [];
    
    // Find wing duel: Home LB vs Away RW / RM
    const homeLB = match.homeTeam.starters.find(p => p.positionLabel === 'LI' || p.positionLabel === 'LB');
    const awayRW = match.awayTeam.starters.find(p => p.positionLabel === 'ED' || p.positionLabel === 'RW' || p.positionLabel === 'RM');
    if (homeLB && awayRW) {
      presets.push({ title: 'Duelo Banda: LI vs ED', a: homeLB, b: awayRW });
    }

    // Find striker vs center back duel: Home ST vs Away CB
    const homeST = match.homeTeam.starters.find(p => p.positionLabel === 'DC' || p.positionLabel === 'ST' || p.position === 'FW');
    const awayCB = match.awayTeam.starters.find(p => p.positionLabel === 'DFC' || p.positionLabel === 'CB');
    if (homeST && awayCB) {
      presets.push({ title: 'Ataque vs Defensa: DC vs DFC', a: homeST, b: awayCB });
    }

    // Find midfield duel: Home CM vs Away CM
    const homeCM = match.homeTeam.starters.find(p => p.position === 'MF');
    const awayCM = match.awayTeam.starters.find(p => p.position === 'MF');
    if (homeCM && awayCM) {
      presets.push({ title: 'Duelo Medular: Mediocentros', a: homeCM, b: awayCM });
    }

    return presets;
  }, [match]);

  // Render collision canvas when in collision mode
  useEffect(() => {
    if (viewMode !== 'collision' || !canvasRef.current || !playerA || !playerB) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw Player A points (Cyan/Emerald)
    const ptsA = playerA.heatmapPoints || [];
    ptsA.forEach((pt) => {
      const px = (pt.x / 100) * width;
      const py = (pt.y / 100) * height;
      const rad = Math.max(16, Math.min(40, 24 * (pt.intensity || 0.8)));
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Draw Player B points (Coral/Rose/Amber)
    const ptsB = playerB.heatmapPoints || [];
    ptsB.forEach((pt) => {
      // Invert B if from opposing team for attack clash representation
      const px = (pt.x / 100) * width;
      const py = (pt.y / 100) * height;
      const rad = Math.max(16, Math.min(40, 24 * (pt.intensity || 0.8)));
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
      grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }, [viewMode, playerA, playerB]);

  if (!playerA || !playerB) return null;

  const statA = playerA.statistics;
  const statB = playerB.statistics;

  const renderStatComparisonRow = (
    label: string, 
    valA: number | undefined, 
    valB: number | undefined, 
    suffix: string = '', 
    higherIsBetter: boolean = true
  ) => {
    const numA = valA ?? 0;
    const numB = valB ?? 0;
    const isTie = numA === numB;
    const aWins = higherIsBetter ? numA > numB : numA < numB;
    const bWins = higherIsBetter ? numB > numA : numB < numA;

    const maxVal = Math.max(Math.abs(numA), Math.abs(numB), 1);
    const pctA = Math.round((Math.abs(numA) / maxVal) * 100);
    const pctB = Math.round((Math.abs(numB) / maxVal) * 100);

    return (
      <div className="py-2.5 border-b border-[#1E293B]/70 last:border-none space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={`font-bold flex items-center gap-1 ${aWins ? 'text-cyan-400 font-extrabold' : 'text-[#CBD5E1]'}`}>
            {valA !== undefined ? `${valA}${suffix}` : '-'}
            {aWins && !isTie && <Award className="w-3 h-3 text-cyan-400 inline" />}
          </span>
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-sans font-medium text-center">
            {label}
          </span>
          <span className={`font-bold flex items-center gap-1 ${bWins ? 'text-rose-400 font-extrabold' : 'text-[#CBD5E1]'}`}>
            {bWins && !isTie && <Award className="w-3 h-3 text-rose-400 inline" />}
            {valB !== undefined ? `${valB}${suffix}` : '-'}
          </span>
        </div>

        {/* Comparative Dual Bar */}
        <div className="grid grid-cols-2 gap-2 items-center h-2">
          {/* Player A bar (right-aligned) */}
          <div className="w-full bg-[#1E293B] rounded-full h-1.5 flex justify-end overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${aWins ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-[#64748B]'}`}
              style={{ width: `${pctA}%` }}
            />
          </div>
          {/* Player B bar (left-aligned) */}
          <div className="w-full bg-[#1E293B] rounded-full h-1.5 flex justify-start overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${bWins ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-[#64748B]'}`}
              style={{ width: `${pctB}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Matchup Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-[#334155]/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-cyan-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Comparador Head-to-Head</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono">1 vs 1</span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Análisis comparativo directo de rendimiento, estadísticas y colisión espacial.
            </p>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center bg-[#0F172A] p-1 rounded-lg border border-[#334155] text-xs font-mono">
          <button
            onClick={() => setViewMode('stats')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'stats' ? 'bg-[#1E293B] text-cyan-300 font-bold shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Estadísticas</span>
          </button>
          <button
            onClick={() => setViewMode('heatmaps')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'heatmaps' ? 'bg-[#1E293B] text-cyan-300 font-bold shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Mapas Paralelos</span>
          </button>
          <button
            onClick={() => setViewMode('collision')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'collision' ? 'bg-[#1E293B] text-rose-400 font-bold shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span>Zona de Colisión</span>
          </button>
        </div>
      </div>

      {/* Matchup Quick Presets */}
      {matchupPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[#94A3B8] text-[11px]">Duelos tácticos clave:</span>
          {matchupPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPlayerAId(preset.a.id);
                setPlayerBId(preset.b.id);
              }}
              className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-cyan-300 border border-[#334155] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-3 h-3 text-cyan-400" />
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Players Selectors and Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player A Card (Cyan Theme) */}
        <div className="rounded-xl bg-gradient-to-b from-[#111827] to-[#0B0F19] border-2 border-cyan-500/40 p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">Jugador A</span>
            </div>
            <select
              value={playerA.id}
              onChange={(e) => setPlayerAId(e.target.value)}
              className="bg-[#0A0D14] border border-[#334155] focus:border-cyan-500 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <optgroup label={`${match.homeTeam.name} (Local)`}>
                {allHomePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number && p.number > 0 ? `#${p.number}` : '(-)'} {sanitizePlayerName(p.name)} ({p.positionLabel})
                  </option>
                ))}
              </optgroup>
              <optgroup label={`${match.awayTeam.name} (Visitante)`}>
                {allAwayPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number && p.number > 0 ? `#${p.number}` : '(-)'} {sanitizePlayerName(p.name)} ({p.positionLabel})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="relative w-16 h-16 rounded-xl bg-[#1E293B] border border-cyan-500/40 overflow-hidden shrink-0 flex items-center justify-center">
              {playerA.avatarUrl ? (
                <img
                  src={playerA.avatarUrl}
                  alt={playerA.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xl font-bold text-cyan-400 font-mono">{playerA.number && playerA.number > 0 ? `#${playerA.number}` : '-'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate">{sanitizePlayerName(playerA.name)}</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                  {playerA.positionLabel}
                </span>
                <img
                  src={getCountryFlagUrl(playerA.nationality, playerA.nationalityCode)}
                  alt={playerA.nationality}
                  className="w-4 h-3 rounded-xs object-cover border border-white/10 shrink-0 shadow-xs"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              </div>
              <p className="text-xs text-[#94A3B8] truncate">{playerATeam.name} • Dorsal {playerA.number && playerA.number > 0 ? `#${playerA.number}` : '-'} • {playerA.nationality}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] font-mono text-[#94A3B8]">
                {playerA.age && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-white">{playerA.age}a</span>}
                {playerA.height && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-white">{playerA.height}</span>}
                {playerA.preferredFoot && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-cyan-300 font-semibold">{playerA.preferredFoot}</span>}
                {playerA.marketValue && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-emerald-400 font-bold">{playerA.marketValue}</span>}
                {playerA.contractUntil && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-amber-300">Exp: {playerA.contractUntil}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                <span className="text-[#94A3B8]">{playerA.minutesPlayed}' jugados</span>
                {statA?.rating && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    ★ {statA.rating.toFixed(1)} Sofascore
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player B Card (Rose Theme) */}
        <div className="rounded-xl bg-gradient-to-b from-[#111827] to-[#0B0F19] border-2 border-rose-500/40 p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">Jugador B</span>
            </div>
            <select
              value={playerB.id}
              onChange={(e) => setPlayerBId(e.target.value)}
              className="bg-[#0A0D14] border border-[#334155] focus:border-rose-500 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <optgroup label={`${match.awayTeam.name} (Visitante)`}>
                {allAwayPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number && p.number > 0 ? `#${p.number}` : '(-)'} {sanitizePlayerName(p.name)} ({p.positionLabel})
                  </option>
                ))}
              </optgroup>
              <optgroup label={`${match.homeTeam.name} (Local)`}>
                {allHomePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number && p.number > 0 ? `#${p.number}` : '(-)'} {sanitizePlayerName(p.name)} ({p.positionLabel})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="relative w-16 h-16 rounded-xl bg-[#1E293B] border border-rose-500/40 overflow-hidden shrink-0 flex items-center justify-center">
              {playerB.avatarUrl ? (
                <img
                  src={playerB.avatarUrl}
                  alt={playerB.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xl font-bold text-rose-400 font-mono">{playerB.number && playerB.number > 0 ? `#${playerB.number}` : '-'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate">{sanitizePlayerName(playerB.name)}</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                  {playerB.positionLabel}
                </span>
                <img
                  src={getCountryFlagUrl(playerB.nationality, playerB.nationalityCode)}
                  alt={playerB.nationality}
                  className="w-4 h-3 rounded-xs object-cover border border-white/10 shrink-0 shadow-xs"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              </div>
              <p className="text-xs text-[#94A3B8] truncate">{playerBTeam.name} • Dorsal {playerB.number && playerB.number > 0 ? `#${playerB.number}` : '-'} • {playerB.nationality}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] font-mono text-[#94A3B8]">
                {playerB.age && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-white">{playerB.age}a</span>}
                {playerB.height && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-white">{playerB.height}</span>}
                {playerB.preferredFoot && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-cyan-300 font-semibold">{playerB.preferredFoot}</span>}
                {playerB.marketValue && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-emerald-400 font-bold">{playerB.marketValue}</span>}
                {playerB.contractUntil && <span className="bg-[#1E293B] px-1.5 py-0.5 rounded text-amber-300">Exp: {playerB.contractUntil}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                <span className="text-[#94A3B8]">{playerB.minutesPlayed}' jugados</span>
                {statB?.rating && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    ★ {statB.rating.toFixed(1)} Sofascore
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Content 1: Statistics Comparative Breakdown */}
      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attack Column */}
          <div className="bg-[#111827] rounded-xl p-5 border border-[#334155]/80 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/60 text-xs font-bold text-white uppercase font-mono">
              <Target className="w-4 h-4 text-rose-400" />
              <span>Ataque & Desequilibrio</span>
            </div>
            <div className="space-y-1">
              {renderStatComparisonRow('Goles', statA?.attack?.goals, statB?.attack?.goals)}
              {renderStatComparisonRow('Asistencias', statA?.attack?.assists, statB?.attack?.assists)}
              {renderStatComparisonRow('Tiros Totales', statA?.attack?.shots, statB?.attack?.shots)}
              {renderStatComparisonRow('Tiros al Arco', statA?.attack?.shotsOnTarget, statB?.attack?.shotsOnTarget)}
              {renderStatComparisonRow('Regates Completados', statA?.attack?.dribblesSucceeded, statB?.attack?.dribblesSucceeded)}
              {renderStatComparisonRow('Toques en Área Rival', statA?.attack?.touchesInOppBox, statB?.attack?.touchesInOppBox)}
              {renderStatComparisonRow('Grandes Ocasiones Creadas', statA?.attack?.bigChancesCreated, statB?.attack?.bigChancesCreated)}
            </div>
          </div>

          {/* Passing Column */}
          <div className="bg-[#111827] rounded-xl p-5 border border-[#334155]/80 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/60 text-xs font-bold text-white uppercase font-mono">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Distribución & Creación</span>
            </div>
            <div className="space-y-1">
              {renderStatComparisonRow('Toques Totales de Balón', statA?.touches ?? statA?.passing?.touches, statB?.touches ?? statB?.passing?.touches)}
              {renderStatComparisonRow('Efectividad de Pase', statA?.passing?.passingAccuracy, statB?.passing?.passingAccuracy, '%')}
              {renderStatComparisonRow('Pases Completados', statA?.passing?.passesCompleted, statB?.passing?.passesCompleted)}
              {renderStatComparisonRow('Pases Clave (Key Passes)', statA?.passing?.keyPasses, statB?.passing?.keyPasses)}
              {renderStatComparisonRow('Pases en Último Tercio', statA?.passing?.finalThirdPassesCompleted, statB?.passing?.finalThirdPassesCompleted)}
              {renderStatComparisonRow('Precisión Último Tercio', statA?.passing?.finalThirdPassesAccuracy, statB?.passing?.finalThirdPassesAccuracy, '%')}
              {renderStatComparisonRow('Centros Precisos', statA?.passing?.crossesAccurate, statB?.passing?.crossesAccurate)}
              {renderStatComparisonRow('Balones Largos Precisos', statA?.passing?.longBallsAccurate, statB?.passing?.longBallsAccurate)}
            </div>
          </div>

          {/* Defense & Duels Column */}
          <div className="bg-[#111827] rounded-xl p-5 border border-[#334155]/80 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/60 text-xs font-bold text-white uppercase font-mono">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Duelos & Recuperación</span>
            </div>
            <div className="space-y-1">
              {renderStatComparisonRow('Duelos Ganados', statA?.defense?.duelsWon, statB?.defense?.duelsWon)}
              {renderStatComparisonRow('Entradas (Tackles)', statA?.defense?.tackles, statB?.defense?.tackles)}
              {renderStatComparisonRow('Intercepciones', statA?.defense?.interceptions, statB?.defense?.interceptions)}
              {renderStatComparisonRow('Recuperaciones', statA?.defense?.recoveries, statB?.defense?.recoveries)}
              {renderStatComparisonRow('Despejes', statA?.defense?.clearances, statB?.defense?.clearances)}
              {renderStatComparisonRow('Faltas Cometidas', statA?.discipline?.foulsCommitted, statB?.discipline?.foulsCommitted, '', false)}
              {renderStatComparisonRow('Faltas Recibidas', statA?.discipline?.foulsDrawn, statB?.discipline?.foulsDrawn)}
            </div>
          </div>
        </div>
      )}

      {/* View Content 2: Side-by-Side Heatmaps */}
      {viewMode === 'heatmaps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player A Heatmap Card */}
          <div className="bg-[#111827] rounded-xl p-5 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-bold">{sanitizePlayerName(playerA.name)}</span>
              <span className="text-[#94A3B8]">{playerA.heatmapPoints?.length || 0} puntos térmicos</span>
            </div>
            <div className="relative w-full aspect-[1.5/1] rounded-xl bg-[#09111E] border border-[#1E293B] overflow-hidden">
              <svg className="absolute inset-0 w-full h-full stroke-[#38BDF8]/20" fill="none" viewBox="0 0 100 68" preserveAspectRatio="none">
                <rect x="2" y="2" width="96" height="64" />
                <line x1="50" y1="2" x2="50" y2="66" />
                <circle cx="50" cy="34" r="9" />
              </svg>
              {playerA.heatmapPoints?.map((pt, idx) => (
                <div
                  key={idx}
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    opacity: pt.intensity,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-400/70 blur-xs"
                />
              ))}
            </div>
          </div>

          {/* Player B Heatmap Card */}
          <div className="bg-[#111827] rounded-xl p-5 border border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-rose-400 font-bold">{sanitizePlayerName(playerB.name)}</span>
              <span className="text-[#94A3B8]">{playerB.heatmapPoints?.length || 0} puntos térmicos</span>
            </div>
            <div className="relative w-full aspect-[1.5/1] rounded-xl bg-[#09111E] border border-[#1E293B] overflow-hidden">
              <svg className="absolute inset-0 w-full h-full stroke-[#38BDF8]/20" fill="none" viewBox="0 0 100 68" preserveAspectRatio="none">
                <rect x="2" y="2" width="96" height="64" />
                <line x1="50" y1="2" x2="50" y2="66" />
                <circle cx="50" cy="34" r="9" />
              </svg>
              {playerB.heatmapPoints?.map((pt, idx) => (
                <div
                  key={idx}
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    opacity: pt.intensity,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500/70 blur-xs"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Content 3: Spatial Collision Map */}
      {viewMode === 'collision' && (
        <div className="bg-[#111827] rounded-xl p-6 border border-purple-500/30 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Mapa de Superposición y Colisión Espacial</span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Visualiza las zonas geográficas del campo donde ambos futbolistas coincidieron y disputaron la posesión.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                <span>{sanitizePlayerName(playerA.shortName || playerA.name)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                <span>{sanitizePlayerName(playerB.shortName || playerB.name)}</span>
              </span>
            </div>
          </div>

          <div className="relative w-full aspect-[1.6/1] max-w-3xl mx-auto rounded-xl bg-[#070D18] border-2 border-[#1E293B] overflow-hidden shadow-2xl">
            {/* Pitch Markings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#38BDF8]/20" fill="none" viewBox="0 0 100 68" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="64" rx="1" />
              <line x1="50" y1="2" x2="50" y2="66" />
              <circle cx="50" cy="34" r="9" />
              <rect x="2" y="18" width="16" height="32" />
              <rect x="82" y="18" width="16" height="32" />
            </svg>

            {/* Canvas for blended thermal rendering */}
            <canvas
              ref={canvasRef}
              width={600}
              height={380}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};
