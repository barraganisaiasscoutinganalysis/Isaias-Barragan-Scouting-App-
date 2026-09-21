import { ISofascoreService } from './ISofascoreService';
import { MatchDetails, Player, MatchEvent, HeatmapPoint, PlayerStatistics } from '../../types/scouting';
import { parseFootballUrl } from './urlParser';
import { transformSofascorePayload } from './sofascoreTransformer';

/**
 * Intelligent Sofascore Service Adapter.
 * Integrates direct Sofascore API fetching, official JSON payload imports,
 * and high-fidelity tactical scouting report processing.
 */
export class MockSofascoreAdapter implements ISofascoreService {
  private matches: Map<string, MatchDetails> = new Map();

  constructor() {
    // Clean initial state: no sample matches
  }

  /**
   * Imports raw Sofascore JSON (lineups, event, or both) and transforms into full MatchDetails
   */
  async importSofascorePayload(
    payloadOrJsonString: string | any,
    urlOrTeams?: string,
    fallbackHome?: string,
    fallbackAway?: string
  ): Promise<MatchDetails> {
    let parsedData = payloadOrJsonString;
    if (typeof payloadOrJsonString === 'string') {
      try {
        parsedData = JSON.parse(payloadOrJsonString);
      } catch (err) {
        throw new Error('El texto ingresado no es un JSON válido de Sofascore.');
      }
    }

    const matchDetails = transformSofascorePayload(parsedData, urlOrTeams, fallbackHome, fallbackAway);
    this.matches.set(matchDetails.id, matchDetails);
    return JSON.parse(JSON.stringify(matchDetails));
  }

  parseUrl(url: string): { valid: boolean; matchId?: string; normalizedUrl?: string; slug?: string; provider?: string; extractedId?: string } {
    const parsed = parseFootballUrl(url);
    
    // Check regex pattern: /(?:#(?:id:)?|\/event\/)(\d+)/i
    const directIdMatch = url.match(/(?:#(?:id:)?|\/event\/)(\d+)/i) || url.match(/[#&?]id:?([0-9]+)/i);
    const extractedId = directIdMatch ? directIdMatch[1] : parsed.extractedId;

    if (!parsed.valid && !extractedId) {
      return { valid: false };
    }

    let matchId = parsed.matchId;
    if (extractedId) {
      matchId = `sofascore-${extractedId}`;
    }

    return {
      valid: true,
      matchId,
      normalizedUrl: parsed.normalizedUrl || url,
      slug: parsed.slug,
      provider: parsed.provider,
      extractedId
    };
  }

  async getMatchFromUrl(url: string, onProgress?: (step: string) => void): Promise<MatchDetails> {
    const parsed = this.parseUrl(url);

    if (!parsed.valid) {
      throw new Error('URL inválida o formato no reconocido de Sofascore');
    }

    // Extract event ID if present in url
    const directIdMatch = url.match(/(?:#(?:id:)?|\/event\/)(\d+)/i) || url.match(/[#&?]id:?([0-9]+)/i);
    const eventId = directIdMatch ? directIdMatch[1] : parsed.extractedId;

    // Step 1: Analizando partido...
    onProgress?.('Analizando partido en Sofascore...');
    await new Promise((res) => setTimeout(res, 200));

    const matchId = parsed.matchId || (eventId ? `sofascore-${eventId}` : `sofascore-${parsed.slug}`);

    // 1. If match already cached in memory, return it
    if (this.matches.has(matchId)) {
      onProgress?.('Cargando estadísticas oficiales y alineaciones...');
      await new Promise((res) => setTimeout(res, 200));
      return JSON.parse(JSON.stringify(this.matches.get(matchId)!));
    }

    // 2. Automated Server-side Gateway & AI Proxy (/api/sofascore/event/:id or /api/sofascore/analyze)
    try {
      onProgress?.('Conectando con el servidor de análisis y estadísticas...');
      
      const scraperKey = typeof window !== 'undefined' ? localStorage.getItem('sofascore_scraper_key') || undefined : undefined;
      const scraperProvider = typeof window !== 'undefined' ? localStorage.getItem('sofascore_proxy_provider') || 'scraperapi' : 'scraperapi';
      const customProxy = typeof window !== 'undefined' ? localStorage.getItem('sofascore_custom_proxy') || undefined : undefined;

      const proxyHeaders: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (scraperKey) proxyHeaders['X-Scraper-Key'] = scraperKey;
      if (scraperProvider) proxyHeaders['X-Scraper-Provider'] = scraperProvider;
      if (customProxy) proxyHeaders['X-Custom-Proxy'] = customProxy;

      let apiJson: any = null;

      // Try GET /api/sofascore/event/:eventId if ID exists
      if (eventId) {
        try {
          const serverApiRes = await fetch(`/api/sofascore/event/${eventId}`, {
            headers: proxyHeaders,
            signal: AbortSignal.timeout(18000)
          });
          if (serverApiRes.ok) {
            apiJson = await serverApiRes.json();
          }
        } catch (e) {
          console.warn('Server event endpoint retry:', e);
        }
      }

      // If still no apiJson or no eventId, use POST /api/sofascore/analyze
      if (!apiJson || (!apiJson.lineups && !apiJson.homeTeam)) {
        onProgress?.('Extrayendo formaciones tácticas y mapas de calor...');
        const analyzeRes = await fetch('/api/sofascore/analyze', {
          method: 'POST',
          headers: { ...proxyHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url, 
            query: parsed.slug || url, 
            eventId,
            apiKey: scraperKey,
            provider: scraperProvider,
            customUrl: customProxy
          }),
          signal: AbortSignal.timeout(20000)
        });

        if (analyzeRes.ok) {
          apiJson = await analyzeRes.json();
        }
      }

      if (apiJson && (apiJson.lineups || apiJson.homeTeam || apiJson.event)) {
        onProgress?.('Procesando valoraciones y coordenadas del terreno de juego...');
        const matchFromApi = transformSofascorePayload(
          {
            event: apiJson.event || (apiJson.homeTeam ? apiJson : null),
            lineups: apiJson.lineups || apiJson,
            incidents: apiJson.incidents || []
          },
          url
        );

        this.matches.set(matchId, matchFromApi);
        if (eventId) this.matches.set(`sofascore-${eventId}`, matchFromApi);
        return JSON.parse(JSON.stringify(matchFromApi));
      }
    } catch (err) {
      console.warn('Error connecting to backend gateway:', err);
    }

    // 3. Client-side Local Proxy Fallback (e.g. localhost:8010)
    if (eventId) {
      const customProxy = typeof window !== 'undefined' ? (localStorage.getItem('sofascore_custom_proxy') || 'http://localhost:8010') : 'http://localhost:8010';
      const localHosts = [customProxy, 'http://localhost:8010', 'http://127.0.0.1:8010'].filter((v, i, a) => a.indexOf(v) === i);

      for (const localHost of localHosts) {
        try {
          const cleanHost = localHost.replace(/\/+$/, '');
          const [eventRes, lineupsRes, incidentsRes] = await Promise.all([
            fetch(`${cleanHost}/api/v1/event/${eventId}`, { signal: AbortSignal.timeout(2000) }).catch(() => null),
            fetch(`${cleanHost}/api/v1/event/${eventId}/lineups`, { signal: AbortSignal.timeout(2000) }).catch(() => null),
            fetch(`${cleanHost}/api/v1/event/${eventId}/incidents`, { signal: AbortSignal.timeout(2000) }).catch(() => null)
          ]);

          if (lineupsRes && lineupsRes.ok) {
            const lineupsData = await lineupsRes.json();
            const eventData = (eventRes && eventRes.ok) ? await eventRes.json() : null;
            const incidentsData = (incidentsRes && incidentsRes.ok) ? await incidentsRes.json() : null;
            if (lineupsData && (lineupsData.home?.players || lineupsData.away?.players)) {
              const matchFromApi = transformSofascorePayload(
                {
                  event: eventData?.event || eventData,
                  lineups: lineupsData,
                  incidents: incidentsData?.incidents || incidentsData
                },
                url
              );
              this.matches.set(matchId, matchFromApi);
              return JSON.parse(JSON.stringify(matchFromApi));
            }
          }
        } catch {
          // ignore
        }
      }
    }

    throw new Error(
      `No se pudo cargar el partido. Verificá que la URL o el ID del partido sean válidos.`
    );
  }

  async getMatchDetails(matchId: string): Promise<MatchDetails> {
    await new Promise((res) => setTimeout(res, 50));

    // Check direct key
    if (this.matches.has(matchId)) {
      return JSON.parse(JSON.stringify(this.matches.get(matchId)!));
    }

    // Check prefixed key
    const prefixedKey = `sofascore-${matchId}`;
    if (this.matches.has(prefixedKey)) {
      return JSON.parse(JSON.stringify(this.matches.get(prefixedKey)!));
    }

    // Check stripped key
    const strippedKey = matchId.replace(/^sofascore-/, '');
    if (this.matches.has(strippedKey)) {
      return JSON.parse(JSON.stringify(this.matches.get(strippedKey)!));
    }

    // Attempt re-fetch if matchId contains a numeric Sofascore event ID
    const extractedNum = matchId.match(/(\d+)/)?.[1];
    if (extractedNum) {
      try {
        const reFetched = await this.getMatchFromUrl(`https://www.sofascore.com/event/${extractedNum}`);
        if (reFetched) return reFetched;
      } catch {
        // Ignore fallback error
      }
    }

    throw new Error(`No se encontraron detalles para el partido ${matchId}.`);
  }

  async getLineups(matchId: string): Promise<{ homeStarters: Player[]; homeSubs: Player[]; awayStarters: Player[]; awaySubs: Player[] }> {
    const match = await this.getMatchDetails(matchId);
    return {
      homeStarters: match.homeTeam.starters,
      homeSubs: match.homeTeam.substitutes,
      awayStarters: match.awayTeam.starters,
      awaySubs: match.awayTeam.substitutes,
    };
  }

  async getPlayerStatistics(matchId: string, playerId: string): Promise<PlayerStatistics | null> {
    const match = await this.getMatchDetails(matchId);
    const allPlayers = [
      ...match.homeTeam.starters,
      ...match.homeTeam.substitutes,
      ...match.awayTeam.starters,
      ...match.awayTeam.substitutes,
    ];
    const player = allPlayers.find((p) => p.id === playerId);
    return player?.statistics || null;
  }

  async getMatchEvents(matchId: string): Promise<MatchEvent[]> {
    const match = await this.getMatchDetails(matchId);
    return match.events;
  }

  async getPlayerHeatmap(matchId: string, playerId: string): Promise<HeatmapPoint[]> {
    const match = await this.getMatchDetails(matchId);
    const allPlayers = [
      ...match.homeTeam.starters,
      ...match.homeTeam.substitutes,
      ...match.awayTeam.starters,
      ...match.awayTeam.substitutes,
    ];
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player || player.minutesPlayed === 0) return [];
    if (player.heatmapPoints && player.heatmapPoints.length > 0) {
      return player.heatmapPoints;
    }

    // Try fetching real heatmap on-demand from server backend proxy
    const rawEventId = matchId.replace(/^sofascore-/, '');
    if (/^\d+$/.test(rawEventId)) {
      try {
        const hmRes = await fetch(`/api/sofascore/event/${rawEventId}/player/${playerId}/heatmap`);
        if (hmRes.ok) {
          const hmData = await hmRes.json();
          const rawPoints = Array.isArray(hmData.heatmap) ? hmData.heatmap : Array.isArray(hmData.points) ? hmData.points : Array.isArray(hmData) ? hmData : [];
          const normalized: HeatmapPoint[] = rawPoints.map((pt: any) => {
            let x = typeof pt.x === 'number' ? pt.x : parseFloat(pt.x) || 0;
            let y = typeof pt.y === 'number' ? pt.y : parseFloat(pt.y) || 0;
            const count = typeof pt.count === 'number' ? pt.count : typeof pt.value === 'number' ? pt.value : 1;
            if (x <= 1 && y <= 1 && (x > 0 || y > 0)) {
              x = Math.round(x * 1000) / 10;
              y = Math.round(y * 1000) / 10;
            }
            return { x, y, count };
          });
          player.heatmapPoints = normalized;
          return normalized;
        }
      } catch {
        // ignore
      }
    }

    return player.heatmapPoints || [];
  }
}

/**
 * Service Factory / Singleton instance
 * In production with a real API or backend proxy, replace MockSofascoreAdapter with HttpSofascoreAdapter
 */
export const sofascoreService: ISofascoreService = new MockSofascoreAdapter();
