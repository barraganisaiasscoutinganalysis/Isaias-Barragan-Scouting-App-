import { 
  CompleteMatchReport, 
  MatchReportMeta, 
  ScoutEvaluation, 
  MatchEventNote, 
  MatchDetails,
  PlayerGeneralReport 
} from '../../types/scouting';
import { db, auth } from '../firebase';
import { sofascoreService } from '../sofascore/sofascoreService';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc 
} from 'firebase/firestore';

const LEGACY_STORAGE_REPORTS_KEY = 'scouting_reports_v1';
const LEGACY_STORAGE_PLAYER_REPORTS_KEY = 'scouting_player_general_reports_v1';

/**
 * Sanitizes any JavaScript object or array for Firestore:
 * - Strips `undefined` values (which crash Firestore setDoc/updateDoc)
 * - Converts to plain serializable JSON structures
 */
function sanitizeForFirestore<T>(data: T): any {
  if (data === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.warn('Serialization fallback in sanitizeForFirestore:', err);
    return data;
  }
}

export interface IStorageService {
  saveReport(report: CompleteMatchReport): Promise<void>;
  getReports(): Promise<MatchReportMeta[]>;
  getReport(reportId: string): Promise<CompleteMatchReport | null>;
  updatePlayerEvaluation(evaluation: ScoutEvaluation): Promise<void>;
  updateMatchNotes(reportId: string, notes: string): Promise<void>;
  updateEventNote(note: MatchEventNote): Promise<void>;
  deleteReport(reportId: string): Promise<void>;
  getPlayerGeneralReport(playerId: string): Promise<PlayerGeneralReport | null>;
  savePlayerGeneralReport(report: PlayerGeneralReport): Promise<void>;
  getAllPlayerGeneralReports(): Promise<Record<string, PlayerGeneralReport>>;
  deletePlayerGeneralReport(playerId: string): Promise<void>;
  syncAll(): Promise<void>;
  exportAllDataAsJSON(): Promise<string>;
  importDataFromJSON(jsonString: string): Promise<{ reportsCount: number; dossiersCount: number }>;
}

class HybridStorageService implements IStorageService {
  /**
   * Returns a scope identifier: 'uid_{firebase_uid}' if logged in, or 'guest' if logged out.
   */
  private getStoragePrefix(): string {
    const uid = auth.currentUser?.uid;
    return uid ? `uid_${uid}` : 'guest';
  }

  private getReportsKey(): string {
    return `scouting_reports_${this.getStoragePrefix()}`;
  }

  private getPlayerReportsKey(): string {
    return `scouting_player_reports_${this.getStoragePrefix()}`;
  }

  private getLocalReports(): Record<string, CompleteMatchReport> {
    const result: Record<string, CompleteMatchReport> = {};
    const primaryKey = this.getReportsKey();
    const isUserLoggedIn = Boolean(auth.currentUser?.uid);

    // 1. Read primary user-scoped storage key
    try {
      const raw = localStorage.getItem(primaryKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.assign(result, parsed);
        }
      }
    } catch (e) {
      console.error('Failed to read local reports', e);
    }

    // 2. If user is logged in and their scoped storage is still empty, migrate legacy un-scoped data
    if (isUserLoggedIn && Object.keys(result).length === 0) {
      const alternateKeys = [
        LEGACY_STORAGE_REPORTS_KEY,
        'scouting_reports_guest',
        'scouting_reports',
        'scouting_reports_v0',
        'scouting_reports_v1_backup'
      ];

      for (const key of alternateKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed)) {
                parsed.forEach((item: any) => {
                  const id = item?.meta?.id || item?.id;
                  if (id && !result[id]) result[id] = item;
                });
              } else {
                for (const [k, v] of Object.entries(parsed)) {
                  if (v && !result[k]) result[k] = v as CompleteMatchReport;
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // If we migrated items into user scope, persist them under the user's key
      if (Object.keys(result).length > 0) {
        this.setLocalReports(result);
      }
    }

    return result;
  }

  private setLocalReports(reports: Record<string, CompleteMatchReport>) {
    try {
      const primaryKey = this.getReportsKey();
      const serialized = JSON.stringify(reports);
      localStorage.setItem(primaryKey, serialized);
      localStorage.setItem(`${primaryKey}_backup`, serialized);
    } catch (e) {
      console.error('Failed to write local reports', e);
    }
  }

  /**
   * Creates an immutable local and cloud snapshot backup to prevent any accidental data loss.
   */
  private createVaultSnapshot(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const reports = this.getLocalReports();
      const playerReports = this.getLocalPlayerReports();
      
      const snapshot = {
        timestamp: new Date().toISOString(),
        reportsCount: Object.keys(reports).length,
        reportsSummary: Object.values(reports).map(r => `${r?.meta?.homeTeamName || ''} vs ${r?.meta?.awayTeamName || ''} (${r?.meta?.id || ''})`),
        data: {
          reports,
          playerReports
        }
      };

      // Keep latest master snapshot
      localStorage.setItem('scouting_vault_latest_backup', JSON.stringify(snapshot));
      
      // Also write to an indexed history buffer (up to 50 rolling snapshots)
      const rawHistory = localStorage.getItem('scouting_vault_history_v1');
      let history: any[] = [];
      if (rawHistory) {
        try { history = JSON.parse(rawHistory); } catch { history = []; }
      }
      if (!Array.isArray(history)) history = [];
      
      // Add current snapshot to front, limit to 30 revisions
      history.unshift({
        id: `snap_${Date.now()}`,
        timestamp: snapshot.timestamp,
        reportsCount: snapshot.reportsCount,
        reportsSummary: snapshot.reportsSummary,
        data: snapshot.data
      });
      if (history.length > 30) history = history.slice(0, 30);
      localStorage.setItem('scouting_vault_history_v1', JSON.stringify(history));

      // If user is authenticated, also sync a snapshot document to Firestore
      const currentUser = auth.currentUser;
      if (currentUser && Object.keys(reports).length > 0) {
        const snapRef = doc(db, 'users', currentUser.uid, 'snapshots', `snap_latest`);
        setDoc(snapRef, sanitizeForFirestore({
          updatedAt: snapshot.timestamp,
          userId: currentUser.uid,
          reportsCount: snapshot.reportsCount,
          reportsSummary: snapshot.reportsSummary,
          reports: reports,
          playerReports: playerReports
        }), { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Snapshot creation error:', e);
    }
  }

  /**
   * Saves a full match report. Writes immediately to local storage, triggers
   * immutable vault snapshot, and syncs the COMPLETE report to Firestore.
   */
  async saveReport(report: CompleteMatchReport): Promise<void> {
    // 1. Always write to local storage as immediate safe buffer
    const local = this.getLocalReports();
    local[report.meta.id] = report;
    this.setLocalReports(local);
    this.createVaultSnapshot();

    // 2. If user is signed in to Firebase Auth, sync complete report to Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const now = new Date().toISOString();
        const reportRef = doc(db, 'users', currentUser.uid, 'reports', report.meta.id);

        // Sanitize entire payload (including match.players, stats, heatmaps, evaluations, notes)
        const firestorePayload = sanitizeForFirestore({
          ...report.meta,
          meta: report.meta,
          match: report.match,
          evaluations: report.evaluations || {},
          eventNotes: report.eventNotes || {},
          generalNotes: report.meta.generalNotes || '',
          userId: currentUser.uid,
          updatedAt: now
        });

        await setDoc(reportRef, firestorePayload, { merge: true });

        // Store individual evaluations in subcollection for granular queries
        for (const [playerId, evaluation] of Object.entries(report.evaluations || {})) {
          const evalRef = doc(db, 'users', currentUser.uid, 'evaluations', `${report.meta.id}_${playerId}`);
          await setDoc(evalRef, sanitizeForFirestore({
            ...evaluation,
            userId: currentUser.uid,
            reportId: report.meta.id,
            updatedAt: now
          }), { merge: true });
        }

        // Store individual event notes in subcollection
        for (const [eventId, note] of Object.entries(report.eventNotes || {})) {
          const noteRef = doc(db, 'users', currentUser.uid, 'eventNotes', `${report.meta.id}_${eventId}`);
          await setDoc(noteRef, sanitizeForFirestore({
            ...note,
            userId: currentUser.uid,
            reportId: report.meta.id,
            updatedAt: now
          }), { merge: true });
        }
      } catch (err) {
        console.warn('Firestore sync failed, local copy intact:', err);
      }
    }
  }

  /**
   * Retrieves summary metadata for all saved match reports.
   * Merges all Firestore documents AND all local documents so no match is ever dropped.
   */
  async getReports(): Promise<MatchReportMeta[]> {
    const currentUser = auth.currentUser;
    const local = this.getLocalReports();
    const reportsMap = new Map<string, MatchReportMeta>();

    // 1. Populate map with all existing local reports first
    for (const [id, r] of Object.entries(local)) {
      if (r && r.meta) {
        reportsMap.set(id, r.meta);
      }
    }

    if (currentUser) {
      try {
        const reportsRef = collection(db, 'users', currentUser.uid, 'reports');
        // Do NOT use orderBy here so documents without explicit updatedAt are NEVER dropped!
        const snap = await getDocs(reportsRef);

        if (!snap.empty) {
          snap.docs.forEach((d) => {
            const data = d.data();
            const docId = data.id || d.id;
            
            const meta: MatchReportMeta = (data.meta || {
              id: docId,
              matchId: data.matchId || '',
              url: data.url || '',
              homeTeamName: data.homeTeamName || '',
              awayTeamName: data.awayTeamName || '',
              homeTeamLogo: data.homeTeamLogo || '',
              awayTeamLogo: data.awayTeamLogo || '',
              score: data.score || '',
              competition: data.competition || '',
              matchDate: data.matchDate || '',
              stadium: data.stadium || '',
              status: data.status || '',
              generalNotes: data.generalNotes || '',
              evaluationCount: data.evaluationCount || (data.evaluations ? Object.keys(data.evaluations).length : 0),
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              userId: data.userId || currentUser.uid
            }) as MatchReportMeta;

            if (data.generalNotes && !meta.generalNotes) {
              meta.generalNotes = data.generalNotes;
            }

            // Merge with local report if present
            const existingLocal = local[docId];
            if (existingLocal) {
              const mergedEvaluations = {
                ...(existingLocal.evaluations || {}),
                ...(data.evaluations || {})
              };
              const mergedEventNotes = {
                ...(existingLocal.eventNotes || {}),
                ...(data.eventNotes || {})
              };
              const mergedGeneralNotes = data.generalNotes || meta.generalNotes || existingLocal.meta?.generalNotes || '';
              
              meta.generalNotes = mergedGeneralNotes;
              meta.evaluationCount = Object.keys(mergedEvaluations).length;

              local[docId] = {
                meta,
                match: data.match || existingLocal.match,
                evaluations: mergedEvaluations,
                eventNotes: mergedEventNotes
              };
            } else {
              const constructedMatch: MatchDetails = data.match || {
                id: meta.matchId || docId,
                url: meta.url || '',
                homeTeam: data.homeTeam || {
                  id: 'team_home',
                  name: meta.homeTeamName || 'Local',
                  shortName: (meta.homeTeamName || 'Local').split(' ')[0],
                  logoUrl: meta.homeTeamLogo || '',
                  formation: '4-3-3',
                  score: 0,
                  isHome: true,
                  starters: [],
                  substitutes: []
                },
                awayTeam: data.awayTeam || {
                  id: 'team_away',
                  name: meta.awayTeamName || 'Visitante',
                  shortName: (meta.awayTeamName || 'Visitante').split(' ')[0],
                  logoUrl: meta.awayTeamLogo || '',
                  formation: '4-3-3',
                  score: 0,
                  isHome: false,
                  starters: [],
                  substitutes: []
                },
                competition: meta.competition || '',
                roundOrPhase: data.roundOrPhase || '',
                date: meta.matchDate || '',
                stadium: meta.stadium || '',
                status: (meta.status as any) || 'FINISHED',
                events: data.events || []
              };

              local[docId] = {
                meta,
                match: constructedMatch,
                evaluations: data.evaluations || {},
                eventNotes: data.eventNotes || {}
              };
            }

            reportsMap.set(docId, meta);
          });

          // Sync any local-only reports up to Firestore in background
          for (const [id, localReport] of Object.entries(local)) {
            if (localReport && localReport.match && localReport.meta) {
              if (!snap.docs.some((d) => d.id === id || d.data().id === id)) {
                this.saveReport(localReport).catch((e) => console.warn('Syncing local-only report:', e));
              }
            }
          }

          this.setLocalReports(local);
        }
      } catch (e) {
        console.warn('Firestore getReports failed, falling back to local storage', e);
      }
    }

    return Array.from(reportsMap.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }

  /**
   * Retrieves a complete match report with all players, stats, lineups, evaluations, and notes.
   * Guarantees that mobile and desktop see identical data by loading directly from Firestore.
   */
  async getReport(reportId: string): Promise<CompleteMatchReport | null> {
    const local = this.getLocalReports();
    
    // Check direct and alias keys in local storage
    const cleanId = reportId.replace(/^rep_/, '').replace(/^sofascore-/, '');
    let localReport = local[reportId] || 
                      local[`rep_${cleanId}`] || 
                      local[`rep_sofascore-${cleanId}`] || 
                      local[cleanId] ||
                      Object.values(local).find((r) => {
                        const rId = (r?.meta?.id || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
                        const rMatchId = String(r?.meta?.matchId || '').replace(/^sofascore-/, '');
                        return rId === cleanId || rMatchId === cleanId;
                      });

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Try exact doc ID first, then try alias IDs
        const possibleDocIds = Array.from(new Set([
          reportId,
          `rep_${cleanId}`,
          `rep_sofascore-${cleanId}`,
          cleanId
        ]));

        let data: any = null;
        let matchedDocId = reportId;

        for (const docId of possibleDocIds) {
          try {
            const reportDoc = await getDoc(doc(db, 'users', currentUser.uid, 'reports', docId));
            if (reportDoc.exists()) {
              data = reportDoc.data();
              matchedDocId = docId;
              break;
            }
          } catch {
            // continue trying
          }
        }

        if (data) {
          let match: MatchDetails | undefined = data.match;

          let meta: MatchReportMeta = (data.meta || {
            id: data.id || matchedDocId,
            matchId: data.matchId || cleanId,
            url: data.url || '',
            homeTeamName: data.homeTeamName || '',
            awayTeamName: data.awayTeamName || '',
            homeTeamLogo: data.homeTeamLogo || '',
            awayTeamLogo: data.awayTeamLogo || '',
            score: data.score || '',
            competition: data.competition || '',
            matchDate: data.matchDate || '',
            stadium: data.stadium || '',
            status: data.status || '',
            generalNotes: data.generalNotes || '',
            evaluationCount: data.evaluationCount || 0,
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || new Date().toISOString(),
            userId: data.userId || currentUser.uid
          }) as MatchReportMeta;

          if (data.generalNotes && !meta.generalNotes) {
            meta.generalNotes = data.generalNotes;
          }

          let evaluations: Record<string, ScoutEvaluation> = data.evaluations || {};
          let eventNotes: Record<string, MatchEventNote> = data.eventNotes || {};

          // If local has evaluations, merge them
          if (localReport?.evaluations) {
            evaluations = { ...evaluations, ...localReport.evaluations };
          }
          if (localReport?.eventNotes) {
            eventNotes = { ...eventNotes, ...localReport.eventNotes };
          }
          if (localReport?.meta?.generalNotes && !meta.generalNotes) {
            meta.generalNotes = localReport.meta.generalNotes;
          }

          // Also check evaluations subcollection in case evaluations were added separately
          try {
            const evalsCol = collection(db, 'users', currentUser.uid, 'evaluations');
            const snap = await getDocs(evalsCol);
            snap.forEach((d) => {
              const ev = d.data() as ScoutEvaluation;
              const evReportId = (ev.reportId || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
              if (evReportId === cleanId || ev.reportId === matchedDocId || ev.reportId === reportId) {
                evaluations[ev.playerId] = ev;
              }
            });
          } catch (evErr) {
            console.warn('Could not query evaluations subcollection:', evErr);
          }

          // Also check eventNotes subcollection
          try {
            const notesCol = collection(db, 'users', currentUser.uid, 'eventNotes');
            const snap = await getDocs(notesCol);
            snap.forEach((d) => {
              const nt = d.data() as MatchEventNote;
              const ntReportId = (nt.reportId || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
              if (ntReportId === cleanId || nt.reportId === matchedDocId || nt.reportId === reportId) {
                eventNotes[nt.eventId] = nt;
              }
            });
          } catch (ntErr) {
            console.warn('Could not query eventNotes subcollection:', ntErr);
          }

          // Ensure match object is always valid and never null
          if (!match || !match.homeTeam || !match.awayTeam) {
            if (localReport?.match?.homeTeam) {
              match = localReport.match;
            } else if (data.homeTeam && data.awayTeam) {
              match = {
                id: meta.matchId || cleanId,
                url: meta.url || '',
                homeTeam: data.homeTeam,
                awayTeam: data.awayTeam,
                competition: meta.competition || '',
                roundOrPhase: data.roundOrPhase || '',
                date: meta.matchDate || '',
                stadium: meta.stadium || '',
                status: (meta.status as any) || 'FINISHED',
                events: data.events || []
              };
            } else {
              // Try fetching via sofascore only if it has a numeric or URL slug ID
              const matchId = meta.matchId || cleanId;
              if (!matchId.startsWith('img_') && !matchId.startsWith('match_img_') && !matchId.startsWith('manual_')) {
                try {
                  match = await sofascoreService.getMatchDetails(matchId);
                } catch {
                  if (meta.url) {
                    try {
                      match = await sofascoreService.getMatchFromUrl(meta.url);
                    } catch (uErr) {
                      console.warn('Match resolution from url failed:', uErr);
                    }
                  }
                }
              }
            }
          }

          // Fallback construction if match details still empty so data is NEVER lost
          const guaranteedMatch: MatchDetails = match || {
            id: meta.matchId || cleanId,
            url: meta.url || '',
            homeTeam: {
              id: 'team_home',
              name: meta.homeTeamName || 'Equipo Local',
              shortName: (meta.homeTeamName || 'Local').split(' ')[0],
              logoUrl: meta.homeTeamLogo || '',
              formation: '4-3-3',
              score: parseInt((meta.score || '0').split('-')[0]) || 0,
              isHome: true,
              starters: [],
              substitutes: []
            },
            awayTeam: {
              id: 'team_away',
              name: meta.awayTeamName || 'Equipo Visitante',
              shortName: (meta.awayTeamName || 'Visitante').split(' ')[0],
              logoUrl: meta.awayTeamLogo || '',
              formation: '4-3-3',
              score: parseInt((meta.score || '0').split('-')[1]) || 0,
              isHome: false,
              starters: [],
              substitutes: []
            },
            competition: meta.competition || '',
            roundOrPhase: '',
            date: meta.matchDate || '',
            stadium: meta.stadium || '',
            status: (meta.status as any) || 'FINISHED',
            events: []
          };

          meta.evaluationCount = Object.keys(evaluations).length;
          const complete: CompleteMatchReport = {
            meta,
            match: guaranteedMatch,
            evaluations,
            eventNotes
          };

          // Save to local storage cache under both IDs to prevent misses
          local[matchedDocId] = complete;
          local[reportId] = complete;
          this.setLocalReports(local);

          return complete;
        }
      } catch (e) {
        console.warn('Firestore getReport error', e);
      }
    }

    // Fallback to local report if offline or Firestore doc not found
    return localReport || null;
  }

  async updatePlayerEvaluation(evaluation: ScoutEvaluation): Promise<void> {
    const local = this.getLocalReports();
    const cleanId = (evaluation.reportId || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
    
    // Find target report across keys
    let report = local[evaluation.reportId] || 
                 local[`rep_${cleanId}`] || 
                 local[`rep_sofascore-${cleanId}`] || 
                 local[cleanId] ||
                 Object.values(local).find((r) => {
                   const rId = (r?.meta?.id || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
                   return rId === cleanId;
                 });
    
    const now = new Date().toISOString();

    if (report) {
      report.evaluations = report.evaluations || {};
      report.evaluations[evaluation.playerId] = {
        ...evaluation,
        updatedAt: now
      };
      report.meta.evaluationCount = Object.keys(report.evaluations).length;
      report.meta.updatedAt = now;
      local[report.meta.id] = report;
      local[evaluation.reportId] = report;
      this.setLocalReports(local);
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const sanitizedEval = sanitizeForFirestore({
          ...evaluation,
          userId: currentUser.uid,
          updatedAt: now
        });

        // 1. Write to evaluations subcollection
        const evalRef = doc(db, 'users', currentUser.uid, 'evaluations', `${evaluation.reportId}_${evaluation.playerId}`);
        await setDoc(evalRef, sanitizedEval, { merge: true });

        // 2. Also update evaluations map directly inside the report document
        const reportTargetId = report?.meta?.id || evaluation.reportId;
        const reportRef = doc(db, 'users', currentUser.uid, 'reports', reportTargetId);
        await setDoc(reportRef, sanitizeForFirestore({
          [`evaluations.${evaluation.playerId}`]: sanitizedEval,
          updatedAt: now
        }), { merge: true });
      } catch (e) {
        console.warn('Failed to update evaluation on Firestore', e);
      }
    }
  }

  async updateMatchNotes(reportId: string, notes: string): Promise<void> {
    const local = this.getLocalReports();
    const cleanId = reportId.replace(/^rep_/, '').replace(/^sofascore-/, '');
    
    let report = local[reportId] || 
                 local[`rep_${cleanId}`] || 
                 local[`rep_sofascore-${cleanId}`] || 
                 local[cleanId] ||
                 Object.values(local).find((r) => {
                   const rId = (r?.meta?.id || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
                   return rId === cleanId;
                 });

    const now = new Date().toISOString();

    if (report) {
      report.meta.generalNotes = notes;
      report.meta.updatedAt = now;
      local[report.meta.id] = report;
      local[reportId] = report;
      this.setLocalReports(local);
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const reportTargetId = report?.meta?.id || reportId;
        const reportRef = doc(db, 'users', currentUser.uid, 'reports', reportTargetId);
        await setDoc(reportRef, sanitizeForFirestore({
          generalNotes: notes,
          'meta.generalNotes': notes,
          updatedAt: now
        }), { merge: true });
      } catch (e) {
        console.warn('Failed to update notes on Firestore', e);
      }
    }
  }

  async updateEventNote(eventNote: MatchEventNote): Promise<void> {
    const local = this.getLocalReports();
    const cleanId = (eventNote.reportId || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
    
    let report = local[eventNote.reportId] || 
                 local[`rep_${cleanId}`] || 
                 local[`rep_sofascore-${cleanId}`] || 
                 local[cleanId] ||
                 Object.values(local).find((r) => {
                   const rId = (r?.meta?.id || '').replace(/^rep_/, '').replace(/^sofascore-/, '');
                   return rId === cleanId;
                 });

    const now = new Date().toISOString();

    if (report) {
      report.eventNotes = report.eventNotes || {};
      report.eventNotes[eventNote.eventId] = {
        ...eventNote,
        updatedAt: now
      };
      local[report.meta.id] = report;
      local[eventNote.reportId] = report;
      this.setLocalReports(local);
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const sanitizedNote = sanitizeForFirestore({
          ...eventNote,
          userId: currentUser.uid,
          updatedAt: now
        });

        const noteRef = doc(db, 'users', currentUser.uid, 'eventNotes', `${eventNote.reportId}_${eventNote.eventId}`);
        await setDoc(noteRef, sanitizedNote, { merge: true });

        const reportTargetId = report?.meta?.id || eventNote.reportId;
        const reportRef = doc(db, 'users', currentUser.uid, 'reports', reportTargetId);
        await setDoc(reportRef, sanitizeForFirestore({
          [`eventNotes.${eventNote.eventId}`]: sanitizedNote,
          updatedAt: now
        }), { merge: true });
      } catch (e) {
        console.warn('Failed to update event note on Firestore', e);
      }
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    const local = this.getLocalReports();
    delete local[reportId];
    this.setLocalReports(local);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'reports', reportId));
      } catch (e) {
        console.warn('Firestore delete failed', e);
      }
    }
  }

  private getLocalPlayerReports(): Record<string, PlayerGeneralReport> {
    const result: Record<string, PlayerGeneralReport> = {};
    const primaryKey = this.getPlayerReportsKey();
    const isUserLoggedIn = Boolean(auth.currentUser?.uid);

    try {
      const raw = localStorage.getItem(primaryKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.assign(result, parsed);
        }
      }
    } catch (e) {
      console.error('Failed to read local player reports', e);
    }

    // If user is logged in and their scoped player storage is empty, migrate legacy dossiers
    if (isUserLoggedIn && Object.keys(result).length === 0) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_PLAYER_REPORTS_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (parsed && typeof parsed === 'object') {
            Object.assign(result, parsed);
            this.setLocalPlayerReports(result);
          }
        } catch {
          // ignore
        }
      }
    }

    return result;
  }

  private setLocalPlayerReports(reports: Record<string, PlayerGeneralReport>) {
    try {
      const primaryKey = this.getPlayerReportsKey();
      localStorage.setItem(primaryKey, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to write local player reports', e);
    }
  }

  async getPlayerGeneralReport(playerId: string): Promise<PlayerGeneralReport | null> {
    const local = this.getLocalPlayerReports();
    if (local[playerId]) return local[playerId];

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'playerReports', playerId));
        if (snap.exists()) {
          const data = snap.data() as PlayerGeneralReport;
          local[playerId] = data;
          this.setLocalPlayerReports(local);
          return data;
        }
      } catch (e) {
        console.warn('Firestore getPlayerGeneralReport error', e);
      }
    }
    return null;
  }

  async savePlayerGeneralReport(report: PlayerGeneralReport): Promise<void> {
    const local = this.getLocalPlayerReports();
    const now = new Date().toISOString();
    local[report.playerId] = {
      ...report,
      updatedAt: now
    };
    this.setLocalPlayerReports(local);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const pRef = doc(db, 'users', currentUser.uid, 'playerReports', report.playerId);
        await setDoc(pRef, sanitizeForFirestore({
          ...report,
          userId: currentUser.uid,
          updatedAt: now
        }), { merge: true });
      } catch (e) {
        console.warn('Failed to save player report to Firestore', e);
      }
    }
  }

  async getAllPlayerGeneralReports(): Promise<Record<string, PlayerGeneralReport>> {
    const local = this.getLocalPlayerReports();
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const pCol = collection(db, 'users', currentUser.uid, 'playerReports');
        const snap = await getDocs(pCol);
        if (!snap.empty) {
          snap.docs.forEach((d) => {
            const data = d.data() as PlayerGeneralReport;
            local[data.playerId] = data;
          });
          this.setLocalPlayerReports(local);
        } else if (Object.keys(local).length > 0) {
          // If Firestore is empty but local has dossiers, upload them!
          for (const rep of Object.values(local)) {
            if (rep?.playerId) {
              const pRef = doc(db, 'users', currentUser.uid, 'playerReports', rep.playerId);
              setDoc(pRef, sanitizeForFirestore({
                ...rep,
                userId: currentUser.uid,
                updatedAt: rep.updatedAt || new Date().toISOString()
              }), { merge: true }).catch((err) => console.warn('Sync player report error:', err));
            }
          }
        }
      } catch (e) {
        console.warn('Firestore getAllPlayerGeneralReports error', e);
      }
    }
    return local;
  }

  async deletePlayerGeneralReport(playerId: string): Promise<void> {
    const local = this.getLocalPlayerReports();
    delete local[playerId];
    this.setLocalPlayerReports(local);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'playerReports', playerId));
      } catch (e) {
        console.warn('Firestore deletePlayerGeneralReport error', e);
      }
    }
  }

  /**
   * Generates a complete standalone JSON backup containing all matches, lineups, evaluations, dossiers, and notes.
   */
  async exportAllDataAsJSON(): Promise<string> {
    const reports = this.getLocalReports();
    const playerReports = this.getLocalPlayerReports();
    const currentUser = auth.currentUser;

    const backupPayload = {
      app: 'Pro Football Scouting Studio',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        uid: currentUser?.uid || 'offline_user',
        email: currentUser?.email || 'offline'
      },
      stats: {
        totalReports: Object.keys(reports).length,
        totalPlayerDossiers: Object.keys(playerReports).length
      },
      data: {
        reports,
        playerReports
      }
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  /**
   * Restores data from a JSON backup file non-destructively (merges without deleting existing entries).
   */
  async importDataFromJSON(jsonString: string): Promise<{ reportsCount: number; dossiersCount: number }> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('El archivo seleccionado no es un archivo JSON válido.');
    }

    const importedReports: Record<string, CompleteMatchReport> = parsed.data?.reports || parsed.reports || {};
    const importedDossiers: Record<string, PlayerGeneralReport> = parsed.data?.playerReports || parsed.playerReports || {};

    let reportsRestored = 0;
    let dossiersRestored = 0;

    // 1. Merge reports
    const localReports = this.getLocalReports();
    for (const [id, rep] of Object.entries(importedReports)) {
      if (rep && (rep.meta || rep.match)) {
        localReports[id] = rep;
        reportsRestored++;
        // Also sync each report to Firestore
        await this.saveReport(rep).catch((err) => console.warn('Import saveReport error:', err));
      }
    }
    this.setLocalReports(localReports);

    // 2. Merge player dossiers
    const localPlayerReports = this.getLocalPlayerReports();
    for (const [pId, dossier] of Object.entries(importedDossiers)) {
      if (dossier && (dossier.playerId || pId)) {
        localPlayerReports[pId] = dossier;
        dossiersRestored++;
        await this.savePlayerGeneralReport(dossier).catch((err) => console.warn('Import savePlayerGeneralReport error:', err));
      }
    }
    this.setLocalPlayerReports(localPlayerReports);

    this.createVaultSnapshot();

    return {
      reportsCount: reportsRestored,
      dossiersCount: dossiersRestored
    };
  }

  /**
   * Synchronizes all local and Firestore data bidirectionally.
   * Useful on application startup and authentication state changes.
   */
  async syncAll(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // 1. Sync reports
      await this.getReports();

      // 2. Sync player general reports
      await this.getAllPlayerGeneralReports();
    } catch (err) {
      console.warn('syncAll error:', err);
    }
  }
}

import { supabaseStorageService } from './supabaseStorageService';
import { supabase } from '../supabase';

class UnifiedStorageService implements IStorageService {
  private fallbackService = new HybridStorageService();

  private async isSupabaseActive(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  }

  async saveReport(report: CompleteMatchReport): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.saveReport(report);
      // Non-destructively preserve backup without throwing
      this.fallbackService.saveReport(report).catch(() => {});
    } else {
      await this.fallbackService.saveReport(report);
    }
  }

  async getReports(): Promise<MatchReportMeta[]> {
    if (await this.isSupabaseActive()) {
      return await supabaseStorageService.getReports();
    }
    return await this.fallbackService.getReports();
  }

  async getReport(reportId: string): Promise<CompleteMatchReport | null> {
    if (await this.isSupabaseActive()) {
      const rep = await supabaseStorageService.getReport(reportId);
      if (rep) return rep;
    }
    return await this.fallbackService.getReport(reportId);
  }

  async updatePlayerEvaluation(evaluation: ScoutEvaluation): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.updatePlayerEvaluation(evaluation);
      this.fallbackService.updatePlayerEvaluation(evaluation).catch(() => {});
    } else {
      await this.fallbackService.updatePlayerEvaluation(evaluation);
    }
  }

  async updateMatchNotes(reportId: string, notes: string): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.updateMatchNotes(reportId, notes);
      this.fallbackService.updateMatchNotes(reportId, notes).catch(() => {});
    } else {
      await this.fallbackService.updateMatchNotes(reportId, notes);
    }
  }

  async updateEventNote(note: MatchEventNote): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.updateEventNote(note);
      this.fallbackService.updateEventNote(note).catch(() => {});
    } else {
      await this.fallbackService.updateEventNote(note);
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.deleteReport(reportId);
    }
    await this.fallbackService.deleteReport(reportId).catch(() => {});
  }

  async getPlayerGeneralReport(playerId: string): Promise<PlayerGeneralReport | null> {
    if (await this.isSupabaseActive()) {
      const dos = await supabaseStorageService.getPlayerGeneralReport(playerId);
      if (dos) return dos;
    }
    return await this.fallbackService.getPlayerGeneralReport(playerId);
  }

  async savePlayerGeneralReport(report: PlayerGeneralReport): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.savePlayerGeneralReport(report);
      this.fallbackService.savePlayerGeneralReport(report).catch(() => {});
    } else {
      await this.fallbackService.savePlayerGeneralReport(report);
    }
  }

  async getAllPlayerGeneralReports(): Promise<Record<string, PlayerGeneralReport>> {
    if (await this.isSupabaseActive()) {
      return await supabaseStorageService.getAllPlayerGeneralReports();
    }
    return await this.fallbackService.getAllPlayerGeneralReports();
  }

  async deletePlayerGeneralReport(playerId: string): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.deletePlayerGeneralReport(playerId);
    }
    await this.fallbackService.deletePlayerGeneralReport(playerId).catch(() => {});
  }

  async syncAll(): Promise<void> {
    if (await this.isSupabaseActive()) {
      await supabaseStorageService.syncAll();
    } else {
      await this.fallbackService.syncAll();
    }
  }

  async exportAllDataAsJSON(): Promise<string> {
    if (await this.isSupabaseActive()) {
      return await supabaseStorageService.exportAllDataAsJSON();
    }
    return await this.fallbackService.exportAllDataAsJSON();
  }

  async importDataFromJSON(jsonString: string): Promise<{ reportsCount: number; dossiersCount: number }> {
    if (await this.isSupabaseActive()) {
      return await supabaseStorageService.importDataFromJSON(jsonString);
    }
    return await this.fallbackService.importDataFromJSON(jsonString);
  }
}

export const storageService: IStorageService = new UnifiedStorageService();
export const firebaseStorageService: IStorageService = new HybridStorageService();

