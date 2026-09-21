import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { MatchReport } from './components/MatchReport';
import { PlayersView } from './components/PlayersView';
import { SettingsView } from './components/SettingsView';
import { ImageLineupAnalyzerView } from './components/ImageLineupAnalyzerView';
import { DataRecoveryModal } from './components/DataRecoveryModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ColorEditorModal } from './components/ColorEditorModal';
import { sofascoreService } from './services/sofascore/sofascoreService';
import { storageService } from './services/storage/storageService';
import { Menu, Activity } from 'lucide-react';
import { Logo } from './components/Logo';
import { 
  CompleteMatchReport, 
  MatchReportMeta, 
  ScoutRatingLevel,
  MatchDetails 
} from './types/scouting';

type ViewMode = 'dashboard' | 'report' | 'players' | 'settings' | 'image-analysis';

function ScoutingApp() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [reports, setReports] = useState<MatchReportMeta[]>([]);
  const [allLoadedReports, setAllLoadedReports] = useState<CompleteMatchReport[]>([]);
  const [activeReport, setActiveReport] = useState<CompleteMatchReport | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAttemptedUrl, setLastAttemptedUrl] = useState<string>('');

  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings PIN protection states
  const [isSettingsLockedModalOpen, setIsSettingsLockedModalOpen] = useState(false);
  const [settingsPinInput, setSettingsPinInput] = useState('');
  const [settingsPinError, setSettingsPinError] = useState(false);

  // Data Recovery Modal state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  // Initial load and cloud sync of saved reports
  const loadReportsList = async () => {
    try {
      if (storageService.syncAll) {
        await storageService.syncAll();
      }
      const list = await storageService.getReports();
      setReports(list);

      // Preload full reports for player index view and fast navigation
      const fullList: CompleteMatchReport[] = [];
      for (const item of list) {
        const full = await storageService.getReport(item.id);
        if (full) fullList.push(full);
      }
      setAllLoadedReports(fullList);
    } catch (e) {
      console.warn('Error loading reports list', e);
    }
  };

  useEffect(() => {
    // Reset view and in-memory list when auth context changes
    setReports([]);
    setAllLoadedReports([]);
    setActiveReport(null);
    if (currentView === 'report') {
      setCurrentView('dashboard');
    }
    loadReportsList();

    // 1. Check URL hash or query parameters for direct 1-click imports from Sofascore Bookmarklet
    const checkHashImport = async () => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;
        const urlParams = new URLSearchParams(search);

        // Check for clipId in query or hash
        const clipIdMatch = hash.match(/#clipId=([a-zA-Z0-9_-]+)/) || [null, urlParams.get('clipId')];
        const clipId = clipIdMatch[1];

        if (clipId) {
          window.history.replaceState(null, '', window.location.pathname);
          setIsLoading(true);
          setLoadingStage('Recibiendo datos desde Sofascore Clipper...');
          try {
            const res = await fetch(`/api/sofascore/clip/${clipId}`);
            if (res.ok) {
              const clipPayload = await res.json();
              await handleImportSofascoreJson(JSON.stringify(clipPayload));
              return;
            }
          } catch (clipErr) {
            console.error('Error loading clip:', clipErr);
          } finally {
            setIsLoading(false);
          }
        }

        // Check for direct JSON in hash
        if (hash.startsWith('#import=') || hash.startsWith('#data=')) {
          const raw = hash.replace(/^#(?:import|data)=/, '');
          const decoded = decodeURIComponent(raw);
          window.history.replaceState(null, '', window.location.pathname);
          handleImportSofascoreJson(decoded);
        }
      } catch (err) {
        console.error('Error parsing hash import:', err);
      }
    };

    checkHashImport();
    window.addEventListener('hashchange', checkHashImport);

    // 2. Listen for postMessage from bookmarklet or external popups
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SOFASCORE_IMPORT' && e.data.payload) {
        const text = typeof e.data.payload === 'string' ? e.data.payload : JSON.stringify(e.data.payload);
        handleImportSofascoreJson(text, e.data.sourceUrl);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('hashchange', checkHashImport);
      window.removeEventListener('message', handleMessage);
    };
  }, [user]);

  // Handle URL analysis flow
  const handleAnalyzeUrl = async (url: string) => {
    setLastAttemptedUrl(url);
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStage('Analizando partido...');

    try {
      // 1. Fetch match through ISofascoreService
      const matchDetails: MatchDetails = await sofascoreService.getMatchFromUrl(url, (stage) => {
        setLoadingStage(stage);
      });

      // 2. Build or retrieve report representation
      const reportId = `rep_${matchDetails.id}`;
      const existing = await storageService.getReport(reportId);

      let completeReport: CompleteMatchReport;

      if (existing) {
        // Keep existing scout evaluations! Never overwrite scout data when refreshing external match data
        completeReport = {
          ...existing,
          match: matchDetails,
          meta: {
            ...existing.meta,
            score: `${matchDetails.homeTeam.score} - ${matchDetails.awayTeam.score}`,
            status: matchDetails.status,
            updatedAt: new Date().toISOString()
          }
        };
      } else {
        const meta: MatchReportMeta = {
          id: reportId,
          matchId: matchDetails.id,
          url: matchDetails.url || url,
          homeTeamName: matchDetails.homeTeam.name,
          awayTeamName: matchDetails.awayTeam.name,
          homeTeamLogo: matchDetails.homeTeam.logoUrl,
          awayTeamLogo: matchDetails.awayTeam.logoUrl,
          score: `${matchDetails.homeTeam.score} - ${matchDetails.awayTeam.score}`,
          competition: matchDetails.competition,
          matchDate: matchDetails.date,
          stadium: matchDetails.stadium,
          status: matchDetails.status,
          generalNotes: '',
          evaluationCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: user?.uid
        };

        completeReport = {
          meta,
          match: matchDetails,
          evaluations: {},
          eventNotes: {}
        };
      }

      await storageService.saveReport(completeReport);
      setActiveReport(completeReport);
      await loadReportsList();
      setCurrentView('report');
    } catch (err: any) {
      console.error('Match analysis failure', err);
      setErrorMessage(err?.message || 'No pudimos obtener los datos de este partido.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct Sofascore JSON import
  const handleImportSofascoreJson = async (
    jsonText: string,
    urlOrTeams?: string,
    fallbackHome?: string,
    fallbackAway?: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStage('Procesando datos oficiales de Sofascore...');

    try {
      const matchDetails: MatchDetails = await sofascoreService.importSofascorePayload(
        jsonText,
        urlOrTeams,
        fallbackHome,
        fallbackAway
      );
      const reportId = `rep_${matchDetails.id}`;
      const existing = await storageService.getReport(reportId);

      let completeReport: CompleteMatchReport;
      if (existing) {
        completeReport = {
          ...existing,
          match: matchDetails,
          meta: {
            ...existing.meta,
            score: `${matchDetails.homeTeam.score} - ${matchDetails.awayTeam.score}`,
            status: matchDetails.status,
            updatedAt: new Date().toISOString()
          }
        };
      } else {
        const meta: MatchReportMeta = {
          id: reportId,
          matchId: matchDetails.id,
          url: matchDetails.url || `https://www.sofascore.com/${matchDetails.id}`,
          homeTeamName: matchDetails.homeTeam.name,
          awayTeamName: matchDetails.awayTeam.name,
          homeTeamLogo: matchDetails.homeTeam.logoUrl,
          awayTeamLogo: matchDetails.awayTeam.logoUrl,
          score: `${matchDetails.homeTeam.score} - ${matchDetails.awayTeam.score}`,
          competition: matchDetails.competition,
          matchDate: matchDetails.date,
          stadium: matchDetails.stadium,
          status: matchDetails.status,
          generalNotes: '',
          evaluationCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: user?.uid
        };

        completeReport = {
          meta,
          match: matchDetails,
          evaluations: {},
          eventNotes: {}
        };
      }

      await storageService.saveReport(completeReport);
      setActiveReport(completeReport);
      await loadReportsList();
      setCurrentView('report');
    } catch (err: any) {
      console.error('Sofascore JSON import failure', err);
      setErrorMessage(err?.message || 'No se pudo interpretar el JSON de Sofascore. Verificá que contenga la estructura de event o lineups.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = async (reportId: string) => {
    setIsLoading(true);
    setLoadingStage('Cargando informe guardado...');
    try {
      const full = await storageService.getReport(reportId);
      if (full && full.match) {
        setActiveReport(full);
        setCurrentView('report');
      } else {
        // If match data was missing, reload through matchId
        const matchId = full?.meta.matchId || reportId.replace('rep_', '');
        let freshMatch: MatchDetails;
        try {
          freshMatch = await sofascoreService.getMatchDetails(matchId);
        } catch {
          if (full?.meta.url) {
            freshMatch = await sofascoreService.getMatchFromUrl(full.meta.url);
          } else {
            throw new Error('No match data found');
          }
        }
        const resolved: CompleteMatchReport = {
          meta: full?.meta || {
            id: reportId,
            matchId: freshMatch.id,
            url: freshMatch.url,
            homeTeamName: freshMatch.homeTeam.name,
            awayTeamName: freshMatch.awayTeam.name,
            homeTeamLogo: freshMatch.homeTeam.logoUrl,
            awayTeamLogo: freshMatch.awayTeam.logoUrl,
            score: `${freshMatch.homeTeam.score} - ${freshMatch.awayTeam.score}`,
            competition: freshMatch.competition,
            matchDate: freshMatch.date,
            stadium: freshMatch.stadium,
            status: freshMatch.status,
            generalNotes: '',
            evaluationCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          match: freshMatch,
          evaluations: full?.evaluations || {},
          eventNotes: full?.eventNotes || {}
        };
        await storageService.saveReport(resolved);
        setActiveReport(resolved);
        setCurrentView('report');
      }
    } catch (e) {
      setErrorMessage('No pudimos recuperar los datos de este informe guardado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = (reportId: string) => {
    setReportToDeleteId(reportId);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDeleteId) return;
    const targetId = reportToDeleteId;
    setIsDeleting(true);
    try {
      await storageService.deleteReport(targetId);
      // Immediately filter out from state
      setReports((prev) => prev.filter((r) => r.id !== targetId));
      setAllLoadedReports((prev) => prev.filter((r) => r.meta.id !== targetId));
      if (activeReport?.meta.id === targetId) {
        setActiveReport(null);
        setCurrentView('dashboard');
      }
      await loadReportsList();
    } catch (e) {
      console.error('Error al borrar informe:', e);
    } finally {
      setIsDeleting(false);
      setReportToDeleteId(null);
    }
  };

  // Scout evaluation update
  const handleUpdateEvaluation = async (
    playerId: string,
    rating?: number,
    level?: ScoutRatingLevel,
    comment?: string
  ) => {
    if (!activeReport) return;

    const evaluation = {
      reportId: activeReport.meta.id,
      matchId: activeReport.match.id,
      playerId,
      userId: user?.uid,
      rating,
      ratingLevel: level,
      comment: comment ?? (activeReport.evaluations[playerId]?.comment || ''),
      updatedAt: new Date().toISOString()
    };

    await storageService.updatePlayerEvaluation(evaluation);

    // Update local state smoothly
    setActiveReport((prev) => {
      if (!prev) return null;
      const updatedEvals = {
        ...prev.evaluations,
        [playerId]: evaluation
      };
      return {
        ...prev,
        evaluations: updatedEvals,
        meta: {
          ...prev.meta,
          evaluationCount: Object.keys(updatedEvals).length,
          updatedAt: new Date().toISOString()
        }
      };
    });

    loadReportsList();
  };

  // Event note update
  const handleUpdateEventNote = async (eventId: string, note: string) => {
    if (!activeReport) return;
    const eventNote = {
      reportId: activeReport.meta.id,
      eventId,
      userId: user?.uid,
      note,
      updatedAt: new Date().toISOString()
    };

    await storageService.updateEventNote(eventNote);

    setActiveReport((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        eventNotes: {
          ...prev.eventNotes,
          [eventId]: eventNote
        }
      };
    });
  };

  // General match notes update
  const handleUpdateMatchNotes = async (notes: string) => {
    if (!activeReport) return;
    await storageService.updateMatchNotes(activeReport.meta.id, notes);
    setActiveReport((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        meta: {
          ...prev.meta,
          generalNotes: notes,
          updatedAt: new Date().toISOString()
        }
      };
    });
    loadReportsList();
  };

  // Complete match report update (teams, scores, players, events, info)
  const handleUpdateMatchReport = async (updatedReport: CompleteMatchReport) => {
    try {
      await storageService.saveReport(updatedReport);
      setActiveReport(updatedReport);
      setReports((prev) => [
        updatedReport.meta,
        ...prev.filter((r) => r.id !== updatedReport.meta.id)
      ]);
      setAllLoadedReports((prev) => [
        updatedReport,
        ...prev.filter((r) => r.meta.id !== updatedReport.meta.id)
      ]);
      await loadReportsList();
    } catch (e) {
      console.error('Error al actualizar el informe de partido:', e);
      throw e;
    }
  };

  const handleEditReport = (reportId: string) => {
    handleOpenReport(reportId);
  };

  const handleOpenReportWithPlayer = (reportId: string, playerId: string) => {
    handleOpenReport(reportId);
  };

  return (
    <div 
      style={{ backgroundColor: theme.bgMain, color: theme.textPrimary }}
      className="flex flex-col h-screen w-full max-w-full overflow-hidden tactical-grid-bg font-sans"
    >
      {/* Mobile Top Header Bar */}
      <div 
        style={{ backgroundColor: theme.bgHeader, borderColor: theme.borderCard }}
        className="md:hidden h-14 border-b px-4 flex items-center justify-between shrink-0 z-30"
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg bg-[#1E293B] text-white hover:bg-[#334155] transition-colors"
          >
            <Menu className="w-5 h-5 text-blue-400" />
          </button>
          <span className="text-sm font-bold text-white tracking-wide">Scouting</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Structural Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setErrorMessage(null);
            setIsMobileSidebarOpen(false);
            if (view === 'settings') {
              const isOwner = user?.email === 'barraganisaias2002@gmail.com';
              const isUnlocked = sessionStorage.getItem('scout_settings_unlocked') === 'true';
              if (!isOwner && !isUnlocked) {
                setIsSettingsLockedModalOpen(true);
                return;
              }
            }
            setCurrentView(view);
          }}
          hasActiveReport={Boolean(activeReport)}
          onOpenActiveReport={() => {
            setErrorMessage(null);
            setCurrentView('report');
            setIsMobileSidebarOpen(false);
          }}
          onOpenRecovery={() => setIsRecoveryModalOpen(true)}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Primary Workspace Area */}
        <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {isLoading ? (
          <LoadingState currentStage={loadingStage} />
        ) : errorMessage ? (
          <ErrorState
            message={errorMessage}
            lastUrl={lastAttemptedUrl || undefined}
            onImportJson={handleImportSofascoreJson}
            onRetry={() => {
              if (lastAttemptedUrl) handleAnalyzeUrl(lastAttemptedUrl);
              else setErrorMessage(null);
            }}
            onBack={() => {
              setErrorMessage(null);
              setCurrentView('dashboard');
            }}
          />
        ) : currentView === 'dashboard' ? (
          <Dashboard
            reports={reports}
            onAnalyzeUrl={handleAnalyzeUrl}
            onImportSofascoreJson={handleImportSofascoreJson}
            onOpenReport={handleOpenReport}
            onEditReport={handleEditReport}
            onDeleteReport={handleDeleteReport}
            onNavigateToImageAnalysis={() => setCurrentView('image-analysis')}
            onRefresh={loadReportsList}
            onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
            isLoading={isLoading}
          />
        ) : currentView === 'report' && activeReport ? (
          <MatchReport
            report={activeReport}
            onBack={() => setCurrentView('dashboard')}
            onUpdateEvaluation={handleUpdateEvaluation}
            onUpdateEventNote={handleUpdateEventNote}
            onUpdateMatchNotes={handleUpdateMatchNotes}
            onUpdateMatchReport={handleUpdateMatchReport}
            onDeleteReport={handleDeleteReport}
          />
        ) : currentView === 'players' ? (
          <PlayersView
            reports={allLoadedReports}
            onOpenReportWithPlayer={handleOpenReportWithPlayer}
          />
        ) : currentView === 'settings' ? (
          <SettingsView onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)} />
        ) : currentView === 'image-analysis' ? (
          <ImageLineupAnalyzerView
            onReportSaved={(newReport) => {
              setReports((prev) => [newReport.meta, ...prev.filter((r) => r.id !== newReport.meta.id)]);
              setAllLoadedReports((prev) => [newReport, ...prev.filter((r) => r.meta.id !== newReport.meta.id)]);
            }}
            onOpenReport={(reportId) => {
              handleOpenReport(reportId);
            }}
          />
        ) : (
          <Dashboard
            reports={reports}
            onAnalyzeUrl={handleAnalyzeUrl}
            onImportSofascoreJson={handleImportSofascoreJson}
            onOpenReport={handleOpenReport}
            onEditReport={handleEditReport}
            onDeleteReport={handleDeleteReport}
            onNavigateToImageAnalysis={() => setCurrentView('image-analysis')}
            onRefresh={loadReportsList}
            onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
            isLoading={isLoading}
          />
        )}

        {/* Data Recovery Modal */}
        <DataRecoveryModal
          isOpen={isRecoveryModalOpen}
          onClose={() => setIsRecoveryModalOpen(false)}
          onRestorationComplete={loadReportsList}
        />

        {/* Delete Confirmation Modal */}
        {reportToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#111827] border border-rose-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Eliminar este informe?</h3>
                  <p className="text-xs text-[#94A3B8]">Esta acción no se puede deshacer.</p>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Se borrará permanentemente de tu base de datos y de la lista de scouting local.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportToDeleteId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-mono font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Borrando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings PIN Verification Modal */}
        {isSettingsLockedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#111827] border border-purple-500/40 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-purple-400">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Acceso Protegido a Ajustes</h3>
                  <p className="text-xs text-[#94A3B8]">Ingrese el PIN de administrador.</p>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (settingsPinInput === 'IsaiasBarraganScouting') {
                  sessionStorage.setItem('scout_settings_unlocked', 'true');
                  setIsSettingsLockedModalOpen(false);
                  setSettingsPinInput('');
                  setSettingsPinError(false);
                  setCurrentView('settings');
                } else {
                  setSettingsPinError(true);
                }
              }} className="space-y-3">
                <div>
                  <input
                    type="password"
                    placeholder="Ingrese PIN"
                    value={settingsPinInput}
                    onChange={(e) => {
                      setSettingsPinInput(e.target.value);
                      setSettingsPinError(false);
                    }}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-[#334155] text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:border-purple-500"
                  />
                  {settingsPinError && (
                    <p className="text-xs text-rose-400 font-mono mt-1 text-center">PIN incorrecto. Intente nuevamente.</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsLockedModalOpen(false);
                      setSettingsPinInput('');
                      setSettingsPinError(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-mono font-medium transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Acceder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Global Color Editor Modal */}
      <ColorEditorModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ScoutingApp />
      </ThemeProvider>
    </AuthProvider>
  );
}
