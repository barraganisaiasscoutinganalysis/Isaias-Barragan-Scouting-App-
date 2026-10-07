import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  CompleteMatchReport, 
  MatchReportMeta, 
  ScoutEvaluation, 
  MatchEventNote, 
  PlayerGeneralReport 
} from '../types/scouting';

export interface IDataService {
  getReports(): Promise<MatchReportMeta[]>;
  getReport(reportId: string): Promise<CompleteMatchReport | null>;
  saveReport(report: CompleteMatchReport): Promise<void>;
  deleteReport(reportId: string): Promise<void>;
  updatePlayerEvaluation(evaluation: ScoutEvaluation): Promise<void>;
  updateMatchNotes(reportId: string, notes: string): Promise<void>;
  updateEventNote(note: MatchEventNote): Promise<void>;
  getPlayerGeneralReport(playerId: string): Promise<PlayerGeneralReport | null>;
  savePlayerGeneralReport(report: PlayerGeneralReport): Promise<void>;
  getAllPlayerGeneralReports(): Promise<Record<string, PlayerGeneralReport>>;
  deletePlayerGeneralReport(playerId: string): Promise<void>;
  exportAllDataAsJSON(): Promise<string>;
  importDataFromJSON(jsonString: string): Promise<{ reportsCount: number; dossiersCount: number }>;
  syncAll?(): Promise<void>;
  resetToDefaults?(): Promise<void>;
  handleAuthChange(uid: string | null): void;
}

export class FirebaseDataService implements IDataService {
  // In-memory cache isolated per active session and cleared upon logout/user change
  private memoryReports: Map<string, CompleteMatchReport> = new Map();
  private memoryDossiers: Map<string, PlayerGeneralReport> = new Map();
  private currentLoadedUid: string | null = null;

  private getUserUid(): string | null {
    return auth.currentUser?.uid || null;
  }

  /**
   * Clears in-memory data whenever authentication state changes (logout or switch user)
   * to guarantee zero cross-user data leakage.
   */
  public handleAuthChange(uid: string | null): void {
    if (this.currentLoadedUid !== uid) {
      this.memoryReports.clear();
      this.memoryDossiers.clear();
      this.currentLoadedUid = uid;
    }
  }

  async getReports(): Promise<MatchReportMeta[]> {
    const uid = this.getUserUid();
    // Synchronize auth context tracking
    this.handleAuthChange(uid);

    if (!uid) {
      // If not logged in, return empty list (never expose data from another session)
      return [];
    }

    const path = `users/${uid}/reports`;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'reports'));
      const list: MatchReportMeta[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as { 
          meta: MatchReportMeta; 
          match: any; 
          evaluations: any; 
          eventNotes: any;
          deleted?: boolean;
        };
        // Filter out soft-deleted documents
        if (data && data.meta && !data.deleted) {
          list.push(data.meta);
          // Update in-memory cache for fast responsive reads
          this.memoryReports.set(data.meta.id, {
            meta: data.meta,
            match: data.match,
            evaluations: data.evaluations || {},
            eventNotes: data.eventNotes || {}
          });
        }
      });
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (error) {
      console.warn('Firestore getReports error, falling back to local memory cache for current user:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Fallback to cache only if matches active user
        const list: MatchReportMeta[] = [];
        this.memoryReports.forEach((rep) => {
          if (rep.meta && (!rep.meta.userId || rep.meta.userId === uid)) {
            list.push(rep.meta);
          }
        });
        return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
    }
  }

  async getReport(reportId: string): Promise<CompleteMatchReport | null> {
    const uid = this.getUserUid();
    this.handleAuthChange(uid);

    if (!uid) {
      return null;
    }

    const path = `users/${uid}/reports/${reportId}`;
    try {
      const docRef = doc(db, 'users', uid, 'reports', reportId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const cached = this.memoryReports.get(reportId);
        return cached ? JSON.parse(JSON.stringify(cached)) : null;
      }
      const data = docSnap.data() as { 
        meta: MatchReportMeta; 
        match: any; 
        evaluations: any; 
        eventNotes: any;
        deleted?: boolean;
      };
      
      if (data.deleted) {
        // Document was soft-deleted
        this.memoryReports.delete(reportId);
        return null;
      }

      const report: CompleteMatchReport = {
        meta: data.meta,
        match: data.match,
        evaluations: data.evaluations || {},
        eventNotes: data.eventNotes || {}
      };
      this.memoryReports.set(reportId, report);
      return JSON.parse(JSON.stringify(report));
    } catch (error) {
      console.warn('Firestore getReport error:', error);
      const cached = this.memoryReports.get(reportId);
      if (cached) return JSON.parse(JSON.stringify(cached));
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  /**
   * Non-destructive report save with merge protection against data overwrites
   */
  async saveReport(report: CompleteMatchReport): Promise<void> {
    const uid = this.getUserUid();
    this.handleAuthChange(uid);

    const cloned: CompleteMatchReport = JSON.parse(JSON.stringify(report));
    const evalsCount = Object.keys(cloned.evaluations || {}).length;
    cloned.meta.evaluationCount = evalsCount;
    cloned.meta.updatedAt = new Date().toISOString();
    
    if (uid) {
      cloned.meta.userId = uid;
    }

    // Save in session memory cache
    this.memoryReports.set(cloned.meta.id, cloned);

    if (uid) {
      const path = `users/${uid}/reports/${cloned.meta.id}`;
      try {
        const docRef = doc(db, 'users', uid, 'reports', cloned.meta.id);
        // Non-destructive write using merge: true to avoid deleting adjacent metadata
        await setDoc(docRef, {
          id: cloned.meta.id,
          userId: uid,
          meta: cloned.meta,
          match: cloned.match,
          evaluations: cloned.evaluations || {},
          eventNotes: cloned.eventNotes || {},
          deleted: false,
          createdAt: cloned.meta.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }

  /**
   * Conservative Soft-Delete: marks document as deleted without irrevocably wiping it from Firestore
   */
  async deleteReport(reportId: string): Promise<void> {
    this.memoryReports.delete(reportId);
    const uid = this.getUserUid();
    if (uid) {
      const path = `users/${uid}/reports/${reportId}`;
      try {
        const docRef = doc(db, 'users', uid, 'reports', reportId);
        // Soft delete: keep historical document intact in Firestore with deleted flag
        await setDoc(docRef, {
          id: reportId,
          userId: uid,
          deleted: true,
          deletedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }

  /**
   * Atomic evaluation updater: safely merges scout rating and comment without losing other players' data
   */
  async updatePlayerEvaluation(evaluation: ScoutEvaluation): Promise<void> {
    const rep = await this.getReport(evaluation.reportId);
    if (rep) {
      rep.evaluations = rep.evaluations || {};
      const uid = this.getUserUid();
      
      // Preserve any previously stored fields for this player
      const existingPlayerEval = rep.evaluations[evaluation.playerId] || {};
      rep.evaluations[evaluation.playerId] = {
        ...existingPlayerEval,
        ...evaluation,
        userId: uid || evaluation.userId,
        updatedAt: new Date().toISOString()
      };
      await this.saveReport(rep);
    } else {
      throw new Error(`Report ${evaluation.reportId} not found to attach evaluation`);
    }
  }

  async updateMatchNotes(reportId: string, notes: string): Promise<void> {
    const rep = await this.getReport(reportId);
    if (rep) {
      rep.meta.generalNotes = notes;
      await this.saveReport(rep);
    }
  }

  async updateEventNote(note: MatchEventNote): Promise<void> {
    const rep = await this.getReport(note.reportId);
    if (rep) {
      rep.eventNotes = rep.eventNotes || {};
      const uid = this.getUserUid();
      const existingNote = rep.eventNotes[note.eventId] || {};
      rep.eventNotes[note.eventId] = {
        ...existingNote,
        ...note,
        userId: uid || note.userId,
        updatedAt: new Date().toISOString()
      };
      await this.saveReport(rep);
    }
  }

  async getPlayerGeneralReport(playerId: string): Promise<PlayerGeneralReport | null> {
    const uid = this.getUserUid();
    this.handleAuthChange(uid);

    if (!uid) {
      return null;
    }

    const path = `users/${uid}/playerDossiers/${playerId}`;
    try {
      const docRef = doc(db, 'users', uid, 'playerDossiers', playerId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const item = this.memoryDossiers.get(playerId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
      }
      const data = snap.data() as PlayerGeneralReport & { deleted?: boolean };
      if (data.deleted) {
        this.memoryDossiers.delete(playerId);
        return null;
      }
      this.memoryDossiers.set(playerId, data);
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      const item = this.memoryDossiers.get(playerId);
      if (item) return JSON.parse(JSON.stringify(item));
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async savePlayerGeneralReport(report: PlayerGeneralReport): Promise<void> {
    const uid = this.getUserUid();
    this.handleAuthChange(uid);

    const cloned: PlayerGeneralReport = JSON.parse(JSON.stringify(report));
    cloned.updatedAt = new Date().toISOString();
    if (uid) {
      cloned.userId = uid;
    }

    this.memoryDossiers.set(cloned.playerId, cloned);

    if (uid) {
      const path = `users/${uid}/playerDossiers/${cloned.playerId}`;
      try {
        await setDoc(doc(db, 'users', uid, 'playerDossiers', cloned.playerId), {
          ...cloned,
          deleted: false
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }

  async getAllPlayerGeneralReports(): Promise<Record<string, PlayerGeneralReport>> {
    const uid = this.getUserUid();
    this.handleAuthChange(uid);

    if (!uid) {
      return {};
    }

    const path = `users/${uid}/playerDossiers`;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'playerDossiers'));
      const result: Record<string, PlayerGeneralReport> = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PlayerGeneralReport & { deleted?: boolean };
        if (data && data.playerId && !data.deleted) {
          result[data.playerId] = data;
          this.memoryDossiers.set(data.playerId, data);
        }
      });
      return result;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        const result: Record<string, PlayerGeneralReport> = {};
        this.memoryDossiers.forEach((dossier, key) => {
          result[key] = JSON.parse(JSON.stringify(dossier));
        });
        return result;
      }
    }
  }

  async deletePlayerGeneralReport(playerId: string): Promise<void> {
    this.memoryDossiers.delete(playerId);
    const uid = this.getUserUid();
    if (uid) {
      const path = `users/${uid}/playerDossiers/${playerId}`;
      try {
        // Soft delete for dossiers
        await setDoc(doc(db, 'users', uid, 'playerDossiers', playerId), {
          playerId,
          userId: uid,
          deleted: true,
          deletedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }

  async syncAll(): Promise<void> {
    const uid = this.getUserUid();
    this.handleAuthChange(uid);
    if (!uid) return;
    await this.getReports();
    await this.getAllPlayerGeneralReports();
  }

  async resetToDefaults(): Promise<void> {
    this.memoryReports.clear();
    this.memoryDossiers.clear();
  }

  async exportAllDataAsJSON(): Promise<string> {
    const reports = await this.getReports();
    const completeReports: CompleteMatchReport[] = [];
    for (const meta of reports) {
      const full = await this.getReport(meta.id);
      if (full) completeReports.push(full);
    }

    const dossiersMap = await this.getAllPlayerGeneralReports();
    const dossiersList = Object.values(dossiersMap);

    const exportPayload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'Scouting Studio - Cloud Firestore Architecture',
      reports: completeReports,
      playerDossiers: dossiersList
    };

    return JSON.stringify(exportPayload, null, 2);
  }

  async importDataFromJSON(jsonString: string): Promise<{ reportsCount: number; dossiersCount: number }> {
    const parsed = JSON.parse(jsonString);
    let reportsCount = 0;
    let dossiersCount = 0;

    if (Array.isArray(parsed.reports)) {
      for (const rep of parsed.reports) {
        if (rep.meta?.id) {
          // Check if report already exists to prevent accidental overwrite of newer evaluations
          const existing = await this.getReport(rep.meta.id);
          if (existing) {
            // Merge evaluations and eventNotes carefully
            const mergedEvaluations = {
              ...(rep.evaluations || {}),
              ...(existing.evaluations || {})
            };
            const mergedEventNotes = {
              ...(rep.eventNotes || {}),
              ...(existing.eventNotes || {})
            };
            await this.saveReport({
              ...rep,
              evaluations: mergedEvaluations,
              eventNotes: mergedEventNotes,
              meta: {
                ...rep.meta,
                generalNotes: existing.meta?.generalNotes || rep.meta?.generalNotes || ''
              }
            });
          } else {
            await this.saveReport(rep);
          }
          reportsCount++;
        }
      }
    }

    if (Array.isArray(parsed.playerDossiers)) {
      for (const dos of parsed.playerDossiers) {
        if (dos.playerId) {
          await this.savePlayerGeneralReport(dos);
          dossiersCount++;
        }
      }
    } else if (parsed.playerDossiers && typeof parsed.playerDossiers === 'object') {
      for (const [key, dos] of Object.entries(parsed.playerDossiers as Record<string, PlayerGeneralReport>)) {
        if (dos.playerId || key) {
          const playerId = dos.playerId || key;
          await this.savePlayerGeneralReport({ ...dos, playerId });
          dossiersCount++;
        }
      }
    }

    return { reportsCount, dossiersCount };
  }
}

export const dataService = new FirebaseDataService();
