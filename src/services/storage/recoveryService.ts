import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  collectionGroup, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { CompleteMatchReport, ScoutEvaluation, MatchEventNote, PlayerGeneralReport } from '../../types/scouting';
import { storageService } from './storageService';

export interface RecoveredItem {
  type: 'report' | 'evaluation' | 'eventNote' | 'playerReport' | 'raw_match';
  source: 'localStorage' | 'firestore_user' | 'firestore_group' | 'firestore_root';
  id: string;
  title: string;
  summary: string;
  notes?: string;
  rating?: number;
  data: any;
  timestamp?: string;
}

export interface DeepScanResult {
  reportsFound: CompleteMatchReport[];
  evaluationsFound: ScoutEvaluation[];
  eventNotesFound: MatchEventNote[];
  playerReportsFound: PlayerGeneralReport[];
  allItems: RecoveredItem[];
  ciencianoTorqueRacingItems: RecoveredItem[];
  totalItemsCount: number;
}

class RecoveryService {
  /**
   * Performs an exhaustive scan across all potential storage locations:
   * 1. Browser LocalStorage (every key and nested object)
   * 2. Current user's Firestore collections
   * 3. Firestore collection groups (in case previous logins used different UIDs)
   * 4. Root Firestore collections
   */
  async performDeepScan(): Promise<DeepScanResult> {
    const allItems: RecoveredItem[] = [];
    const reportsMap = new Map<string, CompleteMatchReport>();
    const evalsMap = new Map<string, ScoutEvaluation>();
    const notesMap = new Map<string, MatchEventNote>();
    const playerReportsMap = new Map<string, PlayerGeneralReport>();

    // -------------------------------------------------------------
    // 1. SCAN BROWSER LOCALSTORAGE & SESSIONSTORAGE
    // -------------------------------------------------------------
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          const val = localStorage.getItem(key);
          if (!val) continue;

          try {
            const parsed = JSON.parse(val);
            this.inspectAndExtract(parsed, `localStorage:${key}`, 'localStorage', allItems, reportsMap, evalsMap, notesMap, playerReportsMap);
          } catch {
            // Check if raw string contains interesting scout keywords
            if (val.toLowerCase().includes('cienciano') || val.toLowerCase().includes('torque') || val.toLowerCase().includes('racing')) {
              allItems.push({
                type: 'raw_match',
                source: 'localStorage',
                id: key,
                title: `Clave Local: ${key}`,
                summary: val.slice(0, 150),
                notes: val,
                data: val
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage scan error:', e);
    }

    // -------------------------------------------------------------
    // 2. SCAN FIRESTORE USER COLLECTIONS
    // -------------------------------------------------------------
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Reports
        const reportsRef = collection(db, 'users', currentUser.uid, 'reports');
        const repSnap = await getDocs(reportsRef);
        repSnap.forEach((d) => {
          const data = d.data();
          const docId = data.id || d.id;
          const meta = data.meta || data;
          const title = `${meta.homeTeamName || 'Local'} vs ${meta.awayTeamName || 'Visitante'}`;
          
          allItems.push({
            type: 'report',
            source: 'firestore_user',
            id: docId,
            title,
            summary: `Competición: ${meta.competition || 'N/A'}, Fecha: ${meta.matchDate || 'N/A'}, Evaluaciones: ${data.evaluations ? Object.keys(data.evaluations).length : 0}`,
            notes: meta.generalNotes || data.generalNotes,
            data,
            timestamp: meta.updatedAt || data.updatedAt
          });

          if (data.match && data.meta) {
            reportsMap.set(docId, data as CompleteMatchReport);
          }

          if (data.evaluations) {
            Object.entries(data.evaluations).forEach(([pId, ev]: [string, any]) => {
              evalsMap.set(`${docId}_${pId}`, ev);
            });
          }
        });

        // Evaluations subcollection
        const evalsRef = collection(db, 'users', currentUser.uid, 'evaluations');
        const evSnap = await getDocs(evalsRef);
        evSnap.forEach((d) => {
          const data = d.data() as any;
          const key = `${data.reportId || 'rep'}_${data.playerId || d.id}`;
          evalsMap.set(key, data as ScoutEvaluation);
          allItems.push({
            type: 'evaluation',
            source: 'firestore_user',
            id: d.id,
            title: `Jugador: ${data.playerName || data.playerId || 'Scout'}`,
            summary: `Puntaje: ${data.rating || 'N/A'}/10 | Nivel: ${data.ratingLevel || data.recommendation || 'N/A'}`,
            notes: data.comment || data.notes || '',
            rating: data.rating,
            data,
            timestamp: data.updatedAt
          });
        });

        // Event notes subcollection
        const notesRef = collection(db, 'users', currentUser.uid, 'eventNotes');
        const ntSnap = await getDocs(notesRef);
        ntSnap.forEach((d) => {
          const data = d.data() as any;
          notesMap.set(d.id, data as MatchEventNote);
          allItems.push({
            type: 'eventNote',
            source: 'firestore_user',
            id: d.id,
            title: `Nota de Evento: ${data.eventId || 'General'}`,
            summary: data.note || '',
            notes: data.note,
            data,
            timestamp: data.updatedAt
          });
        });

        // Player general dossiers
        const pRepRef = collection(db, 'users', currentUser.uid, 'playerReports');
        const pSnap = await getDocs(pRepRef);
        pSnap.forEach((d) => {
          const data = d.data() as any;
          playerReportsMap.set(data.playerId || d.id, data as PlayerGeneralReport);
          allItems.push({
            type: 'playerReport',
            source: 'firestore_user',
            id: d.id,
            title: `Dossier: ${data.playerName || data.playerId}`,
            summary: `Club: ${data.teamName || data.currentTeam || 'N/A'} | Rol: ${data.projectedRole || data.tacticalRole || 'N/A'}`,
            notes: data.strengths || data.overallNotes || data.weaknesses || '',
            data,
            timestamp: data.updatedAt
          });
        });
      } catch (err) {
        console.warn('Firestore user collection scan error:', err);
      }
    }

    // -------------------------------------------------------------
    // 3. SCAN FIRESTORE COLLECTION GROUPS (CROSS-UID DISCOVERY)
    // -------------------------------------------------------------
    try {
      const groupReports = collectionGroup(db, 'reports');
      const gSnap = await getDocs(groupReports);
      gSnap.forEach((d) => {
        const data = d.data();
        const docId = data.id || d.id;
        if (!reportsMap.has(docId)) {
          const meta = data.meta || data;
          const title = `${meta.homeTeamName || 'Local'} vs ${meta.awayTeamName || 'Visitante'}`;
          allItems.push({
            type: 'report',
            source: 'firestore_group',
            id: docId,
            title,
            summary: `[Grupo] Competición: ${meta.competition || 'N/A'}, Fecha: ${meta.matchDate || 'N/A'}`,
            notes: meta.generalNotes || data.generalNotes,
            data,
            timestamp: meta.updatedAt || data.updatedAt
          });
          if (data.match && data.meta) {
            reportsMap.set(docId, data as CompleteMatchReport);
          }
        }
      });
    } catch (gErr) {
      console.warn('CollectionGroup reports scan skipped:', gErr);
    }

    try {
      const groupEvals = collectionGroup(db, 'evaluations');
      const geSnap = await getDocs(groupEvals);
      geSnap.forEach((d) => {
        const data = d.data() as any;
        const key = `${data.reportId || 'rep'}_${data.playerId || d.id}`;
        if (!evalsMap.has(key)) {
          evalsMap.set(key, data as ScoutEvaluation);
          allItems.push({
            type: 'evaluation',
            source: 'firestore_group',
            id: d.id,
            title: `[Grupo] Jugador: ${data.playerName || data.playerId || 'Scout'}`,
            summary: `Puntaje: ${data.rating || 'N/A'}`,
            notes: data.comment || data.notes || '',
            rating: data.rating,
            data,
            timestamp: data.updatedAt
          });
        }
      });
    } catch (geErr) {
      console.warn('CollectionGroup evaluations scan skipped:', geErr);
    }

    // Filter items related specifically to Cienciano, Torque, Racing, or manual images
    const ciencianoTorqueRacingItems = allItems.filter((item) => {
      const str = JSON.stringify(item).toLowerCase();
      return str.includes('cienciano') || 
             str.includes('torque') || 
             str.includes('racing') || 
             str.includes('match_img_') || 
             str.includes('img_');
    });

    return {
      reportsFound: Array.from(reportsMap.values()),
      evaluationsFound: Array.from(evalsMap.values()),
      eventNotesFound: Array.from(notesMap.values()),
      playerReportsFound: Array.from(playerReportsMap.values()),
      allItems,
      ciencianoTorqueRacingItems,
      totalItemsCount: allItems.length
    };
  }

  /**
   * Helper to inspect any nested JSON object or array for match reports, evaluations, and notes
   */
  private inspectAndExtract(
    obj: any,
    path: string,
    source: 'localStorage' | 'firestore_user' | 'firestore_group' | 'firestore_root',
    allItems: RecoveredItem[],
    reportsMap: Map<string, CompleteMatchReport>,
    evalsMap: Map<string, ScoutEvaluation>,
    notesMap: Map<string, MatchEventNote>,
    playerReportsMap: Map<string, PlayerGeneralReport>
  ) {
    if (!obj || typeof obj !== 'object') return;

    // Is it a CompleteMatchReport or MatchReportMeta?
    if (obj.meta && (obj.match || obj.meta.homeTeamName)) {
      const reportId = obj.meta.id || obj.id || `rec_${Date.now()}`;
      const title = `${obj.meta.homeTeamName || 'Local'} vs ${obj.meta.awayTeamName || 'Visitante'}`;
      allItems.push({
        type: 'report',
        source,
        id: reportId,
        title,
        summary: `Origen: ${path} | Fecha: ${obj.meta.matchDate || 'N/A'}`,
        notes: obj.meta.generalNotes || obj.generalNotes,
        data: obj,
        timestamp: obj.meta.updatedAt
      });
      reportsMap.set(reportId, obj);

      if (obj.evaluations) {
        Object.entries(obj.evaluations).forEach(([pId, ev]: [string, any]) => {
          if (ev) {
            evalsMap.set(`${reportId}_${pId}`, ev);
          }
        });
      }
      return;
    }

    // Is it a dictionary of reports?
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const keys = Object.keys(obj);
      const isReportDictionary = keys.some((k) => k.startsWith('rep_') || k.startsWith('sofascore-') || k.startsWith('match_img_'));
      if (isReportDictionary) {
        for (const [k, v] of Object.entries(obj)) {
          if (v && typeof v === 'object') {
            this.inspectAndExtract(v, `${path}.${k}`, source, allItems, reportsMap, evalsMap, notesMap, playerReportsMap);
          }
        }
        return;
      }
    }

    // Is it an array of items?
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        this.inspectAndExtract(item, `${path}[${idx}]`, source, allItems, reportsMap, evalsMap, notesMap, playerReportsMap);
      });
      return;
    }

    // Is it a single Evaluation?
    if (obj.playerId && (obj.playerName || obj.rating !== undefined || obj.notes !== undefined || obj.comment !== undefined)) {
      const evId = `${obj.reportId || 'rep'}_${obj.playerId}`;
      evalsMap.set(evId, obj);
      allItems.push({
        type: 'evaluation',
        source,
        id: evId,
        title: `Jugador: ${obj.playerName || obj.playerId}`,
        summary: `Origen: ${path} | Puntaje: ${obj.rating || 'N/A'}`,
        notes: obj.notes || obj.comment,
        rating: obj.rating,
        data: obj,
        timestamp: obj.updatedAt
      });
      return;
    }

    // Is it a single PlayerGeneralReport?
    if (obj.playerId && obj.playerName && obj.strengths) {
      playerReportsMap.set(obj.playerId, obj);
      allItems.push({
        type: 'playerReport',
        source,
        id: obj.playerId,
        title: `Dossier: ${obj.playerName}`,
        summary: `Origen: ${path} | Club: ${obj.currentTeam || 'N/A'}`,
        notes: obj.overallNotes,
        data: obj,
        timestamp: obj.updatedAt
      });
      return;
    }
  }

  /**
   * Consolidates and restores all discovered reports, evaluations, and notes into active storage
   * and syncs them directly into Firestore.
   */
  async restoreAllDiscoveredData(scanResult: DeepScanResult): Promise<{ restoredReports: number; restoredEvals: number }> {
    let restoredReports = 0;
    let restoredEvals = 0;

    // 1. Restore reports
    for (const rep of scanResult.reportsFound) {
      if (rep && rep.meta) {
        // Guarantee match object
        if (!rep.match) {
          rep.match = {
            id: rep.meta.matchId || rep.meta.id,
            url: rep.meta.url || '',
            homeTeam: {
              id: 'team_home',
              name: rep.meta.homeTeamName || 'Local',
              shortName: (rep.meta.homeTeamName || 'Local').split(' ')[0],
              logoUrl: rep.meta.homeTeamLogo || '',
              formation: '4-3-3',
              score: 0,
              isHome: true,
              starters: [],
              substitutes: []
            },
            awayTeam: {
              id: 'team_away',
              name: rep.meta.awayTeamName || 'Visitante',
              shortName: (rep.meta.awayTeamName || 'Visitante').split(' ')[0],
              logoUrl: rep.meta.awayTeamLogo || '',
              formation: '4-3-3',
              score: 0,
              isHome: false,
              starters: [],
              substitutes: []
            },
            competition: rep.meta.competition || '',
            roundOrPhase: '',
            date: rep.meta.matchDate || '',
            stadium: rep.meta.stadium || '',
            status: 'FINISHED',
            events: []
          };
        }

        // Attach evaluations that belong to this report
        rep.evaluations = rep.evaluations || {};
        scanResult.evaluationsFound.forEach((ev) => {
          if (ev.reportId === rep.meta.id || 
              ev.reportId === rep.meta.matchId || 
              (ev.reportId && rep.meta.id.includes(ev.reportId))) {
            rep.evaluations[ev.playerId] = ev;
          }
        });

        await storageService.saveReport(rep);
        restoredReports++;
      }
    }

    // 2. Restore individual evaluations to active reports or player general reports
    for (const ev of scanResult.evaluationsFound) {
      if (ev.playerId) {
        await storageService.updatePlayerEvaluation(ev);
        restoredEvals++;
      }
    }

    // 3. Restore player dossiers
    for (const pRep of scanResult.playerReportsFound) {
      if (pRep.playerId) {
        await storageService.savePlayerGeneralReport(pRep);
      }
    }

    return { restoredReports, restoredEvals };
  }
}

export const recoveryService = new RecoveryService();
