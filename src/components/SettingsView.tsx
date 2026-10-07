import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
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
  FolderArchive,
  Image as ImageIcon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage/storageService';
import { Logo } from './Logo';
import { 
  Cloud, 
  LogIn, 
  LogOut, 
  Database, 
  User as UserIcon,
  RefreshCw
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { setIsEditorOpen } = useTheme();
  const { user, signInWithGoogle, signOut, isOnline } = useAuth();
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);

  // Backup / Restore state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);
  
  // Scraper API (Option 4)
  const [scraperProvider, setScraperProvider] = useState<'scraperapi' | 'scrapingant' | 'zenrows' | 'scrapingbee' | 'custom'>('scraperapi');
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

  const handleSaveScraper = (key: string, provider: 'scraperapi' | 'scrapingant' | 'zenrows' | 'scrapingbee' | 'custom') => {
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
          Configuración de base de datos Firebase Firestore, proxies residenciales, copias de seguridad de datos y personalización visual.
        </p>
      </div>

      {/* FIREBASE FIRESTORE CLOUD CARD */}
      <div className="rounded-xl bg-[#111827] border border-amber-500/30 p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155]/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <span>Base de Datos Cloud Firestore (Firebase)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-normal font-sans border border-emerald-500/30">
                  {isOnline ? 'Online & Activa' : 'Modo Offline'}
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Proyecto: <code className="text-amber-300 font-mono">gold-range-2mn89</code> (Región: <span className="text-white">us-east1</span>)
              </p>
            </div>
          </div>

          <div>
            {user ? (
              <button
                onClick={() => signOut()}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar con Google</span>
              </button>
            )}
          </div>
        </div>

        {/* User / Session Details */}
        <div className="p-4 rounded-lg bg-[#0A0D14] border border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Scout'} className="w-10 h-10 rounded-full border border-amber-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-amber-400">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {user ? user.displayName || 'Scout Autenticado' : 'Modo Invitado / Sin Iniciar Sesión'}
              </p>
              <p className="text-xs text-[#94A3B8]">
                {user ? user.email : 'Inicia sesión para sincronizar automáticamente tus informes y dossiers en Firestore.'}
              </p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setSyncingCloud(true);
                  setCloudSyncMsg(null);
                  try {
                    if (storageService.syncAll) await storageService.syncAll();
                    setCloudSyncMsg('¡Sincronización en la nube completada!');
                  } catch (e: any) {
                    setCloudSyncMsg('Error al sincronizar: ' + (e.message || String(e)));
                  } finally {
                    setSyncingCloud(false);
                  }
                }}
                disabled={syncingCloud}
                className="px-3.5 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white text-xs font-mono flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncingCloud ? 'animate-spin' : ''}`} />
                <span>{syncingCloud ? 'Sincronizando...' : 'Forzar Sincronización'}</span>
              </button>
            </div>
          )}
        </div>

        {cloudSyncMsg && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{cloudSyncMsg}</span>
          </div>
        )}
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
                  Arquitectura Limpia
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Exporta respaldos completos en formato .JSON a tu computadora o restaura datos en 1 clic.
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-lg bg-[#0A0D14] border border-[#334155] space-y-2 text-xs text-[#94A3B8]">
          <p className="text-white font-semibold flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            Capa de Datos Desacoplada (DataService Abstraction)
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-[#94A3B8] pl-1">
            <li>
              <strong className="text-white">Persistencia Desacoplada:</strong> La aplicación opera a través de una interfaz de servicio unificada (<code className="text-cyan-400">dataService</code>).
            </li>
            <li>
              <strong className="text-white">Preparada para Conexión:</strong> Lista para conectar una nueva base de datos limpia en cualquier momento.
            </li>
            <li>
              <strong className="text-white">Buenas Prácticas:</strong> Descarga una copia de seguridad <code className="text-emerald-400">.json</code> periódicamente para conservar tus informes de partidos y dossiers.
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
              <option value="zenrows">ZenRows (Plan Gratuito: 1.000 peticiones)</option>
              <option value="scrapingbee">ScrapingBee (Plan Gratuito: 1.000 peticiones)</option>
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
              {scraperProvider === 'scrapingant' && (
                <a
                  href="https://scrapingant.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-0.5"
                >
                  <span>Obtener clave gratis</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {scraperProvider === 'zenrows' && (
                <a
                  href="https://www.zenrows.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-0.5"
                >
                  <span>Obtener clave gratis</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {scraperProvider === 'scrapingbee' && (
                <a
                  href="https://www.scrapingbee.com"
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
