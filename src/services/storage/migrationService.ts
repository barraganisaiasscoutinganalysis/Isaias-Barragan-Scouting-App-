import { db } from '../firebase';
import { supabase } from '../supabase';
import { supabaseStorageService } from './supabaseStorageService';
import { collection, getDocs } from 'firebase/firestore';
import { CompleteMatchReport, PlayerGeneralReport } from '../../types/scouting';

export interface MigrationResult {
  success: boolean;
  reportsMigrated: number;
  dossiersMigrated: number;
  firebaseBackupPreserved: boolean;
  errors: string[];
}

/**
 * Migration Service:
 * Safely copies all existing Scouting data from Firebase Firestore (and local storage backups)
 * to Supabase PostgreSQL without deleting or altering ANY records in Firebase.
 */
export async function migrateFirebaseToSupabase(firebaseUid?: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    reportsMigrated: 0,
    dossiersMigrated: 0,
    firebaseBackupPreserved: true,
    errors: []
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.errors.push('Debes haber iniciado sesión en Supabase para asociar los datos migrados a tu cuenta.');
    return result;
  }

  const reportsToMigrate: CompleteMatchReport[] = [];
  const dossiersToMigrate: PlayerGeneralReport[] = [];

  // 1. Try to read from Firebase if UID is available
  if (firebaseUid) {
    try {
      const reportsRef = collection(db, 'users', firebaseUid, 'reports');
      const snap = await getDocs(reportsRef);
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d && (d.match || d.meta)) {
          reportsToMigrate.push(d as CompleteMatchReport);
        }
      });

      const playerReportsRef = collection(db, 'users', firebaseUid, 'playerReports');
      const playerSnap = await getDocs(playerReportsRef);
      playerSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d && d.playerId) {
          dossiersToMigrate.push(d as PlayerGeneralReport);
        }
      });
    } catch (e: any) {
      console.warn('Could not read from Firebase Firestore directly (may require active Firebase token):', e);
      result.errors.push(`Lectura directa de Firestore: ${e.message || String(e)}`);
    }
  }

  // 2. Also check LocalStorage for any cached/offline reports
  try {
    const keysToCheck = [
      `scouting_reports_uid_${firebaseUid}`,
      'scouting_reports_v1',
      'scouting_reports_guest',
      'scouting_reports'
    ];

    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            Object.values(parsed).forEach((item: any) => {
              if (item && item.meta && item.match) {
                if (!reportsToMigrate.some(r => r.meta?.id === item.meta?.id)) {
                  reportsToMigrate.push(item as CompleteMatchReport);
                }
              }
            });
          }
        } catch {
          // ignore
        }
      }
    }

    const playerKeysToCheck = [
      `scouting_player_reports_uid_${firebaseUid}`,
      'scouting_player_general_reports_v1',
      'scouting_player_reports_guest'
    ];

    for (const key of playerKeysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            Object.values(parsed).forEach((item: any) => {
              if (item && item.playerId) {
                if (!dossiersToMigrate.some(d => d.playerId === item.playerId)) {
                  dossiersToMigrate.push(item as PlayerGeneralReport);
                }
              }
            });
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err: any) {
    console.warn('Error reading local cache for migration:', err);
  }

  // 3. Write items to Supabase PostgreSQL
  for (const report of reportsToMigrate) {
    try {
      await supabaseStorageService.saveReport(report);
      result.reportsMigrated++;
    } catch (err: any) {
      result.errors.push(`Error migrando partido ${report.meta?.id}: ${err.message}`);
    }
  }

  for (const dossier of dossiersToMigrate) {
    try {
      await supabaseStorageService.savePlayerGeneralReport(dossier);
      result.dossiersMigrated++;
    } catch (err: any) {
      result.errors.push(`Error migrando dossier ${dossier.playerId}: ${err.message}`);
    }
  }

  result.success = result.reportsMigrated > 0 || result.dossiersMigrated > 0 || result.errors.length === 0;
  return result;
}
