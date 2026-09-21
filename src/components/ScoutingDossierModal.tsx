import React, { useState } from 'react';
import { CompleteMatchReport, ScoutRatingLevel } from '../types/scouting';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  Star, 
  Award, 
  Shield, 
  Flame,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { exportElementToPDF } from '../utils/exportUtils';
import { Logo } from './Logo';
import { getCountryFlagUrl, sanitizePlayerName } from '../utils/countryFlags';

interface ScoutingDossierModalProps {
  report: CompleteMatchReport;
  onClose: () => void;
}

export const ScoutingDossierModal: React.FC<ScoutingDossierModalProps> = ({
  report,
  onClose,
}) => {
  const { match, evaluations } = report;
  const [isExporting, setIsExporting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [exportMode, setExportMode] = useState<'paginated' | 'continuous'>('paginated');
  const [playersPerPage, setPlayersPerPage] = useState<number>(3);

  const allPlayers = [
    ...match.homeTeam.starters,
    ...match.homeTeam.substitutes,
    ...match.awayTeam.starters,
    ...match.awayTeam.substitutes,
  ];

  // Players that have either an evaluation rating or comment
  const evaluatedPlayers = allPlayers.filter((p) => {
    const evalData = evaluations[p.id];
    return evalData && (evalData.rating !== undefined || (evalData.comment && evalData.comment.trim().length > 0));
  });

  // Calculate players chunked for paginated mode
  const chunkPlayers = (players: typeof evaluatedPlayers, size: number) => {
    const chunks = [];
    for (let i = 0; i < players.length; i += size) {
      chunks.push(players.slice(i, i + size));
    }
    return chunks;
  };

  const playerChunks = chunkPlayers(evaluatedPlayers, playersPerPage);
  const totalPages = 1 + playerChunks.length; // Page 1 is Match info, then the chunked pages

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById('scouting-dossier-print-container');
    if (!el) return;
    setIsExporting(true);
    try {
      const home = match.homeTeam.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const away = match.awayTeam.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      await exportElementToPDF(el, `dossier_scouting_${home}_vs_${away}.pdf`, { mode: exportMode });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    let text = `📋 INFORME DE SCOUTING OFICIAL\n`;
    text += `⚽ ${match.homeTeam.name} (${match.homeTeam.score}) vs (${match.awayTeam.score}) ${match.awayTeam.name}\n`;
    text += `🏆 ${match.competition} • ${match.stadium}\n\n`;

    if (report.meta?.generalNotes) {
      text += `📝 NOTAS EJECUTIVAS DEL PARTIDO:\n${report.meta.generalNotes}\n\n`;
    }

    text += `⭐ JUGADORES EVALUADOS (${evaluatedPlayers.length}):\n`;
    evaluatedPlayers.forEach((p) => {
      const evalData = evaluations[p.id];
      const levelStr = evalData?.ratingLevel === 'HIGH' ? '[DESTACADO ⭐]' : evalData?.ratingLevel === 'LOW' ? '[BAJO]' : '[REGULAR]';
      const numStr = p.number && p.number > 0 ? `#${p.number}` : '(-)';
      text += `\n• ${numStr} ${sanitizePlayerName(p.name)} (${p.positionLabel}) - Nota Scout: ${evalData?.rating || '-'}/10 ${levelStr} | Sofascore: ${p.statistics?.rating || '-'}\n`;
      if (evalData?.comment) {
        text += `  Observación: ${evalData.comment}\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const getRatingBadge = (level?: ScoutRatingLevel, rating?: number) => {
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40 whitespace-nowrap">
          <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
          <span>DESTACADO ({rating?.toFixed(1) || 'Alto'})</span>
        </span>
      );
    }
    if (level === 'LOW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/40 whitespace-nowrap">
          <span>EN REVISIÓN ({rating?.toFixed(1) || 'Bajo'})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/40 whitespace-nowrap">
        <span>APROBADO ({rating?.toFixed(1) || 'Medio'})</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0B0F19] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-[#111827] border-b border-[#334155] shrink-0 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Dossier de Scouting Consolidado</span>
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Informe ejecutivo táctico listo para compartir o presentar en PDF de alta calidad.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-cyan-300 border border-[#334155] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copiado' : 'Copiar Texto'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-300" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B] transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Formatting Configuration Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-3 bg-[#0F172A] border-b border-[#2D3748] gap-4 shrink-0 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Formato PDF:</span>
            
            <div className="flex items-center rounded-lg bg-[#111827] border border-[#334155] p-0.5">
              <button
                onClick={() => setExportMode('paginated')}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  exportMode === 'paginated'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Páginas A4 Segmentadas
              </button>
              <button
                onClick={() => setExportMode('continuous')}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  exportMode === 'continuous'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Largo Continuo (Landing / Móvil)
              </button>
            </div>

            {exportMode === 'paginated' && (
              <div className="flex items-center gap-2 bg-[#111827] px-2.5 py-1 rounded-lg border border-[#334155]">
                <span className="text-[#94A3B8]">Jugadores por Página:</span>
                <select
                  value={playersPerPage}
                  onChange={(e) => setPlayersPerPage(Number(e.target.value))}
                  className="bg-[#1E293B] border border-[#334155] text-white rounded px-2 py-0.5 font-mono text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={1}>1 jugador</option>
                  <option value={2}>2 jugadores</option>
                  <option value={3}>3 jugadores</option>
                  <option value={4}>4 jugadores</option>
                  <option value={5}>5 jugadores</option>
                </select>
                <span className="text-[10px] text-blue-400 font-bold ml-1">
                  (Total: {totalPages} pág.)
                </span>
              </div>
            )}
          </div>
          
          <div className="text-[11px] text-[#A0AEC0]">
            {exportMode === 'paginated' 
              ? '✨ Agrupa jugadores de forma fija por página evitando cortes por la mitad.' 
              : '📱 Un solo lienzo vertical continuo, perfecto para ver en celulares sin cortes.'}
          </div>
        </div>

        {/* Printable Report Content Container */}
        <div 
          id="scouting-dossier-print-container"
          className={`flex-1 overflow-y-auto bg-[#030712] p-6 space-y-6 select-none ${
            exportMode === 'paginated' ? 'space-y-10' : ''
          }`}
        >
          {exportMode === 'paginated' ? (
            /* ==================== DISCRETE PAGINATED RENDERING ==================== */
            <>
              {/* PAGE 1: Match Info & Executive Notes */}
              <div className="scouting-page bg-[#0B0F19] border border-[#334155] rounded-xl p-8 space-y-6 shadow-xl relative min-h-[750px] flex flex-col justify-between max-w-4xl mx-auto">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="border-b-2 border-blue-500/40 pb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="max-w-[150px]">
                        <Logo size="sm" />
                      </div>
                      <div>
                        <h1 className="text-md font-black text-white tracking-wider uppercase">DOSSIER TÁCTICO DE SCOUTING</h1>
                        <p className="text-[10px] text-blue-400 font-mono">ISAIAS BARRAGAN • SCOUTING & VIDEO ANALYSIS</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] font-mono text-[#94A3B8]">
                      <span>ID: {match.id}</span>
                      <span className="block">{new Date().toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-xl border border-[#334155]">
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <h3 className="text-sm font-black text-white">{match.homeTeam.name}</h3>
                        <span className="text-[10px] font-mono text-cyan-400">{match.homeTeam.formation} (Local)</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-lg font-black text-white font-mono tracking-wider">
                        {match.homeTeam.score} - {match.awayTeam.score}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">{match.awayTeam.name}</h3>
                        <span className="text-[10px] font-mono text-rose-400">{match.awayTeam.formation} (Visitante)</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-[#94A3B8] space-y-1 sm:text-right">
                      <div className="flex items-center sm:justify-end gap-1 text-white font-semibold">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span>{match.competition}</span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{match.stadium}</span>
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary Notes */}
                  {report.meta?.generalNotes ? (
                    <div className="bg-[#111827] p-5 rounded-xl border border-[#334155] space-y-2.5">
                      <h4 className="text-[11px] font-bold text-cyan-400 uppercase font-mono flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Notas Ejecutivas & Conclusiones Tácticas del Encuentro</span>
                      </h4>
                      <p className="text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                        {report.meta.generalNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#111827]/50 p-12 rounded-xl border border-[#334155]/60 text-center text-gray-400 text-xs">
                      Sin observaciones generales asociadas a este informe de scouting.
                    </div>
                  )}
                </div>

                {/* Page Footer */}
                <div className="pt-4 border-t border-[#334155]/60 flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                  <span>Generado con Scouting Pro • Confidencial</span>
                  <span>Página 1 de {totalPages}</span>
                </div>
              </div>

              {/* PAGES 2, 3, etc.: Players chunked */}
              {playerChunks.map((chunk, chunkIdx) => {
                const pageNum = chunkIdx + 2;
                return (
                  <div 
                    key={chunkIdx}
                    className="scouting-page bg-[#0B0F19] border border-[#334155] rounded-xl p-8 space-y-6 shadow-xl relative min-h-[750px] flex flex-col justify-between max-w-4xl mx-auto"
                  >
                    <div className="space-y-4">
                      {/* Repeated Header */}
                      <div className="border-b border-[#334155]/60 pb-3 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#94A3B8] flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-blue-400" />
                          <strong>DOSSIER TÁCTICO:</strong> {match.homeTeam.name} vs {match.awayTeam.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B]">
                          Sección: Fichas de Jugadores
                        </span>
                      </div>

                      <div className="space-y-4">
                        {chunk.map((player) => {
                          const evalData = evaluations[player.id];
                          const stat = player.statistics;
                          const isHome = match.homeTeam.starters.some(p => p.id === player.id) || match.homeTeam.substitutes.some(p => p.id === player.id);

                          return (
                            <div 
                              key={player.id}
                              className="bg-[#111827] rounded-xl border border-[#334155] p-4 space-y-3 shadow-md"
                            >
                              {/* Player Header Info */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-[#1E293B] border border-[#334155] overflow-hidden flex items-center justify-center shrink-0">
                                    {player.avatarUrl ? (
                                      <img 
                                        src={player.avatarUrl} 
                                        alt={player.name} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-white font-mono">#{player.number || '-'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-white">{sanitizePlayerName(player.name)}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-cyan-300 text-[9px] font-mono font-bold">
                                        {player.positionLabel}
                                      </span>
                                      <img
                                        src={getCountryFlagUrl(player.nationality, player.nationalityCode)}
                                        alt={player.nationality}
                                        className="w-4 h-3 rounded-xs object-cover border border-white/10 shrink-0 shadow-xs ml-1"
                                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-[#94A3B8]">
                                      {isHome ? match.homeTeam.name : match.awayTeam.name} • Dorsal {player.number || '-'} • {player.minutesPlayed}'
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#94A3B8] mt-0.5 flex-wrap">
                                      {player.age && <span>Edad: <strong className="text-white">{player.age}a</strong></span>}
                                      {player.height && <span>• Altura: <strong className="text-white">{player.height}</strong></span>}
                                      {player.preferredFoot && <span>• Pierna: <strong className="text-cyan-300">{player.preferredFoot}</strong></span>}
                                      {player.marketValue && <span>• Valor: <strong className="text-emerald-400">{player.marketValue}</strong></span>}
                                      {player.contractUntil && <span>• Contrato: <strong className="text-amber-300">{player.contractUntil}</strong></span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  {stat?.rating && (
                                    <span className="text-[10px] font-mono text-[#94A3B8]">
                                      Sofascore: <strong className="text-white">★ {stat.rating.toFixed(1)}</strong>
                                    </span>
                                  )}
                                  {getRatingBadge(evalData?.ratingLevel, evalData?.rating)}
                                </div>
                              </div>

                              {/* Comment */}
                              {evalData?.comment && (
                                <div className="bg-[#0B0F19] p-2.5 rounded-lg border border-[#1E293B] space-y-0.5">
                                  <span className="text-[9px] font-bold text-cyan-400 uppercase font-mono block">
                                    Observación del Scout:
                                  </span>
                                  <p className="text-[11px] text-[#E2E8F0] whitespace-pre-wrap leading-relaxed">
                                    {evalData.comment}
                                  </p>
                                </div>
                              )}

                              {/* Quick Stats Grid */}
                              {stat && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-0.5 text-[10px] font-mono text-[#94A3B8]">
                                  <div className="bg-[#0F172A] p-2 rounded border border-[#1E293B]">
                                    <span className="text-[9px] block text-[#64748B]">TOQUES:</span>
                                    <span className="text-amber-300 font-bold">{stat.touches ?? stat.passing?.touches ?? 0} toques</span>
                                  </div>
                                  <div className="bg-[#0F172A] p-2 rounded border border-[#1E293B]">
                                    <span className="text-[9px] block text-[#64748B]">PASE:</span>
                                    <span className="text-white font-bold">{stat.passing?.passesCompleted ?? 0}/{stat.passing?.passesAttempted ?? 0} ({stat.passing?.passingAccuracy ?? 0}%)</span>
                                  </div>
                                  <div className="bg-[#0F172A] p-2 rounded border border-[#1E293B]">
                                    <span className="text-[9px] block text-[#64748B]">DUELOS:</span>
                                    <span className="text-white font-bold">{stat.defense?.duelsWon ?? 0}/{stat.defense?.duelsTotal ?? 0}</span>
                                  </div>
                                  <div className="bg-[#0F172A] p-2 rounded border border-[#1E293B]">
                                    <span className="text-[9px] block text-[#64748B]">ÚLTIMO TERCIO:</span>
                                    <span className="text-white font-bold">{stat.passing?.finalThirdPassesCompleted ?? 0} pases</span>
                                  </div>
                                  <div className="bg-[#0F172A] p-2 rounded border border-[#1E293B]">
                                    <span className="text-[9px] block text-[#64748B]">TIROS / REG.:</span>
                                    <span className="text-white font-bold">{stat.attack?.shots ?? 0}t / {stat.attack?.dribblesSucceeded ?? 0}r</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Page Footer */}
                    <div className="pt-4 border-t border-[#334155]/60 flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                      <span>Generado con Scouting Pro • Confidencial</span>
                      <span>Página {pageNum} de {totalPages}</span>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* ==================== CONTINUOUS LANDING PAGE RENDERING ==================== */
            <div className="bg-[#0B0F19] border border-[#334155] rounded-xl p-8 space-y-6 shadow-xl max-w-4xl mx-auto">
              
              {/* Header */}
              <div className="border-b-2 border-blue-500/40 pb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="max-w-[150px]">
                    <Logo size="sm" />
                  </div>
                  <div>
                    <h1 className="text-md font-black text-white tracking-wider uppercase">DOSSIER TÁCTICO DE SCOUTING</h1>
                    <p className="text-[10px] text-blue-400 font-mono">ISAIAS BARRAGAN • SCOUTING & VIDEO ANALYSIS</p>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-[#94A3B8]">
                  <span>ID: {match.id}</span>
                  <span className="block">{new Date().toLocaleDateString('es-ES')}</span>
                </div>
              </div>

              {/* Match Score */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-xl border border-[#334155]">
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <h3 className="text-sm font-black text-white">{match.homeTeam.name}</h3>
                    <span className="text-[10px] font-mono text-cyan-400">{match.homeTeam.formation} (Local)</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-lg font-black text-white font-mono tracking-wider">
                    {match.homeTeam.score} - {match.awayTeam.score}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{match.awayTeam.name}</h3>
                    <span className="text-[10px] font-mono text-rose-400">{match.awayTeam.formation} (Visitante)</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-[#94A3B8] space-y-1 sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1 text-white font-semibold">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span>{match.competition}</span>
                  </div>
                  <div className="flex items-center sm:justify-end gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>{match.stadium}</span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Notes */}
              {report.meta?.generalNotes && (
                <div className="bg-[#111827] p-5 rounded-xl border border-[#334155] space-y-2.5">
                  <h4 className="text-[11px] font-bold text-cyan-400 uppercase font-mono flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Notas Ejecutivas & Conclusiones Tácticas del Encuentro</span>
                  </h4>
                  <p className="text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                    {report.meta.generalNotes}
                  </p>
                </div>
              )}

              {/* All evaluated players in a single scroll */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-white uppercase font-mono tracking-wide flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Futbolistas Evaluados ({evaluatedPlayers.length})</span>
                </h4>

                {evaluatedPlayers.length === 0 ? (
                  <div className="bg-[#111827]/50 p-8 rounded-xl border border-[#334155] text-center text-xs text-gray-400">
                    Aún no hay futbolistas evaluados en este partido.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluatedPlayers.map((player) => {
                      const evalData = evaluations[player.id];
                      const stat = player.statistics;
                      const isHome = match.homeTeam.starters.some(p => p.id === player.id) || match.homeTeam.substitutes.some(p => p.id === player.id);

                      return (
                        <div 
                          key={player.id}
                          className="bg-[#111827] rounded-xl border border-[#334155] p-5 space-y-3 shadow-md"
                        >
                          {/* Player Header Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#1E293B] border border-[#334155] overflow-hidden flex items-center justify-center shrink-0">
                                {player.avatarUrl ? (
                                  <img 
                                    src={player.avatarUrl} 
                                    alt={player.name} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-white font-mono">#{player.number || '-'}</span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-black text-white">{sanitizePlayerName(player.name)}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-cyan-300 text-[10px] font-mono font-bold">
                                    {player.positionLabel}
                                  </span>
                                  <img
                                    src={getCountryFlagUrl(player.nationality, player.nationalityCode)}
                                    alt={player.nationality}
                                    className="w-4 h-3 rounded-xs object-cover border border-white/10 shrink-0 shadow-xs ml-1"
                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                  />
                                </div>
                                <p className="text-xs text-[#94A3B8]">
                                  {isHome ? match.homeTeam.name : match.awayTeam.name} • Dorsal {player.number || '-'} • {player.minutesPlayed}'
                                </p>
                                <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8] mt-0.5 flex-wrap">
                                  {player.age && <span>Edad: <strong className="text-white">{player.age}a</strong></span>}
                                  {player.height && <span>• Altura: <strong className="text-white">{player.height}</strong></span>}
                                  {player.preferredFoot && <span>• Pierna: <strong className="text-cyan-300">{player.preferredFoot}</strong></span>}
                                  {player.marketValue && <span>• Valor: <strong className="text-emerald-400">{player.marketValue}</strong></span>}
                                  {player.contractUntil && <span>• Contrato: <strong className="text-amber-300">{player.contractUntil}</strong></span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {stat?.rating && (
                                <span className="text-xs font-mono text-[#94A3B8]">
                                  Sofascore: <strong className="text-white">★ {stat.rating.toFixed(1)}</strong>
                                </span>
                              )}
                              {getRatingBadge(evalData?.ratingLevel, evalData?.rating)}
                            </div>
                          </div>

                          {/* Comment */}
                          {evalData?.comment && (
                            <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B] space-y-1">
                              <span className="text-[11px] font-bold text-cyan-400 uppercase font-mono block">
                                Observación del Scout:
                              </span>
                              <p className="text-xs text-[#E2E8F0] whitespace-pre-wrap leading-relaxed">
                                {evalData.comment}
                              </p>
                            </div>
                          )}

                          {/* Quick Stats Grid */}
                          {stat && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs font-mono text-[#94A3B8]">
                              <div className="bg-[#0F172A] px-2.5 py-1.5 rounded border border-[#1E293B]">
                                <span className="text-[10px] block text-[#64748B]">TOQUES:</span>
                                <span className="text-amber-300 font-bold">{stat.touches ?? stat.passing?.touches ?? 0} toques</span>
                              </div>
                              <div className="bg-[#0F172A] px-2.5 py-1.5 rounded border border-[#1E293B]">
                                <span className="text-[10px] block text-[#64748B]">PASE:</span>
                                <span className="text-white font-bold">{stat.passing?.passesCompleted ?? 0}/{stat.passing?.passesAttempted ?? 0} ({stat.passing?.passingAccuracy ?? 0}%)</span>
                              </div>
                              <div className="bg-[#0F172A] px-2.5 py-1.5 rounded border border-[#1E293B]">
                                <span className="text-[10px] block text-[#64748B]">DUELOS:</span>
                                <span className="text-white font-bold">{stat.defense?.duelsWon ?? 0}/{stat.defense?.duelsTotal ?? 0}</span>
                              </div>
                              <div className="bg-[#0F172A] px-2.5 py-1.5 rounded border border-[#1E293B]">
                                <span className="text-[10px] block text-[#64748B]">ÚLTIMO TERCIO:</span>
                                <span className="text-white font-bold">{stat.passing?.finalThirdPassesCompleted ?? 0} pases</span>
                              </div>
                              <div className="bg-[#0F172A] px-2.5 py-1.5 rounded border border-[#1E293B] col-span-2 sm:col-span-1">
                                <span className="text-[10px] block text-[#64748B]">TIROS / REGATES:</span>
                                <span className="text-white font-bold">{stat.attack?.shots ?? 0}t / {stat.attack?.dribblesSucceeded ?? 0}r</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Continuous Footer Note */}
              <div className="pt-6 border-t border-[#334155]/60 flex items-center justify-between text-xs font-mono text-[#64748B]">
                <span>Generado con Scouting Pro • Confidencial • Una sola página</span>
                <span>{new Date().toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
