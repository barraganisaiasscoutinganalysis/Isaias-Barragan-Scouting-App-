import React from 'react';
import { MatchEvent, Player, ScoutEvaluation } from '../types/scouting';
import { PlayerRow } from './PlayerRow';

interface PlayerTableProps {
  title: string;
  players: Player[];
  evaluations: Record<string, ScoutEvaluation>;
  selectedPlayerId?: string;
  onSelectPlayer: (player: Player) => void;
  events?: MatchEvent[];
  onQuickAction?: (playerId: string, eventType: 'goals' | 'assists' | 'yellowCards' | 'redCards', delta: number) => void;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  title,
  players,
  evaluations,
  selectedPlayerId,
  onSelectPlayer,
  events = [],
  onQuickAction,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          {title} ({players.length})
        </h3>
        <span className="text-[11px] font-mono text-[#64748B]">
          Clic para abrir ficha o sumá acciones directo
        </span>
      </div>

      <div className="rounded-lg bg-[#111827] border border-[#334155] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-[#0F172A] border-b border-[#334155] text-[10px] uppercase font-mono tracking-wider text-[#64748B] h-9">
                <th className="px-3 text-center w-10">#</th>
                <th className="px-3">Jugador</th>
                <th className="px-3 w-16">Pos</th>
                <th className="px-3 hidden lg:table-cell">Nacionalidad</th>
                <th className="px-3 text-center hidden sm:table-cell">Min</th>
                <th className="px-2.5">Acciones</th>
                <th className="px-3 text-center">Rating</th>
                <th className="px-3 hidden md:table-cell">Observación</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  evaluation={evaluations[player.id]}
                  isSelected={selectedPlayerId === player.id}
                  onSelect={() => onSelectPlayer(player)}
                  events={events}
                  onQuickAction={onQuickAction ? (eventType, delta) => onQuickAction(player.id, eventType, delta) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
