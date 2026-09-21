import React, { useState } from 'react';
import { 
  CompleteMatchReport, 
  MatchDetails,
  MatchEvent,
  Player, 
  ScoutRatingLevel, 
  Team 
} from '../types/scouting';
import { MatchHeader } from './MatchHeader';
import { PlayerTable } from './PlayerTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { FormationPitch } from './FormationPitch';
import { MatchTimeline } from './MatchTimeline';
import { MatchNotes } from './MatchNotes';
import { FinalThirdPassesView } from './FinalThirdPassesView';
import { HeadToHeadComparison } from './HeadToHeadComparison';
import { ScoutingDossierModal } from './ScoutingDossierModal';
import { EditMatchModal } from './EditMatchModal';
import { 
  LayoutList, 
  Layers, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Swords,
  ChevronRight
} from 'lucide-react';
import { exportElementToPDF, exportElementToPNG } from '../utils/exportUtils';

interface MatchReportProps {
  report: CompleteMatchReport;
  onBack: () => void;
  onUpdateEvaluation: (playerId: string, rating?: number, level?: ScoutRatingLevel, comment?: string) => void;
  onUpdateEventNote: (eventId: string, note: string) => void;
  onUpdateMatchNotes: (notes: string) => void;
  onUpdateMatchReport?: (updatedReport: CompleteMatchReport) => void;
  onDeleteReport?: (reportId: string) => void;
}

export const MatchReport: React.FC<MatchReportProps> = ({
  report,
  onBack,
  onUpdateEvaluation,
  onUpdateEventNote,
  onUpdateMatchNotes,
  onUpdateMatchReport,
  onDeleteReport,
}) => {
  const { match, evaluations, eventNotes, meta } = report;

  // Selected team state: 'home' | 'away'
  const [selectedTeamSide, setSelectedTeamSide] = useState<'home' | 'away'>('home');

  // Active view tab: 'table' | 'formation' | 'final_third' | 'compare' | 'timeline' | 'notes'
  const [activeTab, setActiveTab] = useState<'table' | 'formation' | 'final_third' | 'compare' | 'timeline' | 'notes'>('table');

  // Selected player for deep detail panel
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Dossier modal open state
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);

  // Edit Match modal open state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // Exporting state
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active team data
  const currentTeam: Team = selectedTeamSide === 'home' ? match.homeTeam : match.awayTeam;

  const getCleanFilename = () => {
    const home = (match.homeTeam.name || 'local').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    const away = (match.awayTeam.name || 'visitante').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    return `informe_scouting_${home}_vs_${away}`;
  };

  const handleExportPDF = async () => {
    const el = document.getElementById('match-report-container');
    if (!el) return;
    setIsExporting(true);
    setExportFeedback(null);
    try {
      await exportElementToPDF(el, `${getCleanFilename()}.pdf`);
      setExportFeedback({ type: 'success', message: '¡Documento PDF descargado exitosamente!' });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      setExportFeedback({ type: 'error', message: err?.message || 'Error al exportar el PDF' });
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPNG = async () => {
    const el = document.getElementById('match-report-container');
    if (!el) return;
    setIsExporting(true);
    setExportFeedback(null);
    try {
      await exportElementToPNG(el, `${getCleanFilename()}.png`);
      setExportFeedback({ type: 'success', message: '¡Imagen PNG de alta resolución descargada!' });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      setExportFeedback({ type: 'error', message: err?.message || 'Error al exportar el PNG' });
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectPlayerById = (playerId: string) => {
    const all = [
      ...match.homeTeam.starters,
      ...match.homeTeam.substitutes,
      ...match.awayTeam.starters,
      ...match.awayTeam.substitutes,
    ];
    const found = all.find((p) => p.id === playerId);
    if (found) {
      setSelectedPlayer(found);
    }
  };

  const handleQuickActionForPlayer = (
    playerId: string,
    eventType: 'goals' | 'assists' | 'yellowCards' | 'redCards',
    delta: number
  ) => {
    // 1. Locate player across both teams
    const isHome =
      match.homeTeam.starters.some((p) => p.id === playerId) ||
      match.homeTeam.substitutes.some((p) => p.id === playerId);
    const targetTeam = isHome ? match.homeTeam : match.awayTeam;

    const allPlayers = [...targetTeam.starters, ...targetTeam.substitutes];
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player) return;

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

    const evGoals = match.events.filter((e) => e.type === 'goal' && e.subType !== 'own_goal' && isEvForPlayer(e.playerName, e.playerId)).length;
    const evAssists = match.events.filter((e) => e.type === 'goal' && isEvForPlayer(e.secondaryPlayerName, e.secondaryPlayerId)).length;
    const evYellows = match.events.filter((e) => e.type === 'yellow_card' && isEvForPlayer(e.playerName, e.playerId)).length;
    const evReds = match.events.filter((e) => (e.type === 'red_card' || e.type === 'yellow_red_card' || e.subType === 'second_yellow' || e.subType === 'direct_red') && isEvForPlayer(e.playerName, e.playerId)).length;

    const currentGoals = Math.max(player.statistics?.attack?.goals || 0, evGoals);
    const currentAssists = Math.max(player.statistics?.attack?.assists || 0, evAssists);
    const currentYellows = Math.max(player.statistics?.discipline?.yellowCards || 0, evYellows);
    const currentReds = Math.max(player.statistics?.discipline?.redCards || 0, evReds);

    let newGoals = currentGoals;
    let newAssists = currentAssists;
    let newYellows = currentYellows;
    let newReds = currentReds;

    if (eventType === 'goals') newGoals = Math.max(0, currentGoals + delta);
    if (eventType === 'assists') newAssists = Math.max(0, currentAssists + delta);
    if (eventType === 'yellowCards') newYellows = Math.max(0, currentYellows + delta);
    if (eventType === 'redCards') newReds = Math.max(0, currentReds + delta);

    const updatePlayer = (p: Player): Player => {
      if (p.id !== player.id) return p;
      return {
        ...p,
        statistics: {
          ...p.statistics,
          minutesPlayed: p.minutesPlayed ?? 90,
          attack: {
            ...p.statistics?.attack,
            goals: newGoals,
            assists: newAssists,
          },
          discipline: {
            ...p.statistics?.discipline,
            yellowCards: newYellows,
            redCards: newReds,
          },
        },
      };
    };

    const updatedStarters = targetTeam.starters.map(updatePlayer);
    const updatedSubs = targetTeam.substitutes.map(updatePlayer);

    let updatedEvents = [...match.events];

    if (delta > 0) {
      const newEventId = `ev_${eventType}_${player.id}_${Date.now()}`;
      const minute = 45;
      if (eventType === 'goals') {
        updatedEvents.push({
          id: newEventId,
          minute,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          type: 'goal',
          playerId: player.id,
          playerName: player.name,
          playerNumber: player.number,
          description: `Gol de ${player.name}`,
        });
      } else if (eventType === 'assists') {
        updatedEvents.push({
          id: newEventId,
          minute,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          type: 'goal',
          secondaryPlayerId: player.id,
          secondaryPlayerName: player.name,
          secondaryPlayerNumber: player.number,
          playerId: `scorer_${Date.now()}`,
          playerName: targetTeam.name,
          description: `Asistencia de ${player.name}`,
        });
      } else if (eventType === 'yellowCards') {
        updatedEvents.push({
          id: newEventId,
          minute,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          type: 'yellow_card',
          playerId: player.id,
          playerName: player.name,
          playerNumber: player.number,
          description: `Tarjeta amarilla para ${player.name}`,
        });
      } else if (eventType === 'redCards') {
        updatedEvents.push({
          id: newEventId,
          minute,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          type: 'red_card',
          subType: 'direct_red',
          playerId: player.id,
          playerName: player.name,
          playerNumber: player.number,
          description: `Tarjeta roja para ${player.name}`,
        });
      }
    } else if (delta < 0) {
      let idxToRemove = -1;
      for (let i = updatedEvents.length - 1; i >= 0; i--) {
        const e = updatedEvents[i];
        if (eventType === 'goals' && e.type === 'goal' && isEvForPlayer(e.playerName, e.playerId)) {
          idxToRemove = i;
          break;
        }
        if (eventType === 'assists' && e.type === 'goal' && isEvForPlayer(e.secondaryPlayerName, e.secondaryPlayerId)) {
          idxToRemove = i;
          break;
        }
        if (eventType === 'yellowCards' && e.type === 'yellow_card' && isEvForPlayer(e.playerName, e.playerId)) {
          idxToRemove = i;
          break;
        }
        if (eventType === 'redCards' && (e.type === 'red_card' || e.type === 'yellow_red_card') && isEvForPlayer(e.playerName, e.playerId)) {
          idxToRemove = i;
          break;
        }
      }
      if (idxToRemove >= 0) {
        updatedEvents.splice(idxToRemove, 1);
      }
    }

    let updatedHomeScore = match.homeTeam.score;
    let updatedAwayScore = match.awayTeam.score;

    if (eventType === 'goals') {
      const diff = newGoals - currentGoals;
      if (isHome) {
        updatedHomeScore = Math.max(0, updatedHomeScore + diff);
      } else {
        updatedAwayScore = Math.max(0, updatedAwayScore + diff);
      }
    }

    const updatedHomeTeam: Team = isHome
      ? {
          ...match.homeTeam,
          score: updatedHomeScore,
          starters: updatedStarters,
          substitutes: updatedSubs,
        }
      : match.homeTeam;

    const updatedAwayTeam: Team = !isHome
      ? {
          ...match.awayTeam,
          score: updatedAwayScore,
          starters: updatedStarters,
          substitutes: updatedSubs,
        }
      : match.awayTeam;

    const updatedMatch: MatchDetails = {
      ...match,
      homeTeam: updatedHomeTeam,
      awayTeam: updatedAwayTeam,
      events: updatedEvents,
    };

    const updatedReport: CompleteMatchReport = {
      ...report,
      match: updatedMatch,
      meta: {
        ...report.meta,
        score: `${updatedHomeScore} - ${updatedAwayScore}`,
        updatedAt: new Date().toISOString(),
      },
    };

    if (selectedPlayer && selectedPlayer.id === player.id) {
      const updatedP = [...updatedStarters, ...updatedSubs].find((p) => p.id === player.id);
      if (updatedP) {
        setSelectedPlayer(updatedP);
      }
    }

    if (onUpdateMatchReport) {
      onUpdateMatchReport(updatedReport);
    }
  };

  const handleAddEvent = (newEvent: MatchEvent) => {
    const updatedEvents = [...match.events, newEvent].sort((a, b) => (a.minute || 0) - (b.minute || 0));

    let homeScore = match.homeTeam.score;
    let awayScore = match.awayTeam.score;

    if (newEvent.type === 'goal') {
      if (newEvent.teamId === match.homeTeam.id) {
        homeScore += 1;
      } else if (newEvent.teamId === match.awayTeam.id) {
        awayScore += 1;
      }
    }

    const updatePlayer = (p: Player): Player => {
      if (p.id !== newEvent.playerId && p.id !== newEvent.secondaryPlayerId) return p;
      const newStats = { ...(p.statistics || { minutesPlayed: 90 }) };
      if (newEvent.type === 'goal' && p.id === newEvent.playerId) {
        newStats.attack = {
          ...newStats.attack,
          goals: (newStats.attack?.goals || 0) + 1,
        };
      }
      if (newEvent.type === 'goal' && p.id === newEvent.secondaryPlayerId) {
        newStats.attack = {
          ...newStats.attack,
          assists: (newStats.attack?.assists || 0) + 1,
        };
      }
      if (newEvent.type === 'yellow_card' && p.id === newEvent.playerId) {
        newStats.discipline = {
          ...newStats.discipline,
          yellowCards: (newStats.discipline?.yellowCards || 0) + 1,
        };
      }
      if ((newEvent.type === 'red_card' || newEvent.type === 'yellow_red_card') && p.id === newEvent.playerId) {
        newStats.discipline = {
          ...newStats.discipline,
          redCards: (newStats.discipline?.redCards || 0) + 1,
        };
      }
      return { ...p, statistics: newStats };
    };

    const updatedHomeStarters = match.homeTeam.starters.map(updatePlayer);
    const updatedHomeSubs = match.homeTeam.substitutes.map(updatePlayer);
    const updatedAwayStarters = match.awayTeam.starters.map(updatePlayer);
    const updatedAwaySubs = match.awayTeam.substitutes.map(updatePlayer);

    const updatedReport: CompleteMatchReport = {
      ...report,
      match: {
        ...match,
        homeTeam: {
          ...match.homeTeam,
          score: homeScore,
          starters: updatedHomeStarters,
          substitutes: updatedHomeSubs,
        },
        awayTeam: {
          ...match.awayTeam,
          score: awayScore,
          starters: updatedAwayStarters,
          substitutes: updatedAwaySubs,
        },
        events: updatedEvents,
      },
      meta: {
        ...report.meta,
        score: `${homeScore} - ${awayScore}`,
        updatedAt: new Date().toISOString(),
      },
    };

    if (onUpdateMatchReport) {
      onUpdateMatchReport(updatedReport);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    const evToDelete = match.events.find((e) => e.id === eventId);
    if (!evToDelete) return;

    const updatedEvents = match.events.filter((e) => e.id !== eventId);

    let homeScore = match.homeTeam.score;
    let awayScore = match.awayTeam.score;

    if (evToDelete.type === 'goal') {
      if (evToDelete.teamId === match.homeTeam.id) {
        homeScore = Math.max(0, homeScore - 1);
      } else if (evToDelete.teamId === match.awayTeam.id) {
        awayScore = Math.max(0, awayScore - 1);
      }
    }

    const updatePlayer = (p: Player): Player => {
      if (p.id !== evToDelete.playerId && p.id !== evToDelete.secondaryPlayerId) return p;
      const newStats = { ...(p.statistics || { minutesPlayed: 90 }) };
      if (evToDelete.type === 'goal' && p.id === evToDelete.playerId) {
        newStats.attack = {
          ...newStats.attack,
          goals: Math.max(0, (newStats.attack?.goals || 0) - 1),
        };
      }
      if (evToDelete.type === 'goal' && p.id === evToDelete.secondaryPlayerId) {
        newStats.attack = {
          ...newStats.attack,
          assists: Math.max(0, (newStats.attack?.assists || 0) - 1),
        };
      }
      if (evToDelete.type === 'yellow_card' && p.id === evToDelete.playerId) {
        newStats.discipline = {
          ...newStats.discipline,
          yellowCards: Math.max(0, (newStats.discipline?.yellowCards || 0) - 1),
        };
      }
      if ((evToDelete.type === 'red_card' || evToDelete.type === 'yellow_red_card') && p.id === evToDelete.playerId) {
        newStats.discipline = {
          ...newStats.discipline,
          redCards: Math.max(0, (newStats.discipline?.redCards || 0) - 1),
        };
      }
      return { ...p, statistics: newStats };
    };

    const updatedHomeStarters = match.homeTeam.starters.map(updatePlayer);
    const updatedHomeSubs = match.homeTeam.substitutes.map(updatePlayer);
    const updatedAwayStarters = match.awayTeam.starters.map(updatePlayer);
    const updatedAwaySubs = match.awayTeam.substitutes.map(updatePlayer);

    const updatedReport: CompleteMatchReport = {
      ...report,
      match: {
        ...match,
        homeTeam: {
          ...match.homeTeam,
          score: homeScore,
          starters: updatedHomeStarters,
          substitutes: updatedHomeSubs,
        },
        awayTeam: {
          ...match.awayTeam,
          score: awayScore,
          starters: updatedAwayStarters,
          substitutes: updatedAwaySubs,
        },
        events: updatedEvents,
      },
      meta: {
        ...report.meta,
        score: `${homeScore} - ${awayScore}`,
        updatedAt: new Date().toISOString(),
      },
    };

    if (onUpdateMatchReport) {
      onUpdateMatchReport(updatedReport);
    }
  };

  return (
    <div id="match-report-container" className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0D14] relative">
      {/* Toast notification for exports */}
      {exportFeedback && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2.5 text-xs font-mono transition-all animate-bounce ${
            exportFeedback.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950 border-rose-500/50 text-rose-300'
          }`}
        >
          {exportFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{exportFeedback.message}</span>
        </div>
      )}

      {/* Top Match Header */}
      <MatchHeader
        match={match}
        onBack={onBack}
        onExportPDF={handleExportPDF}
        onExportPNG={handleExportPNG}
        onOpenDossier={() => setShowDossierModal(true)}
        onOpenEdit={() => setShowEditModal(true)}
        onOpenNotes={() => setActiveTab('notes')}
        hasNotes={Boolean(meta?.generalNotes || (report as any).generalNotes)}
        onDelete={onDeleteReport ? () => onDeleteReport(meta.id) : undefined}
        isExporting={isExporting}
      />

      {/* Main Analysis Body + Contextual Player Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Central Analysis Workspace */}
        <div className="flex-1 flex flex-col overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Match Notes Banner (when notes exist and not already in notes tab) */}
          {Boolean(meta?.generalNotes || (report as any).generalNotes) && activeTab !== 'notes' && (
            <div 
              onClick={() => setActiveTab('notes')}
              className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-500/70 transition-all cursor-pointer flex items-start justify-between gap-3 shadow-sm group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-300 block tracking-wider">
                    Notas Generales del Partido
                  </span>
                  <p className="text-xs text-[#E5E7EB] line-clamp-2 leading-relaxed italic">
                    "{meta?.generalNotes || (report as any).generalNotes}"
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 group-hover:underline shrink-0 font-bold flex items-center gap-1">
                <span>Editar notas</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          )}

          {/* Controls Toolbar: Team Selector & Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#111827] p-2 sm:p-2.5 rounded-lg border border-[#334155]/80 shrink-0">
            {/* Team Selector: [ Equipo local ] [ Equipo visitante ] */}
            <div className="flex items-center gap-1 bg-[#0A0D14] p-1 rounded border border-[#334155] text-xs font-mono shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTeamSide('home')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 font-bold cursor-pointer text-xs ${
                  selectedTeamSide === 'home'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <img
                  src={match.homeTeam.logoUrl}
                  alt={match.homeTeam.name}
                  className="w-4 h-4 object-contain shrink-0"
                />
                <span className="truncate max-w-[90px] sm:max-w-none">{match.homeTeam.name}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTeamSide('away')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 font-bold cursor-pointer text-xs ${
                  selectedTeamSide === 'away'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <img
                  src={match.awayTeam.logoUrl}
                  alt={match.awayTeam.name}
                  className="w-4 h-4 object-contain shrink-0"
                />
                <span className="truncate max-w-[90px] sm:max-w-none">{match.awayTeam.name}</span>
              </button>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'table'
                    ? 'bg-[#1E293B] text-white border border-[#334155] font-semibold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5 text-blue-400" />
                <span>Alineaciones</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('formation')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'formation'
                    ? 'bg-[#1E293B] text-white border border-[#334155] font-semibold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Formación</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('compare')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'compare'
                    ? 'bg-[#1E293B] text-white border border-rose-500/50 font-semibold text-rose-300'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span>1v1</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('final_third')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'final_third'
                    ? 'bg-[#1E293B] text-white border border-[#334155] font-semibold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Pases 3/3</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'timeline'
                    ? 'bg-[#1E293B] text-white border border-[#334155] font-semibold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Timeline ({match.events.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`px-2.5 sm:px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'notes'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold'
                    : meta?.generalNotes || (report as any).generalNotes
                    ? 'text-emerald-400 hover:text-emerald-300 font-medium'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{meta?.generalNotes || (report as any).generalNotes ? 'Notas ●' : 'Notas'}</span>
              </button>
            </div>
          </div>

          {/* VIEW: TABLE (TITULARES & SUPLENTES) */}
          {activeTab === 'table' && (
            <div className="space-y-6">
              {/* Titulares */}
              <PlayerTable
                title={`Titulares — ${currentTeam.name} (${currentTeam.formation})`}
                players={currentTeam.starters}
                evaluations={evaluations}
                selectedPlayerId={selectedPlayer?.id}
                onSelectPlayer={(player) => setSelectedPlayer(player)}
                events={match.events}
                onQuickAction={(playerId, eventType, delta) => handleQuickActionForPlayer(playerId, eventType, delta)}
              />

              {/* Suplentes */}
              <PlayerTable
                title={`Suplentes — ${currentTeam.name}`}
                players={currentTeam.substitutes}
                evaluations={evaluations}
                selectedPlayerId={selectedPlayer?.id}
                onSelectPlayer={(player) => setSelectedPlayer(player)}
                events={match.events}
                onQuickAction={(playerId, eventType, delta) => handleQuickActionForPlayer(playerId, eventType, delta)}
              />
            </div>
          )}

          {/* VIEW: FORMATION PITCH */}
          {activeTab === 'formation' && (
            <FormationPitch
              starters={currentTeam.starters}
              teamName={currentTeam.name}
              formation={currentTeam.formation}
              selectedPlayerId={selectedPlayer?.id}
              onSelectPlayer={(player) => setSelectedPlayer(player)}
              events={match.events}
            />
          )}

          {/* VIEW: HEAD TO HEAD 1v1 COMPARISON */}
          {activeTab === 'compare' && (
            <HeadToHeadComparison
              match={match}
              initialPlayerA={selectedPlayer || undefined}
            />
          )}

          {/* VIEW: FINAL THIRD PASSES */}
          {activeTab === 'final_third' && (
            <FinalThirdPassesView
              homeTeamName={match.homeTeam.name}
              awayTeamName={match.awayTeam.name}
              homePlayers={[...match.homeTeam.starters, ...match.homeTeam.substitutes]}
              awayPlayers={[...match.awayTeam.starters, ...match.awayTeam.substitutes]}
              selectedPlayerId={selectedPlayer?.id}
              onSelectPlayer={(player) => setSelectedPlayer(player)}
            />
          )}

          {/* VIEW: MATCH TIMELINE */}
          {activeTab === 'timeline' && (
            <MatchTimeline
              events={match.events}
              eventNotes={eventNotes}
              onSaveEventNote={onUpdateEventNote}
              onSelectPlayerById={handleSelectPlayerById}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              homeTeamName={match.homeTeam.name}
              awayTeamName={match.awayTeam.name}
              players={[
                ...match.homeTeam.starters,
                ...match.homeTeam.substitutes,
                ...match.awayTeam.starters,
                ...match.awayTeam.substitutes,
              ]}
            />
          )}

          {/* VIEW: GENERAL MATCH NOTES */}
          {activeTab === 'notes' && (
            <MatchNotes
              initialNotes={meta.generalNotes || ''}
              onSaveNotes={onUpdateMatchNotes}
            />
          )}
        </div>

        {/* Right Collapsible Player Detail Panel */}
        {selectedPlayer && (
          <PlayerDetailPanel
            player={selectedPlayer}
            evaluation={evaluations[selectedPlayer.id]}
            matchId={match.id}
            events={match.events}
            onClose={() => setSelectedPlayer(null)}
            onQuickAction={(eventType, delta) => handleQuickActionForPlayer(selectedPlayer.id, eventType, delta)}
            onSaveObservation={(comment) => {
              const currentEval = evaluations[selectedPlayer.id];
              onUpdateEvaluation(
                selectedPlayer.id,
                currentEval?.rating,
                currentEval?.ratingLevel,
                comment
              );
            }}
            onSaveRating={(rating, level) => {
              const currentEval = evaluations[selectedPlayer.id];
              onUpdateEvaluation(
                selectedPlayer.id,
                rating,
                level,
                currentEval?.comment
              );
            }}
          />
        )}
      </div>

      {/* Scouting Dossier Modal */}
      {showDossierModal && (
        <ScoutingDossierModal
          report={report}
          onClose={() => setShowDossierModal(false)}
        />
      )}

      {/* Edit Match Modal */}
      {showEditModal && (
        <EditMatchModal
          report={report}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={async (updatedReport) => {
            if (onUpdateMatchReport) {
              await onUpdateMatchReport(updatedReport);
            }
            setExportFeedback({ type: 'success', message: '¡Partido actualizado correctamente!' });
            setTimeout(() => setExportFeedback(null), 4000);
          }}
        />
      )}
    </div>
  );
};
