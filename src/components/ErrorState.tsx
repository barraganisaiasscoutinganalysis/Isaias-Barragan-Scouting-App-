import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ExternalLink, ClipboardPaste, CheckCircle2 } from 'lucide-react';
import { parseFootballUrl } from '../services/sofascore/urlParser';

interface ErrorStateProps {
  message?: string;
  lastUrl?: string;
  onRetry: () => void;
  onBack: () => void;
  onImportJson?: (jsonText: string, urlOrTeams?: string, fallbackHome?: string, fallbackAway?: string) => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "No pudimos obtener los datos de este partido.",
  lastUrl,
  onRetry,
  onBack,
  onImportJson
}) => {
  const [jsonText, setJsonText] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const parsed = lastUrl ? parseFootballUrl(lastUrl) : { extractedId: undefined, homeSlug: undefined, awaySlug: undefined };
  const directIdMatch = (lastUrl || message).match(/(?:#(?:id:)?|\/event\/)(\d+)/i) || (lastUrl || message).match(/[#&?]id:?([0-9]+)/i);
  const eventId = directIdMatch ? directIdMatch[1] : parsed.extractedId;

  const handleProcessJson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) {
      setJsonError('Por favor pegá el JSON copiado de Sofascore');
      return;
    }
    try {
      JSON.parse(jsonText.trim());
      setJsonError(null);
      if (onImportJson) {
        onImportJson(jsonText.trim(), lastUrl, homeTeam.trim() || undefined, awayTeam.trim() || undefined);
      }
    } catch (err) {
      setJsonError('El texto no es un JSON válido. Verificá haber copiado todo el contenido.');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0A0D14] min-h-[550px] overflow-y-auto">
      <div className="w-full max-w-xl p-6 sm:p-8 rounded-xl bg-[#111827] border border-[#334155] shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-wide">
            Carga de datos oficiales de Sofascore
          </h3>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Debido a las políticas de seguridad del navegador (CORS), Sofascore bloquea las peticiones automáticas dentro de la app web.
          </p>
        </div>

        {/* Quick 1-click Solution Box */}
        {eventId && (
          <div className="text-left bg-[#0A0D14]/80 border border-emerald-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Solución rápida para evento #{eventId}</span>
              </span>
              <a
                href={`https://www.sofascore.com/api/v1/event/${eventId}/lineups`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded text-emerald-300 hover:text-emerald-200 text-xs font-mono inline-flex items-center gap-1 transition-all"
              >
                <span>1. Abrir JSON oficial</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-[#94A3B8]">
              2. Copiá todo el texto (<code className="text-white bg-[#1E293B] px-1 py-0.5 rounded font-mono">Ctrl+A</code>, <code className="text-white bg-[#1E293B] px-1 py-0.5 rounded font-mono">Ctrl+C</code>) y pegalo acá:
            </p>

            <form onSubmit={handleProcessJson} className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono block mb-1">Equipo Local (opcional):</label>
                  <input
                    type="text"
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    placeholder="Ej: Arsenal"
                    className="w-full px-2.5 py-1.5 bg-[#0F172A] border border-[#334155] focus:border-emerald-500 rounded text-xs text-white placeholder-[#64748B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono block mb-1">Equipo Visitante (opcional):</label>
                  <input
                    type="text"
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    placeholder="Ej: Chelsea"
                    className="w-full px-2.5 py-1.5 bg-[#0F172A] border border-[#334155] focus:border-emerald-500 rounded text-xs text-white placeholder-[#64748B] focus:outline-none"
                  />
                </div>
              </div>

              <textarea
                rows={3}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  if (jsonError) setJsonError(null);
                }}
                placeholder='Pegá aquí el JSON copiado (ej: { "confirmed": true, "home": { ... } })'
                className="w-full p-2.5 bg-[#0F172A] border border-[#334155] focus:border-emerald-500 rounded text-xs text-emerald-300 font-mono placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />

              {jsonError && (
                <span className="text-rose-400 text-xs block">{jsonError}</span>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>3. Cargar datos del partido</span>
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded bg-[#1E293B] hover:bg-[#334155] text-[#E5E7EB] text-xs font-medium transition-colors flex items-center gap-2 border border-[#334155] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

