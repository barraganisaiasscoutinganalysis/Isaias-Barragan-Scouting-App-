import React from 'react';
import { Player, PlayerStatistics } from '../types/scouting';
import { Target, Share2, Shield, AlertCircle, Award } from 'lucide-react';

interface PlayerStatsProps {
  player: Player;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({ player }) => {
  const stats = player.statistics;

  if (!stats || player.minutesPlayed === 0) {
    return (
      <div className="p-6 rounded-lg bg-[#0F172A] border border-[#334155] text-center space-y-1.5 font-mono">
        <p className="text-xs text-[#94A3B8]">Sin estadísticas registradas para este partido</p>
        <p className="text-[11px] text-[#64748B]">El jugador no disputó minutos en el encuentro.</p>
      </div>
    );
  }

  const formatStat = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '--';
    return val;
  };

  const isGoalkeeper = player.position === 'GK';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#334155]/60 pb-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          Estadísticas del partido
        </h4>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8]">
          <span>
            Minutos: <strong className="text-white">{player.minutesPlayed}'</strong>
          </span>
          {(stats.touches !== undefined || stats.passing?.touches !== undefined) && (
            <span>
              • Toques: <strong className="text-amber-400">{stats.touches ?? stats.passing?.touches}</strong>
            </span>
          )}
        </div>
      </div>

      {/* GOALKEEPER EXCLUSIVE STATS */}
      {isGoalkeeper && stats.goalkeeper && (
        <div className="rounded-lg bg-[#0F172A] border border-[#334155] p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wide font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>PORTERO</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Atajadas</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.goalkeeper.saves)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Goles recibidos</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.goalkeeper.goalsConceded)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">En área chica</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.goalkeeper.savesInsideBox)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Despejes puño</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.goalkeeper.punches)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Salidas</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.goalkeeper.runsOut)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Pases portería</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.goalkeeper.passesAttempted)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ATAQUE */}
      {stats.attack && (
        <div className="rounded-lg bg-[#0F172A] border border-[#334155] p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wide font-mono">
            <Target className="w-3.5 h-3.5" />
            <span>ATAQUE</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Goles</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{formatStat(stats.attack.goals)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Asistencias</span>
              <span className="text-sm font-mono font-bold text-cyan-300">{formatStat(stats.attack.assists)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Tiros</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.attack.shots)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Tiros al arco</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.attack.shotsOnTarget)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Grandes ocasiones</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.attack.bigChancesCreated)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Toques área rival</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.attack.touchesInOppBox)}</span>
            </div>
          </div>
        </div>
      )}

      {/* PASE */}
      {stats.passing && (
        <div className="rounded-lg bg-[#0F172A] border border-[#334155] p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wide font-mono">
            <Share2 className="w-3.5 h-3.5" />
            <span>PASE Y PARTICIPACIÓN</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10px] text-amber-300 block uppercase font-mono font-bold">Toques totales</span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {formatStat(stats.touches ?? stats.passing?.touches)}
              </span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Pases intentados</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.passing.passesAttempted)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Completados</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.passing.passesCompleted)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Precisión</span>
              <span className="text-sm font-mono font-bold text-cyan-300">
                {stats.passing.passingAccuracy !== undefined ? `${stats.passing.passingAccuracy}%` : '--'}
              </span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Pases clave</span>
              <span className="text-sm font-mono font-bold text-amber-300">{formatStat(stats.passing.keyPasses)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Centros</span>
              <span className="text-sm font-mono font-bold text-white">
                {stats.passing.crossesTotal !== undefined ? `${stats.passing.crossesAccurate || 0}/${stats.passing.crossesTotal}` : '--'}
              </span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Pases largos</span>
              <span className="text-sm font-mono font-bold text-white">
                {stats.passing.longBallsTotal !== undefined ? `${stats.passing.longBallsAccurate || 0}/${stats.passing.longBallsTotal}` : '--'}
              </span>
            </div>
            <div className="p-2 rounded bg-purple-950/30 border border-purple-500/30 col-span-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-300 uppercase font-mono font-semibold">Pases en último tercio</span>
                <span className="text-xs font-mono text-purple-300 font-bold">
                  {stats.passing.finalThirdPassesAccuracy !== undefined 
                    ? `${stats.passing.finalThirdPassesAccuracy}% efectividad`
                    : stats.passing.finalThirdPassesAttempted 
                    ? `${Math.round(((stats.passing.finalThirdPassesCompleted || 0) / stats.passing.finalThirdPassesAttempted) * 100)}%`
                    : '--'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-mono font-bold text-white">
                  {stats.passing.finalThirdPassesCompleted !== undefined 
                    ? stats.passing.finalThirdPassesCompleted 
                    : stats.passing.keyPasses ? Math.max(1, (stats.passing.keyPasses * 3)) : '--'}
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  {stats.passing.finalThirdPassesAttempted 
                    ? `/ ${stats.passing.finalThirdPassesAttempted} completados`
                    : 'pases exitosos'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEFENSA */}
      {stats.defense && (
        <div className="rounded-lg bg-[#0F172A] border border-[#334155] p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>DEFENSA</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Entradas</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.defense.tackles)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Intercepciones</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.defense.interceptions)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Despejes</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.defense.clearances)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Duelos ganados</span>
              <span className="text-sm font-mono font-bold text-white">
                {stats.defense.duelsTotal !== undefined ? `${stats.defense.duelsWon || 0}/${stats.defense.duelsTotal}` : '--'}
              </span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Recuperaciones</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.defense.recoveries)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Tiros tapados</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.defense.blockedShots)}</span>
            </div>
          </div>
        </div>
      )}

      {/* DISCIPLINA */}
      {stats.discipline && (
        <div className="rounded-lg bg-[#0F172A] border border-[#334155] p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>DISCIPLINA</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Faltas com.</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.discipline.foulsCommitted)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Faltas rec.</span>
              <span className="text-sm font-mono font-bold text-white">{formatStat(stats.discipline.foulsDrawn)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Amarillas</span>
              <span className="text-sm font-mono font-bold text-amber-400">{formatStat(stats.discipline.yellowCards)}</span>
            </div>
            <div className="p-2 rounded bg-[#1E293B]/70 border border-[#334155]/60">
              <span className="text-[10px] text-[#94A3B8] block uppercase font-mono">Rojas</span>
              <span className="text-sm font-mono font-bold text-rose-500">{formatStat(stats.discipline.redCards)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
