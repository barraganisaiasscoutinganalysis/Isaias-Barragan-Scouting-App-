import React, { useState } from 'react';
import { 
  CompleteMatchReport, 
  Player, 
  PlayerPosition, 
  MatchEvent, 
  MatchEventType, 
  Team 
} from '../types/scouting';
import { 
  X, 
  Save, 
  Pencil, 
  Plus, 
  Trash2, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Clock, 
  FileText, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Minus,
  Shield,
  Search,
  Sparkles
} from 'lucide-react';
import { TeamBadgeFinderModal } from './TeamBadgeFinderModal';

interface EditMatchModalProps {
  report: CompleteMatchReport;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedReport: CompleteMatchReport) => Promise<void> | void;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  report,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  // Active tab inside modal
  const [activeTab, setActiveTab] = useState<'info' | 'home_team' | 'away_team' | 'events' | 'notes'>('info');

  // General match info
  const [competition, setCompetition] = useState(report.match.competition || report.meta.competition || 'Competición');
  const [roundOrPhase, setRoundOrPhase] = useState(report.match.roundOrPhase || 'Fase Regular');
  const [matchDate, setMatchDate] = useState(report.match.date || report.meta.matchDate || '');
  const [stadium, setStadium] = useState(report.match.stadium || report.meta.stadium || '');
  const [referee, setReferee] = useState(report.match.referee || '');
  const [status, setStatus] = useState<'FINISHED' | 'LIVE' | 'UPCOMING'>(report.match.status || 'FINISHED');
  const [generalNotes, setGeneralNotes] = useState(report.meta.generalNotes || '');

  // Teams info
  const [homeTeamName, setHomeTeamName] = useState(report.match.homeTeam.name || report.meta.homeTeamName || 'Local');
  const [homeFormation, setHomeFormation] = useState(report.match.homeTeam.formation || '4-3-3');
  const [homeScore, setHomeScore] = useState<number>(report.match.homeTeam.score ?? 0);
  const [homeLogoUrl, setHomeLogoUrl] = useState(report.match.homeTeam.logoUrl || report.meta.homeTeamLogo || '');

  const [awayTeamName, setAwayTeamName] = useState(report.match.awayTeam.name || report.meta.awayTeamName || 'Visitante');
  const [awayFormation, setAwayFormation] = useState(report.match.awayTeam.formation || '4-3-3');
  const [awayScore, setAwayScore] = useState<number>(report.match.awayTeam.score ?? 0);
  const [awayLogoUrl, setAwayLogoUrl] = useState(report.match.awayTeam.logoUrl || report.meta.awayTeamLogo || '');

  // Badge Finder state
  const [badgeFinderTarget, setBadgeFinderTarget] = useState<'home' | 'away' | null>(null);
  const [isAutoSearchingLogo, setIsAutoSearchingLogo] = useState<'home' | 'away' | null>(null);

  const handleAutoSearchLogo = async (teamSide: 'home' | 'away') => {
    const query = teamSide === 'home' ? homeTeamName : awayTeamName;
    if (!query || !query.trim()) {
      setBadgeFinderTarget(teamSide);
      return;
    }
    setIsAutoSearchingLogo(teamSide);
    try {
      const res = await fetch(`/api/escudoteca/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const top = data.results[0];
          if (teamSide === 'home') setHomeLogoUrl(top.badgeUrl);
          else setAwayLogoUrl(top.badgeUrl);
          return;
        }
      }
      // If not automatically matched or multiple, open finder modal
      setBadgeFinderTarget(teamSide);
    } catch {
      setBadgeFinderTarget(teamSide);
    } finally {
      setIsAutoSearchingLogo(null);
    }
  };

  // Players lists (cloned for editing)
  const [homeStarters, setHomeStarters] = useState<Player[]>([...report.match.homeTeam.starters]);
  const [homeSubs, setHomeSubs] = useState<Player[]>([...report.match.homeTeam.substitutes]);

  const [awayStarters, setAwayStarters] = useState<Player[]>([...report.match.awayTeam.starters]);
  const [awaySubs, setAwaySubs] = useState<Player[]>([...report.match.awayTeam.substitutes]);

  // Events list (cloned for editing)
  const [events, setEvents] = useState<MatchEvent[]>([...report.match.events]);

  // New Player Form State (inside Add Player submodal or row)
  const [isAddingPlayer, setIsAddingPlayer] = useState<'home_starters' | 'home_subs' | 'away_starters' | 'away_subs' | null>(null);
  const [newPlayerNumber, setNewPlayerNumber] = useState<number>(10);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState<PlayerPosition>('MF');
  const [newPlayerPositionLabel, setNewPlayerPositionLabel] = useState('MC');
  const [newPlayerMinutes, setNewPlayerMinutes] = useState<number>(90);

  // New Event Form State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventMinute, setNewEventMinute] = useState<number>(45);
  const [newEventTeamSide, setNewEventTeamSide] = useState<'home' | 'away'>('home');
  const [newEventType, setNewEventType] = useState<MatchEventType>('goal');
  const [newEventPlayerName, setNewEventPlayerName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  // Save feedback / error state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handlers for modifying players
  const handleUpdatePlayer = (
    teamSide: 'home' | 'away',
    category: 'starters' | 'subs',
    index: number,
    field: keyof Player,
    value: any
  ) => {
    if (teamSide === 'home') {
      if (category === 'starters') {
        const updated = [...homeStarters];
        updated[index] = { ...updated[index], [field]: value };
        setHomeStarters(updated);
      } else {
        const updated = [...homeSubs];
        updated[index] = { ...updated[index], [field]: value };
        setHomeSubs(updated);
      }
    } else {
      if (category === 'starters') {
        const updated = [...awayStarters];
        updated[index] = { ...updated[index], [field]: value };
        setAwayStarters(updated);
      } else {
        const updated = [...awaySubs];
        updated[index] = { ...updated[index], [field]: value };
        setAwaySubs(updated);
      }
    }
  };

  const handleToggleStarterSub = (
    teamSide: 'home' | 'away',
    currentCategory: 'starters' | 'subs',
    index: number
  ) => {
    if (teamSide === 'home') {
      if (currentCategory === 'starters') {
        const player = { ...homeStarters[index], isStarter: false };
        setHomeStarters(homeStarters.filter((_, i) => i !== index));
        setHomeSubs([...homeSubs, player]);
      } else {
        const player = { ...homeSubs[index], isStarter: true };
        setHomeSubs(homeSubs.filter((_, i) => i !== index));
        setHomeStarters([...homeStarters, player]);
      }
    } else {
      if (currentCategory === 'starters') {
        const player = { ...awayStarters[index], isStarter: false };
        setAwayStarters(awayStarters.filter((_, i) => i !== index));
        setAwaySubs([...awaySubs, player]);
      } else {
        const player = { ...awaySubs[index], isStarter: true };
        setAwaySubs(awaySubs.filter((_, i) => i !== index));
        setAwayStarters([...awayStarters, player]);
      }
    }
  };

  const handleDeletePlayer = (
    teamSide: 'home' | 'away',
    category: 'starters' | 'subs',
    index: number
  ) => {
    if (teamSide === 'home') {
      if (category === 'starters') {
        setHomeStarters(homeStarters.filter((_, i) => i !== index));
      } else {
        setHomeSubs(homeSubs.filter((_, i) => i !== index));
      }
    } else {
      if (category === 'starters') {
        setAwayStarters(awayStarters.filter((_, i) => i !== index));
      } else {
        setAwaySubs(awaySubs.filter((_, i) => i !== index));
      }
    }
  };

  const handleAddPlayerSubmit = () => {
    if (!newPlayerName.trim()) {
      setErrorMessage('El nombre del jugador es requerido.');
      return;
    }

    const uniqueId = `player_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPlayer: Player = {
      id: uniqueId,
      name: newPlayerName.trim(),
      shortName: newPlayerName.trim().split(' ').slice(-1)[0] || newPlayerName.trim(),
      number: Number(newPlayerNumber) || 0,
      position: newPlayerPosition,
      positionLabel: newPlayerPositionLabel || newPlayerPosition,
      nationality: 'Desconocida',
      avatarUrl: '',
      isStarter: isAddingPlayer === 'home_starters' || isAddingPlayer === 'away_starters',
      minutesPlayed: Number(newPlayerMinutes) || 0,
      statistics: {
        minutesPlayed: Number(newPlayerMinutes) || 0,
      },
    };

    if (isAddingPlayer === 'home_starters') {
      setHomeStarters([...homeStarters, newPlayer]);
    } else if (isAddingPlayer === 'home_subs') {
      setHomeSubs([...homeSubs, newPlayer]);
    } else if (isAddingPlayer === 'away_starters') {
      setAwayStarters([...awayStarters, newPlayer]);
    } else if (isAddingPlayer === 'away_subs') {
      setAwaySubs([...awaySubs, newPlayer]);
    }

    // Reset form
    setIsAddingPlayer(null);
    setNewPlayerName('');
    setNewPlayerNumber(10);
    setNewPlayerMinutes(90);
    setErrorMessage(null);
  };

  // Helper to accurately resolve action counts for any player across all sources (statistics, events array, legacy objects)
  const getPlayerActionCounts = (player: Player) => {
    const pName = (player.name || '').trim().toLowerCase();
    const pId = player.id;

    const eventGoals = events.filter(
      (e) =>
        e.type === 'goal' &&
        e.subType !== 'own_goal' &&
        ((pId && e.playerId === pId) || (e.playerName && e.playerName.trim().toLowerCase() === pName))
    ).length;
    const statGoals = player.statistics?.attack?.goals || 0;
    const legacyGoals = (player as any).events?.goals || 0;
    const goals = Math.max(statGoals, legacyGoals, eventGoals);

    const eventYc = events.filter(
      (e) =>
        e.type === 'yellow_card' &&
        ((pId && e.playerId === pId) || (e.playerName && e.playerName.trim().toLowerCase() === pName))
    ).length;
    const statYc = player.statistics?.discipline?.yellowCards || 0;
    const legacyYc = (player as any).events?.yellowCards || 0;
    const yellowCards = Math.max(statYc, legacyYc, eventYc);

    const eventRc = events.filter(
      (e) =>
        (e.type === 'red_card' ||
          e.type === 'yellow_red_card' ||
          e.subType === 'second_yellow' ||
          e.subType === 'direct_red') &&
        ((pId && e.playerId === pId) || (e.playerName && e.playerName.trim().toLowerCase() === pName))
    ).length;
    const statRc = player.statistics?.discipline?.redCards || 0;
    const legacyRc = (player as any).events?.redCards || 0;
    const redCards = Math.max(statRc, legacyRc, eventRc);

    const eventAssists = events.filter(
      (e) =>
        e.type === 'goal' &&
        ((pId && e.secondaryPlayerId === pId) ||
          (e.secondaryPlayerName && e.secondaryPlayerName.trim().toLowerCase() === pName))
    ).length;
    const statAssists = player.statistics?.attack?.assists || 0;
    const legacyAssists = (player as any).events?.assists || 0;
    const assists = Math.max(statAssists, legacyAssists, eventAssists);

    return { goals, yellowCards, redCards, assists };
  };

  // Quick action modifier for players in lineup tables
  const handleQuickEventForPlayer = (
    teamSide: 'home' | 'away',
    role: 'starters' | 'subs',
    playerIdentifier: number | string,
    eventType: 'goals' | 'yellowCards' | 'redCards' | 'assists',
    delta: number
  ) => {
    const listGetter =
      teamSide === 'home'
        ? role === 'starters'
          ? homeStarters
          : homeSubs
        : role === 'starters'
        ? awayStarters
        : awaySubs;

    const targetIdx =
      typeof playerIdentifier === 'number'
        ? playerIdentifier
        : listGetter.findIndex((p) => p.id === playerIdentifier);

    if (targetIdx === -1 || !listGetter[targetIdx]) return;
    const player = listGetter[targetIdx];

    const currentCounts = getPlayerActionCounts(player);
    const currentVal = currentCounts[eventType] || 0;
    const nextVal = Math.max(0, currentVal + delta);

    const currentStats = player.statistics || { minutesPlayed: player.minutesPlayed || 90 };
    const attackStats = { ...(currentStats.attack || {}) };
    const discStats = { ...(currentStats.discipline || {}) };

    const pName = player.name || 'Jugador';
    const pId = player.id || `pl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const teamId = teamSide === 'home' ? report.match.homeTeam?.id || 'home' : report.match.awayTeam?.id || 'away';
    const teamName = teamSide === 'home' ? homeTeamName : awayTeamName;

    if (eventType === 'goals') {
      attackStats.goals = nextVal;
      if (delta > 0) {
        if (teamSide === 'home') setHomeScore((s) => s + 1);
        else setAwayScore((s) => s + 1);

        const newEv: MatchEvent = {
          id: `ev_goal_${pId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          minute: 45,
          teamId,
          teamName,
          type: 'goal',
          playerId: pId,
          playerName: pName,
          playerNumber: player.number,
          description: `Gol de ${pName}`,
        };
        setEvents((prev) => [...prev, newEv]);
      } else if (delta < 0 && currentVal > 0) {
        if (teamSide === 'home') setHomeScore((s) => Math.max(0, s - 1));
        else setAwayScore((s) => Math.max(0, s - 1));

        setEvents((prev) => {
          const revIdx = [...prev].reverse().findIndex(
            (e) =>
              (e.playerId === pId ||
                (e.playerName && e.playerName.trim().toLowerCase() === pName.trim().toLowerCase())) &&
              e.type === 'goal'
          );
          if (revIdx === -1) return prev;
          const actualIdx = prev.length - 1 - revIdx;
          return prev.filter((_, i) => i !== actualIdx);
        });
      }
    } else if (eventType === 'yellowCards') {
      discStats.yellowCards = nextVal;
      if (delta > 0) {
        const newEv: MatchEvent = {
          id: `ev_yc_${pId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          minute: 60,
          teamId,
          teamName,
          type: 'yellow_card',
          playerId: pId,
          playerName: pName,
          playerNumber: player.number,
          description: `Tarjeta amarilla para ${pName}`,
        };
        setEvents((prev) => [...prev, newEv]);
      } else if (delta < 0 && currentVal > 0) {
        setEvents((prev) => {
          const revIdx = [...prev].reverse().findIndex(
            (e) =>
              (e.playerId === pId ||
                (e.playerName && e.playerName.trim().toLowerCase() === pName.trim().toLowerCase())) &&
              e.type === 'yellow_card'
          );
          if (revIdx === -1) return prev;
          const actualIdx = prev.length - 1 - revIdx;
          return prev.filter((_, i) => i !== actualIdx);
        });
      }
    } else if (eventType === 'redCards') {
      discStats.redCards = nextVal;
      if (delta > 0) {
        const newEv: MatchEvent = {
          id: `ev_rc_${pId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          minute: 75,
          teamId,
          teamName,
          type: 'red_card',
          playerId: pId,
          playerName: pName,
          playerNumber: player.number,
          description: `Tarjeta roja para ${pName}`,
        };
        setEvents((prev) => [...prev, newEv]);
      } else if (delta < 0 && currentVal > 0) {
        setEvents((prev) => {
          const revIdx = [...prev].reverse().findIndex(
            (e) =>
              (e.playerId === pId ||
                (e.playerName && e.playerName.trim().toLowerCase() === pName.trim().toLowerCase())) &&
              (e.type === 'red_card' || e.type === 'yellow_red_card')
          );
          if (revIdx === -1) return prev;
          const actualIdx = prev.length - 1 - revIdx;
          return prev.filter((_, i) => i !== actualIdx);
        });
      }
    } else if (eventType === 'assists') {
      attackStats.assists = nextVal;
      if (delta > 0) {
        const newEv: MatchEvent = {
          id: `ev_ast_${pId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          minute: 45,
          teamId,
          teamName,
          type: 'goal',
          secondaryPlayerId: pId,
          secondaryPlayerName: pName,
          playerId: `scorer_${Date.now()}`,
          playerName: teamName,
          description: `Asistencia de ${pName}`,
        };
        setEvents((prev) => [...prev, newEv]);
      } else if (delta < 0 && currentVal > 0) {
        setEvents((prev) => {
          const revIdx = [...prev].reverse().findIndex(
            (e) =>
              e.secondaryPlayerId === pId ||
              (e.secondaryPlayerName && e.secondaryPlayerName.trim().toLowerCase() === pName.trim().toLowerCase())
          );
          if (revIdx === -1) return prev;
          const actualIdx = prev.length - 1 - revIdx;
          return prev.filter((_, i) => i !== actualIdx);
        });
      }
    }

    const updatedPlayer: Player = {
      ...player,
      id: pId,
      statistics: {
        ...currentStats,
        attack: attackStats,
        discipline: discStats,
      },
      ...((player as any).events
        ? {
            events: {
              ...((player as any).events || {}),
              [eventType]: nextVal,
            },
          }
        : {}),
    };

    const updateFn = (list: Player[]) =>
      list.map((p, i) => (p.id ? p.id === pId : i === targetIdx) ? updatedPlayer : p);

    if (teamSide === 'home') {
      if (role === 'starters') setHomeStarters(updateFn);
      else setHomeSubs(updateFn);
    } else {
      if (role === 'starters') setAwayStarters(updateFn);
      else setAwaySubs(updateFn);
    }
  };

  // Event handlers
  const handleDeleteEvent = (index: number) => {
    const ev = events[index];
    if (!ev) return;

    if (ev.type === 'goal') {
      const isHomeEvent = ev.teamId === (report.match.homeTeam?.id || 'home') || ev.teamName === homeTeamName;
      if (isHomeEvent) setHomeScore((s) => Math.max(0, s - 1));
      else setAwayScore((s) => Math.max(0, s - 1));
    }

    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddEventSubmit = () => {
    const teamId = newEventTeamSide === 'home' ? report.match.homeTeam?.id || 'home' : report.match.awayTeam?.id || 'away';
    const teamName = newEventTeamSide === 'home' ? homeTeamName : awayTeamName;
    const finalPlayerName = newEventPlayerName.trim() || (newEventType === 'goal' ? `Gol ${teamName}` : teamName);

    // Look up real player from squad if exists
    const squad = newEventTeamSide === 'home' ? [...homeStarters, ...homeSubs] : [...awayStarters, ...awaySubs];
    const matchedPlayer = squad.find(
      (p) =>
        p.name.trim().toLowerCase() === finalPlayerName.toLowerCase() ||
        (p.shortName && p.shortName.trim().toLowerCase() === finalPlayerName.toLowerCase())
    );

    const playerId = matchedPlayer?.id || `p_ev_${Date.now()}`;
    const playerNumber = matchedPlayer?.number;

    const newEv: MatchEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      minute: Number(newEventMinute) || 1,
      teamId,
      teamName,
      type: newEventType,
      playerId,
      playerName: finalPlayerName,
      playerNumber,
      description:
        newEventDescription.trim() ||
        `${newEventType === 'goal' ? 'Gol' : newEventType === 'yellow_card' ? 'Tarjeta Amarilla' : newEventType === 'red_card' ? 'Tarjeta Roja' : 'Acción'} de ${finalPlayerName}`,
    };

    // If it's a goal, optionally increment score
    if (newEventType === 'goal') {
      if (newEventTeamSide === 'home') setHomeScore((s) => s + 1);
      else setAwayScore((s) => s + 1);
    }

    // Also update player statistics if matched
    if (matchedPlayer) {
      const updateSquadFn = (list: Player[]) =>
        list.map((p) => {
          if (p.id !== matchedPlayer.id) return p;
          const stats = p.statistics || { minutesPlayed: p.minutesPlayed || 90 };
          const atk = { ...(stats.attack || {}) };
          const disc = { ...(stats.discipline || {}) };
          if (newEventType === 'goal') atk.goals = (atk.goals || 0) + 1;
          if (newEventType === 'yellow_card') disc.yellowCards = (disc.yellowCards || 0) + 1;
          if (newEventType === 'red_card' || newEventType === 'yellow_red_card')
            disc.redCards = (disc.redCards || 0) + 1;
          return {
            ...p,
            statistics: { ...stats, attack: atk, discipline: disc },
          };
        });

      if (newEventTeamSide === 'home') {
        setHomeStarters(updateSquadFn);
        setHomeSubs(updateSquadFn);
      } else {
        setAwayStarters(updateSquadFn);
        setAwaySubs(updateSquadFn);
      }
    }

    setEvents((prev) => [...prev, newEv]);
    setIsAddingEvent(false);
    setNewEventPlayerName('');
    setNewEventDescription('');
    setErrorMessage(null);
  };

  // Save all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const syncPlayerStats = (p: Player): Player => {
        const counts = getPlayerActionCounts(p);
        const stats = p.statistics || { minutesPlayed: p.minutesPlayed || 90 };
        return {
          ...p,
          statistics: {
            ...stats,
            attack: {
              ...(stats.attack || {}),
              goals: counts.goals,
              assists: counts.assists,
            },
            discipline: {
              ...(stats.discipline || {}),
              yellowCards: counts.yellowCards,
              redCards: counts.redCards,
            },
          },
        };
      };

      const updatedHomeTeam: Team = {
        ...report.match.homeTeam,
        name: homeTeamName.trim() || 'Local',
        shortName: homeTeamName.trim().split(' ')[0] || homeTeamName.trim(),
        formation: homeFormation.trim() || '4-3-3',
        logoUrl: homeLogoUrl.trim() || report.match.homeTeam.logoUrl || '',
        score: homeScore,
        starters: homeStarters.map(syncPlayerStats),
        substitutes: homeSubs.map(syncPlayerStats),
      };

      const updatedAwayTeam: Team = {
        ...report.match.awayTeam,
        name: awayTeamName.trim() || 'Visitante',
        shortName: awayTeamName.trim().split(' ')[0] || awayTeamName.trim(),
        formation: awayFormation.trim() || '4-3-3',
        logoUrl: awayLogoUrl.trim() || report.match.awayTeam.logoUrl || '',
        score: awayScore,
        starters: awayStarters.map(syncPlayerStats),
        substitutes: awaySubs.map(syncPlayerStats),
      };

      const updatedReport: CompleteMatchReport = {
        ...report,
        meta: {
          ...report.meta,
          homeTeamName: homeTeamName.trim(),
          awayTeamName: awayTeamName.trim(),
          homeTeamLogo: homeLogoUrl.trim() || report.meta.homeTeamLogo || '',
          awayTeamLogo: awayLogoUrl.trim() || report.meta.awayTeamLogo || '',
          score: `${homeScore} - ${awayScore}`,
          competition: competition.trim(),
          matchDate: matchDate.trim(),
          stadium: stadium.trim(),
          status,
          generalNotes: generalNotes.trim(),
          updatedAt: new Date().toISOString(),
        },
        match: {
          ...report.match,
          competition: competition.trim(),
          roundOrPhase: roundOrPhase.trim(),
          date: matchDate.trim(),
          stadium: stadium.trim(),
          referee: referee.trim(),
          status,
          homeTeam: updatedHomeTeam,
          awayTeam: updatedAwayTeam,
          events,
        },
      };

      await onSave(updatedReport);
      onClose();
    } catch (err: any) {
      console.error('Error saving updated match:', err);
      setErrorMessage(err?.message || 'Ocurrió un error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0F172A] border border-[#334155] rounded-xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-[#334155] bg-[#111827] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Editar Partido Guardado</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1E293B] text-amber-400 border border-amber-400/20">
                  {homeTeamName} vs {awayTeamName}
                </span>
              </h2>
              <p className="text-[11px] font-mono text-[#94A3B8]">
                Modificá detalles generales, nombres de equipos, formaciones, jugadores y eventos del partido.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 py-2.5 bg-[#0A0D14] border-b border-[#334155]/60 flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-amber-500/20 text-white border border-amber-400/50 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Datos del Partido</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('home_team')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'home_team'
                ? 'bg-blue-600/30 text-white border border-blue-400/60 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>{homeTeamName} (Local)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1E293B] text-[#94A3B8]">
              {homeStarters.length + homeSubs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('away_team')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'away_team'
                ? 'bg-purple-600/30 text-white border border-purple-400/60 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>{awayTeamName} (Visitante)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1E293B] text-[#94A3B8]">
              {awayStarters.length + awaySubs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-amber-500/20 text-white border border-amber-400/50 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Eventos ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-emerald-500/20 text-white border border-emerald-400/50 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Notas</span>
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/80 border-b border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: DATOS GENERALES DEL PARTIDO */}
          {activeTab === 'info' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Marcador Central y Equipos */}
              <div className="p-5 rounded-xl bg-[#111827] border border-[#334155] space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                  <span>Equipos y Marcador Final</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                  {/* Local */}
                  <div className="md:col-span-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-[#94A3B8] block">Equipo Local</label>
                      <button
                        type="button"
                        onClick={() => handleAutoSearchLogo('home')}
                        disabled={isAutoSearchingLogo === 'home'}
                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Auto-buscar escudo en Paladar Negro Escudoteca"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isAutoSearchingLogo === 'home' ? 'Buscando...' : 'Buscar Escudo PN'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={() => setBadgeFinderTarget('home')}
                        className="w-12 h-12 rounded-xl bg-[#0A0D14] border border-[#334155] p-1 flex items-center justify-center shrink-0 cursor-pointer hover:border-amber-400 group relative transition-colors"
                        title="Click para cambiar o buscar escudo"
                      >
                        {homeLogoUrl ? (
                          <img
                            src={homeLogoUrl.startsWith('http') ? `/api/badge-proxy?url=${encodeURIComponent(homeLogoUrl)}` : homeLogoUrl}
                            alt={homeTeamName}
                            className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', homeLogoUrl);
                            }}
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-[#64748B] group-hover:text-amber-400" />
                        )}
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Search className="w-2.5 h-2.5" />
                        </span>
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={homeTeamName}
                          onChange={(e) => setHomeTeamName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-sm font-semibold focus:border-amber-500 focus:outline-none"
                          placeholder="Ej: Deportivo Camioneros"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#64748B]">Formación:</span>
                        <input
                          type="text"
                          value={homeFormation}
                          onChange={(e) => setHomeFormation(e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-[#0A0D14] border border-[#334155] text-amber-300 text-xs focus:border-amber-500 focus:outline-none"
                          placeholder="4-3-3"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setBadgeFinderTarget('home')}
                        className="text-[10px] text-[#94A3B8] hover:text-white underline cursor-pointer"
                      >
                        {homeLogoUrl ? 'Cambiar escudo...' : '+ Asignar escudo...'}
                      </button>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center space-y-1">
                    <span className="text-[10px] font-mono text-[#64748B] uppercase">Goles</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        min="0"
                        value={homeScore}
                        onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 py-1.5 text-center rounded bg-[#0A0D14] border border-[#334155] text-white text-lg font-bold focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-white font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        value={awayScore}
                        onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 py-1.5 text-center rounded bg-[#0A0D14] border border-[#334155] text-white text-lg font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Visitante */}
                  <div className="md:col-span-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAutoSearchLogo('away')}
                        disabled={isAutoSearchingLogo === 'away'}
                        className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Auto-buscar escudo en Paladar Negro Escudoteca"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isAutoSearchingLogo === 'away' ? 'Buscando...' : 'Buscar Escudo PN'}</span>
                      </button>
                      <label className="text-[11px] font-mono text-[#94A3B8] block text-right">Equipo Visitante</label>
                    </div>

                    <div className="flex items-center gap-2.5 flex-row-reverse">
                      <div
                        onClick={() => setBadgeFinderTarget('away')}
                        className="w-12 h-12 rounded-xl bg-[#0A0D14] border border-[#334155] p-1 flex items-center justify-center shrink-0 cursor-pointer hover:border-purple-400 group relative transition-colors"
                        title="Click para cambiar o buscar escudo"
                      >
                        {awayLogoUrl ? (
                          <img
                            src={awayLogoUrl.startsWith('http') ? `/api/badge-proxy?url=${encodeURIComponent(awayLogoUrl)}` : awayLogoUrl}
                            alt={awayTeamName}
                            className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', awayLogoUrl);
                            }}
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-[#64748B] group-hover:text-purple-400" />
                        )}
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-purple-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Search className="w-2.5 h-2.5" />
                        </span>
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={awayTeamName}
                          onChange={(e) => setAwayTeamName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-sm font-semibold focus:border-amber-500 focus:outline-none text-right"
                          placeholder="Ej: Flandria"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setBadgeFinderTarget('away')}
                        className="text-[10px] text-[#94A3B8] hover:text-white underline cursor-pointer"
                      >
                        {awayLogoUrl ? 'Cambiar escudo...' : '+ Asignar escudo...'}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#64748B]">Formación:</span>
                        <input
                          type="text"
                          value={awayFormation}
                          onChange={(e) => setAwayFormation(e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-[#0A0D14] border border-[#334155] text-purple-300 text-xs focus:border-amber-500 focus:outline-none text-right"
                          placeholder="4-2-3-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parámetros del Partido */}
              <div className="p-5 rounded-xl bg-[#111827] border border-[#334155] space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Competición, Fecha y Estadio
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8]">Competición / Torneo</label>
                    <input
                      type="text"
                      value={competition}
                      onChange={(e) => setCompetition(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="Ej: Liga Profesional Argentina"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8]">Jornada o Fase</label>
                    <input
                      type="text"
                      value={roundOrPhase}
                      onChange={(e) => setRoundOrPhase(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="Ej: Fecha 14, Cuartos de Final"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8]">Fecha del Partido</label>
                    <input
                      type="text"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="Ej: 2026-05-18 o 18 May 2026"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8]">Estadio</label>
                    <input
                      type="text"
                      value={stadium}
                      onChange={(e) => setStadium(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="Ej: Estadio Monumental"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8]">Árbitro</label>
                    <input
                      type="text"
                      value={referee}
                      onChange={(e) => setReferee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="Ej: Facundo Tello"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8]">Estado del Partido</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    >
                      <option value="FINISHED">FINALIZADO (FINISHED)</option>
                      <option value="LIVE">EN VIVO (LIVE)</option>
                      <option value="UPCOMING">PROGRAMADO (UPCOMING)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: PLANTEL LOCAL Y PLANTEL VISITANTE */}
          {(activeTab === 'home_team' || activeTab === 'away_team') && (
            <div className="space-y-6">
              {(() => {
                const isHome = activeTab === 'home_team';
                const teamSide = isHome ? 'home' : 'away';
                const currentTeamName = isHome ? homeTeamName : awayTeamName;
                const starters = isHome ? homeStarters : awayStarters;
                const subs = isHome ? homeSubs : awaySubs;

                return (
                  <div className="space-y-6">
                    {/* Subheader Toolbar */}
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#334155] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isHome ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                          <span>Plantel de {currentTeamName}</span>
                          <span className="text-xs font-mono text-[#94A3B8]">
                            ({starters.length} titulares • {subs.length} suplentes)
                          </span>
                        </h3>
                        <p className="text-[11px] font-mono text-[#64748B]">
                          Edita números, nombres, posiciones y minutos de cada jugador o cámbialos de categoría.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPlayer(isHome ? 'home_starters' : 'away_starters');
                            setNewPlayerNumber(10);
                            setNewPlayerName('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Agregar Titular</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPlayer(isHome ? 'home_subs' : 'away_subs');
                            setNewPlayerNumber(12);
                            setNewPlayerName('');
                            setNewPlayerMinutes(0);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white border border-[#334155] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Agregar Suplente</span>
                        </button>
                      </div>
                    </div>

                    {/* Modal / Form para agregar jugador si está abierto */}
                    {isAddingPlayer && (
                      <div className="p-4 rounded-xl bg-[#1E293B]/80 border border-amber-400/50 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            Nuevo Jugador ({isAddingPlayer.includes('starters') ? 'Titular' : 'Suplente'})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingPlayer(null)}
                            className="text-[#94A3B8] hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-mono text-[#94A3B8]">Dorsal (#)</label>
                            <input
                              type="number"
                              value={newPlayerNumber}
                              onChange={(e) => setNewPlayerNumber(parseInt(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white font-mono text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-mono text-[#94A3B8]">Nombre y Apellido</label>
                            <input
                              type="text"
                              value={newPlayerName}
                              onChange={(e) => setNewPlayerName(e.target.value)}
                              placeholder="Ej: Lionel Messi"
                              className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white font-mono text-xs"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-mono text-[#94A3B8]">Línea</label>
                            <select
                              value={newPlayerPosition}
                              onChange={(e) => setNewPlayerPosition(e.target.value as PlayerPosition)}
                              className="w-full px-2 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white font-mono text-xs"
                            >
                              <option value="GK">Arquero (GK)</option>
                              <option value="DF">Defensa (DF)</option>
                              <option value="MF">Mediocampo (MF)</option>
                              <option value="FW">Delantero (FW)</option>
                            </select>
                          </div>
                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-mono text-[#94A3B8]">Posición</label>
                            <input
                              type="text"
                              value={newPlayerPositionLabel}
                              onChange={(e) => setNewPlayerPositionLabel(e.target.value)}
                              placeholder="Ej: MC, DFC, ED"
                              className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white font-mono text-xs"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-mono text-[#94A3B8]">Minutos</label>
                            <input
                              type="number"
                              value={newPlayerMinutes}
                              onChange={(e) => setNewPlayerMinutes(parseInt(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingPlayer(null)}
                            className="px-3 py-1 text-xs font-mono text-[#94A3B8] hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddPlayerSubmit}
                            className="px-3.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs"
                          >
                            Agregar al Plantel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tabla de Titulares */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">
                          Titulares ({starters.length})
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#334155] bg-[#111827] overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="bg-[#0A0D14] text-[#64748B] border-b border-[#334155]">
                              <th className="p-2.5 w-12 text-center">#</th>
                              <th className="p-2.5">Nombre del Jugador</th>
                              <th className="p-2.5 w-24">Línea</th>
                              <th className="p-2.5 w-16 text-center">Pos.</th>
                              <th className="p-2.5 w-16 text-center">Min.</th>
                              <th className="p-2.5 min-w-[190px] text-center">Acciones (⚽ 🟨 🟥 🅰️)</th>
                              <th className="p-2.5 w-28 text-center">Rol</th>
                              <th className="p-2.5 w-10 text-center">Elim.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#334155]/40">
                            {starters.map((player, idx) => {
                              const { goals, yellowCards, redCards, assists } = getPlayerActionCounts(player);

                              return (
                                <tr key={player.id || idx} className="hover:bg-[#1E293B]/50 transition-colors">
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={player.number}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'starters', idx, 'number', parseInt(e.target.value) || 0)
                                      }
                                      className="w-10 px-1 py-0.5 rounded bg-[#0A0D14] border border-[#334155] text-center text-white text-xs font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={player.name}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'starters', idx, 'name', e.target.value)
                                      }
                                      className="w-full px-2 py-1 rounded bg-[#0A0D14] border border-[#334155] text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={player.position}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'starters', idx, 'position', e.target.value)
                                      }
                                      className="w-full px-1.5 py-1 rounded bg-[#0A0D14] border border-[#334155] text-xs text-[#94A3B8]"
                                    >
                                      <option value="GK">Arquero</option>
                                      <option value="DF">Defensa</option>
                                      <option value="MF">Medio</option>
                                      <option value="FW">Delantero</option>
                                    </select>
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="text"
                                      value={player.positionLabel || player.position}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'starters', idx, 'positionLabel', e.target.value)
                                      }
                                      className="w-14 px-1 py-0.5 rounded bg-[#0A0D14] border border-[#334155] text-center text-amber-300 text-xs font-mono uppercase"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={player.minutesPlayed}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'starters', idx, 'minutesPlayed', parseInt(e.target.value) || 0)
                                      }
                                      className="w-12 px-1 py-0.5 rounded bg-[#0A0D14] border border-[#334155] text-center text-[#94A3B8] text-xs"
                                    />
                                  </td>

                                  {/* Acciones para el jugador */}
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* Gol */}
                                      {goals === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'goals', 1)}
                                          title="Sumar gol (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-emerald-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          ⚽
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'goals', -1)}
                                            title="Restar gol (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'goals', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar gol (+1)"
                                          >
                                            ⚽{goals}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'goals', 1)}
                                            title="Sumar gol (+1)"
                                            className="px-1.5 h-full hover:bg-emerald-500/30 text-emerald-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Amarilla */}
                                      {yellowCards === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'yellowCards', 1)}
                                          title="Sumar amarilla (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-amber-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          🟨
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'yellowCards', -1)}
                                            title="Restar amarilla (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'yellowCards', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar amarilla (+1)"
                                          >
                                            🟨{yellowCards}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'yellowCards', 1)}
                                            title="Sumar amarilla (+1)"
                                            className="px-1.5 h-full hover:bg-amber-500/30 text-amber-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Roja */}
                                      {redCards === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'redCards', 1)}
                                          title="Sumar roja (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-rose-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          🟥
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'redCards', -1)}
                                            title="Quitar roja (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/40 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'redCards', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar roja (+1)"
                                          >
                                            🟥{redCards}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'redCards', 1)}
                                            title="Sumar roja (+1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Asistencia */}
                                      {assists === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'assists', 1)}
                                          title="Sumar asistencia (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-blue-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          🅰️
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-blue-500/20 border border-blue-500/50 text-blue-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'assists', -1)}
                                            title="Restar asistencia (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'assists', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar asistencia (+1)"
                                          >
                                            🅰️{assists}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'starters', idx, 'assists', 1)}
                                            title="Sumar asistencia (+1)"
                                            className="px-1.5 h-full hover:bg-blue-500/30 text-blue-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStarterSub(teamSide, 'starters', idx)}
                                      className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                                      title="Cambiar a Suplente"
                                    >
                                      Pasar a Suplente
                                    </button>
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlayer(teamSide, 'starters', idx)}
                                      className="p-1 rounded text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                                      title="Eliminar jugador"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tabla de Suplentes */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-wider">
                          Suplentes ({subs.length})
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#334155] bg-[#111827] overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="bg-[#0A0D14] text-[#64748B] border-b border-[#334155]">
                              <th className="p-2.5 w-12 text-center">#</th>
                              <th className="p-2.5">Nombre del Jugador</th>
                              <th className="p-2.5 w-24">Línea</th>
                              <th className="p-2.5 w-16 text-center">Pos.</th>
                              <th className="p-2.5 w-16 text-center">Min.</th>
                              <th className="p-2.5 min-w-[190px] text-center">Acciones (⚽ 🟨 🟥 🅰️)</th>
                              <th className="p-2.5 w-28 text-center">Rol</th>
                              <th className="p-2.5 w-10 text-center">Elim.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#334155]/40">
                            {subs.map((player, idx) => {
                              const { goals, yellowCards, redCards, assists } = getPlayerActionCounts(player);

                              return (
                                <tr key={player.id || idx} className="hover:bg-[#1E293B]/50 transition-colors">
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={player.number}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'subs', idx, 'number', parseInt(e.target.value) || 0)
                                      }
                                      className="w-10 px-1 py-0.5 rounded bg-[#0A0D14] border border-[#334155] text-center text-white text-xs font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={player.name}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'subs', idx, 'name', e.target.value)
                                      }
                                      className="w-full px-2 py-1 rounded bg-[#0A0D14] border border-[#334155] text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={player.position}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'subs', idx, 'position', e.target.value)
                                      }
                                      className="w-full px-1.5 py-1 rounded bg-[#0A0D14] border border-[#334155] text-xs text-[#94A3B8]"
                                    >
                                      <option value="GK">Arquero</option>
                                      <option value="DF">Defensa</option>
                                      <option value="MF">Medio</option>
                                      <option value="FW">Delantero</option>
                                    </select>
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="text"
                                      value={player.positionLabel || player.position}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'subs', idx, 'positionLabel', e.target.value)
                                      }
                                      className="w-14 px-1 py-0.5 rounded bg-[#0A0D14] border border-[#334155] text-center text-blue-300 text-xs font-mono uppercase"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={player.minutesPlayed}
                                      onChange={(e) =>
                                        handleUpdatePlayer(teamSide, 'subs', idx, 'minutesPlayed', parseInt(e.target.value) || 0)
                                      }
                                      className="w-12 px-1 py-0.5 rounded bg-[#0A0D14] border border-[#334155] text-center text-[#94A3B8] text-xs"
                                    />
                                  </td>

                                  {/* Acciones para el suplente */}
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* Gol */}
                                      {goals === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'goals', 1)}
                                          title="Sumar gol (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-emerald-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          ⚽
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'goals', -1)}
                                            title="Restar gol (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'goals', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar gol (+1)"
                                          >
                                            ⚽{goals}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'goals', 1)}
                                            title="Sumar gol (+1)"
                                            className="px-1.5 h-full hover:bg-emerald-500/30 text-emerald-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Amarilla */}
                                      {yellowCards === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'yellowCards', 1)}
                                          title="Sumar amarilla (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-amber-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          🟨
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'yellowCards', -1)}
                                            title="Restar amarilla (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'yellowCards', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar amarilla (+1)"
                                          >
                                            🟨{yellowCards}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'yellowCards', 1)}
                                            title="Sumar amarilla (+1)"
                                            className="px-1.5 h-full hover:bg-amber-500/30 text-amber-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Roja */}
                                      {redCards === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'redCards', 1)}
                                          title="Sumar roja (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-rose-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          🟥
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'redCards', -1)}
                                            title="Quitar roja (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/40 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'redCards', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar roja (+1)"
                                          >
                                            🟥{redCards}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'redCards', 1)}
                                            title="Sumar roja (+1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Asistencia */}
                                      {assists === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'assists', 1)}
                                          title="Sumar asistencia (+1)"
                                          className="h-6 min-w-[26px] px-1 rounded bg-[#0A0D14] border border-[#334155] text-xs hover:border-blue-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                          🅰️
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center rounded bg-blue-500/20 border border-blue-500/50 text-blue-300 h-6 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'assists', -1)}
                                            title="Restar asistencia (-1)"
                                            className="px-1.5 h-full hover:bg-rose-500/30 text-rose-300 font-bold"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'assists', 1)}
                                            className="px-1 font-bold text-[11px]"
                                            title="Sumar asistencia (+1)"
                                          >
                                            🅰️{assists}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickEventForPlayer(teamSide, 'subs', idx, 'assists', 1)}
                                            title="Sumar asistencia (+1)"
                                            className="px-1.5 h-full hover:bg-blue-500/30 text-blue-300 font-bold"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStarterSub(teamSide, 'subs', idx)}
                                      className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition-colors"
                                      title="Cambiar a Titular"
                                    >
                                      Pasar a Titular
                                    </button>
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlayer(teamSide, 'subs', idx)}
                                      className="p-1 rounded text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                                      title="Eliminar jugador"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: EVENTOS DEL PARTIDO (TIMELINE) */}
          {activeTab === 'events' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl bg-[#111827] border border-[#334155] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Cronología de Eventos ({events.length})</span>
                  </h3>
                  <p className="text-[11px] font-mono text-[#64748B]">
                    Goles, tarjetas y cambios registrados durante el partido.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Evento</span>
                </button>
              </div>

              {/* Formulario Agregar Evento */}
              {isAddingEvent && (
                <div className="p-4 rounded-xl bg-[#1E293B]/80 border border-amber-400/50 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 font-mono">Nuevo Evento de Partido</span>
                    <button type="button" onClick={() => setIsAddingEvent(false)} className="text-[#94A3B8] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-[#94A3B8] block">Minuto</label>
                      <input
                        type="number"
                        value={newEventMinute}
                        onChange={(e) => setNewEventMinute(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#94A3B8] block">Equipo</label>
                      <select
                        value={newEventTeamSide}
                        onChange={(e) => setNewEventTeamSide(e.target.value as 'home' | 'away')}
                        className="w-full px-2 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white"
                      >
                        <option value="home">{homeTeamName} (Local)</option>
                        <option value="away">{awayTeamName} (Visitante)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#94A3B8] block">Tipo de Evento</label>
                      <select
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value as MatchEventType)}
                        className="w-full px-2 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white"
                      >
                        <option value="goal">⚽ Gol</option>
                        <option value="yellow_card">🟨 Tarjeta Amarilla</option>
                        <option value="red_card">🟥 Tarjeta Roja</option>
                        <option value="substitution">🔄 Sustitución</option>
                        <option value="penalty_miss">❌ Penal Fallado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#94A3B8] block">Jugador</label>
                      <div className="space-y-1">
                        <select
                          value={newEventPlayerName}
                          onChange={(e) => setNewEventPlayerName(e.target.value)}
                          className="w-full px-2 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white text-xs"
                        >
                          <option value="">-- Seleccionar jugador del plantel --</option>
                          {(newEventTeamSide === 'home'
                            ? [...homeStarters, ...homeSubs]
                            : [...awayStarters, ...awaySubs]
                          ).map((p, pIdx) => (
                            <option key={p.id || `${p.name}_${pIdx}`} value={p.name}>
                              #{p.number} {p.name} ({p.positionLabel || p.position})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newEventPlayerName}
                          onChange={(e) => setNewEventPlayerName(e.target.value)}
                          placeholder="O escribir nombre si no está en la lista..."
                          className="w-full px-2.5 py-1 rounded bg-[#0A0D14] border border-[#334155] text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#94A3B8] block font-mono">Descripción (opcional)</label>
                    <input
                      type="text"
                      value={newEventDescription}
                      onChange={(e) => setNewEventDescription(e.target.value)}
                      placeholder="Ej: Remate de zurda cruzado tras tiro de esquina"
                      className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingEvent(false)}
                      className="px-3 py-1 text-xs font-mono text-[#94A3B8] hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddEventSubmit}
                      className="px-3.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs"
                    >
                      Guardar Evento
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de eventos */}
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[#64748B] border border-dashed border-[#334155] rounded-xl">
                    No hay eventos registrados en este partido.
                  </div>
                ) : (
                  events
                    .sort((a, b) => a.minute - b.minute)
                    .map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="p-3 rounded-lg bg-[#111827] border border-[#334155] flex items-center justify-between gap-3 text-xs font-mono hover:border-[#475569] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-[#0A0D14] border border-[#334155] font-bold text-amber-400">
                            {ev.minute}'
                          </span>
                          <span className="text-base">
                            {ev.type === 'goal'
                              ? '⚽'
                              : ev.type === 'yellow_card'
                              ? '🟨'
                              : ev.type === 'red_card'
                              ? '🟥'
                              : ev.type === 'substitution'
                              ? '🔄'
                              : '📌'}
                          </span>
                          <div>
                            <p className="font-semibold text-white">
                              {ev.playerName} <span className="text-[#64748B]">({ev.teamName})</span>
                            </p>
                            {ev.description && (
                              <p className="text-[11px] text-[#94A3B8]">{ev.description}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(idx)}
                          className="p-1.5 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: NOTAS DEL PARTIDO */}
          {activeTab === 'notes' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-4 rounded-xl bg-[#111827] border border-[#334155] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Notas Generales del Partido y Scouting</span>
                </h3>
                <p className="text-[11px] font-mono text-[#64748B]">
                  Observaciones tácticas, contexto de juego o conclusiones generales del informe.
                </p>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={8}
                  placeholder="Escribe notas sobre el trámite del partido, rendimiento de los esquemas tácticos, etc..."
                  className="w-full p-3 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 border-t border-[#334155] bg-[#111827] flex items-center justify-between gap-3 shrink-0 text-xs font-mono">
          <span className="text-[#64748B]">
            * Los cambios se aplicarán instantáneamente al informe activo y se guardarán en la base de datos local y en la nube.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal for searching & assigning team crest badges */}
      <TeamBadgeFinderModal
        isOpen={badgeFinderTarget !== null}
        onClose={() => setBadgeFinderTarget(null)}
        teamName={badgeFinderTarget === 'home' ? homeTeamName : awayTeamName}
        currentLogoUrl={badgeFinderTarget === 'home' ? homeLogoUrl : awayLogoUrl}
        onSelectBadge={(badgeUrl) => {
          if (badgeFinderTarget === 'home') {
            setHomeLogoUrl(badgeUrl);
          } else if (badgeFinderTarget === 'away') {
            setAwayLogoUrl(badgeUrl);
          }
          setBadgeFinderTarget(null);
        }}
      />
    </div>
  );
};
