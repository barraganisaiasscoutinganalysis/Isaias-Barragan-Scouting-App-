import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Upload, 
  FileText, 
  ShieldCheck,
  Star,
  Copy,
  Check
} from 'lucide-react';
import { recoveryService, DeepScanResult, RecoveredItem } from '../services/storage/recoveryService';

interface DataRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestorationComplete: () => Promise<void> | void;
}

export const DataRecoveryModal: React.FC<DataRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRestorationComplete
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DeepScanResult | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'cienciano_torque_racing' | 'reports' | 'evaluations'>('all');
  const [restoring, setRestoring] = useState(false);
  const [restoredSummary, setRestoredSummary] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const runScan = async () => {
    setIsScanning(true);
    setRestoredSummary(null);
    try {
      const result = await recoveryService.performDeepScan();
      setScanResult(result);
      if (result.ciencianoTorqueRacingItems.length > 0) {
        setSelectedTab('cienciano_torque_racing');
      }
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runScan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestoreAll = async () => {
    if (!scanResult) return;
    setRestoring(true);
    try {
      const res = await recoveryService.restoreAllDiscoveredData(scanResult);
      setRestoredSummary(`¡Restauración exitosa! Se consolidaron ${res.restoredReports} informes de partido y ${res.restoredEvals} notas/evaluaciones.`);
      await onRestorationComplete();
    } catch (e) {
      console.error('Restore error:', e);
      setRestoredSummary('Ocurrió un error al restaurar algunos elementos.');
    } finally {
      setRestoring(false);
    }
  };

  const handleCopyNote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportBackup = () => {
    if (!scanResult) return;
    const jsonStr = JSON.stringify(scanResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scouting_respaldo_recuperacion_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter items
  const itemsToDisplay = (scanResult?.allItems || []).filter((item) => {
    if (selectedTab === 'cienciano_torque_racing') {
      const s = JSON.stringify(item).toLowerCase();
      if (!s.includes('cienciano') && !s.includes('torque') && !s.includes('racing') && !s.includes('match_img_') && !s.includes('img_')) {
        return false;
      }
    } else if (selectedTab === 'reports' && item.type !== 'report') {
      return false;
    } else if (selectedTab === 'evaluations' && item.type !== 'evaluation') {
      return false;
    }

    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchSummary = (item.summary || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      return matchTitle || matchSummary || matchNotes;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B132B] border border-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#070D1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Centro de Diagnóstico y Recuperación de Datos</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Escaneo Profundo
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Rastrea Firestore (Nube), localStorage (PC) y copias locales para rescatar partidos y notas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Status */}
        <div className="p-4 border-b border-[#1E293B] bg-[#0E172E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={runScan}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Re-escanear todo'}</span>
            </button>

            <button
              onClick={handleRestoreAll}
              disabled={restoring || isScanning || !scanResult || scanResult.allItems.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{restoring ? 'Restaurando...' : 'Restaurar todos los datos encontrados'}</span>
            </button>

            <button
              onClick={handleExportBackup}
              disabled={!scanResult || scanResult.allItems.length === 0}
              className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar copia de seguridad en JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>

          {/* Quick Metrics */}
          {scanResult && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
              <span className="px-2 py-0.5 rounded bg-[#1E293B]">
                Partidos: <strong className="text-white">{scanResult.reportsFound.length}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1E293B]">
                Notas/Evals: <strong className="text-white">{scanResult.evaluationsFound.length}</strong>
              </span>
              {scanResult.ciencianoTorqueRacingItems.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Cienciano/Torque/Racing: <strong>{scanResult.ciencianoTorqueRacingItems.length}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {restoredSummary && (
          <div className="m-4 mb-0 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{restoredSummary}</span>
          </div>
        )}

        {/* Filters & Search */}
        <div className="p-4 pb-2 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[#070D1E] p-1 rounded-xl border border-[#1E293B] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Todos ({scanResult?.allItems.length || 0})
            </button>
            <button
              onClick={() => setSelectedTab('cienciano_torque_racing')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedTab === 'cienciano_torque_racing'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <span>⭐ Cienciano / Torque / Racing</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                {scanResult?.ciencianoTorqueRacingItems.length || 0}
              </span>
            </button>
            <button
              onClick={() => setSelectedTab('reports')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Partidos ({scanResult?.reportsFound.length || 0})
            </button>
            <button
              onClick={() => setSelectedTab('evaluations')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTab === 'evaluations'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Evaluaciones ({scanResult?.evaluationsFound.length || 0})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Buscar por equipo, jugador o nota..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#070D1E] border border-[#1E293B] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5 max-h-[50vh]">
          {isScanning ? (
            <div className="py-12 text-center text-[#94A3B8] text-xs space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" />
              <p>Escaneando almacenamiento local y bases de datos en la nube...</p>
            </div>
          ) : itemsToDisplay.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] text-xs space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500/50" />
              <p>No se encontraron elementos con el filtro actual.</p>
            </div>
          ) : (
            itemsToDisplay.map((item, idx) => (
              <div
                key={`${item.id}_${idx}`}
                className="p-3.5 rounded-xl bg-[#070D1E] border border-[#1E293B] hover:border-[#334155] transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        item.type === 'report' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        item.type === 'evaluation' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {item.type === 'report' ? 'Partido' : item.type === 'evaluation' ? 'Evaluación' : 'Nota'}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        Fuente: {item.source}
                      </span>
                      {item.timestamp && (
                        <span className="text-[10px] text-[#64748B] font-mono">
                          • {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-[#94A3B8]">{item.summary}</p>
                  </div>

                  {item.rating !== undefined && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{item.rating}/10</span>
                    </div>
                  )}
                </div>

                {/* Notes content if present */}
                {item.notes && (
                  <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E293B] text-xs text-[#CBD5E1] flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 overflow-hidden">
                      <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <p className="whitespace-pre-wrap leading-relaxed font-sans">{item.notes}</p>
                    </div>
                    <button
                      onClick={() => handleCopyNote(item.notes!, item.id)}
                      className="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white shrink-0 cursor-pointer"
                      title="Copiar texto de la nota"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#070D1E] flex items-center justify-between text-xs text-[#64748B]">
          <span>
            {itemsToDisplay.length} elementos encontrados
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
