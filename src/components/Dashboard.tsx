import React, { useState } from 'react';
import { 
  Search, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Trophy, 
  Clock, 
  Edit3, 
  Trash2, 
  ShieldCheck,
  AlertCircle,
  Sparkles,
  FileCode,
  ExternalLink,
  ClipboardPaste,
  CheckCircle2,
  Zap,
  Bookmark,
  Copy,
  Check,
  Filter,
  X,
  FileImage,
  FileText,
  RefreshCw,
  Database,
  LogIn,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MatchReportMeta } from '../types/scouting';
import { parseFootballUrl } from '../services/sofascore/urlParser';
import { cleanCompetitionName } from '../utils/countryFlags';

interface DashboardProps {
  reports: MatchReportMeta[];
  onAnalyzeUrl: (url: string) => void;
  onImportSofascoreJson?: (jsonText: string, urlOrTeams?: string, fallbackHome?: string, fallbackAway?: string) => void;
  onOpenReport: (reportId: string) => void;
  onEditReport?: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onNavigateToImageAnalysis?: () => void;
  onRefresh?: () => Promise<void> | void;
  onOpenRecoveryModal?: () => void;
  isLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  reports,
  onAnalyzeUrl,
  onImportSofascoreJson,
  onOpenReport,
  onEditReport,
  onDeleteReport,
  onNavigateToImageAnalysis,
  onRefresh,
  onOpenRecoveryModal,
  isLoading,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'url' | 'bookmarklet' | 'json'>('url');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [homeTeamInput, setHomeTeamInput] = useState('');
  const [awayTeamInput, setAwayTeamInput] = useState('');
  const [teamsOrUrlInput, setTeamsOrUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  // Reports search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');

  // Extract unique competitions and teams
  const uniqueCompetitions = Array.from(
    new Set(reports.map((r) => cleanCompetitionName(r.competition)).filter(Boolean))
  ).sort();

  const uniqueTeams = Array.from(
    new Set(
      reports.flatMap((r) => [r.homeTeamName, r.awayTeamName]).filter((t): t is string => Boolean(t))
    )
  ).sort();

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const cleanComp = cleanCompetitionName(report.competition);
    if (selectedCompetition !== 'ALL' && cleanComp !== selectedCompetition) {
      return false;
    }
    if (
      selectedTeam !== 'ALL' &&
      report.homeTeamName !== selectedTeam &&
      report.awayTeamName !== selectedTeam
    ) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesHome = report.homeTeamName?.toLowerCase().includes(term);
      const matchesAway = report.awayTeamName?.toLowerCase().includes(term);
      const matchesComp = cleanComp.toLowerCase().includes(term);
      const matchesStadium = report.stadium?.toLowerCase().includes(term);
      const matchesDate = report.matchDate?.toLowerCase().includes(term);
      if (!matchesHome && !matchesAway && !matchesComp && !matchesStadium && !matchesDate) {
        return false;
      }
    }
    return true;
  });

  const isFilterActive = searchTerm.trim().length > 0 || selectedCompetition !== 'ALL' || selectedTeam !== 'ALL';

  const parsedUrl = parseFootballUrl(urlInput || teamsOrUrlInput);
  const directIdMatch = (urlInput || teamsOrUrlInput).match(/(?:#(?:id:)?|\/event\/)(\d+)/i) || (urlInput || teamsOrUrlInput).match(/[#&?]id:?([0-9]+)/i);
  const detectedEventId = directIdMatch ? directIdMatch[1] : parsedUrl.extractedId;

  const currentAppOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-zagge5epelruw666uk6na7-23704232398.us-west2.run.app';
  const bookmarkletCode = `javascript:(async function(){try{const m=location.href.match(/(?:#id:|\\/event\\/|#id%3A)(\\d+)/i);const id=m?m[1]:null;if(!id){alert("⚽ Por favor abrí un partido específico en Sofascore (por ejemplo: sofascore.com/football/match/...#id:16924719)");return;}const n=document.createElement("div");n.style="position:fixed;top:20px;right:20px;z-index:9999999;background:#0F172A;border:2px solid #3B82F6;color:white;padding:16px 24px;border-radius:12px;font-family:sans-serif;font-size:14px;font-weight:bold;box-shadow:0 20px 40px rgba(0,0,0,0.8);display:flex;align-items:center;gap:10px;";n.innerHTML="<span style='font-size:20px'>⚽</span><span>Extrayendo alineaciones y mapas de calor oficiales...</span>";document.body.appendChild(n);const[eR,lR,iR]=await Promise.all([fetch('/api/v1/event/'+id).then(r=>r.ok?r.json():null).catch(()=>null),fetch('/api/v1/event/'+id+'/lineups').then(r=>r.ok?r.json():null).catch(()=>null),fetch('/api/v1/event/'+id+'/incidents').then(r=>r.ok?r.json():null).catch(()=>null)]);if(!lR||(!lR.home?.players&&!lR.away?.players)){n.style.borderColor="#EF4444";n.style.background="#7F1D1D";n.innerHTML="<span style='font-size:20px'>⚠️</span><span>Alineaciones no confirmadas aún en Sofascore.</span>";setTimeout(()=>n.remove(),3500);return;}const starters=[...(lR.home?.players||[]),...(lR.away?.players||[])].filter(p=>!p.substitute&&p.player?.id);await Promise.all(starters.slice(0,22).map(async p=>{try{const hm=await fetch('/api/v1/event/'+id+'/player/'+p.player.id+'/heatmap').then(r=>r.ok?r.json():null);if(hm)p.heatmap=hm.heatmap||hm.points||hm;}catch(e){}}));const payload={event:eR?.event||eR,lineups:lR,incidents:iR?.incidents||iR,sourceUrl:location.href};n.style.borderColor="#10B981";n.innerHTML="<span style='font-size:20px'>🚀</span><span>¡Datos obtenidos! Abriendo Scouting App...</span>";try{const clipResp=await fetch('${currentAppOrigin}/api/sofascore/clip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(clipResp.ok){const res=await clipResp.json();if(res.clipId){window.open('${currentAppOrigin}/#clipId='+res.clipId,'_blank');setTimeout(()=>n.remove(),2000);return;}}}catch(e){}const jsonStr=JSON.stringify(payload);const targetUrl='${currentAppOrigin}/#import='+encodeURIComponent(jsonStr);window.open(targetUrl,'_blank');setTimeout(()=>n.remove(),2000);}catch(err){alert("Error al extraer: "+err.message);}})();`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setUrlError('Por favor ingresá un enlace de Sofascore');
      return;
    }
    setUrlError(null);
    onAnalyzeUrl(urlInput.trim());
  };

  const handleSubmitJson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput.trim()) {
      setJsonError('Por favor pegá el JSON obtenido de la API de Sofascore');
      return;
    }
    try {
      JSON.parse(jsonInput.trim());
      setJsonError(null);
      if (onImportSofascoreJson) {
        onImportSofascoreJson(
          jsonInput.trim(),
          (teamsOrUrlInput || urlInput).trim(),
          homeTeamInput.trim() || undefined,
          awayTeamInput.trim() || undefined
        );
      }
    } catch (err) {
      setJsonError('El texto pegado no es un JSON válido. Verificá haber copiado el contenido completo.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 md:space-y-12 w-full max-w-full overflow-x-hidden">
      {/* Hero Analysis Box */}
      <section className="relative rounded-xl bg-gradient-to-b from-[#1E293B]/70 to-[#111827]/90 border border-[#334155] p-4 sm:p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            <Sparkles className="w-3 h-3" />
            <span>DATOS REALES DE SOFASCORE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Analizá un partido de Sofascore
          </h1>
          <p className="text-[#94A3B8] text-xs sm:text-sm lg:text-base leading-relaxed">
            Utilizá directamente los datos oficiales de <span className="text-amber-400 font-semibold">Sofascore</span>: alineaciones reales, calificaciones de rendimiento, mapas de calor tácticos y estadísticas oficiales.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-b border-[#334155]/60 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-amber-600 text-black font-bold shadow'
                  : 'bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Por Enlace / ID</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookmarklet')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bookmarklet'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-[#0F172A] text-amber-300 hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Marcador 1-Click (100% Automático)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Importar JSON</span>
            </button>
            {onNavigateToImageAnalysis && (
              <button
                type="button"
                onClick={onNavigateToImageAnalysis}
                className="px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer bg-[#0F172A] text-amber-400 hover:text-white hover:bg-[#1E293B] border border-amber-400/30"
              >
                <FileImage className="w-3.5 h-3.5 text-amber-400" />
                <span>📷 Analizar por Imágenes</span>
              </button>
            )}
          </div>

          {activeTab === 'url' ? (
            <form onSubmit={handleSubmitUrl} className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    placeholder="https://www.sofascore.com/football/match/...#id:16924719"
                    className="w-full pl-10 pr-24 py-3 bg-[#0A0D14]/90 border border-[#334155] focus:border-amber-500 rounded text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) {
                          setUrlInput(clipText.trim());
                          if (urlError) setUrlError(null);
                        }
                      } catch (err) {
                        console.warn('Clipboard read permission:', err);
                      }
                    }}
                    title="Pegar desde el portapapeles"
                    className="absolute inset-y-1.5 right-1.5 px-2.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155]/80 text-[#94A3B8] hover:text-white rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Pegar</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 shrink-0 cursor-pointer"
                >
                  <span>Analizar partido</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {urlError && (
                <div className="flex items-center gap-2 text-rose-400 text-xs mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{urlError}</span>
                </div>
              )}

              {detectedEventId && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded text-xs text-[#94A3B8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ID de evento detectado: <strong className="text-white font-mono">#{detectedEventId}</strong> • Proxy inteligente activo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.sofascore.com/api/v1/event/${detectedEventId}/lineups`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-1 text-[11px]"
                    >
                      <span>Abrir JSON oficial</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </form>
          ) : activeTab === 'bookmarklet' ? (
            <div className="pt-2 space-y-4 text-left">
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[#0A0D14] border border-amber-500/30 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Extracción automática con 1 solo Clic desde Sofascore
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Sin CORS • Sin Copiar/Pegar
                  </span>
                </div>

                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Sofascore bloquea servidores en la nube, pero permite consultas directas desde tu propio navegador. Con este marcador mágico, al estar viendo cualquier partido en Sofascore, hacés un clic y se extraen los datos oficiales y mapas de calor al instante:
                </p>

                {/* Step 1 Drag Button */}
                <div className="p-3 bg-[#0A0D14]/80 border border-[#334155] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-mono flex items-center justify-center">1</span>
                      <span>Arrastrá este botón a tu barra de marcadores del navegador:</span>
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      (Si tu barra está oculta, presiona <kbd className="text-white bg-[#1E293B] px-1 py-0.5 rounded font-mono">Ctrl+Shift+B</kbd>)
                    </p>
                  </div>

                  <a
                    href={bookmarkletCode}
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Arrastrá este botón hacia la barra de marcadores de tu navegador (Chrome, Edge, Firefox, Brave) para usarlo.");
                    }}
                    title="Arrastrá a la barra de marcadores"
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-amber-600/30 flex items-center gap-2 cursor-grab active:cursor-grabbing shrink-0"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>⚽ Enviar a Scouting App</span>
                  </a>
                </div>

                {/* Step 2 Usage Instruction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#94A3B8]">
                  <div className="p-3 bg-[#0F172A] border border-[#334155]/60 rounded-lg space-y-1">
                    <span className="text-white font-semibold flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono flex items-center justify-center">2</span>
                      <span>En Sofascore:</span>
                    </span>
                    <p className="text-[11px] text-[#94A3B8]">
                      Navegá a la página del partido que querés analizar (ej: Premier League, Libertadores, etc.).
                    </p>
                  </div>

                  <div className="p-3 bg-[#0F172A] border border-[#334155]/60 rounded-lg space-y-1">
                    <span className="text-white font-semibold flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center justify-center">3</span>
                      <span>Hacé 1 Clic en el marcador:</span>
                    </span>
                    <p className="text-[11px] text-[#94A3B8]">
                      La app recibirá automáticamente los equipos, alineaciones, estadio y mapas de calor en tiempo real.
                    </p>
                  </div>
                </div>

                {/* Alternative Copy Button */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-[#64748B]">
                    ¿No podés arrastrar? Podés copiar el código JavaScript:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBookmarklet}
                    className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] rounded text-xs text-[#E5E7EB] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedBookmarklet ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar código JavaScript</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitJson} className="pt-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#94A3B8] font-medium block">
                    Equipo Local:
                  </label>
                  <input
                    type="text"
                    value={homeTeamInput}
                    onChange={(e) => setHomeTeamInput(e.target.value)}
                    placeholder="Ej: Arsenal, Real Madrid..."
                    className="w-full px-3 py-2 bg-[#0A0D14]/90 border border-[#334155] focus:border-emerald-500 rounded text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#94A3B8] font-medium block">
                    Equipo Visitante:
                  </label>
                  <input
                    type="text"
                    value={awayTeamInput}
                    onChange={(e) => setAwayTeamInput(e.target.value)}
                    placeholder="Ej: Chelsea, Barcelona..."
                    className="w-full px-3 py-2 bg-[#0A0D14]/90 border border-[#334155] focus:border-emerald-500 rounded text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#94A3B8] font-medium flex items-center justify-between">
                  <span>Enlace o ID de Sofascore (opcional para auto-completar):</span>
                  {detectedEventId && (
                    <span className="text-[11px] font-mono text-emerald-400">ID detectado: #{detectedEventId}</span>
                  )}
                </label>
                <input
                  type="text"
                  value={teamsOrUrlInput}
                  onChange={(e) => setTeamsOrUrlInput(e.target.value)}
                  placeholder="https://www.sofascore.com/football/match/...#id:16924719"
                  className="w-full px-3 py-2 bg-[#0A0D14]/90 border border-[#334155] focus:border-emerald-500 rounded text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {detectedEventId && (
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-950/20 border border-emerald-800/40 rounded text-[11px]">
                  <span className="text-[#94A3B8]">Endpoints directos de Sofascore:</span>
                  <a
                    href={`https://www.sofascore.com/api/v1/event/${detectedEventId}/lineups`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 bg-[#0F172A] hover:bg-[#1E293B] border border-emerald-700/50 rounded text-emerald-300 hover:text-emerald-200 font-mono inline-flex items-center gap-1"
                  >
                    <span>/lineups</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://www.sofascore.com/api/v1/event/${detectedEventId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 bg-[#0F172A] hover:bg-[#1E293B] border border-emerald-700/50 rounded text-emerald-300 hover:text-emerald-200 font-mono inline-flex items-center gap-1"
                  >
                    <span>/event (Nombres y estadio)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-[#94A3B8] font-medium flex items-center justify-between">
                  <span>Pegá la respuesta JSON de Sofascore (<code className="text-emerald-400 font-mono">/lineups</code> o combinada):</span>
                  <span className="text-[10px] text-[#64748B] font-mono">100% exactitud estadística</span>
                </label>
                <textarea
                  rows={4}
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    if (jsonError) setJsonError(null);
                  }}
                  placeholder='Pegá acá el JSON de Sofascore (ej: { "confirmed": true, "home": { "players": [...] }, "away": { ... } })'
                  className="w-full p-3 bg-[#0A0D14]/90 border border-[#334155] focus:border-emerald-500 rounded text-xs text-emerald-300 font-mono placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                {jsonError ? (
                  <div className="flex items-center gap-2 text-rose-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{jsonError}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#64748B] font-mono">
                    Acepta payload de lineups, event o el objeto combinado.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 shrink-0 cursor-pointer"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Procesar JSON oficial</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Reports Section */}
      <section className="space-y-4">
        {/* User Account / Cloud Persistence Banner */}
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                <span className="text-emerald-300 font-semibold font-mono text-[11px] uppercase tracking-wider">
                  Nube Firebase Activa:
                </span>
                <span className="text-white font-medium truncate font-mono text-xs">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] shrink-0">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sincronizado con tu cuenta</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-amber-300 font-semibold font-mono text-xs uppercase tracking-wider">
                  Modo Invitado (Sin Cuenta de Google)
                </p>
                <p className="text-[#94A3B8] text-[11px] leading-relaxed">
                  Estás trabajando localmente. Inicia sesión con tu cuenta de Google para guardar tus informes permanentemente en la nube y acceder desde cualquier dispositivo.
                </p>
              </div>
            </div>
            <button
              onClick={() => signInWithGoogle()}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md shadow-amber-500/10 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión con Google</span>
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Informes guardados</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] font-mono">
                  {filteredReports.length} {filteredReports.length !== reports.length && `de ${reports.length}`}
                </span>
              </h2>
              {onRefresh && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefresh();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-[11px] font-mono text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Sincronizar y recuperar partidos de la nube y almacenamiento local"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                  <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
              )}
              {onOpenRecoveryModal && (
                <button
                  type="button"
                  onClick={onOpenRecoveryModal}
                  className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Escanear y recuperar partidos y notas perdidas de Cienciano, Torque, Racing, etc."
                >
                  <Database className="w-3 h-3 text-amber-400" />
                  <span>Recuperar Datos</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Historial de partidos analizados y evaluaciones registradas
            </p>
          </div>

          {/* Search and Filters Toolbar */}
          {reports.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar equipo, torneo, fecha..."
                  className="w-full bg-[#111827] border border-[#334155] focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] focus:outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Competition Filter */}
              {uniqueCompetitions.length > 0 && (
                <select
                  value={selectedCompetition}
                  onChange={(e) => setSelectedCompetition(e.target.value)}
                  className="bg-[#111827] border border-[#334155] focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-sans"
                >
                  <option value="ALL">Todas las Competiciones</option>
                  {uniqueCompetitions.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              )}

              {/* Team Filter */}
              {uniqueTeams.length > 0 && (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="bg-[#111827] border border-[#334155] focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-sans"
                >
                  <option value="ALL">Todos los Equipos</option>
                  {uniqueTeams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              )}

              {/* Reset Filters */}
              {isFilterActive && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCompetition('ALL');
                    setSelectedTeam('ALL');
                  }}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-mono flex items-center gap-1 transition-colors"
                  title="Limpiar filtros"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
            </div>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#334155] rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto text-[#64748B]">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">No tenés informes guardados todavía</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                Ingresá un enlace de Sofascore arriba para generar tu primer informe de partido.
              </p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-[#334155] rounded-xl space-y-2">
            <Filter className="w-8 h-8 text-[#64748B] mx-auto" />
            <p className="text-sm font-medium text-white">No se encontraron informes con los filtros aplicados</p>
            <p className="text-xs text-[#64748B]">Probá cambiar la búsqueda o el filtro de torneo/equipo.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCompetition('ALL');
                setSelectedTeam('ALL');
              }}
              className="mt-2 text-xs font-semibold text-blue-400 hover:underline"
            >
              Restablecer todos los filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => onOpenReport(report.id)}
                className="group relative rounded-lg bg-[#111827] border border-[#1E293B] hover:border-blue-500/50 p-5 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
                    <span className="truncate max-w-[180px]">{cleanCompetitionName(report.competition)}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {report.matchDate || 'Reciente'}
                    </span>
                  </div>

                  {/* Teams and Score Header */}
                  <div className="py-2 border-y border-[#1E293B]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {report.homeTeamLogo && (
                          <img
                            src={report.homeTeamLogo}
                            alt=""
                            className="w-5 h-5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const teamId = report.matchId;
                              if (teamId && !target.src.includes('/api/sofascore/image/team/')) {
                                target.src = `/api/sofascore/image/team/${teamId}`;
                              }
                            }}
                          />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {report.homeTeamName}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white font-mono px-2 py-0.5 rounded bg-[#1E293B]">
                        {report.score || '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {report.awayTeamLogo && (
                          <img
                            src={report.awayTeamLogo}
                            alt=""
                            className="w-5 h-5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const teamId = report.matchId;
                              if (teamId && !target.src.includes('/api/sofascore/image/team/')) {
                                target.src = `/api/sofascore/image/team/${teamId}`;
                              }
                            }}
                          />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {report.awayTeamName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* General Match Notes snippet if present */}
                  {report.generalNotes && (
                    <div 
                      className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-[#D1D5DB] flex items-start gap-1.5 line-clamp-2 italic"
                      title={report.generalNotes}
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="truncate max-w-full">"{report.generalNotes}"</span>
                    </div>
                  )}

                  {/* Meta stats */}
                  <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>{report.evaluationCount || 0} evaluados</span>
                    </div>
                    {report.stadium && (
                      <div className="flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{report.stadium}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-[#1E293B]/40">
                  {onEditReport && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditReport(report.id);
                      }}
                      className="p-1.5 rounded hover:bg-amber-500/15 text-[#94A3B8] hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px] font-mono"
                      title="Editar partido (datos, alineaciones, resultado)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport(report.id);
                    }}
                    className="p-1.5 rounded hover:bg-rose-500/10 text-[#64748B] hover:text-rose-400 transition-colors"
                    title="Eliminar informe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 ml-2">
                    <span>Abrir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

