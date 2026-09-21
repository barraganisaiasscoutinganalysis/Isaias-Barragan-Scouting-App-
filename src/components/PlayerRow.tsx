import React from 'react';
import { MatchEvent, Player, ScoutEvaluation } from '../types/scouting';
import { ChevronRight, MessageSquare, Star } from 'lucide-react';
import { getCountryFlagUrl, sanitizePlayerName } from '../utils/countryFlags';
import { PositionBadge } from './PositionBadge';

interface PlayerRowProps {
  player: Player;
  evaluation?: ScoutEvaluation;
  isSelected: boolean;
  onSelect: () => void;
  events?: MatchEvent[];
  onQuickAction?: (eventType: 'goals' | 'assists' | 'yellowCards' | 'redCards', delta: number) => void;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  evaluation,
  isSelected,
  onSelect,
  events = [],
  onQuickAction,
}) => {
  const stats = player.statistics;
  const rating = stats?.rating;

  // Normalized matching for events (team & player accurate)
  const normalizeStr = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const pNorm = normalizeStr(player.name);
  const pShortNorm = normalizeStr(player.shortName || '');
  const pTokens = pNorm.split(' ').filter((t) => t.length >= 2);
  const pFirst = pTokens[0];
  const pLast = pTokens[pTokens.length - 1];

  const isEventForPlayer = (targetName?: string, targetId?: string) => {
    if (targetId && (targetId === player.id || player.id === `sofa-${targetId}` || player.id.endsWith(`-${targetId}`))) {
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

  const formatEventMinute = (ev: MatchEvent) => {
    if (ev.extraMinute !== undefined && ev.extraMinute > 0 && ev.extraMinute <= 30) {
      return `${ev.minute}'+${ev.extraMinute}'`;
    }
    return `${ev.minute}'`;
  };

  const goalEvents = events.filter(
    (e) => e.type === 'goal' && e.subType !== 'own_goal' && isEventForPlayer(e.playerName, e.playerId)
  );

  const ownGoalEvents = events.filter(
    (e) => (e.type === 'own_goal' || e.subType === 'own_goal') && isEventForPlayer(e.playerName, e.playerId)
  );

  const assistEvents = events.filter(
    (e) =>
      e.type === 'goal' &&
      e.subType !== 'own_goal' &&
      isEventForPlayer(e.secondaryPlayerName, e.secondaryPlayerId)
  );

  const redCardEvents = events.filter(
    (e) =>
      (e.type === 'red_card' || e.type === 'yellow_red_card' || e.subType === 'second_yellow' || e.subType === 'direct_red') &&
      isEventForPlayer(e.playerName, e.playerId)
  );

  const yellowCardEvents = events.filter(
    (e) => e.type === 'yellow_card' && isEventForPlayer(e.playerName, e.playerId)
  );

  const subOutEvent = events.find(
    (e) =>
      e.type === 'substitution' &&
      (isEventForPlayer(e.playerOutName, e.playerOutId) || isEventForPlayer(e.secondaryPlayerName, e.secondaryPlayerId))
  );

  const subInEvent = events.find(
    (e) =>
      e.type === 'substitution' &&
      (isEventForPlayer(e.playerInName, e.playerInId) || isEventForPlayer(e.playerName, e.playerId))
  );

  const isExpelled = redCardEvents.length > 0 || (stats?.discipline?.redCards && stats.discipline.redCards > 0);
  const isSecondYellow =
    redCardEvents.some((e) => e.type === 'yellow_red_card' || e.subType === 'second_yellow') ||
    (yellowCardEvents.length >= 2);
  const isYellowBooked = yellowCardEvents.length > 0 || (stats?.discipline?.yellowCards && stats.discipline.yellowCards > 0);

  // Key actions summary (synchronized goals, assists, saves, tackles, discipline with exact event minutes)
  const renderActions = () => {
    if (!stats && player.minutesPlayed === 0 && !isExpelled && goalEvents.length === 0 && assistEvents.length === 0) {
      return <span className="text-[#64748B]">--</span>;
    }
    const badges: React.ReactNode[] = [];

    // 1. Goals (with exact minute synchronized)
    goalEvents.forEach((gEv, idx) => {
      const minStr = formatEventMinute(gEv);
      badges.push(
        <span
          key={`goal-${idx}`}
          className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm"
          title={gEv.subType === 'penalty' ? `Gol de penal (min ${minStr})` : `Gol (min ${minStr})`}
        >
          <span>⚽</span>
          <span>{gEv.subType === 'penalty' ? `(P) ${minStr}` : minStr}</span>
        </span>
      );
    });
    if (goalEvents.length === 0 && stats?.attack?.goals && stats.attack.goals > 0) {
      badges.push(
        <span
          key="goal-stat"
          className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm"
        >
          <span>⚽</span>
          <span>{stats.attack.goals}G</span>
        </span>
      );
    }

    // 2. Own Goals (with exact minute)
    ownGoalEvents.forEach((ogEv, idx) => {
      const minStr = formatEventMinute(ogEv);
      badges.push(
        <span
          key={`owngoal-${idx}`}
          className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm"
          title={`Autogol (min ${minStr})`}
        >
          <span>🥅</span>
          <span>Autogol {minStr}</span>
        </span>
      );
    });

    // 3. Assists (with exact minute synchronized)
    assistEvents.forEach((aEv, idx) => {
      const minStr = formatEventMinute(aEv);
      badges.push(
        <span
          key={`assist-${idx}`}
          className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/40 text-[10px] font-mono font-medium flex items-center gap-1 shadow-sm"
          title={`Asistencia de gol (min ${minStr})`}
        >
          <span>🎯</span>
          <span>Asist {minStr}</span>
        </span>
      );
    });
    if (assistEvents.length === 0 && stats?.attack?.assists && stats.attack.assists > 0) {
      badges.push(
        <span
          key="assist-stat"
          className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/40 text-[10px] font-mono font-medium flex items-center gap-1 shadow-sm"
        >
          <span>🎯</span>
          <span>{stats.attack.assists}A</span>
        </span>
      );
    }

    // 4. Discipline (Cards with exact minute)
    if (isExpelled) {
      const redMin = redCardEvents[0] ? formatEventMinute(redCardEvents[0]) : '';
      badges.push(
        <span
          key="expelled"
          className="px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/60 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm"
        >
          <span>{isSecondYellow ? '🟨🟥' : '🟥'}</span>
          <span>{isSecondYellow ? '2ª Amarilla' : 'Roja Directa'}</span>
          {redMin && <span>({redMin})</span>}
        </span>
      );
    } else if (isYellowBooked) {
      const yellowMin = yellowCardEvents[0] ? formatEventMinute(yellowCardEvents[0]) : '';
      badges.push(
        <span
          key="yellow"
          className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1"
        >
          <span>🟨</span>
          <span>Amarilla</span>
          {yellowMin && <span>({yellowMin})</span>}
        </span>
      );
    }

    // 5. Goalkeeper & Defense
    if (player.position === 'GK' && stats?.goalkeeper) {
      if (stats.goalkeeper.saves && stats.goalkeeper.saves > 0) {
        badges.push(
          <span key="saves" className="px-1.5 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-medium">
            🧤 {stats.goalkeeper.saves} atajadas
          </span>
        );
      }
    } else if (stats) {
      if (stats.passing?.keyPasses && stats.passing.keyPasses >= 2) {
        badges.push(
          <span key="keypasses" className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-medium">
            {stats.passing.keyPasses} key pass
          </span>
        );
      }
      if (stats.defense?.tackles && stats.defense.tackles >= 3) {
        badges.push(
          <span key="tackles" className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono font-medium">
            🛡️ {stats.defense.tackles} entr
          </span>
        );
      }
    }

    if (badges.length === 0 && !onQuickAction) {
      return <span className="text-[#64748B] font-mono text-[11px]">Normal</span>;
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {badges.length > 0 ? (
          badges
        ) : (
          <span className="text-[#64748B] font-mono text-[11px]">Normal</span>
        )}

        {onQuickAction && (
          <div
            className="inline-flex items-center gap-1 ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onQuickAction('goals', 1)}
              className="px-1.5 py-0.5 rounded bg-[#0F172A] hover:bg-emerald-600 border border-emerald-500/40 text-[10px] text-emerald-300 hover:text-white cursor-pointer transition-colors active:scale-95"
              title="Sumar gol (+1)"
            >
              +⚽
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('assists', 1)}
              className="px-1.5 py-0.5 rounded bg-[#0F172A] hover:bg-blue-600 border border-blue-500/40 text-[10px] text-blue-300 hover:text-white cursor-pointer transition-colors active:scale-95"
              title="Sumar asistencia (+1)"
            >
              +🎯
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('yellowCards', 1)}
              className="px-1.5 py-0.5 rounded bg-[#0F172A] hover:bg-amber-600 border border-amber-500/40 text-[10px] text-amber-300 hover:text-white cursor-pointer transition-colors active:scale-95"
              title="Sumar tarjeta amarilla (+1)"
            >
              +🟨
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('redCards', 1)}
              className="px-1.5 py-0.5 rounded bg-[#0F172A] hover:bg-rose-600 border border-rose-500/40 text-[10px] text-rose-300 hover:text-white cursor-pointer transition-colors active:scale-95"
              title="Sumar tarjeta roja (+1)"
            >
              +🟥
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <tr
      onClick={onSelect}
      className={`group cursor-pointer transition-all border-b border-[#334155]/40 h-11 text-xs select-none ${
        isSelected
          ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
          : isExpelled
          ? 'bg-rose-950/20 hover:bg-rose-950/30'
          : 'hover:bg-[#1E293B]/60'
      }`}
    >
      {/* Number */}
      <td className="w-10 px-3 text-center font-mono text-[#94A3B8] font-bold">
        {player.number && player.number > 0 ? player.number : '-'}
      </td>

      {/* Player Name & Avatar with Card Badges */}
      <td className="px-3 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative shrink-0">
            <img
              src={player.avatarUrl || `/api/sofascore/image/player/${player.id}`}
              alt={player.name}
              referrerPolicy="no-referrer"
              className={`w-6 h-6 rounded-full object-cover bg-[#0F172A] border shrink-0 ${
                isExpelled ? 'border-rose-500 ring-1 ring-rose-500/60' : 'border-[#334155]'
              }`}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('/api/sofascore/image/player/')) {
                  target.src = `/api/sofascore/image/player/${player.id}`;
                }
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-semibold truncate block ${
                isExpelled ? 'text-rose-200 group-hover:text-white' : 'text-[#E5E7EB] group-hover:text-white'
              }`}
            >
              {sanitizePlayerName(player.name)}
            </span>

            {/* Captain Badge */}
            {player.captain && (
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-amber-500/20 text-amber-300">
                C
              </span>
            )}

            {/* Red Card / Expulsion Badge */}
            {isExpelled && (
              <span
                title={
                  isSecondYellow
                    ? `Segunda Amarilla / Expulsión${redCardEvents[0]?.minute ? ` (min ${redCardEvents[0].minute}')` : ''}`
                    : `Tarjeta Roja Directa${redCardEvents[0]?.minute ? ` (min ${redCardEvents[0].minute}')` : ''}`
                }
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-900/90 text-white border border-rose-500 font-mono text-[9px] font-black shadow-md shrink-0"
              >
                <span>{isSecondYellow ? '🟨🟥' : '🟥'}</span>
                <span>{redCardEvents[0]?.minute ? `${redCardEvents[0].minute}'` : 'ROJA'}</span>
              </span>
            )}

            {/* Yellow Card Badge */}
            {isYellowBooked && !isExpelled && (
              <span
                title={`Tarjeta Amarilla${yellowCardEvents[0]?.minute ? ` (min ${yellowCardEvents[0].minute}')` : ''}`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/50 font-mono text-[9px] font-bold shrink-0"
              >
                <span>🟨</span>
                {yellowCardEvents[0]?.minute && <span>{yellowCardEvents[0].minute}'</span>}
              </span>
            )}

            {/* Sub Out Badge */}
            {subOutEvent && (
              <span
                title={`Sustituido en el min ${subOutEvent.minute}'`}
                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#1E293B] text-rose-300 border border-rose-500/40 font-mono text-[9px] shrink-0"
              >
                <span>▼ {subOutEvent.minute}'</span>
              </span>
            )}

            {/* Sub In Badge (for substitutes) */}
            {subInEvent && !player.isStarter && (
              <span
                title={`Ingresó en el min ${subInEvent.minute}'`}
                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#1E293B] text-emerald-300 border border-emerald-500/40 font-mono text-[9px] shrink-0"
              >
                <span>▲ {subInEvent.minute}'</span>
              </span>
            )}
          </div>

          {/* Scout Observation Note Snippet (Visible on all devices including mobile) */}
          {evaluation?.comment && (
            <div 
              className="w-full flex items-center gap-1.5 text-[11px] text-amber-300/90 font-normal truncate mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 max-w-[280px] sm:max-w-md"
              title={`Nota de scouting: ${evaluation.comment}`}
            >
              <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate italic">"{evaluation.comment}"</span>
            </div>
          )}
        </div>
      </td>

      {/* Position */}
      <td className="px-3 w-16">
        <PositionBadge position={player.position} positionLabel={player.positionLabel} size="xs" />
      </td>

      {/* Nationality */}
      <td className="px-3 text-[#94A3B8] truncate max-w-[130px] hidden lg:table-cell">
        <div className="flex items-center gap-1.5 truncate">
          <img
            src={getCountryFlagUrl(player.nationality, player.nationalityCode)}
            alt={player.nationality}
            className="w-4 h-3 rounded-xs object-cover shrink-0 border border-white/10 shadow-xs"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="truncate">{player.nationality}</span>
        </div>
      </td>

      {/* Minutes */}
      <td className="px-3 font-mono text-center text-[#94A3B8] hidden sm:table-cell">
        {player.minutesPlayed}'
      </td>

      {/* Actions / Discipline */}
      <td className="px-2.5">
        {renderActions()}
      </td>

      {/* Sofascore Rating */}
      <td className="px-3 text-center font-mono">
        {rating ? (
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
              rating >= 8.0
                ? 'bg-emerald-500/15 text-[#10B981] border border-emerald-500/30'
                : rating >= 7.0
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}
          >
            {rating.toFixed(1)}
          </span>
        ) : (
          <span className="text-[#64748B]">--</span>
        )}
      </td>

      {/* Scout Evaluation & Rating (Visible on md and above) */}
      <td className="px-3 hidden md:table-cell">
        {evaluation ? (
          <div className="flex items-center gap-2">
            {evaluation.ratingLevel && (
              <span
                className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-extrabold uppercase tracking-wide ${
                  evaluation.ratingLevel === 'HIGH'
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                    : evaluation.ratingLevel === 'MEDIUM'
                    ? 'bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40'
                    : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                }`}
              >
                {evaluation.ratingLevel}
              </span>
            )}
            {evaluation.comment && (
              <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] truncate max-w-[160px]">
                <MessageSquare className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate">{evaluation.comment}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#64748B] italic">Sin nota</span>
        )}
      </td>

      {/* Row arrow */}
      <td className="w-8 px-2 text-right text-[#64748B] group-hover:text-blue-400">
        <ChevronRight className="w-4 h-4 ml-auto" />
      </td>
    </tr>
  );
};
