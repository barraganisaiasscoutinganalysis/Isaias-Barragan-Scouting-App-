import React, { useState } from 'react';
import { MatchEvent, MatchEventNote, Player } from '../types/scouting';
import { sanitizePlayerName } from '../utils/countryFlags';
import { 
  CircleDot, 
  AlertCircle, 
  ArrowRightLeft, 
  MessageSquare, 
  Save, 
  Check, 
  Clock,
  Trash2,
  Plus
} from 'lucide-react';

interface MatchTimelineProps {
  events: MatchEvent[];
  eventNotes: Record<string, MatchEventNote>;
  onSaveEventNote: (eventId: string, note: string) => void;
  onSelectPlayerById?: (playerId: string) => void;
  onAddEvent?: (newEvent: MatchEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  homeTeamName?: string;
  awayTeamName?: string;
  players?: Player[];
}

export const MatchTimeline: React.FC<MatchTimelineProps> = ({
  events,
  eventNotes,
  onSaveEventNote,
  onSelectPlayerById,
  onAddEvent,
  onDeleteEvent,
  homeTeamName = 'Local',
  awayTeamName = 'Visitante',
  players = [],
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  // New Event creation form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMinute, setNewMinute] = useState<number>(45);
  const [newType, setNewType] = useState<MatchEvent['type']>('goal');
  const [newTeam, setNewTeam] = useState<'home' | 'away'>('home');
  const [newPlayerId, setNewPlayerId] = useState<string>('');
  const [newCustomPlayerName, setNewCustomPlayerName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddEvent) return;

    const selectedPl = players.find((p) => p.id === newPlayerId);
    const finalPlayerName = selectedPl ? selectedPl.name : (newCustomPlayerName.trim() || 'Jugador');
    const finalTeamName = newTeam === 'home' ? homeTeamName : awayTeamName;

    const eventNames: Record<string, string> = {
      goal: 'Gol',
      yellow_card: 'Tarjeta Amarilla',
      red_card: 'Tarjeta Roja',
      yellow_red_card: 'Doble Amarilla / Expulsión',
      substitution: 'Sustitución',
      var: 'Revisión VAR',
      penalty_miss: 'Penal Fallado',
      own_goal: 'Gol en Contra',
    };

    const createdEvent: MatchEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      minute: Number(newMinute) || 45,
      teamId: newTeam === 'home' ? 'home' : 'away',
      teamName: finalTeamName,
      type: newType,
      playerId: selectedPl ? selectedPl.id : `custom_${Date.now()}`,
      playerName: finalPlayerName,
      playerNumber: selectedPl?.number,
      description: newDescription.trim() || `${eventNames[newType] || 'Evento'} - ${finalPlayerName}`,
    };

    onAddEvent(createdEvent);
    setShowAddForm(false);
    setNewDescription('');
    setNewPlayerId('');
    setNewCustomPlayerName('');
  };

  const handleSelectEvent = (ev: MatchEvent) => {
    setSelectedEventId(ev.id);
    setEditingNote(eventNotes[ev.id]?.note || '');
    setJustSaved(false);
  };

  const handleSaveNote = () => {
    if (!selectedEventId) return;
    onSaveEventNote(selectedEventId, editingNote);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const getEventIcon = (type: MatchEvent['type'], subType?: string) => {
    switch (type) {
      case 'goal':
        return <span className="text-sm select-none">⚽</span>;
      case 'own_goal':
        return <span className="text-sm select-none">🥅</span>;
      case 'penalty_miss':
        return <span className="text-sm select-none">❌</span>;
      case 'yellow_card':
        return (
          <div className="w-2.5 h-3.5 bg-[#FACC15] rounded-[1.5px] shadow-sm ring-1 ring-yellow-400/40" title="Tarjeta Amarilla" />
        );
      case 'yellow_red_card':
        return (
          <div className="relative flex items-center justify-center w-5 h-4" title="Doble Amarilla / Roja (Expulsión)">
            <div className="absolute left-0 top-0.5 w-2.5 h-3.5 bg-[#FACC15] rounded-[1.5px] shadow-sm z-0 ring-1 ring-yellow-400/40" />
            <div className="absolute left-2 top-0 w-2.5 h-3.5 bg-[#EF4444] rounded-[1.5px] shadow-sm z-10 ring-1 ring-red-400/50" />
          </div>
        );
      case 'red_card':
        return (
          <div className="w-2.5 h-3.5 bg-[#EF4444] rounded-[1.5px] shadow-sm ring-1 ring-red-400/50" title="Tarjeta Roja Directa" />
        );
      case 'substitution':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />;
      case 'var':
        return <span className="text-xs px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">VAR</span>;
      default:
        return <CircleDot className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <span>Eventos del Partido ({events.length})</span>
        </h3>
        <div className="flex items-center gap-2.5">
          {onAddEvent && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancelar' : 'Agregar Incidencia'}</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-[#64748B]">
            Seleccioná un evento para anotar observaciones
          </span>
        </div>
      </div>

      {/* Add Event Form */}
      {showAddForm && onAddEvent && (
        <form
          onSubmit={handleCreateEvent}
          className="p-4 rounded-lg bg-[#0F172A] border border-blue-500/50 space-y-3 font-mono text-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#334155]/60 pb-2">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <span>➕ Registrar Nueva Incidencia / Acción</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[#94A3B8] hover:text-white text-xs cursor-pointer"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Minuto */}
            <div>
              <label className="text-[10px] text-[#94A3B8] block mb-1">MINUTO</label>
              <input
                type="number"
                min="1"
                max="130"
                value={newMinute}
                onChange={(e) => setNewMinute(Number(e.target.value))}
                className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white"
                required
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-[10px] text-[#94A3B8] block mb-1">TIPO DE ACCIÓN</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MatchEvent['type'])}
                className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white cursor-pointer"
              >
                <option value="goal">⚽ Gol</option>
                <option value="yellow_card">🟨 Tarjeta Amarilla</option>
                <option value="red_card">🟥 Tarjeta Roja Directa</option>
                <option value="yellow_red_card">🟨🟥 Doble Amarilla (Expulsión)</option>
                <option value="substitution">🔁 Sustitución</option>
                <option value="var">🟣 Revisión VAR</option>
                <option value="penalty_miss">❌ Penal Fallado</option>
                <option value="own_goal">🥅 Gol en Contra</option>
              </select>
            </div>

            {/* Equipo */}
            <div>
              <label className="text-[10px] text-[#94A3B8] block mb-1">EQUIPO</label>
              <select
                value={newTeam}
                onChange={(e) => {
                  setNewTeam(e.target.value as 'home' | 'away');
                  setNewPlayerId('');
                }}
                className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white cursor-pointer"
              >
                <option value="home">Local: {homeTeamName}</option>
                <option value="away">Visitante: {awayTeamName}</option>
              </select>
            </div>

            {/* Jugador */}
            <div>
              <label className="text-[10px] text-[#94A3B8] block mb-1">JUGADOR</label>
              {players.length > 0 ? (
                <select
                  value={newPlayerId}
                  onChange={(e) => setNewPlayerId(e.target.value)}
                  className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white cursor-pointer"
                >
                  <option value="">Seleccionar de la lista...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.positionLabel})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nombre del jugador"
                  value={newCustomPlayerName}
                  onChange={(e) => setNewCustomPlayerName(e.target.value)}
                  className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white"
                />
              )}
            </div>
          </div>

          {/* Optional player custom name if not chosen from list */}
          {players.length > 0 && !newPlayerId && (
            <div>
              <input
                type="text"
                placeholder="O escribir nombre personalizado..."
                value={newCustomPlayerName}
                onChange={(e) => setNewCustomPlayerName(e.target.value)}
                className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white text-xs"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-[10px] text-[#94A3B8] block mb-1">DESCRIPCIÓN ADICIONAL (OPCIONAL)</label>
            <input
              type="text"
              placeholder="Ej: Remate potente de derecha al ángulo superior / Falta táctica"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full p-2 bg-[#0A0D14] border border-[#334155] rounded text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-md shadow-blue-600/30"
            >
              Guardar Incidencia
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline Event List */}
        <div className="lg:col-span-2 rounded-lg bg-[#111827] border border-[#334155] divide-y divide-[#334155]/40 overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B] font-mono">
              Sin eventos reportados en el partido
            </div>
          ) : (
            events.map((ev) => {
              if (ev.type === 'period') {
                return (
                  <div key={ev.id} className="py-2.5 px-4 bg-[#0B111E] border-y border-[#334155]/60 flex items-center justify-center gap-2.5 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                      {ev.playerName || ev.description}
                    </span>
                    {ev.score && (
                      <span className="text-[10px] font-mono font-bold bg-[#1E293B] border border-[#334155] px-1.5 py-0.2 rounded text-emerald-300">
                        {ev.score.home} - {ev.score.away}
                      </span>
                    )}
                  </div>
                );
              }

              const hasNote = Boolean(eventNotes[ev.id]?.note);
              const isSelected = selectedEventId === ev.id;
              const formattedMinute = 
                ev.extraMinute && ev.extraMinute > 0 && ev.extraMinute < 35
                  ? `${ev.minute}'+${ev.extraMinute}`
                  : `${ev.minute}'`;

              return (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev)}
                  className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                      : 'hover:bg-[#1E293B]/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Minute Badge */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className="w-12 h-7 rounded bg-[#0A0D14] border border-[#334155] font-mono font-bold text-cyan-300 text-[11px] flex items-center justify-center shadow-inner">
                        {formattedMinute}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="w-6 flex items-center justify-center shrink-0">
                      {getEventIcon(ev.type, ev.subType)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {ev.type === 'substitution' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span>▲ Entra:</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectPlayerById && ev.playerId) onSelectPlayerById(ev.playerId);
                              }}
                              className="hover:underline font-bold text-white hover:text-emerald-300"
                            >
                              {sanitizePlayerName(ev.playerName)}
                            </button>
                          </span>
                          {ev.secondaryPlayerName && (
                            <span className="text-[10px] font-medium text-rose-400 bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span>▼ Sale:</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectPlayerById && ev.secondaryPlayerId) onSelectPlayerById(ev.secondaryPlayerId);
                                }}
                                className="hover:underline font-medium text-rose-200 hover:text-rose-100"
                              >
                                {sanitizePlayerName(ev.secondaryPlayerName)}
                              </button>
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {ev.teamName}
                          </span>
                        </div>
                      ) : ev.type === 'yellow_red_card' || ev.subType === 'second_yellow' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                            <span>🟨🟥</span>
                            <span>2ª Amarilla / Expulsión:</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPlayerById && ev.playerId) onSelectPlayerById(ev.playerId);
                            }}
                            className="font-bold text-rose-100 hover:text-white hover:underline truncate"
                          >
                            {sanitizePlayerName(ev.playerName)}
                          </button>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {ev.teamName}
                          </span>
                        </div>
                      ) : ev.type === 'red_card' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-red-300 bg-red-950/80 border border-red-500/50 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                            <span className="w-2 h-3 bg-red-500 rounded-[1px] inline-block" />
                            <span>Roja Directa:</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPlayerById && ev.playerId) onSelectPlayerById(ev.playerId);
                            }}
                            className="font-bold text-red-100 hover:text-white hover:underline truncate"
                          >
                            {sanitizePlayerName(ev.playerName)}
                          </button>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {ev.teamName}
                          </span>
                        </div>
                      ) : ev.type === 'own_goal' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                            <span>🥅</span>
                            <span>Autogol (Gol en contra):</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPlayerById && ev.playerId) onSelectPlayerById(ev.playerId);
                            }}
                            className="font-bold text-amber-100 hover:text-white hover:underline truncate"
                          >
                            {sanitizePlayerName(ev.playerName)}
                          </button>
                          {ev.score && (
                            <span className="text-[10px] font-mono font-bold bg-[#1E293B] border border-[#334155] px-1.5 py-0.5 rounded text-emerald-300">
                              {ev.score.home} - {ev.score.away}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {ev.teamName}
                          </span>
                        </div>
                      ) : ev.type === 'goal' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                            <span>⚽</span>
                            <span>{ev.subType === 'penalty' ? 'Gol de Penal:' : 'Gol:'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPlayerById && ev.playerId) onSelectPlayerById(ev.playerId);
                            }}
                            className="font-bold text-white hover:text-emerald-300 hover:underline truncate"
                          >
                            {sanitizePlayerName(ev.playerName)}
                          </button>
                          {ev.secondaryPlayerName && (
                            <span className="text-[11px] text-[#94A3B8] truncate flex items-center gap-1">
                              <span>(asist:</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectPlayerById && ev.secondaryPlayerId) onSelectPlayerById(ev.secondaryPlayerId);
                                }}
                                className="text-cyan-300 hover:underline hover:text-cyan-200"
                              >
                                {sanitizePlayerName(ev.secondaryPlayerName)}
                              </button>
                              <span>)</span>
                            </span>
                          )}
                          {ev.score && (
                            <span className="text-[10px] font-mono font-bold bg-[#1E293B] border border-[#334155] px-1.5 py-0.5 rounded text-emerald-300">
                              {ev.score.home} - {ev.score.away}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {ev.teamName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPlayerById && ev.playerId) onSelectPlayerById(ev.playerId);
                            }}
                            className="font-bold text-white hover:text-blue-400 hover:underline truncate"
                          >
                            {sanitizePlayerName(ev.playerName)}
                          </button>
                          {ev.secondaryPlayerName && (
                            <span className="text-[11px] text-[#94A3B8] truncate flex items-center gap-1">
                              <span>(asist:</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectPlayerById && ev.secondaryPlayerId) onSelectPlayerById(ev.secondaryPlayerId);
                                }}
                                className="text-cyan-300 hover:underline hover:text-cyan-200"
                              >
                                {sanitizePlayerName(ev.secondaryPlayerName)}
                              </button>
                              <span>)</span>
                            </span>
                          )}
                          {ev.score && (
                            <span className="text-[10px] font-mono font-bold bg-[#1E293B] border border-[#334155] px-1.5 py-0.5 rounded text-emerald-300">
                              {ev.score.home} - {ev.score.away}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {ev.teamName}
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                        {ev.description}
                      </p>
                    </div>
                  </div>

                  {/* Note marker & Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasNote ? (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Nota</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#64748B] font-mono opacity-0 group-hover:opacity-100">
                        + Nota
                      </span>
                    )}

                    {onDeleteEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar este evento (${formattedMinute} - ${ev.playerName || ev.description})?`)) {
                            onDeleteEvent(ev.id);
                          }
                        }}
                        className="p-1 rounded text-[#64748B] hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Event Observation Panel */}
        <div className="rounded-lg bg-[#111827] border border-[#334155] p-4 flex flex-col justify-between shadow-sm space-y-4">
          {selectedEvent ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Observación de Evento
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#1E293B] font-mono text-cyan-300 text-xs font-bold border border-[#334155]">
                    {selectedEvent.minute}'
                  </span>
                </div>

                <div className="p-3 rounded bg-[#0A0D14] border border-[#334155]/70 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{selectedEvent.playerName}</span>
                    <span className="text-[11px] text-[#64748B]">({selectedEvent.teamName})</span>
                  </div>
                  <p className="text-[#94A3B8] text-[11px]">{selectedEvent.description}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#94A3B8] uppercase">
                    Comentario del scout:
                  </label>
                  <textarea
                    rows={4}
                    value={editingNote}
                    onChange={(e) => setEditingNote(e.target.value)}
                    placeholder="Ej: Sale después de una actuación irregular / Fallo de marca al cerrar el centro..."
                    className="w-full p-2.5 rounded bg-[#0A0D14] border border-[#334155] focus:border-blue-500 text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#334155]/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#64748B]">
                  {editingNote.length} caracteres
                </span>

                <button
                  type="button"
                  onClick={handleSaveNote}
                  className={`px-3 py-1.5 rounded text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
                    justSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                  }`}
                >
                  {justSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardado</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar nota</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#64748B] space-y-2 font-mono text-xs">
              <Clock className="w-6 h-6 text-[#334155]" />
              <p>Hacé clic en cualquier evento de la izquierda para redactar una anotación táctica.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
