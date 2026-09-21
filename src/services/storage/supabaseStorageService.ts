import { 
  CompleteMatchReport, 
  MatchReportMeta, 
  ScoutEvaluation, 
  MatchEventNote, 
  MatchDetails,
  PlayerGeneralReport,
  Player
} from '../../types/scouting';
import { supabase } from '../supabase';
import { IStorageService } from './storageService';

/**
 * SupabaseStorageService
 * Primary database service powered by Supabase PostgreSQL and Row Level Security (RLS).
 * All queries are strictly scoped to the authenticated user's ID.
 */
export class SupabaseStorageService implements IStorageService {
  /**
   * Helper to retrieve currently authenticated Supabase user
   */
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  /**
   * Saves a full match report to Supabase PostgreSQL.
   * Inserts/upserts into:
   * - teams
   * - players
   * - matches (with user_id)
   * - match_players
   * - scout_evaluations
   * - match_event_notes
   */
  async saveReport(report: CompleteMatchReport): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Debes iniciar sesión con Supabase para guardar informes en la base de datos.');
    }

    const { meta, match, evaluations = {}, eventNotes = {} } = report;

    // 1. Upsert Teams (if present)
    try {
      if (match.homeTeam) {
        await supabase.from('teams').upsert({
          id: match.homeTeam.id,
          name: match.homeTeam.name,
          short_name: match.homeTeam.shortName || match.homeTeam.name,
          logo_url: match.homeTeam.logoUrl || ''
        }, { onConflict: 'id' });
      }

      if (match.awayTeam) {
        await supabase.from('teams').upsert({
          id: match.awayTeam.id,
          name: match.awayTeam.name,
          short_name: match.awayTeam.shortName || match.awayTeam.name,
          logo_url: match.awayTeam.logoUrl || ''
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Supabase teams upsert warning:', e);
    }

    // 2. Upsert Players into catalogue
    try {
      const allPlayers: Player[] = [
        ...(match.homeTeam?.starters || []),
        ...(match.homeTeam?.substitutes || []),
        ...(match.awayTeam?.starters || []),
        ...(match.awayTeam?.substitutes || [])
      ];

      if (allPlayers.length > 0) {
        const playersPayload = allPlayers.map(p => ({
          id: p.id,
          name: p.name,
          short_name: p.shortName || p.name,
          number: p.number || null,
          position: p.position || 'MF',
          position_label: p.positionLabel || p.position || 'MF',
          nationality: p.nationality || '',
          avatar_url: p.avatarUrl || ''
        }));

        await supabase.from('players').upsert(playersPayload, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Supabase players upsert warning:', e);
    }

    // 3. Upsert Match (Main table with RLS user_id)
    const matchRecord = {
      id: meta.id,
      user_id: userId,
      url: meta.url || '',
      competition: meta.competition || match.competition || '',
      competition_logo: match.competitionLogo || '',
      round_or_phase: match.roundOrPhase || '',
      match_date: meta.matchDate ? new Date(meta.matchDate).toISOString() : new Date().toISOString(),
      stadium: meta.stadium || match.stadium || '',
      referee: match.referee || '',
      status: meta.status || match.status || 'FINISHED',
      home_team_id: match.homeTeam?.id || null,
      away_team_id: match.awayTeam?.id || null,
      home_score: match.homeTeam?.score ?? 0,
      away_score: match.awayTeam?.score ?? 0,
      home_formation: match.homeTeam?.formation || '4-3-3',
      away_formation: match.awayTeam?.formation || '4-3-3',
      general_notes: meta.generalNotes || '',
      // Store complete structured object in full_match_data for ultra-fast reconstruct
      full_match_data: {
        meta,
        match,
        evaluations,
        eventNotes
      },
      updated_at: new Date().toISOString()
    };

    const { error: matchError } = await supabase.from('matches').upsert(matchRecord, { onConflict: 'id' });
    if (matchError) {
      console.error('Supabase match upsert error:', matchError);
      throw new Error(`Error al guardar partido en Supabase: ${matchError.message}`);
    }

    // 4. Upsert Evaluations in scout_evaluations table
    try {
      const evalEntries = Object.entries(evaluations);
      if (evalEntries.length > 0) {
        const evalsPayload = evalEntries.map(([playerId, ev]) => ({
          user_id: userId,
          match_id: meta.id,
          player_id: playerId,
          rating: ev.rating || null,
          rating_level: ev.ratingLevel || null,
          comment: ev.comment || '',
          tags: ev.tags || [],
          updated_at: new Date().toISOString()
        }));

        await supabase.from('scout_evaluations').upsert(evalsPayload, { onConflict: 'user_id,match_id,player_id' });
      }
    } catch (e) {
      console.warn('Supabase scout_evaluations upsert warning:', e);
    }

    // 5. Upsert Match Event Notes
    try {
      const noteEntries = Object.entries(eventNotes);
      if (noteEntries.length > 0) {
        const notesPayload = noteEntries.map(([eventId, n]) => ({
          user_id: userId,
          match_id: meta.id,
          event_id: eventId,
          note: n.note || '',
          updated_at: new Date().toISOString()
        }));

        await supabase.from('match_event_notes').upsert(notesPayload, { onConflict: 'user_id,match_id,event_id' });
      }
    } catch (e) {
      console.warn('Supabase match_event_notes upsert warning:', e);
    }
  }

  /**
   * Retrieves all match summaries owned by the current user from Supabase.
   */
  async getReports(): Promise<MatchReportMeta[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('matches')
      .select('id, user_id, url, competition, competition_logo, round_or_phase, match_date, stadium, referee, status, home_score, away_score, home_formation, away_formation, general_notes, full_match_data, created_at, updated_at, home_team:teams!matches_home_team_id_fkey(name, short_name, logo_url), away_team:teams!matches_away_team_id_fkey(name, short_name, logo_url)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      // Fallback: simple query if relations not defined yet
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (fallbackError) {
        console.warn('Supabase getReports error:', fallbackError);
        return [];
      }

      return (fallbackData || []).map((row: any) => {
        if (row.full_match_data?.meta) {
          return row.full_match_data.meta;
        }
        return {
          id: row.id,
          url: row.url || '',
          homeTeamName: row.home_team_name || 'Local',
          awayTeamName: row.away_team_name || 'Visitante',
          homeTeamLogo: row.home_team_logo || '',
          awayTeamLogo: row.away_team_logo || '',
          homeScore: row.home_score ?? 0,
          awayScore: row.away_score ?? 0,
          competition: row.competition || '',
          competitionLogo: row.competition_logo || '',
          roundOrPhase: row.round_or_phase || '',
          matchDate: row.match_date || row.created_at,
          stadium: row.stadium || '',
          referee: row.referee || '',
          status: row.status || 'FINISHED',
          hasLineup: true,
          hasStats: true,
          scoutNotes: row.general_notes || '',
          evaluationCount: 0,
          savedAt: row.created_at,
          lastModified: row.updated_at
        };
      });
    }

    return (data || []).map((row: any) => {
      if (row.full_match_data?.meta) {
        return row.full_match_data.meta;
      }
      return {
        id: row.id,
        url: row.url || '',
        homeTeamName: row.home_team?.name || 'Local',
        awayTeamName: row.away_team?.name || 'Visitante',
        homeTeamLogo: row.home_team?.logo_url || '',
        awayTeamLogo: row.away_team?.logo_url || '',
        homeScore: row.home_score ?? 0,
        awayScore: row.away_score ?? 0,
        competition: row.competition || '',
        competitionLogo: row.competition_logo || '',
        roundOrPhase: row.round_or_phase || '',
        matchDate: row.match_date || row.created_at,
        stadium: row.stadium || '',
        referee: row.referee || '',
        status: row.status || 'FINISHED',
        hasLineup: true,
        hasStats: true,
        scoutNotes: row.general_notes || '',
        evaluationCount: 0,
        savedAt: row.created_at,
        lastModified: row.updated_at
      };
    });
  }

  /**
   * Retrieves a full single match report by ID, verifying user ownership via Supabase RLS.
   */
  async getReport(reportId: string): Promise<CompleteMatchReport | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.warn('Supabase getReport error:', error);
      return null;
    }

    if (data.full_match_data) {
      const full = data.full_match_data as CompleteMatchReport;
      
      // Also fetch any live updates from scout_evaluations and match_event_notes
      const { data: evalsData } = await supabase
        .from('scout_evaluations')
        .select('*')
        .eq('match_id', reportId)
        .eq('user_id', userId);

      if (evalsData && evalsData.length > 0) {
        full.evaluations = full.evaluations || {};
        evalsData.forEach((e: any) => {
          full.evaluations[e.player_id] = {
            id: e.id,
            reportId,
            matchId: reportId,
            playerId: e.player_id,
            rating: Number(e.rating) || 5,
            ratingLevel: e.rating_level || 'MEDIUM',
            comment: e.comment || '',
            tags: e.tags || [],
            updatedAt: e.updated_at
          };
        });
      }

      const { data: notesData } = await supabase
        .from('match_event_notes')
        .select('*')
        .eq('match_id', reportId)
        .eq('user_id', userId);

      if (notesData && notesData.length > 0) {
        full.eventNotes = full.eventNotes || {};
        notesData.forEach((n: any) => {
          full.eventNotes[n.event_id] = {
            reportId,
            eventId: n.event_id,
            note: n.note || '',
            updatedAt: n.updated_at
          };
        });
      }

      return full;
    }

    return null;
  }

  /**
   * Updates a single player evaluation in Supabase PostgreSQL
   */
  async updatePlayerEvaluation(evaluation: ScoutEvaluation): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    // 1. Update scout_evaluations table
    await supabase.from('scout_evaluations').upsert({
      user_id: userId,
      match_id: evaluation.reportId,
      player_id: evaluation.playerId,
      rating: evaluation.rating,
      rating_level: evaluation.ratingLevel,
      comment: evaluation.comment || '',
      tags: evaluation.tags || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,match_id,player_id' });

    // 2. Update nested json in match record if present
    const report = await this.getReport(evaluation.reportId);
    if (report) {
      report.evaluations = report.evaluations || {};
      report.evaluations[evaluation.playerId] = evaluation;
      await supabase.from('matches').update({
        full_match_data: report,
        updated_at: new Date().toISOString()
      }).eq('id', evaluation.reportId).eq('user_id', userId);
    }
  }

  /**
   * Updates match general scout notes
   */
  async updateMatchNotes(reportId: string, notes: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    const report = await this.getReport(reportId);
    if (report) {
      report.meta.generalNotes = notes;
      await supabase.from('matches').update({
        general_notes: notes,
        full_match_data: report,
        updated_at: new Date().toISOString()
      }).eq('id', reportId).eq('user_id', userId);
    } else {
      await supabase.from('matches').update({
        general_notes: notes,
        updated_at: new Date().toISOString()
      }).eq('id', reportId).eq('user_id', userId);
    }
  }

  /**
   * Updates an event timeline note
   */
  async updateEventNote(note: MatchEventNote): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    await supabase.from('match_event_notes').upsert({
      user_id: userId,
      match_id: note.reportId,
      event_id: note.eventId,
      note: note.note,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,match_id,event_id' });

    const report = await this.getReport(note.reportId);
    if (report) {
      report.eventNotes = report.eventNotes || {};
      report.eventNotes[note.eventId] = note;
      await supabase.from('matches').update({
        full_match_data: report,
        updated_at: new Date().toISOString()
      }).eq('id', note.reportId).eq('user_id', userId);
    }
  }

  /**
   * Deletes a match report owned by user
   */
  async deleteReport(reportId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    await supabase.from('matches').delete().eq('id', reportId).eq('user_id', userId);
    await supabase.from('scout_evaluations').delete().eq('match_id', reportId).eq('user_id', userId);
    await supabase.from('match_event_notes').delete().eq('match_id', reportId).eq('user_id', userId);
  }

  /**
   * Dossiers de Jugador
   */
  async getPlayerGeneralReport(playerId: string): Promise<PlayerGeneralReport | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('player_dossiers')
      .select('*')
      .eq('player_id', playerId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    if (data.full_data) {
      return data.full_data as PlayerGeneralReport;
    }

    return {
      playerId: data.player_id,
      playerName: data.player_name,
      teamName: data.team_name || '',
      positionLabel: data.position_label || '',
      overallRating: Number(data.overall_rating) || 5,
      recommendation: data.recommendation || 'MONITOR',
      projectedRole: data.projected_role || '',
      strengths: data.strengths || '',
      weaknesses: data.weaknesses || '',
      summaryNotes: data.summary_notes || '',
      updatedAt: data.updated_at
    };
  }

  async savePlayerGeneralReport(report: PlayerGeneralReport): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Debes iniciar sesión con Supabase para guardar dossiers.');
    }

    const payload = {
      user_id: userId,
      player_id: report.playerId,
      player_name: report.playerName || report.playerId,
      team_name: report.teamName || '',
      position_label: report.positionLabel || '',
      overall_rating: report.overallRating || 5,
      recommendation: report.recommendation || 'MONITOR',
      projected_role: report.projectedRole || '',
      strengths: report.strengths || '',
      weaknesses: report.weaknesses || '',
      summary_notes: report.summaryNotes || '',
      full_data: report,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('player_dossiers')
      .upsert(payload, { onConflict: 'user_id,player_id' });

    if (error) {
      console.error('Supabase savePlayerGeneralReport error:', error);
    }
  }

  async getAllPlayerGeneralReports(): Promise<Record<string, PlayerGeneralReport>> {
    const userId = await this.getCurrentUserId();
    if (!userId) return {};

    const { data, error } = await supabase
      .from('player_dossiers')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error || !data) return {};

    const map: Record<string, PlayerGeneralReport> = {};
    data.forEach((row: any) => {
      if (row.full_data) {
        map[row.player_id] = row.full_data;
      } else {
        map[row.player_id] = {
          playerId: row.player_id,
          playerName: row.player_name,
          teamName: row.team_name || '',
          positionLabel: row.position_label || '',
          overallRating: Number(row.overall_rating) || 5,
          recommendation: row.recommendation || 'MONITOR',
          projectedRole: row.projected_role || '',
          strengths: row.strengths || '',
          weaknesses: row.weaknesses || '',
          summaryNotes: row.summary_notes || '',
          updatedAt: row.updated_at
        };
      }
    });

    return map;
  }

  async deletePlayerGeneralReport(playerId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    await supabase
      .from('player_dossiers')
      .delete()
      .eq('player_id', playerId)
      .eq('user_id', userId);
  }

  async syncAll(): Promise<void> {
    // Supabase is the live single source of truth, no manual multi-step sync required.
  }

  async exportAllDataAsJSON(): Promise<string> {
    const reports = await this.getReports();
    const fullReports: Record<string, CompleteMatchReport> = {};
    for (const meta of reports) {
      const rep = await this.getReport(meta.id);
      if (rep) fullReports[meta.id] = rep;
    }
    const dossiers = await this.getAllPlayerGeneralReports();
    const { data: { user } } = await supabase.auth.getUser();

    return JSON.stringify({
      app: 'Pro Football Scouting Studio (Supabase Engine)',
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email
      },
      stats: {
        totalReports: Object.keys(fullReports).length,
        totalDossiers: Object.keys(dossiers).length
      },
      data: {
        reports: fullReports,
        playerReports: dossiers
      }
    }, null, 2);
  }

  async importDataFromJSON(jsonString: string): Promise<{ reportsCount: number; dossiersCount: number }> {
    const parsed = JSON.parse(jsonString);
    const reports: Record<string, CompleteMatchReport> = parsed.data?.reports || parsed.reports || {};
    const dossiers: Record<string, PlayerGeneralReport> = parsed.data?.playerReports || parsed.playerReports || {};

    let reportsCount = 0;
    let dossiersCount = 0;

    for (const rep of Object.values(reports)) {
      if (rep && rep.meta) {
        await this.saveReport(rep);
        reportsCount++;
      }
    }

    for (const dos of Object.values(dossiers)) {
      if (dos && dos.playerId) {
        await this.savePlayerGeneralReport(dos);
        dossiersCount++;
      }
    }

    return { reportsCount, dossiersCount };
  }
}

export const supabaseStorageService = new SupabaseStorageService();
