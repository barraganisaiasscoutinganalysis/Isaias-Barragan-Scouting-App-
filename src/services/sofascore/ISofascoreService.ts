import { MatchDetails, Player, MatchEvent, HeatmapPoint, PlayerStatistics } from '../../types/scouting';

/**
 * Clean abstract interface for Match Data providers.
 * UI components interact exclusively with this service abstraction,
 * making it seamless to swap the mock adapter with a real backend proxy or Sofascore API later.
 */
export interface ISofascoreService {
  /**
   * Parses the URL, verifies validity and returns match ID
   */
  parseUrl(url: string): { valid: boolean; matchId?: string; normalizedUrl?: string };

  /**
   * Fetches the entire match data structure from URL or Match ID
   */
  getMatchFromUrl(url: string, onProgress?: (step: string) => void): Promise<MatchDetails>;

  /**
   * Imports official raw Sofascore JSON payload (lineups, event, or combined) directly
   */
  importSofascorePayload(payloadOrJsonString: string | any, urlOrTeams?: string, fallbackHome?: string, fallbackAway?: string): Promise<MatchDetails>;

  /**
   * Retrieves match metadata & teams
   */
  getMatchDetails(matchId: string): Promise<MatchDetails>;

  /**
   * Retrieves current lineups (starters & substitutes)
   */
  getLineups(matchId: string): Promise<{ homeStarters: Player[]; homeSubs: Player[]; awayStarters: Player[]; awaySubs: Player[] }>;

  /**
   * Retrieves deep statistics for a specific player
   */
  getPlayerStatistics(matchId: string, playerId: string): Promise<PlayerStatistics | null>;

  /**
   * Retrieves timeline events
   */
  getMatchEvents(matchId: string): Promise<MatchEvent[]>;

  /**
   * Retrieves 2D pitch coordinates and intensities for player heatmaps
   */
  getPlayerHeatmap(matchId: string, playerId: string): Promise<HeatmapPoint[]>;
}
