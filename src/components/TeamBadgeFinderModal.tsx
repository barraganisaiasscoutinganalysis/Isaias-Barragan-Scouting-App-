import React, { useState, useEffect } from 'react';
import { Search, Globe, Shield, Check, X, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

export interface BadgeOption {
  name: string;
  url: string;
  proxiedUrl: string;
  league?: string;
  score?: number;
}

interface TeamBadgeFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  currentLogoUrl?: string;
  onSelectBadge: (badgeUrl: string) => void;
}

export const TeamBadgeFinderModal: React.FC<TeamBadgeFinderModalProps> = ({
  isOpen,
  onClose,
  teamName,
  currentLogoUrl,
  onSelectBadge,
}) => {
  const [activeTab, setActiveTab] = useState<'escudoteca' | 'custom_url'>('escudoteca');
  const [searchQuery, setSearchQuery] = useState(teamName || '');
  const [results, setResults] = useState<BadgeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom webpage scraper tab states
  const [customUrl, setCustomUrl] = useState('https://paladarnegro.net/escudoteca/index.html');
  const [extractedTitle, setExtractedTitle] = useState<string | null>(null);
  const [customBadges, setCustomBadges] = useState<BadgeOption[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // When modal opens or teamName changes, perform search in Escudoteca
  useEffect(() => {
    if (isOpen) {
      const q = teamName?.trim() || '';
      setSearchQuery(q);
      if (q) {
        handleSearchEscudoteca(q);
      } else {
        handleSearchEscudoteca('');
      }
    }
  }, [isOpen, teamName]);

  const handleSearchEscudoteca = async (query: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/escudoteca/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Error buscando en la Escudoteca');
      const data = await res.json();
      const mapped: BadgeOption[] = (data.results || []).map((r: any) => ({
        name: r.name,
        url: r.badgeUrl,
        proxiedUrl: r.proxiedUrl,
        league: r.league,
        score: r.score,
      }));
      setResults(mapped);
    } catch (err: any) {
      console.error('Error fetching badges:', err);
      setErrorMessage(err?.message || 'No se pudo conectar con la base de escudos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractFromUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customUrl.trim()) return;

    setIsExtracting(true);
    setErrorMessage(null);
    setExtractedTitle(null);
    setCustomBadges([]);

    try {
      const res = await fetch('/api/escudoteca/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: customUrl.trim(),
          team: searchQuery.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status}`);
      }

      const data = await res.json();
      setExtractedTitle(data.title || customUrl);
      const badges: BadgeOption[] = (data.badges || []).map((b: any) => ({
        name: b.name,
        url: b.url,
        proxiedUrl: b.proxiedUrl,
      }));
      setCustomBadges(badges);

      if (badges.length === 0) {
        setErrorMessage('No se encontraron imágenes de escudos en la página consultada con ese filtro.');
      }
    } catch (err: any) {
      console.error('Error extracting badges:', err);
      setErrorMessage(err?.message || 'Error al consultar la página externa.');
    } finally {
      setIsExtracting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0F172A] border border-[#334155] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-4 bg-[#1E293B] border-b border-[#334155] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Buscador & Extractor de Escudos
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Asignando escudo para: <strong className="text-amber-400">{teamName || 'Equipo'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#334155]/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="px-5 py-2 bg-[#0A0D14] border-b border-[#334155]/60 flex items-center gap-2 shrink-0 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('escudoteca')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'escudoteca'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Escudoteca Paladar Negro (+930 Clubes)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom_url')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'custom_url'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50 font-bold'
                : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#334155]/40'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Extraer desde URL Externa</span>
          </button>
        </div>

        {/* Search controls */}
        <div className="p-4 bg-[#111827] border-b border-[#334155]/60 shrink-0">
          {activeTab === 'escudoteca' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchEscudoteca(searchQuery);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribe el nombre del club (ej: Camioneros, Boca, Chacarita, Flandria)..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Buscar</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleExtractFromUrl} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="URL de la página (ej: https://paladarnegro.net/escudoteca/index.html)"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A0D14] border border-[#334155] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isExtracting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Extraer</span>
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] font-mono">
                La web se conectará a la página indicada, buscará imágenes de escudos transparentes y las pondrá a tu disposición.
              </p>
            </form>
          )}
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="px-5 py-2 bg-rose-950/80 border-b border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between shrink-0">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Badges Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'escudoteca' ? (
            <div>
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#94A3B8] space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs font-mono">Consultando Escudoteca Paladar Negro...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-[#64748B] font-mono text-xs space-y-2">
                  <p>No se encontraron escudos para "{searchQuery}".</p>
                  <p className="text-[#94A3B8]">Intenta buscando por una sola palabra (ej: "camioneros", "san martin", "quilmes").</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {results.map((badge, idx) => {
                    const isSelected = currentLogoUrl === badge.url || currentLogoUrl === badge.proxiedUrl;
                    return (
                      <div
                        key={`${badge.url}_${idx}`}
                        onClick={() => {
                          onSelectBadge(badge.url);
                          onClose();
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer group hover:scale-[1.02] ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10'
                            : 'bg-[#111827] border-[#334155] hover:border-amber-500/60 hover:bg-[#1E293B]'
                        }`}
                      >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1.5 mb-2 bg-[#0A0D14]/80 rounded-lg border border-[#334155]/40">
                          <img
                            src={badge.proxiedUrl}
                            alt={badge.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                            loading="lazy"
                            onError={(e) => {
                              // If proxy fails, try direct URL
                              (e.target as HTMLElement).setAttribute('src', badge.url);
                            }}
                          />
                        </div>
                        <div className="w-full space-y-1">
                          <h4 className="text-xs font-bold text-white font-mono truncate" title={badge.name}>
                            {badge.name}
                          </h4>
                          {badge.league && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#1E293B] text-amber-300/90 border border-[#334155]/50">
                              {badge.league}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`mt-2.5 w-full py-1 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-[#1E293B] group-hover:bg-amber-500 group-hover:text-slate-950 text-[#94A3B8]'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Actual</span>
                            </>
                          ) : (
                            <span>Seleccionar</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              {isExtracting ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#94A3B8] space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <p className="text-xs font-mono">Extrayendo imágenes desde la web externa...</p>
                </div>
              ) : customBadges.length === 0 ? (
                <div className="py-12 text-center text-[#64748B] font-mono text-xs space-y-2">
                  <p>Ingresa una URL arriba y presiona "Extraer" para cargar los escudos disponibles.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extractedTitle && (
                    <div className="text-xs font-mono text-[#94A3B8] flex items-center justify-between px-1">
                      <span>Página: <strong className="text-white">{extractedTitle}</strong></span>
                      <span className="text-amber-400">{customBadges.length} escudos detectados</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {customBadges.map((badge, idx) => {
                      const isSelected = currentLogoUrl === badge.url || currentLogoUrl === badge.proxiedUrl;
                      return (
                        <div
                          key={`${badge.url}_${idx}`}
                          onClick={() => {
                            onSelectBadge(badge.url);
                            onClose();
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer group hover:scale-[1.02] ${
                            isSelected
                              ? 'bg-blue-500/15 border-blue-400 shadow-lg shadow-blue-500/10'
                            : 'bg-[#111827] border-[#334155] hover:border-blue-500/60 hover:bg-[#1E293B]'
                          }`}
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1.5 mb-2 bg-[#0A0D14]/80 rounded-lg border border-[#334155]/40">
                            <img
                              src={badge.proxiedUrl}
                              alt={badge.name}
                              className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute('src', badge.url);
                              }}
                            />
                          </div>
                          <h4 className="text-xs font-bold text-white font-mono truncate w-full" title={badge.name}>
                            {badge.name}
                          </h4>
                          <button
                            type="button"
                            className={`mt-2 w-full py-1 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-colors ${
                              isSelected
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#1E293B] group-hover:bg-blue-500 group-hover:text-white text-[#94A3B8]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Actual</span>
                              </>
                            ) : (
                              <span>Seleccionar</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#111827] border-t border-[#334155] flex items-center justify-between shrink-0 text-xs font-mono">
          <a
            href="https://paladarnegro.net/escudoteca/index.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#64748B] hover:text-amber-400 transition-colors"
          >
            <span>Fuente: Paladar Negro Escudoteca</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
