import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  Trash2, 
  RefreshCw, 
  Save, 
  Edit3, 
  Plus, 
  Minus,
  Search, 
  Check, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Sparkles, 
  X, 
  Shield, 
  ArrowRight, 
  CheckCircle2,
  FileImage,
  Filter
} from 'lucide-react';
import { CompleteMatchReport, MatchDetails, MatchEvent, Player, Team } from '../types/scouting';
import { storageService } from '../services/storage/storageService';
import { useTheme } from '../context/ThemeContext';
import { TeamBadgeFinderModal } from './TeamBadgeFinderModal';

export interface ImageFileState {
  file: File | null;
  previewUrl: string | null;
  base64Data: string | null;
  mimeType: string;
  fileName: string;
  fileSize: string;
}

export interface EditableLineupPlayer {
  id: string;
  teamSide: 'home' | 'away';
  number: number;
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  positionLabel: string; // e.g. "POR", "DFC", "LI", "LD", "MC", "DC"
  formationRole?: string;
  isStarter: boolean;
  minutesPlayed: number;
  events: {
    goals: number;
    yellowCards: number;
    redCards: number;
    assists: number;
  };
  observation: string;
}

interface ImageLineupAnalyzerViewProps {
  onReportSaved: (newReport: CompleteMatchReport) => void;
  onOpenReport: (reportId: string) => void;
}

export const ImageLineupAnalyzerView: React.FC<ImageLineupAnalyzerViewProps> = ({
  onReportSaved,
  onOpenReport,
}) => {
  const { theme } = useTheme();

  // Images state
  const [homeImage, setHomeImage] = useState<ImageFileState | null>(null);
  const [awayImage, setAwayImage] = useState<ImageFileState | null>(null);

  // Drag over states
  const [isHomeDragOver, setIsHomeDragOver] = useState(false);
  const [isAwayDragOver, setIsAwayDragOver] = useState(false);

  // Analysis status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Match Information Header
  const [competition, setCompetition] = useState('Liga Profesional');
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [stadium, setStadium] = useState('Estadio Principal');
  const [homeTeamName, setHomeTeamName] = useState('Equipo Local');
  const [awayTeamName, setAwayTeamName] = useState('Equipo Visitante');
  const [homeTeamLogo, setHomeTeamLogo] = useState('');
  const [awayTeamLogo, setAwayTeamLogo] = useState('');
  const [homeFormation, setHomeFormation] = useState('4-3-3');
  const [awayFormation, setAwayFormation] = useState('4-2-3-1');

  // Badge Finder state
  const [badgeFinderTarget, setBadgeFinderTarget] = useState<'home' | 'away' | null>(null);

  const lookupTeamBadge = async (name: string, teamSide: 'home' | 'away') => {
    if (!name || !name.trim() || name === 'Equipo Local' || name === 'Equipo Visitante') return;
    try {
      const res = await fetch(`/api/escudoteca/search?q=${encodeURIComponent(name.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          if (teamSide === 'home') setHomeTeamLogo(data.results[0].badgeUrl);
          else setAwayTeamLogo(data.results[0].badgeUrl);
        }
      }
    } catch {
      // silent fallback
    }
  };

  // Player list
  const [players, setPlayers] = useState<EditableLineupPlayer[]>([]);

  // UI Table Filters & State
  const [teamTab, setTeamTab] = useState<'home' | 'away'>('home');
  const [statusFilter, setStatusFilter] = useState<'all' | 'starters' | 'subs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Modal for adding a new player manually
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerSide, setNewPlayerSide] = useState<'home' | 'away'>('home');
  const [newPlayerNumber, setNewPlayerNumber] = useState<number>(1);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState<'GK' | 'DF' | 'MF' | 'FW'>('MF');
  const [newPlayerPosLabel, setNewPlayerPosLabel] = useState('MC');
  const [newPlayerIsStarter, setNewPlayerIsStarter] = useState(true);

  // Save feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessReportId, setSavedSuccessReportId] = useState<string | null>(null);

  // File input refs
  const homeInputRef = useRef<HTMLInputElement | null>(null);
  const awayInputRef = useRef<HTMLInputElement | null>(null);

  // Handle file selection
  const processImageFile = (file: File, side: 'home' | 'away') => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = Number(sizeMb) < 1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`;

      const newState: ImageFileState = {
        file,
        previewUrl: dataUrl,
        base64Data: dataUrl,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
        fileSize: sizeStr,
      };

      if (side === 'home') {
        setHomeImage(newState);
      } else {
        setAwayImage(newState);
      }
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Analysis
  const handleAnalyze = async () => {
    if (!homeImage?.base64Data && !awayImage?.base64Data) {
      setAnalysisError('Por favor sube al menos una imagen (Local o Visitante) para iniciar el análisis.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setSavedSuccessReportId(null);

    try {
      const response = await fetch('/api/analyze-lineup-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeImage: homeImage ? { data: homeImage.base64Data, mimeType: homeImage.mimeType, fileName: homeImage.fileName } : undefined,
          awayImage: awayImage ? { data: awayImage.base64Data, mimeType: awayImage.mimeType, fileName: awayImage.fileName } : undefined,
          matchContext: {
            competition,
            date: matchDate,
            stadium,
            homeName: homeTeamName !== 'Equipo Local' ? homeTeamName : undefined,
            awayName: awayTeamName !== 'Equipo Visitante' ? awayTeamName : undefined,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Error en el servidor: ${response.status}`);
      }

      const data = await response.json();

      // Populate metadata
      if (data.competition) setCompetition(data.competition);
      if (data.date) setMatchDate(data.date);
      if (data.stadium) setStadium(data.stadium);
      if (data.homeTeam?.name) {
        setHomeTeamName(data.homeTeam.name);
        lookupTeamBadge(data.homeTeam.name, 'home');
      }
      if (data.awayTeam?.name) {
        setAwayTeamName(data.awayTeam.name);
        lookupTeamBadge(data.awayTeam.name, 'away');
      }
      if (data.homeTeam?.formation) setHomeFormation(data.homeTeam.formation);
      if (data.awayTeam?.formation) setAwayFormation(data.awayTeam.formation);

      // Convert players
      const extractedPlayers: EditableLineupPlayer[] = [];

      // Home Starters & Subs
      (data.homeTeam?.starters || []).forEach((p: any, idx: number) => {
        extractedPlayers.push({
          id: `h_s_${idx}_${Date.now()}`,
          teamSide: 'home',
          number: Number(p.number) || (idx + 1),
          name: p.name || `Titular ${idx + 1}`,
          position: p.position || 'MF',
          positionLabel: p.positionLabel || 'MC',
          formationRole: p.formationRole || '',
          isStarter: true,
          minutesPlayed: Number(p.minutesPlayed) || 90,
          events: {
            goals: Number(p.events?.goals) || 0,
            yellowCards: Number(p.events?.yellowCards) || 0,
            redCards: Number(p.events?.redCards) || 0,
            assists: Number(p.events?.assists) || 0,
          },
          observation: p.observation || '',
        });
      });

      (data.homeTeam?.substitutes || []).forEach((p: any, idx: number) => {
        extractedPlayers.push({
          id: `h_sub_${idx}_${Date.now()}`,
          teamSide: 'home',
          number: Number(p.number) || (idx + 12),
          name: p.name || `Suplente ${idx + 1}`,
          position: p.position || 'MF',
          positionLabel: p.positionLabel || 'MC',
          formationRole: p.formationRole || '',
          isStarter: false,
          minutesPlayed: Number(p.minutesPlayed) || 0,
          events: {
            goals: Number(p.events?.goals) || 0,
            yellowCards: Number(p.events?.yellowCards) || 0,
            redCards: Number(p.events?.redCards) || 0,
            assists: Number(p.events?.assists) || 0,
          },
          observation: p.observation || '',
        });
      });

      // Away Starters & Subs
      (data.awayTeam?.starters || []).forEach((p: any, idx: number) => {
        extractedPlayers.push({
          id: `a_s_${idx}_${Date.now()}`,
          teamSide: 'away',
          number: Number(p.number) || (idx + 1),
          name: p.name || `Titular ${idx + 1}`,
          position: p.position || 'MF',
          positionLabel: p.positionLabel || 'MC',
          formationRole: p.formationRole || '',
          isStarter: true,
          minutesPlayed: Number(p.minutesPlayed) || 90,
          events: {
            goals: Number(p.events?.goals) || 0,
            yellowCards: Number(p.events?.yellowCards) || 0,
            redCards: Number(p.events?.redCards) || 0,
            assists: Number(p.events?.assists) || 0,
          },
          observation: p.observation || '',
        });
      });

      (data.awayTeam?.substitutes || []).forEach((p: any, idx: number) => {
        extractedPlayers.push({
          id: `a_sub_${idx}_${Date.now()}`,
          teamSide: 'away',
          number: Number(p.number) || (idx + 12),
          name: p.name || `Suplente ${idx + 1}`,
          position: p.position || 'MF',
          positionLabel: p.positionLabel || 'MC',
          formationRole: p.formationRole || '',
          isStarter: false,
          minutesPlayed: Number(p.minutesPlayed) || 0,
          events: {
            goals: Number(p.events?.goals) || 0,
            yellowCards: Number(p.events?.yellowCards) || 0,
            redCards: Number(p.events?.redCards) || 0,
            assists: Number(p.events?.assists) || 0,
          },
          observation: p.observation || '',
        });
      });

      setPlayers(extractedPlayers);
      setHasAnalyzed(true);
    } catch (err: any) {
      console.error('Error analyzing lineup images:', err);
      setAnalysisError(err?.message || 'Hubo un inconveniente al procesar las imágenes. Por favor reintenta.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Modify individual player row field
  const handleUpdatePlayer = (id: string, field: keyof EditableLineupPlayer, value: any) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return { ...p, [field]: value };
      })
    );
  };

  // Toggle or adjust events with safe defaults
  const handleModifyEvent = (
    id: string,
    eventType: 'goals' | 'yellowCards' | 'redCards' | 'assists',
    delta: number
  ) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const currentEvents = p.events || { goals: 0, yellowCards: 0, redCards: 0, assists: 0 };
        const currentVal = Number(currentEvents[eventType]) || 0;
        const nextVal = Math.max(0, currentVal + delta);
        return {
          ...p,
          events: {
            ...currentEvents,
            [eventType]: nextVal,
          },
        };
      })
    );
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  // Add new player manually
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newP: EditableLineupPlayer = {
      id: `manual_${Date.now()}`,
      teamSide: newPlayerSide,
      number: newPlayerNumber,
      name: newPlayerName.trim(),
      position: newPlayerPos,
      positionLabel: newPlayerPosLabel.trim().toUpperCase() || (newPlayerPos === 'GK' ? 'POR' : 'MC'),
      isStarter: newPlayerIsStarter,
      minutesPlayed: newPlayerIsStarter ? 90 : 0,
      events: { goals: 0, yellowCards: 0, redCards: 0, assists: 0 },
      observation: '',
    };

    setPlayers((prev) => [...prev, newP]);
    setNewPlayerName('');
    setNewPlayerNumber((n) => n + 1);
    setIsAddPlayerModalOpen(false);
  };

  // Save Complete Match Report to Storage
  const handleSaveMatch = async () => {
    if (players.length === 0) {
      setAnalysisError('No hay jugadores para guardar en el informe.');
      return;
    }

    setIsSaving(true);
    setAnalysisError(null);

    try {
      const matchId = `match_img_${Date.now()}`;
      const reportId = `rep_${matchId}`;

      // Calculate goals
      const homeGoals = players
        .filter((p) => p.teamSide === 'home')
        .reduce((sum, p) => sum + (p.events.goals || 0), 0);
      const awayGoals = players
        .filter((p) => p.teamSide === 'away')
        .reduce((sum, p) => sum + (p.events.goals || 0), 0);

      // Map each player to a consistent domain ID
      const playerIdMap = new Map<string, string>();
      players.forEach((p, idx) => {
        const domainId = `pl_${matchId}_${p.teamSide}_${p.number}_${idx}`;
        playerIdMap.set(p.id, domainId);
      });

      // Convert EditableLineupPlayer to domain Player
      const convertToDomainPlayer = (p: EditableLineupPlayer): Player => {
        const domainId = playerIdMap.get(p.id) || p.id;
        const events = p.events || { goals: 0, yellowCards: 0, redCards: 0, assists: 0 };
        return {
          id: domainId,
          name: p.name,
          shortName: p.name.split(' ').slice(-1)[0] || p.name,
          number: p.number,
          position: p.position,
          positionLabel: p.positionLabel,
          nationality: 'Argentina',
          avatarUrl: '',
          isStarter: p.isStarter,
          minutesPlayed: p.minutesPlayed,
          statistics: {
            minutesPlayed: p.minutesPlayed,
            attack: {
              goals: events.goals || 0,
              assists: events.assists || 0,
            },
            discipline: {
              yellowCards: events.yellowCards || 0,
              redCards: events.redCards || 0,
            },
          },
        };
      };

      const homeStarters = players
        .filter((p) => p.teamSide === 'home' && p.isStarter)
        .map(convertToDomainPlayer);
      const homeSubs = players
        .filter((p) => p.teamSide === 'home' && !p.isStarter)
        .map(convertToDomainPlayer);

      const awayStarters = players
        .filter((p) => p.teamSide === 'away' && p.isStarter)
        .map(convertToDomainPlayer);
      const awaySubs = players
        .filter((p) => p.teamSide === 'away' && !p.isStarter)
        .map(convertToDomainPlayer);

      // Build events list
      const matchEvents: MatchEvent[] = [];
      players.forEach((p) => {
        const teamName = p.teamSide === 'home' ? homeTeamName : awayTeamName;
        const pId = playerIdMap.get(p.id) || p.id;
        const goalsCount = p.events?.goals || 0;
        const yellowCount = p.events?.yellowCards || 0;
        const redCount = p.events?.redCards || 0;
        const assistCount = p.events?.assists || 0;

        // Goals
        for (let g = 0; g < goalsCount; g++) {
          matchEvents.push({
            id: `ev_goal_${pId}_${g}`,
            minute: 35 + g * 20,
            teamId: p.teamSide === 'home' ? 'team_home' : 'team_away',
            teamName,
            type: 'goal',
            playerId: pId,
            playerName: p.name,
            playerNumber: p.number,
            description: `Gol de ${p.name}`,
          });
        }
        // Yellow cards
        for (let y = 0; y < yellowCount; y++) {
          matchEvents.push({
            id: `ev_yc_${pId}_${y}`,
            minute: 40 + y * 25,
            teamId: p.teamSide === 'home' ? 'team_home' : 'team_away',
            teamName,
            type: 'yellow_card',
            playerId: pId,
            playerName: p.name,
            playerNumber: p.number,
            description: `Tarjeta amarilla para ${p.name}`,
          });
        }
        // Red cards
        for (let r = 0; r < redCount; r++) {
          matchEvents.push({
            id: `ev_rc_${pId}_${r}`,
            minute: 78,
            teamId: p.teamSide === 'home' ? 'team_home' : 'team_away',
            teamName,
            type: 'red_card',
            playerId: pId,
            playerName: p.name,
            playerNumber: p.number,
            description: `Tarjeta roja para ${p.name}`,
          });
        }
        // Assists
        for (let a = 0; a < assistCount; a++) {
          matchEvents.push({
            id: `ev_ast_${pId}_${a}`,
            minute: 35 + a * 20,
            teamId: p.teamSide === 'home' ? 'team_home' : 'team_away',
            teamName,
            type: 'goal',
            secondaryPlayerId: pId,
            secondaryPlayerName: p.name,
            playerId: `scorer_${pId}_${a}`,
            playerName: teamName,
            description: `Asistencia de ${p.name}`,
          });
        }
      });

      const homeTeam: Team = {
        id: 'team_home',
        name: homeTeamName,
        shortName: homeTeamName.split(' ')[0] || homeTeamName,
        logoUrl: homeTeamLogo || '',
        formation: homeFormation,
        score: homeGoals,
        isHome: true,
        starters: homeStarters,
        substitutes: homeSubs,
      };

      const awayTeam: Team = {
        id: 'team_away',
        name: awayTeamName,
        shortName: awayTeamName.split(' ')[0] || awayTeamName,
        logoUrl: awayTeamLogo || '',
        formation: awayFormation,
        score: awayGoals,
        isHome: false,
        starters: awayStarters,
        substitutes: awaySubs,
      };

      const matchDetails: MatchDetails = {
        id: matchId,
        url: '',
        homeTeam,
        awayTeam,
        competition,
        roundOrPhase: 'Fase Regular',
        date: matchDate,
        stadium,
        status: 'FINISHED',
        events: matchEvents,
      };

      // Evaluations from observations
      const evaluations: Record<string, any> = {};
      players.forEach((p, idx) => {
        if (p.observation?.trim()) {
          const pId = `pl_${matchId}_${p.teamSide}_${p.number}_${idx}`;
          evaluations[pId] = {
            id: `ev_${pId}`,
            reportId,
            matchId,
            playerId: pId,
            comment: p.observation.trim(),
            updatedAt: new Date().toISOString(),
          };
        }
      });

      const completeReport: CompleteMatchReport = {
        meta: {
          id: reportId,
          matchId,
          url: '',
          homeTeamName,
          awayTeamName,
          homeTeamLogo: homeTeamLogo || '',
          awayTeamLogo: awayTeamLogo || '',
          score: `${homeGoals} - ${awayGoals}`,
          competition,
          matchDate,
          stadium,
          status: 'FINISHED',
          generalNotes: `Partido analizado desde imágenes de formación táctica (${homeFormation} vs ${awayFormation}).`,
          evaluationCount: Object.keys(evaluations).length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        match: matchDetails,
        evaluations,
        eventNotes: {},
      };

      await storageService.saveReport(completeReport);
      onReportSaved(completeReport);
      setSavedSuccessReportId(reportId);
    } catch (err: any) {
      console.error('Error saving match report:', err);
      setAnalysisError(err?.message || 'Error al guardar el partido.');
    } finally {
      setIsSaving(false);
    }
  };

  // Team players and stats
  const homePlayersCount = useMemo(() => players.filter((p) => p.teamSide === 'home').length, [players]);
  const awayPlayersCount = useMemo(() => players.filter((p) => p.teamSide === 'away').length, [players]);
  // Safe goals count from player events
  const homeGoalsCount = useMemo(
    () => players.filter((p) => p.teamSide === 'home').reduce((sum, p) => sum + (p.events?.goals || 0), 0),
    [players]
  );
  const awayGoalsCount = useMemo(
    () => players.filter((p) => p.teamSide === 'away').reduce((sum, p) => sum + (p.events?.goals || 0), 0),
    [players]
  );

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (teamTab === 'home' && p.teamSide !== 'home') return false;
      if (teamTab === 'away' && p.teamSide !== 'away') return false;

      if (statusFilter === 'starters' && !p.isStarter) return false;
      if (statusFilter === 'subs' && p.isStarter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchNum = String(p.number).includes(q);
        const matchPos = p.positionLabel.toLowerCase().includes(q);
        return matchName || matchNum || matchPos;
      }
      return true;
    });
  }, [players, teamTab, statusFilter, searchQuery]);

  return (
    <div 
      style={{ backgroundColor: theme.bgMain }} 
      className="flex-1 flex flex-col h-full overflow-y-auto text-[#E5E7EB] select-none"
    >
      {/* Top Header Bar */}
      <div 
        style={{ backgroundColor: theme.bgHeader, borderColor: theme.borderCard }}
        className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileImage className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>Analizar partido desde imágenes</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                IA Táctica
              </span>
            </h1>
            <p className="text-[11px] text-[#94A3B8]">
              Carga las formaciones del equipo local y visitante para digitalizar y reconstruir las alineaciones.
            </p>
          </div>
        </div>

        {/* Action button header */}
        <div className="flex items-center gap-2">
          {hasAnalyzed && (
            <>
              <button
                type="button"
                onClick={() => setIsEditingMode(!isEditingMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold font-mono transition-all border ${
                  isEditingMode 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                    : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white hover:bg-[#334155]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingMode ? 'Terminar Edición' : 'Editar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewPlayerSide(teamTab);
                  setIsAddPlayerModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold font-mono bg-[#1E293B] text-[#94A3B8] border border-[#334155] hover:text-white hover:bg-[#334155] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Jugador</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMatch}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold font-mono bg-amber-400 text-[#0F172A] hover:bg-amber-300 transition-all shadow-sm font-bold disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Guardar partido</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification Bar */}
      {savedSuccessReportId && (
        <div className="bg-emerald-950/70 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs text-emerald-300 animate-fadeIn shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              ¡Partido guardado con éxito en los informes de la plataforma!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenReport(savedSuccessReportId)}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-mono font-medium flex items-center gap-1 transition-colors"
            >
              <span>Abrir informe y fichas</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setSavedSuccessReportId(null)}
              className="text-emerald-400 hover:text-emerald-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error notification */}
      {analysisError && (
        <div className="bg-rose-950/70 border-b border-rose-500/40 px-4 py-2 flex items-center justify-between gap-2 text-xs text-rose-300 animate-fadeIn shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{analysisError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAnalysisError(null)}
            className="text-rose-400 hover:text-rose-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-4 space-y-4 flex-1 flex flex-col">
        {/* ========================================================================= */}
        {/* 1. SECCIÓN DE CARGA DE IMÁGENES (15-20% SUPERIOR, COMPACTA) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
          {/* EQUIPO LOCAL */}
          <div 
            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard }}
            className="rounded-lg border p-3 flex flex-col justify-between shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Equipo Local
                </span>
              </div>
              {homeImage && (
                <span className="text-[10px] font-mono text-[#64748B]">
                  {homeImage.fileSize}
                </span>
              )}
            </div>

            {homeImage ? (
              <div className="flex items-center gap-3 p-2 rounded bg-[#0A0D14] border border-[#334155]/60">
                <img
                  src={homeImage.previewUrl!}
                  alt="Alineación Local"
                  className="w-16 h-12 rounded object-cover border border-[#334155] shrink-0 bg-black"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">
                    {homeImage.fileName}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    Imagen lista para procesar
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => homeInputRef.current?.click()}
                    className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[11px] font-mono text-[#94A3B8] hover:text-white transition-colors"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeImage(null)}
                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsHomeDragOver(true);
                }}
                onDragLeave={() => setIsHomeDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsHomeDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    processImageFile(e.dataTransfer.files[0], 'home');
                  }
                }}
                onClick={() => homeInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-3 ${
                  isHomeDragOver 
                    ? 'border-amber-400 bg-amber-400/5' 
                    : 'border-[#334155] hover:border-amber-400/60 bg-[#0A0D14]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-amber-400 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-white">
                    Subir formación local
                  </p>
                  <p className="text-[10px] text-[#64748B]">
                    Arrastra la imagen o haz clic aquí (JPG, PNG, WEBP)
                  </p>
                </div>
              </div>
            )}
            <input
              ref={homeInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'home');
                }
              }}
            />
          </div>

          {/* EQUIPO VISITANTE */}
          <div 
            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard }}
            className="rounded-lg border p-3 flex flex-col justify-between shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Equipo Visitante
                </span>
              </div>
              {awayImage && (
                <span className="text-[10px] font-mono text-[#64748B]">
                  {awayImage.fileSize}
                </span>
              )}
            </div>

            {awayImage ? (
              <div className="flex items-center gap-3 p-2 rounded bg-[#0A0D14] border border-[#334155]/60">
                <img
                  src={awayImage.previewUrl!}
                  alt="Alineación Visitante"
                  className="w-16 h-12 rounded object-cover border border-[#334155] shrink-0 bg-black"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">
                    {awayImage.fileName}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    Imagen lista para procesar
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => awayInputRef.current?.click()}
                    className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[11px] font-mono text-[#94A3B8] hover:text-white transition-colors"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAwayImage(null)}
                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsAwayDragOver(true);
                }}
                onDragLeave={() => setIsAwayDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsAwayDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    processImageFile(e.dataTransfer.files[0], 'away');
                  }
                }}
                onClick={() => awayInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-3 ${
                  isAwayDragOver 
                    ? 'border-blue-400 bg-blue-400/5' 
                    : 'border-[#334155] hover:border-blue-400/60 bg-[#0A0D14]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-blue-400 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-white">
                    Subir formación visitante
                  </p>
                  <p className="text-[10px] text-[#64748B]">
                    Arrastra la imagen o haz clic aquí (JPG, PNG, WEBP)
                  </p>
                </div>
              </div>
            )}
            <input
              ref={awayInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'away');
                }
              }}
            />
          </div>
        </div>

        {/* Botón principal de análisis */}
        <div className="flex items-center justify-center gap-3 shrink-0 pt-1 pb-1">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!homeImage && !awayImage)}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg ${
              isAnalyzing
                ? 'bg-amber-500/50 text-amber-950 cursor-wait'
                : !homeImage && !awayImage
                ? 'bg-[#1E293B] text-[#64748B] border border-[#334155] cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-300 text-[#0F172A] hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#0F172A]" />
                <span>Analizando formaciones con IA...</span>
              </>
            ) : hasAnalyzed ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Volver a analizar</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analizar formaciones</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. INFORMACIÓN DEL PARTIDO (BLOQUE COMPACTO EDITABLE) */}
        {/* ========================================================================= */}
        <div 
          style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard }}
          className="rounded-lg border p-3 shrink-0 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Información del Partido</span>
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              Puedes editar estos campos manualmente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {/* Competencia */}
            <div>
              <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">
                Competencia
              </label>
              <input
                type="text"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                placeholder="Liga Profesional"
                className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-[10px] font-mono text-[#94A3B8] mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#64748B]" />
                <span>Fecha</span>
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Estadio */}
            <div>
              <label className="block text-[10px] font-mono text-[#94A3B8] mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#64748B]" />
                <span>Estadio</span>
              </label>
              <input
                type="text"
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                placeholder="Estadio"
                className="w-full px-2.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>

            {/* Equipo Local & Formación */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-mono text-[#94A3B8] text-amber-300">
                  Equipo Local
                </label>
                <button
                  type="button"
                  onClick={() => setBadgeFinderTarget('home')}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Buscar escudo en Paladar Negro Escudoteca"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Escudo PN</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  onClick={() => setBadgeFinderTarget('home')}
                  className="w-7 h-7 rounded bg-[#0A0D14] border border-[#334155] p-0.5 flex items-center justify-center shrink-0 cursor-pointer hover:border-amber-400 group transition-colors"
                  title="Click para buscar escudo"
                >
                  {homeTeamLogo ? (
                    <img
                      src={homeTeamLogo.startsWith('http') ? `/api/badge-proxy?url=${encodeURIComponent(homeTeamLogo)}` : homeTeamLogo}
                      alt={homeTeamName}
                      className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110"
                      onError={(e) => (e.target as HTMLElement).setAttribute('src', homeTeamLogo)}
                    />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-[#64748B] group-hover:text-amber-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={homeTeamName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHomeTeamName(val);
                  }}
                  onBlur={() => {
                    if (!homeTeamLogo && homeTeamName.trim()) {
                      lookupTeamBadge(homeTeamName, 'home');
                    }
                  }}
                  placeholder="Local"
                  className="w-full px-2 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                />
                <input
                  type="text"
                  value={homeFormation}
                  onChange={(e) => setHomeFormation(e.target.value)}
                  title="Formación táctica"
                  placeholder="4-3-3"
                  className="w-16 px-1.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-amber-400 text-center font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Equipo Visitante & Formación */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-mono text-[#94A3B8] text-blue-300">
                  Equipo Visitante
                </label>
                <button
                  type="button"
                  onClick={() => setBadgeFinderTarget('away')}
                  className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  title="Buscar escudo en Paladar Negro Escudoteca"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Escudo PN</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  onClick={() => setBadgeFinderTarget('away')}
                  className="w-7 h-7 rounded bg-[#0A0D14] border border-[#334155] p-0.5 flex items-center justify-center shrink-0 cursor-pointer hover:border-blue-400 group transition-colors"
                  title="Click para buscar escudo"
                >
                  {awayTeamLogo ? (
                    <img
                      src={awayTeamLogo.startsWith('http') ? `/api/badge-proxy?url=${encodeURIComponent(awayTeamLogo)}` : awayTeamLogo}
                      alt={awayTeamName}
                      className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110"
                      onError={(e) => (e.target as HTMLElement).setAttribute('src', awayTeamLogo)}
                    />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-[#64748B] group-hover:text-blue-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={awayTeamName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAwayTeamName(val);
                  }}
                  onBlur={() => {
                    if (!awayTeamLogo && awayTeamName.trim()) {
                      lookupTeamBadge(awayTeamName, 'away');
                    }
                  }}
                  placeholder="Visitante"
                  className="w-full px-2 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-blue-400 font-semibold"
                />
                <input
                  type="text"
                  value={awayFormation}
                  onChange={(e) => setAwayFormation(e.target.value)}
                  title="Formación táctica"
                  placeholder="4-2-3-1"
                  className="w-16 px-1.5 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-blue-400 text-center font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SECCIÓN DE RESULTADOS (70-80% INFERIOR: FORMATO LISTA/TABLA) */}
        {/* ========================================================================= */}
        <div 
          style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard }}
          className="rounded-lg border flex-1 flex flex-col min-h-[420px] shadow-sm overflow-hidden"
        >
          {/* Subheader: Two Team Tabs & Filters */}
          <div className="p-3 border-b border-[#334155]/60 bg-[#0F172A] flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* 2 Pestañas Principales de Equipos: Local vs Visitante */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeamTab('home')}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  teamTab === 'home'
                    ? 'bg-amber-500/20 text-white border-amber-400/80 shadow-sm ring-1 ring-amber-400/30'
                    : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-white hover:border-[#475569]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-white font-semibold">{homeTeamName || 'Equipo Local'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  {homeFormation}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1E293B] text-[#CBD5E1]">
                  {homePlayersCount} jug.
                </span>
                {homeGoalsCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    ⚽ {homeGoalsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTeamTab('away')}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  teamTab === 'away'
                    ? 'bg-blue-500/20 text-white border-blue-400/80 shadow-sm ring-1 ring-blue-400/30'
                    : 'bg-[#0A0D14] text-[#94A3B8] border-[#334155] hover:text-white hover:border-[#475569]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <span className="text-white font-semibold">{awayTeamName || 'Equipo Visitante'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-300 border border-blue-400/20">
                  {awayFormation}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1E293B] text-[#CBD5E1]">
                  {awayPlayersCount} jug.
                </span>
                {awayGoalsCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    ⚽ {awayGoalsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter: Titulares / Suplentes */}
              <div className="inline-flex rounded bg-[#0A0D14] p-0.5 border border-[#334155]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-[#1E293B] text-white font-semibold'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Plantel
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('starters')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    statusFilter === 'starters'
                      ? 'bg-[#1E293B] text-amber-300 font-semibold'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Titulares
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('subs')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    statusFilter === 'subs'
                      ? 'bg-[#1E293B] text-blue-300 font-semibold'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Suplentes
                </button>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar jugador..."
                  className="pl-8 pr-2.5 py-1 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-amber-400 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {players.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#64748B] mb-3">
                  <FileImage className="w-6 h-6 text-amber-400/80" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Aún no se han analizado formaciones
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-sm mb-4">
                  Carga las imágenes del equipo local y visitante arriba y presiona "Analizar formaciones" para reconstruir las alineaciones.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewPlayerSide(teamTab);
                    setIsAddPlayerModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-amber-400 border border-amber-400/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cargar jugadores manualmente</span>
                </button>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] space-y-3">
                <p>
                  No se encontraron jugadores para <strong className="text-white">{teamTab === 'home' ? homeTeamName : awayTeamName}</strong> con los filtros activos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewPlayerSide(teamTab);
                    setIsAddPlayerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-amber-400 border border-amber-400/30 text-xs font-mono font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar jugador a {teamTab === 'home' ? homeTeamName : awayTeamName}</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-[#0A0D14] border-b border-[#334155] text-[10px] uppercase font-mono tracking-wider text-[#64748B] h-9 sticky top-0 z-10">
                    <th className="px-3 text-center w-12">#</th>
                    <th className="px-3">Jugador</th>
                    <th className="px-3 w-28">Equipo</th>
                    <th className="px-3 w-20 text-center">Posición</th>
                    <th className="px-3 text-center w-20">Minutos</th>
                    <th className="px-3 min-w-[260px] text-center">Acciones (⚽ 🟨 🟥 🅰️)</th>
                    <th className="px-3">Observación</th>
                    <th className="px-3 text-center w-12">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {filteredPlayers.map((player) => {
                    const isHome = player.teamSide === 'home';
                    const pEvents = player.events || { goals: 0, yellowCards: 0, redCards: 0, assists: 0 };
                    const goals = Number(pEvents.goals) || 0;
                    const yellowCards = Number(pEvents.yellowCards) || 0;
                    const redCards = Number(pEvents.redCards) || 0;
                    const assists = Number(pEvents.assists) || 0;
                    return (
                      <tr
                        key={player.id}
                        className="hover:bg-[#1E293B]/40 transition-colors text-xs group"
                      >
                        {/* Número */}
                        <td className="px-3 py-2 text-center font-mono font-bold">
                          {isEditingMode ? (
                            <input
                              type="number"
                              value={player.number}
                              onChange={(e) =>
                                handleUpdatePlayer(player.id, 'number', parseInt(e.target.value) || 0)
                              }
                              className="w-10 px-1 py-0.5 text-center bg-[#0A0D14] border border-[#334155] rounded text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                            />
                          ) : (
                            <span className="text-amber-400">
                              {player.number}
                            </span>
                          )}
                        </td>

                        {/* Jugador */}
                        <td className="px-3 py-2">
                          {isEditingMode ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={player.name}
                                onChange={(e) => handleUpdatePlayer(player.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-[#0A0D14] border border-[#334155] rounded text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                              />
                              <div className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-1 text-[10px] text-[#94A3B8] font-mono cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={player.isStarter}
                                    onChange={(e) =>
                                      handleUpdatePlayer(player.id, 'isStarter', e.target.checked)
                                    }
                                    className="rounded border-[#334155] text-amber-400 focus:ring-0"
                                  />
                                  <span>Titular</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Rol táctico (ej. Lateral)"
                                  value={player.formationRole || ''}
                                  onChange={(e) =>
                                    handleUpdatePlayer(player.id, 'formationRole', e.target.value)
                                  }
                                  className="px-1.5 py-0.5 text-[10px] bg-[#0A0D14] border border-[#334155] rounded text-[#94A3B8] focus:outline-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">
                                  {player.name}
                                </span>
                                {player.isStarter ? (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Titular
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#334155]/40 text-[#94A3B8] border border-[#334155]">
                                    Suplente
                                  </span>
                                )}
                              </div>
                              {player.formationRole && (
                                <p className="text-[10px] text-[#64748B] font-mono">
                                  {player.formationRole}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Equipo */}
                        <td className="px-3 py-2">
                          {isEditingMode ? (
                            <select
                              value={player.teamSide}
                              onChange={(e) =>
                                handleUpdatePlayer(player.id, 'teamSide', e.target.value as 'home' | 'away')
                              }
                              className="px-2 py-1 bg-[#0A0D14] border border-[#334155] rounded text-xs text-white focus:outline-none"
                            >
                              <option value="home">{homeTeamName} (Local)</option>
                              <option value="away">{awayTeamName} (Visitante)</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                                isHome
                                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                                  : 'bg-blue-400/10 text-blue-300 border border-blue-400/20'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isHome ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                              <span className="truncate max-w-[90px]">
                                {isHome ? homeTeamName : awayTeamName}
                              </span>
                            </span>
                          )}
                        </td>

                        {/* Posición */}
                        <td className="px-3 py-2 text-center">
                          {isEditingMode ? (
                            <div className="flex items-center justify-center gap-1">
                              <select
                                value={player.position}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.id, 'position', e.target.value)
                                }
                                className="px-1 py-1 bg-[#0A0D14] border border-[#334155] rounded text-xs text-white focus:outline-none"
                              >
                                <option value="GK">GK</option>
                                <option value="DF">DF</option>
                                <option value="MF">MF</option>
                                <option value="FW">FW</option>
                              </select>
                              <input
                                type="text"
                                value={player.positionLabel}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.id, 'positionLabel', e.target.value.toUpperCase())
                                }
                                className="w-11 px-1 py-1 text-center bg-[#0A0D14] border border-[#334155] rounded text-xs font-mono font-bold text-white focus:outline-none"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#111827] border border-[#334155] text-white font-bold">
                              {player.positionLabel}
                            </span>
                          )}
                        </td>

                        {/* Minutos */}
                        <td className="px-3 py-2 text-center font-mono text-xs">
                          {isEditingMode ? (
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={player.minutesPlayed}
                              onChange={(e) =>
                                handleUpdatePlayer(player.id, 'minutesPlayed', parseInt(e.target.value) || 0)
                              }
                              className="w-14 px-1 py-0.5 text-center bg-[#0A0D14] border border-[#334155] rounded text-xs text-white font-mono focus:outline-none"
                            />
                          ) : (
                            <span className="text-[#94A3B8]">
                              {player.minutesPlayed}'
                            </span>
                          )}
                        </td>

                        {/* Acciones: ⚽ Gol, 🟨 Amarilla, 🟥 Roja, 🅰️ Asistencia */}
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            {/* Gol ⚽ */}
                            {goals === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleModifyEvent(player.id, 'goals', 1)}
                                title="Añadir gol (+1)"
                                className="h-7 min-w-[30px] px-1.5 rounded-lg text-xs font-mono flex items-center justify-center bg-[#111827] text-[#94A3B8] border border-[#334155]/70 hover:text-white hover:border-emerald-400/60 hover:bg-emerald-500/10 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>⚽</span>
                              </button>
                            ) : (
                              <div
                                className="inline-flex items-center rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 h-7 overflow-hidden shadow-xs"
                                title={`Goles: ${goals}. Clic en '+' o en el emoji para sumar (+1), clic en '-' para restar (-1).`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'goals', -1);
                                  }}
                                  title="Restar o quitar gol (-1)"
                                  className="w-6 h-full hover:bg-rose-500/30 text-rose-300 border-r border-emerald-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModifyEvent(player.id, 'goals', 1)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleModifyEvent(player.id, 'goals', -1);
                                  }}
                                  title="Clic para sumar otro gol (+1) | Clic derecho para restar (-1)"
                                  className="px-2 h-full text-xs font-mono font-bold flex items-center gap-1 hover:bg-emerald-500/25 active:scale-95 transition-all cursor-pointer select-none"
                                >
                                  <span>⚽</span>
                                  <span>{goals}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'goals', 1);
                                  }}
                                  title="Sumar otro gol (+1)"
                                  className="w-6 h-full hover:bg-emerald-500/30 text-emerald-300 border-l border-emerald-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Amarilla 🟨 */}
                            {yellowCards === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleModifyEvent(player.id, 'yellowCards', 1)}
                                title="Añadir tarjeta amarilla (+1)"
                                className="h-7 min-w-[30px] px-1.5 rounded-lg text-xs font-mono flex items-center justify-center bg-[#111827] text-[#94A3B8] border border-[#334155]/70 hover:text-white hover:border-amber-400/60 hover:bg-amber-500/10 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>🟨</span>
                              </button>
                            ) : (
                              <div
                                className="inline-flex items-center rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 h-7 overflow-hidden shadow-xs"
                                title={`Tarjetas amarillas: ${yellowCards}. Clic en '+' o en el emoji para sumar (+1), clic en '-' para restar (-1).`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'yellowCards', -1);
                                  }}
                                  title="Quitar tarjeta amarilla (-1)"
                                  className="w-6 h-full hover:bg-rose-500/30 text-rose-300 border-r border-amber-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModifyEvent(player.id, 'yellowCards', 1)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleModifyEvent(player.id, 'yellowCards', -1);
                                  }}
                                  title="Clic para sumar otra amarilla (+1) | Clic derecho para restar (-1)"
                                  className="px-2 h-full text-xs font-mono font-bold flex items-center gap-1 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer select-none"
                                >
                                  <span>🟨</span>
                                  <span>{yellowCards}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'yellowCards', 1);
                                  }}
                                  title="Sumar otra tarjeta amarilla (+1)"
                                  className="w-6 h-full hover:bg-amber-500/30 text-amber-300 border-l border-amber-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Roja 🟥 */}
                            {redCards === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleModifyEvent(player.id, 'redCards', 1)}
                                title="Añadir tarjeta roja (+1)"
                                className="h-7 min-w-[30px] px-1.5 rounded-lg text-xs font-mono flex items-center justify-center bg-[#111827] text-[#94A3B8] border border-[#334155]/70 hover:text-white hover:border-rose-400/60 hover:bg-rose-500/10 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>🟥</span>
                              </button>
                            ) : (
                              <div
                                className="inline-flex items-center rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 h-7 overflow-hidden shadow-xs"
                                title={`Tarjetas rojas: ${redCards}. Clic en '+' o en el emoji para sumar (+1), clic en '-' para restar (-1).`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'redCards', -1);
                                  }}
                                  title="Quitar / anular tarjeta roja (-1)"
                                  className="w-6 h-full hover:bg-rose-500/40 text-rose-300 border-r border-rose-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModifyEvent(player.id, 'redCards', 1)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleModifyEvent(player.id, 'redCards', -1);
                                  }}
                                  title="Clic para sumar otra roja (+1) | Clic derecho para anular (-1)"
                                  className="px-2 h-full text-xs font-mono font-bold flex items-center gap-1 hover:bg-rose-500/30 active:scale-95 transition-all cursor-pointer select-none"
                                >
                                  <span>🟥</span>
                                  <span>{redCards}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'redCards', 1);
                                  }}
                                  title="Sumar otra tarjeta roja (+1)"
                                  className="w-6 h-full hover:bg-rose-500/30 text-rose-300 border-l border-rose-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Asistencia 🅰️ */}
                            {assists === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleModifyEvent(player.id, 'assists', 1)}
                                title="Añadir asistencia (+1)"
                                className="h-7 min-w-[30px] px-1.5 rounded-lg text-xs font-mono flex items-center justify-center bg-[#111827] text-[#94A3B8] border border-[#334155]/70 hover:text-white hover:border-blue-400/60 hover:bg-blue-500/10 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>🅰️</span>
                              </button>
                            ) : (
                              <div
                                className="inline-flex items-center rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 h-7 overflow-hidden shadow-xs"
                                title={`Asistencias: ${assists}. Clic en '+' o en el emoji para sumar (+1), clic en '-' para restar (-1).`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'assists', -1);
                                  }}
                                  title="Quitar / restar asistencia (-1)"
                                  className="w-6 h-full hover:bg-rose-500/30 text-rose-300 border-r border-blue-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModifyEvent(player.id, 'assists', 1)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleModifyEvent(player.id, 'assists', -1);
                                  }}
                                  title="Clic para sumar otra asistencia (+1) | Clic derecho para restar (-1)"
                                  className="px-2 h-full text-xs font-mono font-bold flex items-center gap-1 hover:bg-blue-500/25 active:scale-95 transition-all cursor-pointer select-none"
                                >
                                  <span>🅰️</span>
                                  <span>{assists}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifyEvent(player.id, 'assists', 1);
                                  }}
                                  title="Sumar otra asistencia (+1)"
                                  className="w-6 h-full hover:bg-blue-500/30 text-blue-300 border-l border-blue-500/30 font-bold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Observación */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={player.observation}
                            onChange={(e) =>
                              handleUpdatePlayer(player.id, 'observation', e.target.value)
                            }
                            placeholder="Nota de scouting..."
                            className="w-full px-2 py-1 rounded bg-[#0A0D14] border border-transparent hover:border-[#334155] focus:border-amber-400 text-xs text-[#CBD5E1] placeholder-[#475569] focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Eliminar fila */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-1 rounded text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
            )}
          </div>

          {/* Table Footer Count Summary */}
          {players.length > 0 && (
            <div className="p-2.5 border-t border-[#334155]/60 bg-[#0A0D14] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#94A3B8] shrink-0">
              <div className="flex items-center gap-4">
                <span>
                  Equipo mostrado:{' '}
                  <strong className={teamTab === 'home' ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>
                    {teamTab === 'home' ? homeTeamName : awayTeamName} ({filteredPlayers.length} jugadores)
                  </strong>
                </span>
                <span>
                  Total ambas alineaciones: <strong className="text-white font-bold">{players.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#94A3B8]">
                  * Acciones: clic en el emoji o en '+' para añadir (+1), clic en '-' para restar (-1). Clic derecho también resta.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Agregar Jugador Manualmente */}
      {isAddPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Plus className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Agregar Jugador a la Alineación
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPlayerModalOpen(false)}
                className="text-[#64748B] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-3">
              {/* Equipo */}
              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1">
                  Equipo
                </label>
                <select
                  value={newPlayerSide}
                  onChange={(e) => setNewPlayerSide(e.target.value as 'home' | 'away')}
                  className="w-full px-3 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="home">{homeTeamName} (Equipo Local)</option>
                  <option value="away">{awayTeamName} (Equipo Visitante)</option>
                </select>
              </div>

              {/* Dorsal y Nombre */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-mono text-[#94A3B8] mb-1">
                    # Dorsal
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-[#94A3B8] mb-1">
                    Nombre del Jugador
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lucas Beltrán"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Posición & Sigla táctica */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-[#94A3B8] mb-1">
                    Línea Posición
                  </label>
                  <select
                    value={newPlayerPos}
                    onChange={(e) => {
                      const pos = e.target.value as 'GK' | 'DF' | 'MF' | 'FW';
                      setNewPlayerPos(pos);
                      if (pos === 'GK') setNewPlayerPosLabel('POR');
                      else if (pos === 'DF') setNewPlayerPosLabel('DFC');
                      else if (pos === 'MF') setNewPlayerPosLabel('MC');
                      else if (pos === 'FW') setNewPlayerPosLabel('DC');
                    }}
                    className="w-full px-3 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="GK">Portero (GK)</option>
                    <option value="DF">Defensa (DF)</option>
                    <option value="MF">Mediocampista (MF)</option>
                    <option value="FW">Delantero (FW)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#94A3B8] mb-1">
                    Sigla (ej. DFC, LI, MC, DC)
                  </label>
                  <input
                    type="text"
                    value={newPlayerPosLabel}
                    onChange={(e) => setNewPlayerPosLabel(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded bg-[#0A0D14] border border-[#334155] text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Titular vs Suplente */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-mono text-[#CBD5E1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlayerIsStarter}
                    onChange={(e) => setNewPlayerIsStarter(e.target.checked)}
                    className="rounded border-[#334155] text-amber-400 focus:ring-0"
                  />
                  <span>Es Jugador Titular (Starting XI)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-[#94A3B8] hover:text-white bg-[#1E293B] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-bold font-mono bg-amber-400 text-[#0F172A] hover:bg-amber-300 transition-colors"
                >
                  Agregar a Alineación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for searching & assigning team crest badges */}
      <TeamBadgeFinderModal
        isOpen={badgeFinderTarget !== null}
        onClose={() => setBadgeFinderTarget(null)}
        teamName={badgeFinderTarget === 'home' ? homeTeamName : awayTeamName}
        currentLogoUrl={badgeFinderTarget === 'home' ? homeTeamLogo : awayTeamLogo}
        onSelectBadge={(badgeUrl) => {
          if (badgeFinderTarget === 'home') {
            setHomeTeamLogo(badgeUrl);
          } else if (badgeFinderTarget === 'away') {
            setAwayTeamLogo(badgeUrl);
          }
          setBadgeFinderTarget(null);
        }}
      />
    </div>
  );
};
