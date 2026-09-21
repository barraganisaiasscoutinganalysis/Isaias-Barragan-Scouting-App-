import React, { useState } from 'react';
import { X, Shield, Star, Award, UserCheck, Loader2, FileDown, Image } from 'lucide-react';
import { MatchEvent, Player, ScoutEvaluation, ScoutRatingLevel } from '../types/scouting';
import { PlayerStats } from './PlayerStats';
import { PlayerHeatmap } from './PlayerHeatmap';
import { PlayerRating } from './PlayerRating';
import { PlayerObservation } from './PlayerObservation';
import { getCountryFlagUrl, sanitizePlayerName } from '../utils/countryFlags';
import { exportElementToPNG, exportElementToPDF } from '../utils/exportUtils';
import { PositionBadge } from './PositionBadge';

interface PlayerDetailPanelProps {
  player: Player | null;
  evaluation?: ScoutEvaluation;
  onClose: () => void;
  onSaveObservation: (comment: string) => void;
  onSaveRating: (rating: number | undefined, level: ScoutRatingLevel | undefined) => void;
  matchId?: string;
  events?: MatchEvent[];
  onQuickAction?: (eventType: 'goals' | 'assists' | 'yellowCards' | 'redCards', delta: number) => void;
}

export const PlayerDetailPanel: React.FC<PlayerDetailPanelProps> = ({
  player,
  evaluation,
  onClose,
  onSaveObservation,
  onSaveRating,
  matchId,
  events = [],
  onQuickAction,
}) => {
  if (!player) return null;

  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPNG = async () => {
    const el = document.getElementById(`player-report-card-${player.id}`);
    if (!el) return;
    setIsExportingPng(true);
    try {
      const name = player.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      await exportElementToPNG(el, `reporte_scouting_${name}.png`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleExportPDF = async () => {
    const el = document.getElementById(`player-report-card-${player.id}`);
    if (!el) return;
    setIsExportingPdf(true);
    try {
      const name = player.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      await exportElementToPDF(el, `reporte_scouting_${name}.pdf`, { mode: 'continuous' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const normalizeStr = (str: string) =>
    (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
  const pNorm = normalizeStr(player.name);

  const isEvForPlayer = (targetName?: string, targetId?: string) => {
    if (targetId && (targetId === player.id || player.id === `sofa-${targetId}` || player.id.endsWith(`-${targetId}`))) {
      return true;
    }
    if (!targetName) return false;
    return normalizeStr(targetName) === pNorm;
  };

  const evGoals = events.filter((e) => e.type === 'goal' && e.subType !== 'own_goal' && isEvForPlayer(e.playerName, e.playerId)).length;
  const evAssists = events.filter((e) => e.type === 'goal' && isEvForPlayer(e.secondaryPlayerName, e.secondaryPlayerId)).length;
  const evYellows = events.filter((e) => e.type === 'yellow_card' && isEvForPlayer(e.playerName, e.playerId)).length;
  const evReds = events.filter((e) => (e.type === 'red_card' || e.type === 'yellow_red_card' || e.subType === 'second_yellow' || e.subType === 'direct_red') && isEvForPlayer(e.playerName, e.playerId)).length;

  const goalsCount = Math.max(player.statistics?.attack?.goals || 0, evGoals);
  const assistsCount = Math.max(player.statistics?.attack?.assists || 0, evAssists);
  const yellowCount = Math.max(player.statistics?.discipline?.yellowCards || 0, evYellows);
  const redCount = Math.max(player.statistics?.discipline?.redCards || 0, evReds);

  const isExpelled =
    (player.statistics?.discipline?.redCards && player.statistics.discipline.redCards > 0) ||
    events.some(
      (e) =>
        (e.type === 'red_card' || e.type === 'yellow_red_card' || e.subType === 'second_yellow') &&
        (e.playerId === player.id || (e.playerName && player.name.toLowerCase().includes(e.playerName.toLowerCase())))
    );

  const isYellowBooked =
    (player.statistics?.discipline?.yellowCards && player.statistics.discipline.yellowCards > 0) ||
    events.some(
      (e) =>
        e.type === 'yellow_card' &&
        (e.playerId === player.id || (e.playerName && player.name.toLowerCase().includes(e.playerName.toLowerCase())))
    );

  return (
    <aside 
      id={`player-report-card-${player.id}`}
      className="w-full md:w-[480px] fixed inset-0 md:static shrink-0 bg-[#111827] border-l border-[#334155] h-full flex flex-col shadow-2xl z-50 animate-in slide-in-from-right duration-200"
    >
      {/* Top Utility Bar (Actions & Context) - Ignored in the export */}
      <div 
        data-html2canvas-ignore="true" 
        className="px-5 py-2.5 flex items-center justify-between bg-[#0B0F19] border-b border-[#334155]/50 shrink-0 text-[10px] font-mono tracking-wider text-[#64748B] uppercase"
      >
        <span>Ficha de Scouting</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportPNG}
            disabled={isExportingPng || isExportingPdf}
            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-[#1E293B] rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            title="Exportar Ficha como PNG"
          >
            {isExportingPng ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Image className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPng || isExportingPdf}
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-[#1E293B] rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            title="Exportar Ficha como PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
          </button>

          <div className="w-px h-3 bg-[#334155] mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg transition-all cursor-pointer"
            title="Cerrar panel"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Main Identity Header */}
      <div className={`p-5 border-b border-[#334155] flex items-center gap-4 shrink-0 ${isExpelled ? 'bg-rose-950/30' : 'bg-[#0A0D14]/40'}`}>
        <div className="relative shrink-0">
          <img
            src={player.avatarUrl || `/api/sofascore/image/player/${player.id}`}
            alt={player.name}
            referrerPolicy="no-referrer"
            className={`w-14 h-14 rounded-full object-cover border-2 ${
              isExpelled ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-blue-500/30'
            } bg-[#1E293B]`}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/api/sofascore/image/player/')) {
                target.src = `/api/sofascore/image/player/${player.id}`;
              }
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[10px] font-mono font-bold text-white">
            {player.number && player.number > 0 ? player.number : '-'}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-lg font-extrabold tracking-tight ${isExpelled ? 'text-rose-100' : 'text-white'}`}>
              {sanitizePlayerName(player.name)}
            </h3>
            {player.captain && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                C
              </span>
            )}
            {isExpelled && (
              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-600 text-white shadow-sm flex items-center gap-0.5 shrink-0">
                <span>🟥</span>
                <span>EXP</span>
              </span>
            )}
            {isYellowBooked && !isExpelled && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 shrink-0">
                <span>🟨</span>
                <span>AMON</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#94A3B8]">
            <PositionBadge position={player.position} positionLabel={player.positionLabel} showFullName size="sm" />
            <div className="flex items-center gap-1 shrink-0">
              <img
                src={getCountryFlagUrl(player.nationality, player.nationalityCode)}
                alt={player.nationality}
                className="w-3.5 h-2.5 rounded-xs object-cover shrink-0 border border-white/10 shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span>{player.nationality}</span>
            </div>
            <span className="text-[#334155] shrink-0">•</span>
            <span className="font-mono text-[#E5E7EB] shrink-0">
              {player.isStarter ? 'Titular' : 'Suplente'} ({player.minutesPlayed}')
            </span>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Ficha / Datos de Perfil (Edad, Altura, Pierna, Precio, Contrato) */}
        <section className="p-3.5 rounded-lg bg-[#0F172A] border border-[#334155]/80 grid grid-cols-6 gap-2 text-xs font-mono">
          <div className="bg-[#1E293B]/70 p-2 rounded border border-[#334155]/50 col-span-2">
            <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">EDAD</span>
            <span className="text-white font-bold">{player.age ? `${player.age}a` : '--'}</span>
          </div>
          <div className="bg-[#1E293B]/70 p-2 rounded border border-[#334155]/50 col-span-2">
            <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">ALTURA</span>
            <span className="text-white font-bold">{player.height || '--'}</span>
          </div>
          <div className="bg-[#1E293B]/70 p-2 rounded border border-[#334155]/50 col-span-2">
            <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">PIERNA</span>
            <span className="text-cyan-300 font-bold">{player.preferredFoot || '--'}</span>
          </div>
          <div className="bg-[#1E293B]/70 p-2 rounded border border-[#334155]/50 col-span-3">
            <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold font-mono">VALOR MERCADO</span>
            <span className="text-emerald-400 font-bold truncate block">{player.marketValue || 'Sin datos'}</span>
          </div>
          <div className="bg-[#1E293B]/70 p-2 rounded border border-[#334155]/50 col-span-3">
            <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold font-mono">FIN CONTRATO</span>
            <span className="text-amber-300 font-bold truncate block">{player.contractUntil || '--'}</span>
          </div>
        </section>

        {/* Acciones en este Partido (Goles, Asistencias, Amarillas, Rojas) */}
        {onQuickAction && (
          <section className="p-4 rounded-lg bg-[#0F172A] border border-[#334155]/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <span>⚡ Acciones en este Partido</span>
              </h4>
              <span className="text-[10px] font-mono text-[#64748B]">Suma o resta incidencias</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              {/* Goles */}
              <div className="bg-[#1E293B]/70 p-2.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">⚽</span>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">GOLES</span>
                    <span className="text-sm font-bold text-emerald-400">{goalsCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onQuickAction('goals', -1)}
                    disabled={goalsCount === 0}
                    className="w-6 h-6 rounded bg-[#0F172A] border border-[#334155] hover:border-rose-500/50 text-[#94A3B8] hover:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer transition-all"
                    title="Restar gol"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAction('goals', 1)}
                    className="w-6 h-6 rounded bg-emerald-600/30 border border-emerald-500/50 hover:bg-emerald-600 text-emerald-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    title="Sumar gol"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Asistencias */}
              <div className="bg-[#1E293B]/70 p-2.5 rounded-lg border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🎯</span>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">ASISTENCIAS</span>
                    <span className="text-sm font-bold text-blue-400">{assistsCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onQuickAction('assists', -1)}
                    disabled={assistsCount === 0}
                    className="w-6 h-6 rounded bg-[#0F172A] border border-[#334155] hover:border-rose-500/50 text-[#94A3B8] hover:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer transition-all"
                    title="Restar asistencia"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAction('assists', 1)}
                    className="w-6 h-6 rounded bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600 text-blue-300 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    title="Sumar asistencia"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tarjetas Amarillas */}
              <div className="bg-[#1E293B]/70 p-2.5 rounded-lg border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🟨</span>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">AMARILLAS</span>
                    <span className="text-sm font-bold text-amber-300">{yellowCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onQuickAction('yellowCards', -1)}
                    disabled={yellowCount === 0}
                    className="w-6 h-6 rounded bg-[#0F172A] border border-[#334155] hover:border-rose-500/50 text-[#94A3B8] hover:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer transition-all"
                    title="Restar tarjeta amarilla"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAction('yellowCards', 1)}
                    className="w-6 h-6 rounded bg-amber-500/30 border border-amber-500/50 hover:bg-amber-600 text-amber-200 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    title="Sumar tarjeta amarilla"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tarjetas Rojas */}
              <div className="bg-[#1E293B]/70 p-2.5 rounded-lg border border-rose-500/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🟥</span>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">ROJAS</span>
                    <span className="text-sm font-bold text-rose-400">{redCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onQuickAction('redCards', -1)}
                    disabled={redCount === 0}
                    className="w-6 h-6 rounded bg-[#0F172A] border border-[#334155] hover:border-rose-500/50 text-[#94A3B8] hover:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer transition-all"
                    title="Restar tarjeta roja"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAction('redCards', 1)}
                    className="w-6 h-6 rounded bg-rose-600/30 border border-rose-500/50 hover:bg-rose-600 text-rose-200 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    title="Sumar tarjeta roja"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Rating Section */}
        <section className="p-4 rounded-lg bg-[#0F172A] border border-[#334155]/80">
          <PlayerRating
            currentRating={evaluation?.rating}
            currentRatingLevel={evaluation?.ratingLevel}
            onChange={onSaveRating}
          />
        </section>

        {/* Heatmap Section */}
        <section>
          <PlayerHeatmap
            heatmapPoints={player.heatmapPoints}
            actionPoints={player.actionPoints}
            playerName={player.name}
            position={player.position}
            player={player}
            matchId={matchId}
          />
        </section>

        {/* Observation Section */}
        <section>
          <PlayerObservation
            initialComment={evaluation?.comment || ''}
            lastUpdated={evaluation?.updatedAt}
            onSave={onSaveObservation}
          />
        </section>

        {/* Detailed Stats Section */}
        <section>
          <PlayerStats player={player} />
        </section>
      </div>
    </aside>
  );
};
