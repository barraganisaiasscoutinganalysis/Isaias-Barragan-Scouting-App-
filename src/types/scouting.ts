/**
 * SCOUTING Domain Types & Data Models
 * Clean separation between external match data and scout evaluations
 */

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface HeatmapPoint {
  x: number; // 0 to 100 percentage of pitch length
  y: number; // 0 to 100 percentage of pitch width
  intensity: number; // 0.1 to 1.0
}

export interface PlayerActionPoint {
  id: string;
  x: number;
  y: number;
  type: 'pass' | 'shot' | 'tackle' | 'aerial' | 'cross' | 'carry' | 'foul';
  outcome: 'success' | 'failed';
  minute: number;
  label?: string;
}

export interface PlayerAttackStats {
  goals?: number;
  assists?: number;
  shots?: number;
  shotsOnTarget?: number;
  bigChancesCreated?: number;
  touchesInOppBox?: number;
  dribblesAttempted?: number;
  dribblesSucceeded?: number;
}

export interface PlayerPassingStats {
  touches?: number; // Total touches of the ball ("Toques totales")
  passesAttempted?: number;
  passesCompleted?: number;
  passingAccuracy?: number; // e.g. 84 (%)
  keyPasses?: number;
  crossesTotal?: number;
  crossesAccurate?: number;
  longBallsTotal?: number;
  longBallsAccurate?: number;
  // Sofascore Last Third Passes ("Pases en el último tercio")
  finalThirdPassesAttempted?: number;
  finalThirdPassesCompleted?: number;
  finalThirdPassesAccuracy?: number;
}

export interface PlayerDefenseStats {
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  duelsTotal?: number;
  duelsWon?: number;
  recoveries?: number;
  blockedShots?: number;
}

export interface PlayerDisciplineStats {
  foulsCommitted?: number;
  foulsDrawn?: number;
  yellowCards?: number;
  redCards?: number;
  offsides?: number;
}

export interface GoalkeeperStats {
  saves?: number;
  goalsConceded?: number;
  savesInsideBox?: number;
  punches?: number;
  runsOut?: number;
  passesAttempted?: number;
  passingAccuracy?: number;
}

export interface PlayerStatistics {
  rating?: number; // Sofascore rating e.g. 7.6
  minutesPlayed: number;
  touches?: number; // Total touches of the ball
  attack?: PlayerAttackStats;
  passing?: PlayerPassingStats;
  defense?: PlayerDefenseStats;
  discipline?: PlayerDisciplineStats;
  goalkeeper?: GoalkeeperStats;
}

export interface Player {
  id: string;
  name: string;
  shortName: string;
  number: number;
  position: PlayerPosition;
  positionLabel: string; // e.g. "CB", "CDM", "RW", "ST"
  nationality: string;
  nationalityCode?: string;
  height?: string | number; // e.g. "184 cm"
  age?: number; // e.g. 25
  preferredFoot?: string; // e.g. "Diestro", "Zurdo", "Ambidiestro"
  marketValue?: string; // e.g. "€4.5M"
  contractUntil?: string; // e.g. "30/06/2026"
  avatarUrl: string;
  isStarter: boolean;
  minutesPlayed: number;
  captain?: boolean;
  formationPosition?: {
    row: number; // 0 to 4 (GK -> FW)
    col: number; // 0 to 4 (Left -> Right)
  };
  statistics?: PlayerStatistics;
  heatmapPoints?: HeatmapPoint[];
  actionPoints?: PlayerActionPoint[];
  hasRealHeatmap?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  formation: string; // e.g. "4-3-3", "4-2-3-1"
  score: number;
  isHome: boolean;
  starters: Player[];
  substitutes: Player[];
}

export type MatchEventType = 
  | 'goal' 
  | 'yellow_card' 
  | 'red_card' 
  | 'yellow_red_card' 
  | 'substitution' 
  | 'var' 
  | 'penalty_miss' 
  | 'own_goal'
  | 'period';

export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute?: number;
  teamId: string;
  teamName: string;
  type: MatchEventType;
  subType?: string; // 'second_yellow' | 'direct_red' | 'penalty' | 'own_goal' | 'regular'
  playerId: string;
  playerName: string;
  playerNumber?: number;
  playerInName?: string;
  playerInId?: string;
  playerOutName?: string;
  playerOutId?: string;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  secondaryPlayerNumber?: number;
  description: string;
  score?: { home: number; away: number };
}

export interface MatchDetails {
  id: string;
  url: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: string;
  competitionLogo?: string;
  roundOrPhase: string;
  date: string;
  stadium: string;
  referee?: string;
  status: 'FINISHED' | 'LIVE' | 'UPCOMING';
  events: MatchEvent[];
}

// ---------------- SCOUT EVALUATIONS & NOTES ----------------
export type ScoutRatingLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScoutEvaluation {
  id?: string;
  reportId: string;
  matchId: string;
  playerId: string;
  userId?: string;
  rating?: number; // 1.0 - 10.0
  ratingLevel?: ScoutRatingLevel; // HIGH, MEDIUM, LOW
  comment: string;
  tags?: string[];
  updatedAt: string;
}

export interface MatchEventNote {
  id?: string;
  reportId: string;
  eventId: string;
  userId?: string;
  note: string;
  updatedAt: string;
}

export interface MatchReportMeta {
  id: string;
  matchId: string;
  url: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  score: string;
  competition: string;
  matchDate: string;
  stadium: string;
  status: string;
  generalNotes: string;
  evaluationCount: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface CompleteMatchReport {
  meta: MatchReportMeta;
  match: MatchDetails;
  evaluations: Record<string, ScoutEvaluation>; // keyed by playerId
  eventNotes: Record<string, MatchEventNote>; // keyed by eventId
}

export type PlayerRecommendation = 'SIGN' | 'MONITOR' | 'FUTURE' | 'DISCARD';

export interface PlayerGeneralReport {
  playerId: string;
  playerName: string;
  teamName?: string;
  positionLabel?: string;
  overallRating?: number; // 1.0 to 10.0
  recommendation?: PlayerRecommendation;
  projectedRole?: string; // e.g. "Titular", "Rotación", "Desarrollo / Promesa"
  strengths?: string;
  weaknesses?: string;
  summaryNotes: string;
  updatedAt: string;
  userId?: string;
}
