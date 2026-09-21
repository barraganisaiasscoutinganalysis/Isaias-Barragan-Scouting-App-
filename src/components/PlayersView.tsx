import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Star, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Trophy, 
  Filter, 
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Edit3,
  Download,
  Trash2,
  Building2,
  Sparkles,
  AlertCircle,
  Plus,
  Save,
  Check,
  FileText,
  ShieldCheck,
  FileDown
} from 'lucide-react';
import { 
  CompleteMatchReport, 
  Player, 
  PlayerGeneralReport, 
  PlayerRecommendation 
} from '../types/scouting';
import { getCountryFlagUrl, sanitizePlayerName, cleanCompetitionName } from '../utils/countryFlags';
import { storageService } from '../services/storage/storageService';
import { exportElementToPDF, exportElementToPNG } from '../utils/exportUtils';
import { resolvePlayerPosition, matchesPlayerPosition } from '../utils/positionUtils';
import { PositionBadge } from './PositionBadge';

interface PlayersViewProps {
  reports: CompleteMatchReport[];
  onOpenReportWithPlayer: (reportId: string, playerId: string) => void;
}

export interface PlayerEvaluationEntry {
  reportId: string;
  matchTitle: string;
  matchDate?: string;
  competition?: string;
  comment?: string;
  rating?: number;
  ratingLevel?: string;
  updatedAt: string;
}

export interface GroupedPlayer {
  key: string;
  player: Player;
  teamName?: string;
  evaluations: PlayerEvaluationEntry[];
  latestUpdatedAt: string;
}

const RECOMMENDATION_CONFIG: Record<PlayerRecommendation, {
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: string;
  desc: string;
}> = {
  SIGN: {
    label: 'Fichar (Prioridad Alta)',
    shortLabel: 'Fichar',
    badgeBg: 'bg-emerald-950/80',
    badgeBorder: 'border-emerald-500/60',
    badgeText: 'text-emerald-300',
    icon: '🟢',
    desc: 'Perfil óptimo. Listo para incorporación.'
  },
  MONITOR: {
    label: 'Seguimiento (En Cartera)',
    shortLabel: 'Seguimiento',
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-500/60',
    badgeText: 'text-amber-300',
    icon: '🟡',
    desc: 'Condiciones notables. Requiere más partidos.'
  },
  FUTURE: {
    label: 'A Futuro (Promesa)',
    shortLabel: 'A Futuro',
    badgeBg: 'bg-cyan-950/80',
    badgeBorder: 'border-cyan-500/60',
    badgeText: 'text-cyan-300',
    icon: '🔵',
    desc: 'Excelente proyección a mediano o largo plazo.'
  },
  DISCARD: {
    label: 'Descartar',
    shortLabel: 'Descartado',
    badgeBg: 'bg-rose-950/80',
    badgeBorder: 'border-rose-500/60',
    badgeText: 'text-rose-300',
    icon: '🔴',
    desc: 'No encaja en los objetivos actuales del club.'
  }
};

const SUGGESTED_ROLES = [
  'Titular indiscutido',
  'Rotación inmediata',
  'Joven promesa',
  'Fondo de armario',
  'Alternativa de mercado'
];

export const PlayersView: React.FC<PlayersViewProps> = ({
  reports,
  onOpenReportWithPlayer,
}) => {
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'EVALUATED' | 'ALL'>('EVALUATED');
  
  // Accordion open/close state
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});

  // General reports from storage
  const [playerReports, setPlayerReports] = useState<Record<string, PlayerGeneralReport>>({});
  
  // Form editing state for General Report
  const [editingReportKey, setEditingReportKey] = useState<string | null>(null);
  const [reportFormData, setReportFormData] = useState<Partial<PlayerGeneralReport>>({});
  const [savingFeedbackKey, setSavingFeedbackKey] = useState<string | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  // Load saved general reports on mount
  useEffect(() => {
    storageService.getAllPlayerGeneralReports().then((res) => {
      if (res) setPlayerReports(res);
    });
  }, []);

  // Collect all unique teams available across reports
  const availableTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    reports.forEach((r) => {
      if (r.match.homeTeam?.name) {
        teamsSet.add(r.match.homeTeam.shortName || r.match.homeTeam.name);
      }
      if (r.match.awayTeam?.name) {
        teamsSet.add(r.match.awayTeam.shortName || r.match.awayTeam.name);
      }
    });
    return Array.from(teamsSet).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [reports]);

  // Group all players across reports
  const allGroupedPlayers = useMemo(() => {
    const playerMap = new Map<string, GroupedPlayer>();

    reports.forEach((rep) => {
      const homeTeamName = rep.match.homeTeam.shortName || rep.match.homeTeam.name;
      const awayTeamName = rep.match.awayTeam.shortName || rep.match.awayTeam.name;
      const matchTitle = `${homeTeamName} vs ${awayTeamName}`;
      const competition = cleanCompetitionName(rep.meta.competition || rep.match.competition);
      const matchDate = rep.meta.matchDate || rep.match.date;

      const allPlayersWithTeam = [
        ...rep.match.homeTeam.starters.map((p) => ({ player: p, teamName: homeTeamName })),
        ...rep.match.homeTeam.substitutes.map((p) => ({ player: p, teamName: homeTeamName })),
        ...rep.match.awayTeam.starters.map((p) => ({ player: p, teamName: awayTeamName })),
        ...rep.match.awayTeam.substitutes.map((p) => ({ player: p, teamName: awayTeamName })),
      ];

      allPlayersWithTeam.forEach(({ player: p, teamName }) => {
        const groupKey = p.id || p.name.toLowerCase().trim();
        
        // Match evaluation flexibly by p.id, string ID, prefixed ID, or player name
        const rawId = String(p.id || '');
        const strippedId = rawId.replace(/^sofa-/, '');
        const ev = rep.evaluations[p.id] ||
                   rep.evaluations[rawId] ||
                   rep.evaluations[`sofa-${rawId}`] ||
                   rep.evaluations[strippedId] ||
                   Object.values(rep.evaluations || {}).find((e: any) => {
                     if (!e) return false;
                     const eId = String(e.playerId || '');
                     return eId === rawId || 
                            eId === strippedId || 
                            eId === `sofa-${rawId}` ||
                            eId === `sofa-${strippedId}` ||
                            (p.name && e.playerName && e.playerName.toLowerCase().trim() === p.name.toLowerCase().trim());
                   });

        const hasEvaluation = ev && (Boolean(ev.comment && ev.comment.trim()) || ev.rating !== undefined || Boolean(ev.ratingLevel));

        if (!playerMap.has(groupKey)) {
          playerMap.set(groupKey, {
            key: groupKey,
            player: p,
            teamName,
            evaluations: [],
            latestUpdatedAt: ev?.updatedAt || matchDate || '',
          });
        }

        const existing = playerMap.get(groupKey)!;
        if (teamName && !existing.teamName) {
          existing.teamName = teamName;
        }

        // Retain the most complete position details (e.g. starter or specific tactical tag)
        if (p.isStarter && !existing.player.isStarter) {
          existing.player = { ...existing.player, ...p, isStarter: true };
        } else if (p.positionLabel && p.positionLabel !== 'MC' && (!existing.player.positionLabel || existing.player.positionLabel === 'MC')) {
          existing.player = { ...existing.player, positionLabel: p.positionLabel, position: p.position || existing.player.position };
        }

        if (hasEvaluation && ev) {
          const evalEntry: PlayerEvaluationEntry = {
            reportId: rep.meta.id,
            matchTitle,
            matchDate,
            competition,
            comment: ev.comment,
            rating: ev.rating,
            ratingLevel: ev.ratingLevel,
            updatedAt: ev.updatedAt || matchDate || '',
          };
          if (!existing.evaluations.some((e) => e.reportId === rep.meta.id)) {
            existing.evaluations.push(evalEntry);
          }
          if (evalEntry.updatedAt > existing.latestUpdatedAt) {
            existing.latestUpdatedAt = evalEntry.updatedAt;
          }
        }
      });
    });

    return Array.from(playerMap.values());
  }, [reports]);

  // Counts by tactical line
  const positionCounts = useMemo(() => {
    const counts = { ALL: 0, GK: 0, DEF: 0, MID: 0, FWD: 0 };
    const baseList = allGroupedPlayers.filter((gp) => {
      const hasGeneralReport = Boolean(playerReports[gp.key]);
      const hasEvaluations = gp.evaluations.length > 0;
      if (viewScope === 'EVALUATED') {
        if (!hasEvaluations && !hasGeneralReport) return false;
      }
      if (selectedTeam !== 'ALL' && (!gp.teamName || gp.teamName.toLowerCase() !== selectedTeam.toLowerCase())) {
        return false;
      }
      return true;
    });

    baseList.forEach((gp) => {
      counts.ALL++;
      const info = resolvePlayerPosition(gp.player);
      if (info.category === 'GK') counts.GK++;
      else if (info.category === 'DF') counts.DEF++;
      else if (info.category === 'MF') counts.MID++;
      else if (info.category === 'FW') counts.FWD++;
    });

    return counts;
  }, [allGroupedPlayers, playerReports, viewScope, selectedTeam]);

  // Filtered player list
  const filteredPlayers = useMemo(() => {
    return allGroupedPlayers
      .filter((gp) => {
        const hasGeneralReport = Boolean(playerReports[gp.key]);
        const hasEvaluations = gp.evaluations.length > 0;

        // View scope: only evaluated (or with general report) vs all match players
        if (viewScope === 'EVALUATED') {
          if (!hasEvaluations && !hasGeneralReport) return false;
        }

        // Team filter
        if (selectedTeam !== 'ALL') {
          if (!gp.teamName || gp.teamName.toLowerCase() !== selectedTeam.toLowerCase()) {
            return false;
          }
        }

        // Position filter using accurate matcher
        if (!matchesPlayerPosition(gp.player, selectedPosition)) {
          return false;
        }

        // Recommendation filter
        if (selectedRecommendation !== 'ALL') {
          const gen = playerReports[gp.key];
          if (selectedRecommendation === 'HAS_REPORT') {
            if (!gen) return false;
          } else {
            if (!gen || gen.recommendation !== selectedRecommendation) return false;
          }
        }

        // Text search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const posInfo = resolvePlayerPosition(gp.player);
          const matchesName = gp.player.name.toLowerCase().includes(q);
          const matchesPos = 
            gp.player.positionLabel?.toLowerCase().includes(q) ||
            posInfo.positionLabel.toLowerCase().includes(q) ||
            posInfo.positionName.toLowerCase().includes(q) ||
            posInfo.lineName.toLowerCase().includes(q);
          const matchesNat = gp.player.nationality?.toLowerCase().includes(q);
          const matchesTeam = gp.teamName?.toLowerCase().includes(q);
          const gen = playerReports[gp.key];
          const matchesGeneral = gen && (
            gen.summaryNotes?.toLowerCase().includes(q) ||
            gen.strengths?.toLowerCase().includes(q) ||
            gen.weaknesses?.toLowerCase().includes(q) ||
            gen.projectedRole?.toLowerCase().includes(q)
          );
          const matchesEvals = gp.evaluations.some((ev) =>
            ev.comment?.toLowerCase().includes(q) ||
            ev.matchTitle.toLowerCase().includes(q) ||
            ev.competition?.toLowerCase().includes(q)
          );

          return matchesName || matchesPos || matchesNat || matchesTeam || matchesGeneral || matchesEvals;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by general report updated or latest match observation
        const genA = playerReports[a.key]?.updatedAt || a.latestUpdatedAt || '';
        const genB = playerReports[b.key]?.updatedAt || b.latestUpdatedAt || '';
        return new Date(genB).getTime() - new Date(genA).getTime();
      });
  }, [
    allGroupedPlayers,
    playerReports,
    viewScope,
    selectedTeam,
    selectedPosition,
    selectedRecommendation,
    searchQuery,
  ]);

  const toggleExpand = (key: string) => {
    setExpandedPlayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startEditGeneralReport = (group: GroupedPlayer) => {
    const existing = playerReports[group.key];
    setEditingReportKey(group.key);
    setExpandedPlayers((prev) => ({ ...prev, [group.key]: true }));
    setReportFormData({
      playerId: group.key,
      playerName: group.player.name,
      teamName: group.teamName,
      positionLabel: group.player.positionLabel,
      overallRating: existing?.overallRating ?? 7.5,
      recommendation: existing?.recommendation ?? 'MONITOR',
      projectedRole: existing?.projectedRole ?? '',
      strengths: existing?.strengths ?? '',
      weaknesses: existing?.weaknesses ?? '',
      summaryNotes: existing?.summaryNotes ?? '',
    });
  };

  const handleSaveGeneralReport = async (groupKey: string) => {
    const group = allGroupedPlayers.find((g) => g.key === groupKey);
    const dataToSave: PlayerGeneralReport = {
      playerId: groupKey,
      playerName: reportFormData.playerName || group?.player.name || 'Jugador',
      teamName: reportFormData.teamName || group?.teamName,
      positionLabel: reportFormData.positionLabel || group?.player.positionLabel,
      overallRating: Number(reportFormData.overallRating) || 7.0,
      recommendation: (reportFormData.recommendation as PlayerRecommendation) || 'MONITOR',
      projectedRole: reportFormData.projectedRole?.trim() || '',
      strengths: reportFormData.strengths?.trim() || '',
      weaknesses: reportFormData.weaknesses?.trim() || '',
      summaryNotes: reportFormData.summaryNotes?.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    await storageService.savePlayerGeneralReport(dataToSave);
    setPlayerReports((prev) => ({
      ...prev,
      [groupKey]: dataToSave,
    }));
    setEditingReportKey(null);
    setSavingFeedbackKey(groupKey);
    setTimeout(() => setSavingFeedbackKey(null), 3500);
  };

  const handleDeleteGeneralReport = async (groupKey: string) => {
    if (!window.confirm('¿Eliminar el informe general de este jugador?')) return;
    await storageService.deletePlayerGeneralReport(groupKey);
    setPlayerReports((prev) => {
      const next = { ...prev };
      delete next[groupKey];
      return next;
    });
    if (editingReportKey === groupKey) {
      setEditingReportKey(null);
    }
  };

  const handleExportPlayerDossier = async (groupKey: string, playerName: string, format: 'pdf' | 'png') => {
    const el = document.getElementById(`player-dossier-card-${groupKey}`);
    if (!el) return;
    setExportingKey(groupKey);
    try {
      const fileName = `Informe_General_${playerName.replace(/\s+/g, '_')}`;
      if (format === 'pdf') {
        await exportElementToPDF(el, fileName);
      } else {
        await exportElementToPNG(el, fileName);
      }
    } catch (err) {
      console.error('Error al exportar ficha del jugador:', err);
    } finally {
      setExportingKey(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedPosition('ALL');
    setSelectedTeam('ALL');
    setSelectedRecommendation('ALL');
    setViewScope('EVALUATED');
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-8 max-w-6xl mx-auto space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-[#334155]/60 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 shrink-0" />
            <span>Fichas e Informes de Jugadores</span>
            <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
              {filteredPlayers.length} {filteredPlayers.length === 1 ? 'jugador' : 'jugadores'}
            </span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
            Visualizá el historial consolidado de partidos y redactá informes generales sobre cada jugador con veredictos, fortalezas y recomendaciones de fichaje.
          </p>
        </div>

        {/* View Scope Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#111827] border border-[#334155] rounded-lg self-stretch sm:self-auto text-xs font-mono shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewScope('EVALUATED')}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded transition-all cursor-pointer whitespace-nowrap text-center ${
              viewScope === 'EVALUATED'
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Evaluados / Con Informe
          </button>
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded transition-all cursor-pointer whitespace-nowrap text-center ${
              viewScope === 'ALL'
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Todos ({allGroupedPlayers.length})
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-[#111827] border border-[#334155] shadow-sm space-y-3 font-sans text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por jugador, club, nota..."
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-cyan-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none"
            />
          </div>

          {/* Position Filter */}
          <div>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las posiciones</option>
              
              <optgroup label="Líneas Tácticas Principales">
                <option value="GK">🧤 Porteros (POR / GK)</option>
                <option value="DEF">🛡️ Defensas (DEF / DFC, LI, LD)</option>
                <option value="MID">⚙️ Centrocampistas (MID / MC, MCD, MCO)</option>
                <option value="FWD">⚡ Delanteros (FWD / DC, EI, ED)</option>
              </optgroup>

              <optgroup label="Posiciones Específicas">
                <option value="POR">🧤 Portero (POR)</option>
                <option value="DFC">🛡️ Central (DFC)</option>
                <option value="LAT">🛡️ Laterales (LI / LD)</option>
                <option value="LI">🛡️ Lateral Izquierdo (LI)</option>
                <option value="LD">🛡️ Lateral Derecho (LD)</option>
                <option value="MCD">⚙️ Pivote Defensivo (MCD)</option>
                <option value="MC">⚙️ Mediocentro (MC)</option>
                <option value="MCO">⚙️ Mediapunta (MCO)</option>
                <option value="MI_MD">⚙️ Volantes / Interiores (MI / MD)</option>
                <option value="DC">⚡ Delantero Centro (DC)</option>
                <option value="EXT">⚡ Extremos (EI / ED)</option>
                <option value="EI">⚡ Extremo Izquierdo (EI)</option>
                <option value="ED">⚡ Extremo Derecho (ED)</option>
              </optgroup>
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los equipos ({availableTeams.length})</option>
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Recommendation Filter */}
          <div>
            <select
              value={selectedRecommendation}
              onChange={(e) => setSelectedRecommendation(e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">Cualquier recomendación</option>
              <option value="HAS_REPORT">📝 Con Informe General</option>
              <option value="SIGN">🟢 Fichar (Prioridad Alta)</option>
              <option value="MONITOR">🟡 Seguimiento (En Cartera)</option>
              <option value="FUTURE">🔵 A Futuro (Promesa)</option>
              <option value="DISCARD">🔴 Descartar</option>
            </select>
          </div>
        </div>

        {/* Quick Position Line Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#334155]/40 scrollbar-thin">
          <span className="text-[11px] font-mono text-[#64748B] shrink-0 mr-1 hidden sm:inline">
            Posición:
          </span>

          <button
            type="button"
            onClick={() => setSelectedPosition('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
              selectedPosition === 'ALL'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-white hover:border-[#475569]'
            }`}
          >
            <span>Todos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white/80">
              {positionCounts.ALL}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPosition('GK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
              selectedPosition === 'GK'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-emerald-300 hover:border-emerald-500/40'
            }`}
          >
            <span>🧤 Porteros</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-emerald-200">
              {positionCounts.GK}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPosition('DEF')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
              selectedPosition === 'DEF'
                ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-sky-300 hover:border-sky-500/40'
            }`}
          >
            <span>🛡️ Defensas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-sky-200">
              {positionCounts.DEF}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPosition('MID')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
              selectedPosition === 'MID'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-amber-300 hover:border-amber-500/40'
            }`}
          >
            <span>⚙️ Medios</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-amber-200">
              {positionCounts.MID}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPosition('FWD')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
              selectedPosition === 'FWD'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-rose-300 hover:border-rose-500/40'
            }`}
          >
            <span>⚡ Delanteros</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-rose-200">
              {positionCounts.FWD}
            </span>
          </button>
        </div>

        {/* Active filter count & clear */}
        {(searchQuery || selectedPosition !== 'ALL' || selectedTeam !== 'ALL' || selectedRecommendation !== 'ALL' || viewScope !== 'EVALUATED') && (
          <div className="flex items-center justify-between pt-1 border-t border-[#334155]/40 text-[11px] font-mono text-[#94A3B8]">
            <span>
              Filtros activos • Mostrando {filteredPlayers.length} de {allGroupedPlayers.length} futbolistas
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* Players List */}
      {allGroupedPlayers.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#111827]/40 border border-[#334155]/60 space-y-2 font-mono text-xs text-[#64748B]">
          <Search className="w-8 h-8 mx-auto text-[#334155]" />
          <p className="text-white font-medium text-sm">Aún no hay informes de partidos cargados</p>
          <p>Importá o creá informes desde el panel principal para ver los jugadores agrupados aquí.</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-[#334155] rounded-xl space-y-3 bg-[#111827]/40">
          <Filter className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm font-medium text-white">No se encontraron jugadores con los filtros seleccionados</p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs cursor-pointer shadow-sm"
          >
            Limpiar búsqueda y filtros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlayers.map((group) => {
            const groupKey = group.key;
            const evalCount = group.evaluations.length;
            const isExpanded = expandedPlayers[groupKey] ?? true;
            const generalReport = playerReports[groupKey];
            const isEditingGeneral = editingReportKey === groupKey;
            const isSavingFeedback = savingFeedbackKey === groupKey;
            const isExporting = exportingKey === groupKey;

            const recConfig = generalReport?.recommendation
              ? RECOMMENDATION_CONFIG[generalReport.recommendation]
              : null;

            return (
              <div
                key={groupKey}
                id={`player-dossier-card-${groupKey}`}
                className="rounded-xl bg-[#111827] border border-[#334155] hover:border-cyan-500/40 transition-all shadow-md overflow-hidden w-full max-w-full"
              >
                {/* Player Header Banner */}
                <div
                  onClick={() => toggleExpand(groupKey)}
                  className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer bg-[#0F172A]/90 border-b border-[#334155]/60 hover:bg-[#1E293B]/60 transition-colors w-full min-w-0"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full">
                    <img
                      src={group.player.avatarUrl}
                      alt={group.player.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-cyan-500/40 bg-[#0F172A] shrink-0 mt-0.5 sm:mt-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                        <h3 className="font-bold text-white text-sm sm:text-base break-words">
                          {sanitizePlayerName(group.player.name)}
                        </h3>
                        {group.player.number && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#1E293B] border border-[#334155] text-cyan-300 rounded shrink-0">
                            #{group.player.number}
                          </span>
                        )}
                        {recConfig && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border shrink-0 ${recConfig.badgeBg} ${recConfig.badgeBorder} ${recConfig.badgeText}`}
                          >
                            <span>{recConfig.icon}</span>
                            <span>{recConfig.shortLabel}</span>
                            {generalReport?.overallRating && (
                              <span className="opacity-90">★ {generalReport.overallRating.toFixed(1)}</span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] mt-0.5 flex-wrap min-w-0">
                        <PositionBadge
                          position={group.player.position}
                          positionLabel={group.player.positionLabel}
                          showFullName
                          size="sm"
                        />
                        {group.teamName && (
                          <>
                            <span>•</span>
                            <span className="text-white/90 truncate max-w-[140px] sm:max-w-none">{group.teamName}</span>
                          </>
                        )}
                        {group.player.nationality && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <img
                                src={getCountryFlagUrl(group.player.nationality, group.player.nationalityCode)}
                                alt={group.player.nationality}
                                className="w-4 h-3 rounded-xs object-cover border border-white/10 shrink-0"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                              />
                              <span className="truncate max-w-[90px] sm:max-w-none">{group.player.nationality}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Bio Metadata Row */}
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-[#94A3B8] mt-1.5 flex-wrap min-w-0">
                        {group.player.age && (
                          <span className="bg-[#1E293B] px-1.5 sm:px-2 py-0.5 rounded border border-[#334155]/60 text-white shrink-0">
                            Edad: <strong className="text-cyan-300">{group.player.age} a.</strong>
                          </span>
                        )}
                        {group.player.height && (
                          <span className="bg-[#1E293B] px-1.5 sm:px-2 py-0.5 rounded border border-[#334155]/60 text-white shrink-0">
                            Alt: <strong className="text-white">{group.player.height}</strong>
                          </span>
                        )}
                        {group.player.preferredFoot && (
                          <span className="bg-[#1E293B] px-1.5 sm:px-2 py-0.5 rounded border border-[#334155]/60 text-cyan-300 font-semibold shrink-0">
                            Pierna: {group.player.preferredFoot}
                          </span>
                        )}
                        {group.player.marketValue && (
                          <span className="bg-[#1E293B] px-1.5 sm:px-2 py-0.5 rounded border border-[#334155]/60 text-emerald-400 font-bold shrink-0">
                            Valor: {group.player.marketValue}
                          </span>
                        )}
                        {group.player.contractUntil && (
                          <span className="bg-[#1E293B] px-1.5 sm:px-2 py-0.5 rounded border border-[#334155]/60 text-amber-300 shrink-0">
                            Contrato: {group.player.contractUntil}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-[#334155]/40 sm:border-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditGeneralReport(group);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer truncate"
                      title="Redactar o modificar informe general del jugador"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{generalReport ? 'Editar Informe' : '+ Informe'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-mono px-2 sm:px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-cyan-400" />
                        <span>{evalCount} {evalCount === 1 ? 'partido' : 'partidos'}</span>
                      </span>

                      <div className="text-[#94A3B8] p-1 rounded-full hover:bg-[#334155]/40">
                        {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content Area */}
                {isExpanded && (
                  <div className="p-3 sm:p-5 space-y-4 sm:space-y-6 bg-[#111827] w-full max-w-full overflow-hidden">
                    {/* FEEDBACK BANNER */}
                    {isSavingFeedback && (
                      <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>¡Informe general guardado correctamente!</span>
                      </div>
                    )}

                    {/* SECTION 1: INFORME GENERAL DEL JUGADOR */}
                    <div className="rounded-lg bg-[#0A0D14] border border-[#334155] overflow-hidden w-full max-w-full">
                      <div className="p-3 sm:p-3.5 bg-[#0F172A] border-b border-[#334155]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ClipboardList className="w-4 h-4 text-cyan-400 shrink-0" />
                          <h4 className="text-[11px] sm:text-xs font-bold text-white uppercase font-mono tracking-wider">
                            Informe General y Conclusión
                          </h4>
                          {generalReport?.updatedAt && (
                            <span className="text-[10px] font-mono text-[#64748B] hidden xs:inline">
                              ({new Date(generalReport.updatedAt).toLocaleDateString()})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                          {generalReport && !isEditingGeneral && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExportPlayerDossier(groupKey, group.player.name, 'pdf')}
                                disabled={isExporting}
                                className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white text-[10px] sm:text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                                title="Descargar ficha en PDF"
                              >
                                <FileDown className="w-3 h-3 text-rose-400" />
                                <span>PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportPlayerDossier(groupKey, group.player.name, 'png')}
                                disabled={isExporting}
                                className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white text-[10px] sm:text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                                title="Descargar ficha en imagen PNG"
                              >
                                <Download className="w-3 h-3 text-cyan-400" />
                                <span>PNG</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditGeneralReport(group)}
                                className="px-2 sm:px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGeneralReport(groupKey)}
                                className="p-1 rounded text-[#64748B] hover:text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors"
                                title="Eliminar informe general"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* EDITING FORM */}
                      {isEditingGeneral ? (
                        <div className="p-4 space-y-4 font-sans text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Recomendación / Dictamen */}
                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] block">
                                Veredicto / Recomendación de Scouting:
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(['SIGN', 'MONITOR', 'FUTURE', 'DISCARD'] as PlayerRecommendation[]).map((recKey) => {
                                  const cfg = RECOMMENDATION_CONFIG[recKey];
                                  const isSelected = reportFormData.recommendation === recKey;
                                  return (
                                    <button
                                      key={recKey}
                                      type="button"
                                      onClick={() => setReportFormData((p) => ({ ...p, recommendation: recKey }))}
                                      className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                        isSelected
                                          ? `${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText} ring-1 ring-cyan-400/50 shadow-md`
                                          : 'bg-[#111827] border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                                      }`}
                                    >
                                      <div className="font-bold flex items-center gap-1 text-[11px]">
                                        <span>{cfg.icon}</span>
                                        <span>{cfg.shortLabel}</span>
                                      </div>
                                      <span className="text-[9px] mt-1 text-[#94A3B8] leading-tight line-clamp-2">
                                        {cfg.desc}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Overall Rating Slider & Input */}
                            <div className="space-y-1.5 bg-[#111827] p-3 rounded-lg border border-[#334155]">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
                                  Rating Global:
                                </label>
                                <span className="text-sm font-mono font-bold text-amber-400">
                                  ★ {Number(reportFormData.overallRating || 7.0).toFixed(1)} / 10
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1.0"
                                max="10.0"
                                step="0.1"
                                value={reportFormData.overallRating || 7.0}
                                onChange={(e) =>
                                  setReportFormData((p) => ({ ...p, overallRating: parseFloat(e.target.value) }))
                                }
                                className="w-full accent-amber-500 cursor-pointer"
                              />
                              <div className="flex justify-between text-[9px] font-mono text-[#64748B]">
                                <span>1.0 (Muy bajo)</span>
                                <span>5.0 (Promedio)</span>
                                <span>10.0 (Élite)</span>
                              </div>
                            </div>
                          </div>

                          {/* Rol Proyectado */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] block">
                              Rol Proyectado en Plantilla:
                            </label>
                            <input
                              type="text"
                              value={reportFormData.projectedRole || ''}
                              onChange={(e) => setReportFormData((p) => ({ ...p, projectedRole: e.target.value }))}
                              placeholder="Ej: Titular inmediato en 4-3-3, Rotación de impacto..."
                              className="w-full p-2.5 bg-[#111827] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:border-cyan-500 focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] font-mono text-[#64748B]">Sugerencias:</span>
                              {SUGGESTED_ROLES.map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => setReportFormData((p) => ({ ...p, projectedRole: role }))}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-cyan-300 border border-[#334155] cursor-pointer"
                                >
                                  {role}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Fortalezas y Debilidades */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                                Puntos Fuertes (Fortalezas Clave):
                              </label>
                              <input
                                type="text"
                                value={reportFormData.strengths || ''}
                                onChange={(e) => setReportFormData((p) => ({ ...p, strengths: e.target.value }))}
                                placeholder="Ej: 1v1 ofensivo, visión periférica, golpeo balón parado..."
                                className="w-full p-2.5 bg-[#111827] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
                                Aspectos a Mejorar (Debilidades):
                              </label>
                              <input
                                type="text"
                                value={reportFormData.weaknesses || ''}
                                onChange={(e) => setReportFormData((p) => ({ ...p, weaknesses: e.target.value }))}
                                placeholder="Ej: Repliegue defensivo, juego aéreo, regularidad..."
                                className="w-full p-2.5 bg-[#111827] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:border-rose-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Conclusión General / Análisis Detallado */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] block">
                              Conclusión General y Perfil Técnico-Táctico:
                            </label>
                            <textarea
                              rows={5}
                              value={reportFormData.summaryNotes || ''}
                              onChange={(e) => setReportFormData((p) => ({ ...p, summaryNotes: e.target.value }))}
                              placeholder="Redactá una conclusión detallada sobre el futbolista: comprensión del juego, ritmo competitivo, adaptabilidad táctica, temperamento bajo presión y potencial de revalorización..."
                              className="w-full p-3 bg-[#111827] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:border-cyan-500 focus:outline-none resize-y leading-relaxed font-sans"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#334155]/60 font-mono">
                            <button
                              type="button"
                              onClick={() => setEditingReportKey(null)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white cursor-pointer transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveGeneralReport(groupKey)}
                              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 cursor-pointer transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Guardar Informe General</span>
                            </button>
                          </div>
                        </div>
                      ) : generalReport ? (
                        /* READ-ONLY VIEW */
                        <div className="p-4 space-y-3.5 text-xs font-sans">
                          {/* Top Summary Bar */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className={`p-3 rounded-lg border ${recConfig?.badgeBg} ${recConfig?.badgeBorder}`}>
                              <span className="text-[10px] font-mono uppercase font-bold text-[#94A3B8] block">
                                Recomendación:
                              </span>
                              <div className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${recConfig?.badgeText}`}>
                                <span>{recConfig?.icon}</span>
                                <span>{recConfig?.label}</span>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-[#111827] border border-[#334155]">
                              <span className="text-[10px] font-mono uppercase font-bold text-[#94A3B8] block">
                                Calificación Global:
                              </span>
                              <div className="text-sm font-bold text-amber-400 flex items-center gap-1 mt-0.5 font-mono">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span>{generalReport.overallRating ? generalReport.overallRating.toFixed(1) : '7.0'} / 10</span>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-[#111827] border border-[#334155]">
                              <span className="text-[10px] font-mono uppercase font-bold text-[#94A3B8] block">
                                Rol Proyectado:
                              </span>
                              <div className="text-xs font-bold text-white mt-0.5 truncate">
                                {generalReport.projectedRole || 'Sin especificar'}
                              </div>
                            </div>
                          </div>

                          {/* Strengths & Weaknesses */}
                          {(generalReport.strengths || generalReport.weaknesses) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {generalReport.strengths && (
                                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block mb-0.5">
                                    ✓ Fortalezas:
                                  </span>
                                  <p className="text-xs text-[#E2E8F0]">{generalReport.strengths}</p>
                                </div>
                              )}
                              {generalReport.weaknesses && (
                                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
                                  <span className="text-[10px] font-mono font-bold uppercase text-rose-400 block mb-0.5">
                                    ⚠ Aspectos a Mejorar:
                                  </span>
                                  <p className="text-xs text-[#E2E8F0]">{generalReport.weaknesses}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Summary Notes */}
                          {generalReport.summaryNotes ? (
                            <div className="p-3.5 rounded-lg bg-[#111827] border border-[#334155] space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] block">
                                Conclusión del Scout:
                              </span>
                              <p className="text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-line font-sans">
                                {generalReport.summaryNotes}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-[#64748B] italic">Sin notas detalladas redactadas aún.</p>
                          )}
                        </div>
                      ) : (
                        /* EMPTY STATE FOR GENERAL REPORT */
                        <div className="p-6 text-center space-y-2.5">
                          <p className="text-xs text-[#94A3B8]">
                            Aún no has creado un informe general consolidado para este futbolista.
                          </p>
                          <button
                            type="button"
                            onClick={() => startEditGeneralReport(group)}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold inline-flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Redactar Informe General</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: HISTORIAL DE OBSERVACIONES EN PARTIDOS */}
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span>Historial de partidos observados ({evalCount}):</span>
                        {evalCount > 0 && (
                          <span className="text-[10px] text-cyan-400 font-normal">
                            Clic en "Ver partido" para inspeccionar la ficha
                          </span>
                        )}
                      </div>

                      {evalCount === 0 ? (
                        <div className="p-4 rounded-lg bg-[#0A0D14] border border-[#1E293B] text-center text-xs text-[#64748B] font-mono">
                          Sin notas registradas en partidos específicos aún.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {group.evaluations.map((ev, idx) => (
                            <div
                              key={idx}
                              className="p-3 sm:p-3.5 rounded-lg bg-[#0A0D14] border border-[#1E293B] hover:border-cyan-500/30 transition-all space-y-2.5 w-full min-w-0"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B]/80 pb-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-white font-mono min-w-0 flex-wrap">
                                  <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="text-cyan-300 break-words">{ev.matchTitle}</span>
                                  {ev.competition && (
                                    <span className="text-[#64748B] text-[11px] font-normal hidden sm:inline">
                                      ({ev.competition})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                  {ev.ratingLevel && (
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase ${
                                        ev.ratingLevel === 'HIGH'
                                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                                          : ev.ratingLevel === 'MEDIUM'
                                          ? 'bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40'
                                          : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                                      }`}
                                    >
                                      {ev.ratingLevel} {ev.rating ? `(${ev.rating.toFixed(1)})` : ''}
                                    </span>
                                  )}

                                  {ev.matchDate && (
                                    <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {ev.matchDate}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {ev.comment && (
                                <p className="text-xs text-[#CBD5E1] leading-relaxed italic font-sans pl-2 border-l-2 border-cyan-500/40 break-words">
                                  "{ev.comment}"
                                </p>
                              )}

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenReportWithPlayer(ev.reportId, group.player.id)}
                                  className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Ver partido completo</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
