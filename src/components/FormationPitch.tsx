import React, { useState } from 'react';
import { Player, MatchEvent } from '../types/scouting';
import { Shield, Sparkles, ArrowRightLeft, Flame, Eye, EyeOff } from 'lucide-react';
import { sanitizePlayerName } from '../utils/countryFlags';
import { PositionBadge } from './PositionBadge';

interface FormationPitchProps {
  starters: Player[];
  teamName: string;
  formation: string;
  onSelectPlayer: (player: Player) => void;
  selectedPlayerId?: string;
  events?: MatchEvent[];
}

export const FormationPitch: React.FC<FormationPitchProps> = ({
  starters,
  teamName,
  formation,
  onSelectPlayer,
  selectedPlayerId,
  events = [],
}) => {
  const [showIncidents, setShowIncidents] = useState<boolean>(true);

  // Group players by tactical lines according to authentic Sofascore row layout
  const rowsMap = new Map<number, Player[]>();

  starters.forEach((p) => {
    const row = p.formationPosition?.row ?? (p.position === 'GK' ? 0 : 1);
    if (!rowsMap.has(row)) {
      rowsMap.set(row, []);
    }
    rowsMap.get(row)!.push(p);
  });

  // Sort players in each row by column
  const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => b - a); // Descending: Attack (top) to GK (bottom)

  sortedRowKeys.forEach((key) => {
    rowsMap.get(key)!.sort((a, b) => {
      const colA = a.formationPosition?.col ?? 0;
      const colB = b.formationPosition?.col ?? 0;
      return colA - colB;
    });
  });

  // Find incidents related to this team
  const teamEvents = events.filter((e) => {
    return starters.some((p) => p.id === e.playerId || p.id === e.secondaryPlayerId || p.name.includes(e.playerName));
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#111827] px-4 py-3 rounded-lg border border-[#334155]/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Pizarra Táctica Oficial
          </h3>
          <span className="px-2.5 py-0.5 rounded bg-blue-500/15 text-cyan-300 border border-blue-500/30 font-mono text-xs font-bold">
            {formation}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Incident toggle button */}
          <button
            type="button"
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
              showIncidents
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-white'
            }`}
          >
            {showIncidents ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
            <span>Sustituciones & Goles ({teamEvents.length})</span>
          </button>

          <span className="text-[#94A3B8] hidden sm:inline">{teamName}</span>
        </div>
      </div>

      {/* High-Fidelity Tactical Pitch */}
      <div className="relative w-full aspect-[1/1.25] max-w-xl mx-auto rounded-2xl bg-[#09111E] border-2 border-[#1E293B] p-4 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xl select-none">
        {/* Pitch subtle pattern & gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/[0.04] via-transparent to-emerald-950/[0.06] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E293B_1px,transparent_1px),linear-gradient(to_bottom,#1E293B_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 pointer-events-none"></div>

        {/* Pitch Markings SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none stroke-[#38BDF8]/20"
          strokeWidth="1.25"
          fill="none"
          viewBox="0 0 100 130"
          preserveAspectRatio="none"
        >
          {/* Pitch Outer Boundary */}
          <rect x="3" y="3" width="94" height="124" rx="2" strokeWidth="1.5" />

          {/* Halfway Line */}
          <line x1="3" y1="65" x2="97" y2="65" strokeDasharray="none" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="65" r="12" />
          <circle cx="50" cy="65" r="0.8" fill="#38BDF8" fillOpacity="0.4" />

          {/* Top Penalty Box (Attacking) */}
          <rect x="20" y="3" width="60" height="24" />
          <rect x="33" y="3" width="34" height="10" />
          <circle cx="50" cy="18" r="0.8" fill="#38BDF8" fillOpacity="0.4" />
          <path d="M 36 27 A 10 10 0 0 0 64 27" />

          {/* Bottom Penalty Box (Defending) */}
          <rect x="20" y="103" width="60" height="24" />
          <rect x="33" y="117" width="34" height="10" />
          <circle cx="50" cy="112" r="0.8" fill="#38BDF8" fillOpacity="0.4" />
          <path d="M 36 103 A 10 10 0 0 1 64 103" />

          {/* Goals */}
          <rect x="42" y="0.8" width="16" height="2.2" stroke="#64748B" strokeWidth="1.5" />
          <rect x="42" y="127" width="16" height="2.2" stroke="#64748B" strokeWidth="1.5" />

          {/* Corner Arcs */}
          <path d="M 3 6 A 3 3 0 0 0 6 3" />
          <path d="M 94 3 A 3 3 0 0 0 97 6" />
          <path d="M 3 124 A 3 3 0 0 1 6 127" />
          <path d="M 94 127 A 3 3 0 0 1 97 124" />
        </svg>

        {/* Dynamic Lines: Rendered from Top (Attack) to Bottom (GK) */}
        {sortedRowKeys.map((rowKey) => {
          const playersInLine = rowsMap.get(rowKey) || [];
          const isGKLine = rowKey === 0;

          return (
            <div
              key={rowKey}
              className={`relative z-10 flex items-center justify-around w-full py-1 ${
                isGKLine ? 'justify-center' : ''
              }`}
            >
              {playersInLine.map((p) => {
                // Robust event matching for this player
                const normalizeStr = (str: string) =>
                  (str || '')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9 ]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const pNorm = normalizeStr(p.name);
                const pShortNorm = normalizeStr(p.shortName || '');
                const pTokens = pNorm.split(' ').filter((t) => t.length >= 2);
                const pFirst = pTokens[0];
                const pLast = pTokens[pTokens.length - 1];

                const isEventForPlayer = (targetName?: string, targetId?: string) => {
                  if (targetId && (targetId === p.id || p.id === `sofa-${targetId}` || p.id.endsWith(`-${targetId}`))) {
                    return true;
                  }
                  if (!targetName) return false;
                  const tNorm = normalizeStr(targetName);
                  if (!tNorm) return false;
                  if (pNorm === tNorm || pShortNorm === tNorm) return true;

                  const tTokens = tNorm.split(' ').filter((t) => t.length >= 2);
                  if (tTokens.length >= 2 && pTokens.length >= 2) {
                    if (tTokens[0] === pFirst && tTokens[tTokens.length - 1] === pLast) return true;
                  }
                  if (tTokens.length === 1 && pTokens.length >= 1) {
                    if (tTokens[0] === pLast && tTokens[0].length >= 4) return true;
                  }

                  return false;
                };

                const playerEvents = showIncidents
                  ? events.filter((e) => {
                      if (isEventForPlayer(e.playerName, e.playerId)) return true;
                      if (isEventForPlayer(e.secondaryPlayerName, e.secondaryPlayerId)) return true;
                      if (isEventForPlayer(e.playerInName, e.playerInId)) return true;
                      if (isEventForPlayer(e.playerOutName, e.playerOutId)) return true;
                      return false;
                    })
                  : [];

                const goals = playerEvents.filter(
                  (e) => e.type === 'goal' && e.subType !== 'own_goal' && 
                         isEventForPlayer(e.playerName, e.playerId)
                );

                const yellowCards = playerEvents.filter(
                  (e) => e.type === 'yellow_card' && isEventForPlayer(e.playerName, e.playerId)
                );

                const redCards = playerEvents.filter(
                  (e) => (e.type === 'red_card' || e.type === 'yellow_red_card' || e.subType === 'second_yellow' || e.subType === 'direct_red') && 
                         isEventForPlayer(e.playerName, e.playerId)
                );

                const subOut = playerEvents.find(
                  (e) => e.type === 'substitution' && (
                    isEventForPlayer(e.playerOutName, e.playerOutId) ||
                    isEventForPlayer(e.secondaryPlayerName, e.secondaryPlayerId)
                  )
                );

                const hasStatsRed = (p.statistics?.discipline?.redCards && p.statistics.discipline.redCards > 0) || false;
                const hasStatsYellow = (p.statistics?.discipline?.yellowCards && p.statistics.discipline.yellowCards > 0) || false;

                return (
                  <PlayerNode
                    key={p.id}
                    player={p}
                    isSelected={selectedPlayerId === p.id}
                    onClick={() => onSelectPlayer(p)}
                    goals={goals}
                    yellowCards={yellowCards}
                    redCards={redCards}
                    subOut={subOut}
                    hasStatsRed={hasStatsRed}
                    hasStatsYellow={hasStatsYellow}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlayerNode: React.FC<{
  player: Player;
  isSelected: boolean;
  onClick: () => void;
  goals?: MatchEvent[];
  yellowCards?: MatchEvent[];
  redCards?: MatchEvent[];
  subOut?: MatchEvent;
  hasStatsRed?: boolean;
  hasStatsYellow?: boolean;
}> = ({ player, isSelected, onClick, goals = [], yellowCards = [], redCards = [], subOut, hasStatsRed = false, hasStatsYellow = false }) => {
  const rating = player.statistics?.rating;
  const isExpelled = redCards.length > 0 || hasStatsRed;
  const isYellowBooked = yellowCards.length > 0 || hasStatsYellow;

  // Authentic Sofascore Rating Badge Colors
  const getRatingBadgeStyle = (r?: number) => {
    if (r === undefined) return null;
    if (r >= 7.5) return 'bg-emerald-500 text-black font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.7)]';
    if (r >= 7.0) return 'bg-emerald-600 text-white font-bold';
    if (r >= 6.5) return 'bg-blue-500 text-white font-bold';
    if (r >= 6.0) return 'bg-amber-500 text-black font-bold';
    return 'bg-rose-500 text-white font-bold';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center focus:outline-none transition-all duration-150 cursor-pointer ${
        isSelected ? 'scale-115 z-30' : 'hover:scale-108 z-20'
      }`}
    >
      {/* Node Circle */}
      <div className="relative">
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-xl transition-all ${
            isSelected
              ? 'bg-blue-600 text-white ring-4 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
              : subOut
              ? 'bg-[#121B2C] text-[#CBD5E1] border border-rose-500/50 group-hover:border-rose-400'
              : 'bg-[#152136] text-white border border-[#334155] group-hover:border-cyan-400 group-hover:bg-[#1E2E4A]'
          }`}
        >
          <span>{player.number && player.number > 0 ? player.number : '-'}</span>
        </div>

        {/* Substitution Out Badge */}
        {subOut && (
          <div 
            title={`Sustituido en el min ${subOut.minute}'`}
            className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded bg-rose-600 text-white flex items-center gap-0.5 text-[8px] font-mono font-black shadow-md border border-[#0A0D14] animate-bounce"
          >
            <span>🔄</span>
            <span>{subOut.minute}'</span>
          </div>
        )}

        {/* Goal Badge */}
        {goals.length > 0 && (
          <div 
            title={`${goals.length} gol(es) anotado(s)`}
            className="absolute -top-1.5 -left-2 px-1 py-0.2 rounded bg-emerald-500 text-black flex items-center gap-0.5 text-[8px] font-mono font-black shadow-md border border-[#0A0D14]"
          >
            <span>⚽</span>
            {goals.length > 1 && <span>{goals.length}</span>}
          </div>
        )}

        {/* Yellow/Red Cards Badge */}
        {isExpelled ? (
          <div 
            title={
              redCards.length > 0 && (redCards[0].type === 'yellow_red_card' || redCards[0].subType === 'second_yellow')
                ? `Segunda tarjeta amarilla / Expulsión (${redCards[0].minute}')`
                : redCards.length > 0 
                ? `Tarjeta roja directa (${redCards[0].minute}')`
                : `Tarjeta roja / Expulsado`
            }
            className="absolute -bottom-1 -left-1 flex items-center shadow-md z-20"
          >
            {redCards.length > 0 && (redCards[0].type === 'yellow_red_card' || redCards[0].subType === 'second_yellow') ? (
              <div className="flex items-center -space-x-1.5">
                <div className="w-2.5 h-3.5 bg-[#FACC15] rounded-xs border border-black/50 shadow-sm" />
                <div className="w-2.5 h-3.5 bg-[#EF4444] rounded-xs border border-white/60 shadow-sm" />
              </div>
            ) : (
              <div className="w-3.5 h-4.5 bg-[#EF4444] rounded-xs border border-white/60 shadow-md" />
            )}
          </div>
        ) : isYellowBooked ? (
          <div 
            title={yellowCards.length > 0 ? `Tarjeta amarilla (${yellowCards[0].minute}')` : `Tarjeta amarilla`}
            className="absolute -bottom-1 -left-1 w-3 h-4 bg-[#FACC15] rounded-xs border border-black/40 shadow-sm z-20"
          />
        ) : null}

        {/* Captain Badge */}
        {player.captain && (
          <div className="absolute top-3 -left-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[8px] font-mono font-black shadow-sm border border-[#0A0D14]">
            C
          </div>
        )}

        {/* Sofascore Rating Tag */}
        {rating !== undefined && (
          <div
            className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-mono leading-none border border-[#0A0D14] shadow-sm ${getRatingBadgeStyle(
              rating
            )}`}
          >
            {rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Position and Name Tag */}
      <div className="mt-1 flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1">
          <PositionBadge position={player.position} positionLabel={player.positionLabel} size="xs" />
        </div>
        <div
          className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium max-w-[75px] sm:max-w-[95px] truncate text-center shadow-md transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white font-semibold'
              : 'bg-[#0A0D14]/90 text-gray-200 border border-[#334155]/60 group-hover:text-white group-hover:border-cyan-400/60'
          }`}
        >
          {sanitizePlayerName(player.shortName || player.name)}
        </div>
      </div>
    </button>
  );
};

