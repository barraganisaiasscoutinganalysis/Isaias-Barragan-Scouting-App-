import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Server, 
  CheckCircle2, 
  Copy, 
  Check, 
  Wifi, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Key, 
  ExternalLink,
  AlertCircle,
  Palette,
  Upload,
  Download,
  FileJson,
  FolderArchive,
  RefreshCw,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { storageService } from '../services/storage/storageService';
import { migrateFirebaseToSupabase, MigrationResult } from '../services/storage/migrationService';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';

interface SettingsViewProps {
  onOpenRecoveryModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenRecoveryModal }) => {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemoScout, signOut } = useAuth();
  const { setIsEditorOpen } = useTheme();

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Backup / Restore state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);
  
  // Scraper API (Option 4)
  const [scraperProvider, setScraperProvider] = useState<'scraperapi' | 'scrapingant' | 'custom'>('scraperapi');
  const [scraperApiKey, setScraperApiKey] = useState('');
  const [scraperStatus, setScraperStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [scraperMessage, setScraperMessage] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [serverProviderName, setServerProviderName] = useState('none');

  // Local Residential Proxy
  const [proxyUrl, setProxyUrl] = useState('http://localhost:8010');
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    const savedProxy = localStorage.getItem('sofascore_custom_proxy');
    if (savedProxy) setProxyUrl(savedProxy);

    const savedProvider = localStorage.getItem('sofascore_proxy_provider') as any;
    if (savedProvider) setScraperProvider(savedProvider);

    const savedKey = localStorage.getItem('sofascore_scraper_key');
    if (savedKey) setScraperApiKey(savedKey);

    fetch('/api/sofascore/config-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasServerKey) {
          setHasServerKey(true);
          setServerProviderName(data.provider);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveScraper = (key: string, provider: 'scraperapi' | 'scrapingant' | 'custom') => {
    setScraperApiKey(key);
    setScraperProvider(provider);
    localStorage.setItem('sofascore_scraper_key', key);
    localStorage.setItem('sofascore_proxy_provider', provider);
  };

  const handleSaveLocalProxy = (url: string) => {
    setProxyUrl(url);
    localStorage.setItem('sofascore_custom_proxy', url);
  };

  const testCloudScraper = async () => {
    setScraperStatus('testing');
    setScraperMessage(null);
    try {
      const res = await fetch('/api/sofascore/test-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: scraperApiKey.trim(),
          provider: scraperProvider,
          customUrl: proxyUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScraperStatus('connected');
        setScraperMessage('¡Conexión exitosa! El proxy residencial eludió Cloudflare correctamente.');
      } else {
        setScraperStatus('error');
        setScraperMessage(data.error || 'No se pudo conectar con Sofascore a través del servicio.');
      }
    } catch (err: any) {
      setScraperStatus('error');
      setScraperMessage(err.message || 'Error de red al probar el servicio.');
    }
  };

  const testLocalProxy = async () => {
    setProxyStatus('testing');
    try {
      const clean = proxyUrl.replace(/\/+$/, '');
      const res = await fetch(`${clean}/api/v1/event/16924719/lineups`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        setProxyStatus('connected');
      } else {
        setProxyStatus('error');
      }
    } catch {
      setProxyStatus('error');
    }
  };

  const command = `npx local-cors-proxy --proxyUrl https://www.sofascore.com --port 8010`;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  // Handle downloading JSON backup
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setBackupErrorMsg(null);
      setBackupSuccessMsg(null);
      const jsonStr = await storageService.exportAllDataAsJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `scouting_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccessMsg('¡Copia de seguridad descargada exitosamente en tu dispositivo!');
    } catch (err: any) {
      setBackupErrorMsg('Error al generar la copia de seguridad: ' + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle uploading and restoring JSON backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setBackupErrorMsg(null);
      setBackupSuccessMsg(null);
      const text = await file.text();
      const result = await storageService.importDataFromJSON(text);
      setBackupSuccessMsg(`¡Restauración exitosa! Se restauraron ${result.reportsCount} partidos y ${result.dossiersCount} dossiers de jugadores.`);
      e.target.value = '';
    } catch (err: any) {
      setBackupErrorMsg('Error al restaurar: ' + (err.message || 'Archivo inválido'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-[#334155]/60 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-purple-400" />
          <span>Ajustes de Plataforma & Configuración</span>
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Configuración de proxies residenciales, copias de seguridad de datos, sesión y personalización visual.
        </p>
      </div>

      {/* BLINDAJE & COPIAS DE SEGURIDAD (ANTI-DATA-LOSS VAULT) */}
      <div className="rounded-xl bg-[#111827] border border-emerald-500/30 p-6 space-y-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <span>Blindaje de Datos & Copias de Seguridad</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-normal font-sans border border-emerald-500/30">
                  Protección 5x Capas
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Evita pérdidas de datos exportando respaldos a tu computadora o restaurando en 1 clic.
              </p>
            </div>
          </div>
        </div>

        {/* Info Box: ¿Cómo funciona y por qué se puede desfasar? */}
        <div className="p-3.5 rounded-lg bg-[#0A0D14] border border-[#334155] space-y-2 text-xs text-[#94A3B8]">
          <p className="text-white font-semibold flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ¿Cómo garantizar que nunca más se pierdan tus notas de scouting?
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-[#94A3B8] pl-1">
            <li>
              <strong className="text-white">Almacenamiento Híbrido Activo:</strong> Cada partido o nota se guarda simultáneamente en tu navegador (<code className="text-cyan-400">LocalStorage</code>), en un historial de snapshots rolling, y en tu cuenta de <code className="text-emerald-400">Firestore Cloud</code>.
            </li>
            <li>
              <strong className="text-white">Cuidado al manipular Firebase Console:</strong> Los datos en Firestore están organizados bajo <code className="text-amber-400">users/{'{'}tu_UID{'}'}/reports</code>. Si borras documentos directamente en Firebase o cambias de cuenta de Google, los datos de ese UID no se cargan automáticamente a menos que uses la herramienta de recuperación.
            </li>
            <li>
              <strong className="text-white">Buenas Prácticas:</strong> Descarga una copia de seguridad <code className="text-emerald-400">.json</code> periódicamente con el botón verde abajo para tener siempre una copia física en tu computadora.
            </li>
          </ul>
        </div>

        {/* Feedback Messages */}
        {backupSuccessMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{backupSuccessMsg}</span>
          </div>
        )}
        {backupErrorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{backupErrorMsg}</span>
          </div>
        )}

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Export button */}
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Descargar Backup (.json)'}</span>
          </button>

          {/* Import file label/button */}
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#1E293B] hover:bg-[#334155] active:bg-[#0F172A] border border-[#475569] text-white text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>{isImporting ? 'Restaurando...' : 'Restaurar desde (.json)'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={isImporting}
              className="hidden"
            />
          </label>

          {/* Recovery modal button */}
          {onOpenRecoveryModal && (
            <button
              onClick={onOpenRecoveryModal}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Centro de Recuperación</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud Residential Scraper Service (Opción 4) */}
      <div className="rounded-xl bg-[#111827] border border-blue-500/40 p-6 space-y-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <span>Servicio de Proxy Residencial en la Nube</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-normal">Opción 4</span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Utiliza redes de IPs residenciales que eluden el Cloudflare WAF de Sofascore automáticamente.
              </p>
            </div>
          </div>
          <span className={`text-xs font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 shrink-0 ${
            scraperStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : scraperStatus === 'error'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              scraperStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : scraperStatus === 'error' ? 'bg-rose-400' : 'bg-[#64748B]'
            }`} />
            <span>
              {scraperStatus === 'connected' ? 'PROBADO Y OPERACIONAL' : scraperStatus === 'error' ? 'ERROR DE CONEXIÓN' : 'SIN PROBAR'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-[#94A3B8] font-mono block">Proveedor de Proxy:</label>
            <select
              value={scraperProvider}
              onChange={(e) => handleSaveScraper(scraperApiKey, e.target.value as any)}
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none cursor-pointer"
            >
              <option value="scraperapi">ScraperAPI (Plan Gratuito: 5.000 peticiones)</option>
              <option value="scrapingant">ScrapingAnt (Plan Gratuito: 10.000 peticiones)</option>
              <option value="custom">Proxy Personalizado / Local</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#94A3B8] font-mono flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>API Key del Proveedor:</span>
              </label>
              {scraperProvider === 'scraperapi' && (
                <a
                  href="https://www.scraperapi.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-0.5"
                >
                  <span>Obtener clave gratis</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              type="password"
              value={scraperApiKey}
              onChange={(e) => handleSaveScraper(e.target.value, scraperProvider)}
              placeholder="Ej: d7f8b9e... (Tu API Key)"
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-[#94A3B8]">
            * Los planes gratuitos de ScraperAPI permiten analizar miles de partidos sin costo alguno.
          </p>
          <button
            onClick={testCloudScraper}
            disabled={scraperStatus === 'testing'}
            className="w-full sm:w-auto px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            {scraperStatus === 'testing' ? 'Comprobando contra Sofascore...' : 'Probar conexión'}
          </button>
        </div>

        {scraperMessage && (
          <div className={`p-3 rounded text-xs flex items-center gap-2 ${
            scraperStatus === 'connected' 
              ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300' 
              : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
          }`}>
            {scraperStatus === 'connected' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{scraperMessage}</span>
          </div>
        )}

        {/* Global Server Persistence Info */}
        <div className="mt-4 pt-4 border-t border-[#1E293B] space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <span>¿Cómo dejar la clave fija para todos los usuarios al publicar?</span>
          </div>
          {hasServerKey ? (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>¡Clave de Servidor Activa!</strong> El servidor backend está configurado con la clave global (<code className="font-mono">{serverProviderName.toUpperCase()}</code>). Cualquier usuario que visite tu app publicada tendrá acceso automático a las métricas de Sofascore sin necesidad de ingresar ninguna clave.
              </span>
            </div>
          ) : (
            <div className="p-3 rounded bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs space-y-1.5">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Para fijar la clave permanentemente en el servidor para el público:</span>
              </p>
              <ol className="list-decimal list-inside text-[11px] text-amber-200/90 space-y-1 pl-1">
                <li>Ve al menú de <strong>Ajustes del proyecto en AI Studio</strong> (icono de engranaje o Secrets / Variables de Entorno).</li>
                <li>Agrega la variable llamada <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-300 font-mono">SCRAPER_API_KEY</code> y pega tu clave de ScraperAPI.</li>
                <li>¡Listo! Al publicar la app, el servidor usará automáticamente esa clave para todas las visitas públicas de la web.</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Local Residential Proxy (Tu propia IP Residencial) */}
      <div className="rounded-xl bg-[#111827] border border-cyan-500/30 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Proxy Residencial Local (Tu PC / Localhost)
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Alternativa local: ejecutá un puente en tu máquina para usar tu conexión hogareña.
              </p>
            </div>
          </div>
          <span className={`text-xs font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 ${
            proxyStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : proxyStatus === 'error'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              proxyStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : proxyStatus === 'error' ? 'bg-rose-400' : 'bg-[#64748B]'
            }`} />
            <span>
              {proxyStatus === 'connected' ? 'CONECTADO Y OPERACIONAL' : proxyStatus === 'error' ? 'NO DETECTADO' : 'CONFIGURADO'}
            </span>
          </span>
        </div>

        <div className="space-y-3 bg-[#0A0D14] p-4 rounded-lg border border-[#334155]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono">1. Ejecutá este comando en tu terminal (PowerShell / CMD / Bash):</span>
            <button
              onClick={handleCopy}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 px-2 py-1 bg-cyan-950/40 rounded border border-cyan-800/40 cursor-pointer"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd ? 'Copiado' : 'Copiar comando'}</span>
            </button>
          </div>

          <div className="p-2.5 bg-[#0F172A] rounded border border-[#1E293B] font-mono text-xs text-emerald-300 select-all overflow-x-auto">
            {command}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-mono text-[#94A3B8] block mb-1">URL del Proxy Local:</label>
            <input
              type="text"
              value={proxyUrl}
              onChange={(e) => handleSaveLocalProxy(e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
              placeholder="http://localhost:8010"
            />
          </div>
          <div className="w-full sm:w-auto pt-4 sm:pt-4">
            <button
              onClick={testLocalProxy}
              disabled={proxyStatus === 'testing'}
              className="w-full sm:w-auto px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {proxyStatus === 'testing' ? 'Verificando...' : 'Probar local'}
            </button>
          </div>
        </div>
      </div>

      {/* SUPABASE POSTGRESQL & AUTH HUB */}
      <div className="rounded-xl bg-[#111827] border border-cyan-500/40 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#334155]/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <span>Supabase PostgreSQL & Auth Engine</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-normal font-sans border border-cyan-500/30">
                  Fuente Principal
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Base de datos relacional PostgreSQL con Row Level Security (RLS) y aislamiento estricto por usuario.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-semibold bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PROJECT: ekltoasdlhsrqaanvixu</span>
          </span>
        </div>

        {/* User Account Info */}
        <div className="p-4 rounded-lg bg-[#0A0D14] border border-[#334155] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
            <div>
              <span className="text-xs text-[#64748B] block font-mono">USUARIO ACTIVO EN SUPABASE</span>
              <p className="text-sm font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                {user ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-emerald-300">{user.email || user.displayName}</span>
                    <span className="text-[10px] text-[#64748B] font-mono">({user.id.slice(0, 8)}...)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-amber-300">Sin sesión iniciada (Modo Local)</span>
                  </>
                )}
              </p>
            </div>

            {user && (
              <button
                onClick={() => signOut()}
                className="px-3.5 py-1.5 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-mono transition-colors cursor-pointer self-start sm:self-auto"
              >
                Cerrar Sesión
              </button>
            )}
          </div>

          {/* If NOT logged in, show Auth Forms */}
          {!user && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className={`text-xs font-mono px-3 py-1 rounded transition-colors ${authMode === 'login' ? 'bg-cyan-500 text-black font-bold' : 'text-[#94A3B8] hover:text-white'}`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                  className={`text-xs font-mono px-3 py-1 rounded transition-colors ${authMode === 'signup' ? 'bg-cyan-500 text-black font-bold' : 'text-[#94A3B8] hover:text-white'}`}
                >
                  Registrar Cuenta
                </button>
              </div>

              {authError && (
                <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                  {authSuccess}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  setAuthSuccess(null);
                  setIsAuthLoading(true);
                  if (authMode === 'login') {
                    const res = await signInWithEmail(authEmail, authPassword);
                    if (res.error) setAuthError(res.error);
                  } else {
                    const res = await signUpWithEmail(authEmail, authPassword);
                    if (res.error) setAuthError(res.error);
                    if (res.message) setAuthSuccess(res.message);
                  }
                  setIsAuthLoading(false);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <input
                  type="email"
                  required
                  placeholder="scout@club.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <input
                  type="password"
                  required
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />

                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAuthLoading ? 'Procesando...' : (authMode === 'login' ? 'Acceder con Email' : 'Crear Cuenta')}
                  </button>

                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="px-4 py-2 rounded bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>Google OAuth</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RLS Isolation Quick Tester (Usuario A vs Usuario B) */}
          <div className="pt-3 border-t border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Pruebas de Aislamiento RLS (Multi-Usuario)
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Cambia instantáneamente entre <strong>Scout A</strong> y <strong>Scout B</strong> para verificar que ningún usuario pueda ver ni modificar los partidos o notas del otro:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await signInAsDemoScout('A');
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  user?.email?.includes('scout_a')
                    ? 'bg-emerald-500 text-black border border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-[#1E293B] hover:bg-[#334155] text-white border border-[#475569]'
                }`}
              >
                <span>👤 Iniciar como Scout A</span>
                {user?.email?.includes('scout_a') && <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded ml-1">ACTIVO</span>}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signInAsDemoScout('B');
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  user?.email?.includes('scout_b')
                    ? 'bg-purple-500 text-white border border-purple-400 shadow-md shadow-purple-500/20'
                    : 'bg-[#1E293B] hover:bg-[#334155] text-white border border-[#475569]'
                }`}
              >
                <span>👤 Iniciar como Scout B</span>
                {user?.email?.includes('scout_b') && <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded ml-1">ACTIVO</span>}
              </button>
            </div>
          </div>
        </div>

        {/* 1-CLICK NON-DESTRUCTIVE MIGRATION FROM FIREBASE */}
        <div className="p-4 rounded-lg bg-[#0A0D14] border border-cyan-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Migración Segura: Firebase ➔ Supabase</span>
              </h4>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Copia todos los partidos, notas tácticas y dossiers existentes a PostgreSQL en Supabase. <strong>No borra nada de Firebase</strong> (permanece 100% como respaldo).
              </p>
            </div>

            <button
              onClick={async () => {
                if (!user) {
                  alert('Debes iniciar sesión con Supabase primero para asociar los datos migrados a tu cuenta.');
                  return;
                }
                setIsMigrating(true);
                setMigrationResult(null);
                try {
                  const res = await migrateFirebaseToSupabase(user.id);
                  setMigrationResult(res);
                  await storageService.syncAll();
                } catch (e: any) {
                  alert('Error al migrar: ' + e.message);
                } finally {
                  setIsMigrating(false);
                }
              }}
              disabled={isMigrating || !user}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black text-xs font-extrabold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-cyan-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
              <span>{isMigrating ? 'Migrando datos...' : 'Copiar a Supabase Ahora'}</span>
            </button>
          </div>

          {migrationResult && (
            <div className="p-3 rounded bg-[#111827] border border-cyan-500/40 text-xs font-mono space-y-1">
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Migración completada con éxito:</span>
              </p>
              <p className="text-[#94A3B8] pl-5">
                • Partidos migrados: <strong className="text-white">{migrationResult.reportsMigrated}</strong>
              </p>
              <p className="text-[#94A3B8] pl-5">
                • Dossiers de jugadores: <strong className="text-white">{migrationResult.dossiersMigrated}</strong>
              </p>
              <p className="text-cyan-300 pl-5">
                • Respaldo Firebase: <strong>Intacto y preservado</strong>
              </p>
            </div>
          )}
        </div>

        {/* Copy SQL Script for Supabase SQL Editor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded bg-[#0A0D14] border border-[#334155] text-xs">
          <div className="flex items-start gap-2.5">
            <Key className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-white font-mono font-bold text-[11px]">
                Script DDL PostgreSQL & Políticas RLS
              </p>
              <p className="text-[#94A3B8] text-[11px]">
                Tablas <code className="text-cyan-300">matches</code>, <code className="text-cyan-300">teams</code>, <code className="text-cyan-300">players</code>, <code className="text-cyan-300">scout_evaluations</code>, <code className="text-cyan-300">player_dossiers</code> listas para Supabase.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const sql = `-- DDL & RLS SCRIPT FOR SUPABASE POSTGRESQL (Project: ekltoasdlhsrqaanvixu)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  number INTEGER,
  position TEXT,
  position_label TEXT,
  nationality TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT,
  competition TEXT NOT NULL,
  competition_logo TEXT,
  round_or_phase TEXT,
  match_date TIMESTAMPTZ,
  stadium TEXT,
  referee TEXT,
  status TEXT DEFAULT 'FINISHED',
  home_team_id TEXT REFERENCES public.teams(id),
  away_team_id TEXT REFERENCES public.teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  home_formation TEXT,
  away_formation TEXT,
  general_notes TEXT DEFAULT '',
  full_match_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scout_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  rating NUMERIC(3, 1),
  rating_level TEXT,
  comment TEXT DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.match_event_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.player_dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  team_name TEXT,
  position_label TEXT,
  overall_rating NUMERIC(3, 1),
  recommendation TEXT,
  projected_role TEXT,
  strengths TEXT,
  weaknesses TEXT,
  summary_notes TEXT DEFAULT '',
  full_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, player_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_event_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public team catalogue" ON public.teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public player catalogue" ON public.players FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Matches user isolation" ON public.matches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Evaluations user isolation" ON public.scout_evaluations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Event notes user isolation" ON public.match_event_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Player dossiers user isolation" ON public.player_dossiers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;
              navigator.clipboard.writeText(sql);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
            className="px-3.5 py-2 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Copiado' : 'Copiar SQL DDL'}</span>
          </button>
        </div>
      </div>

      {/* Custom SVG Logo Card */}
      <div className="rounded-xl bg-[#111827] border border-amber-500/30 p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Logo SVG Personalizado
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Carga tu archivo .SVG o pega directamente el código XML del SVG para usar tu propio logo en toda la app.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* File Upload / Direct Area */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-[#94A3B8] block">Vista Previa / Carga Rápida:</label>
            <div className="p-4 bg-[#0A0D14] rounded-lg border border-[#334155] flex flex-col items-center justify-center min-h-[120px]">
              <Logo size="md" />
            </div>
          </div>

          {/* Code Paste Option */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-[#94A3B8] block">Pegar Código SVG directamente:</label>
            <textarea
              rows={4}
              placeholder="<svg xmlns='http://www.w3.org/2000/svg'...>...</svg>"
              className="w-full bg-[#0A0D14] border border-[#334155] focus:border-amber-500 rounded p-3 text-[11px] font-mono text-amber-300 focus:outline-none resize-none"
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val.includes('<svg') && val.includes('</svg>')) {
                  localStorage.setItem('scout_custom_svg_content', val);
                  window.dispatchEvent(new Event('scout_logo_updated'));
                }
              }}
            />
            <p className="text-[11px] text-[#64748B]">
              Tip: También puedes pulsar el botón <strong>"Cargar mi SVG"</strong> a la izquierda para seleccionar un archivo <code>.svg</code> desde tu dispositivo.
            </p>
          </div>
        </div>
      </div>

      {/* Color Palette Customizer Card */}
      <div className="rounded-xl bg-[#111827] border border-[#334155] p-6 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Editor de Paleta de Colores
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Cambia y personaliza en tiempo real los colores principales, fondos, tarjetas, botones y bordes de la aplicación.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditorOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <Palette className="w-4 h-4" />
            <span>Abrir Editor de Colores</span>
          </button>
        </div>
      </div>
    </div>
  );
};
