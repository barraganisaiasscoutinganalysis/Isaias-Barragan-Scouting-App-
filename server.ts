import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { resolveMatchWithAI, generateRealisticHeatmapForPosition, enrichPlayersWithRealData } from './src/server/geminiResolver';
import { analyzeLineupImages } from './src/server/imageLineupAnalyzer';
import { searchEscudoteca, extractBadgesFromWebpage } from './src/server/escudotecaService';

const PORT = 3000;

// Temporary memory store for 1-Click Bookmarklet clips
const clippedMatchesMap = new Map<string, { data: any; timestamp: number }>();

// Cleanup clips older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of clippedMatchesMap.entries()) {
    if (now - value.timestamp > 30 * 60 * 1000) {
      clippedMatchesMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Multi-provider Residential & Scraping Proxy Fetcher
 */
async function fetchWithResidentialProxy(
  targetUrl: string,
  options: {
    apiKey?: string;
    provider?: 'scraperapi' | 'scrapingant' | 'custom' | 'public';
    customUrl?: string;
  } = {}
): Promise<any | null> {
  const apiKey = options.apiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPINGANT_API_KEY;
  const provider = options.provider || (process.env.SCRAPINGANT_API_KEY ? 'scrapingant' : apiKey ? 'scraperapi' : 'public');

  // 1. ScraperAPI (Rotating Residential IPs)
  if (provider === 'scraperapi' && apiKey) {
    try {
      const proxyEndpoint = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&keep_headers=true`;
      const resp = await fetch(proxyEndpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Referer': 'https://www.sofascore.com/',
          'Origin': 'https://www.sofascore.com'
        },
        signal: AbortSignal.timeout(18000)
      });
      if (resp.ok) {
        const text = await resp.text();
        try {
          return JSON.parse(text);
        } catch {
          console.warn('ScraperAPI returned non-JSON text');
        }
      }
    } catch (e) {
      console.warn('ScraperAPI fetch failed:', e);
    }
  }

  // 2. ScrapingAnt (Residential proxy)
  if (provider === 'scrapingant' && apiKey) {
    try {
      const proxyEndpoint = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(targetUrl)}&x-api-key=${apiKey}&browser=false`;
      const resp = await fetch(proxyEndpoint, { signal: AbortSignal.timeout(12000) });
      if (resp.ok) {
        const text = await resp.text();
        return JSON.parse(text);
      }
    } catch (e) {
      console.warn('ScrapingAnt fetch failed:', e);
    }
  }

  // 3. Custom Proxy (e.g. localhost:8010 or self-hosted proxy)
  if (provider === 'custom' && options.customUrl) {
    try {
      const cleanCustom = options.customUrl.replace(/\/+$/, '');
      const pathSuffix = targetUrl.replace(/^https?:\/\/(?:www\.)?sofascore\.com/, '');
      const resp = await fetch(`${cleanCustom}${pathSuffix}`, { signal: AbortSignal.timeout(6000) });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Custom proxy fetch failed:', e);
    }
  }

  // 4. Public Web Proxy Rotator (CORS & IP Rotators)
  const publicProxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${targetUrl}`
  ];

  for (const proxy of publicProxies) {
    try {
      const resp = await fetch(proxy, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.lineups || data.event || data.home || data.players || data.heatmap || data.points || Array.isArray(data))) {
          return data;
        }
      }
    } catch {
      // try next
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  // Lineup analysis from images using Gemini Vision
  app.post('/api/analyze-lineup-images', async (req, res) => {
    try {
      const { homeImage, awayImage, matchContext } = req.body || {};
      if (!homeImage?.data && !awayImage?.data) {
        return res.status(400).json({ error: 'Debes proporcionar al menos una imagen (Local o Visitante).' });
      }
      const result = await analyzeLineupImages(homeImage, awayImage, matchContext);
      return res.json(result);
    } catch (err: any) {
      console.error('Error analyzing lineup images:', err);
      return res.status(500).json({ error: err?.message || 'Error al analizar las imágenes de las formaciones' });
    }
  });

  const SOFASCORE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': 'https://www.sofascore.com/',
    'Origin': 'https://www.sofascore.com',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Save custom SVG logo permanently to source code
  app.post('/api/save-logo', (req, res) => {
    try {
      const { svg } = req.body;
      if (!svg || typeof svg !== 'string') {
        return res.status(400).json({ error: 'SVG invalido' });
      }
      fs.writeFileSync(path.join(process.cwd(), 'src/assets/logo.svg'), svg, 'utf-8');
      if (fs.existsSync(path.join(process.cwd(), 'public'))) {
        fs.writeFileSync(path.join(process.cwd(), 'public/logo.svg'), svg, 'utf-8');
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error saving logo:', err);
      return res.status(500).json({ error: err.message || 'Error guardando logo' });
    }
  });

  // 2. 1-Click Bookmarklet Clipper Endpoints
  app.post('/api/sofascore/clip', (req, res) => {
    try {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ error: 'Payload vacío' });
      }
      const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      clippedMatchesMap.set(clipId, {
        data: payload,
        timestamp: Date.now()
      });
      return res.json({ success: true, clipId, message: 'Partido recibido exitosamente' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error guardando clip' });
    }
  });

  app.get('/api/sofascore/clip/:clipId', (req, res) => {
    const { clipId } = req.params;
    const clip = clippedMatchesMap.get(clipId);
    if (!clip) {
      return res.status(404).json({ error: 'Clip no encontrado o expirado' });
    }
    return res.json(clip.data);
  });

  // 3. Sofascore Image Proxy for Team Logos
  app.get('/api/sofascore/image/team/:teamId', async (req, res) => {
    const { teamId } = req.params;
    try {
      const urls = [
        `https://api.sofascore.com/api/v1/team/${teamId}/image`,
        `https://img.sofascore.com/api/v1/team/${teamId}/image`
      ];
      for (const targetUrl of urls) {
        const resp = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.sofascore.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || 'image/png';
          const buffer = Buffer.from(await resp.arrayBuffer());
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buffer);
        }
      }
      // Fallback SVG Crest
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="#1E293B"/><path d="M50 18 L80 32 L80 60 C80 75 50 86 50 86 C50 86 20 75 20 60 L20 32 Z" fill="#3B82F6" opacity="0.85"/><circle cx="50" cy="50" r="14" fill="#FFFFFF" opacity="0.9"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(svg);
    } catch (e) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="#1E293B"/><circle cx="50" cy="50" r="20" fill="#64748B"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }
  });

  // 4. Sofascore Image Proxy for Player Photos
  app.get('/api/sofascore/image/player/:playerId', async (req, res) => {
    const { playerId } = req.params;
    try {
      const urls = [
        `https://api.sofascore.com/api/v1/player/${playerId}/image`,
        `https://img.sofascore.com/api/v1/player/${playerId}/image`
      ];
      for (const targetUrl of urls) {
        const resp = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.sofascore.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || 'image/png';
          const buffer = Buffer.from(await resp.arrayBuffer());
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buffer);
        }
      }
      // Fallback SVG Player Silhouette
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="#1E293B"/><circle cx="50" cy="38" r="18" fill="#94A3B8"/><path d="M22 88 C22 68 35 62 50 62 C65 62 78 68 78 88 Z" fill="#94A3B8"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(svg);
    } catch (e) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="#1E293B"/><circle cx="50" cy="38" r="18" fill="#64748B"/><path d="M22 88 C22 68 35 62 50 62 C65 62 78 68 78 88 Z" fill="#64748B"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }
  });

  // --- Escudoteca Paladar Negro & Badge Endpoints ---
  app.get('/api/escudoteca/search', (req, res) => {
    const query = (req.query.q || req.query.team || '').toString();
    const results = searchEscudoteca(query, 16);
    return res.json({
      query,
      count: results.length,
      results,
    });
  });

  app.post('/api/escudoteca/extract', async (req, res) => {
    try {
      const { url, team } = req.body || {};
      if (!url) {
        return res.status(400).json({ error: 'Debes proporcionar la URL de la página externa a consultar.' });
      }
      const data = await extractBadgesFromWebpage(url, team);
      return res.json(data);
    } catch (err: any) {
      console.error('Error in /api/escudoteca/extract:', err);
      return res.status(500).json({ error: err?.message || 'Error extrayendo escudos de la página externa' });
    }
  });

  app.get('/api/badge-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url param');
    }
    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || 'image/png';
        const buffer = Buffer.from(await resp.arrayBuffer());
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800');
        return res.send(buffer);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="#1E293B"/><path d="M50 18 L80 32 L80 60 C80 75 50 86 50 86 C50 86 20 75 20 60 L20 32 Z" fill="#3B82F6" opacity="0.85"/><circle cx="50" cy="50" r="14" fill="#FFFFFF" opacity="0.9"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    } catch {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="#1E293B"/><circle cx="50" cy="50" r="20" fill="#64748B"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }
  });

  // 5. Test Proxy Connection Endpoint
  app.get('/api/sofascore/config-status', (_req, res) => {
    const hasServerKey = Boolean(process.env.SCRAPER_API_KEY || process.env.SCRAPINGANT_API_KEY);
    const provider = process.env.SCRAPINGANT_API_KEY ? 'scrapingant' : process.env.SCRAPER_API_KEY ? 'scraperapi' : 'none';
    return res.json({ hasServerKey, provider });
  });

  app.post('/api/sofascore/test-proxy', async (req, res) => {
    const { apiKey, provider, customUrl } = req.body || {};
    try {
      const testUrl = 'https://www.sofascore.com/api/v1/event/16924719/lineups';
      const result = await fetchWithResidentialProxy(testUrl, { apiKey, provider, customUrl });
      if (result && (result.home || result.lineups || result.players)) {
        return res.json({ success: true, message: 'Proxy residencial operativo y conectado con Sofascore' });
      }
      return res.status(400).json({ success: false, error: 'El proxy no pudo obtener respuesta válida de Sofascore' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error probando el proxy' });
    }
  });

  // 4. Fetch Sofascore Player Heatmap
  app.get('/api/sofascore/event/:eventId/player/:playerId/heatmap', async (req, res) => {
    const { eventId, playerId } = req.params;
    const scraperKey = (req.headers['x-scraper-key'] as string) || undefined;
    const scraperProvider = (req.headers['x-scraper-provider'] as any) || undefined;
    const customProxy = (req.headers['x-custom-proxy'] as string) || undefined;

    try {
      const targetUrl = `https://www.sofascore.com/api/v1/event/${eventId}/player/${playerId}/heatmap`;
      const proxyData = await fetchWithResidentialProxy(targetUrl, {
        apiKey: scraperKey,
        provider: scraperProvider,
        customUrl: customProxy
      });

      if (proxyData) {
        return res.json(proxyData);
      }

      // Realistic positional heatmap fallback
      const fallbackHeatmap = generateRealisticHeatmapForPosition('M', true);
      return res.json({ heatmap: fallbackHeatmap });
    } catch (err: any) {
      const fallbackHeatmap = generateRealisticHeatmapForPosition('M', true);
      return res.json({ heatmap: fallbackHeatmap });
    }
  });

  // 5. Main Sofascore Match Endpoint (Event + Lineups + Incidents + Heatmaps)
  app.get('/api/sofascore/event/:eventId', async (req, res) => {
    const { eventId } = req.params;
    if (!eventId || !/^\d+$/.test(eventId)) {
      return res.status(400).json({ error: 'ID de evento inválido' });
    }

    const scraperKey = (req.headers['x-scraper-key'] as string) || undefined;
    const scraperProvider = (req.headers['x-scraper-provider'] as any) || undefined;
    const customProxy = (req.headers['x-custom-proxy'] as string) || undefined;

    try {
      // 1. Try fetching with residential scraper proxy
      const lineupsUrl = `https://www.sofascore.com/api/v1/event/${eventId}/lineups`;
      const eventUrl = `https://www.sofascore.com/api/v1/event/${eventId}`;
      const incidentsUrl = `https://www.sofascore.com/api/v1/event/${eventId}/incidents`;

      const [lineupsData, eventData, incidentsData] = await Promise.all([
        fetchWithResidentialProxy(lineupsUrl, { apiKey: scraperKey, provider: scraperProvider, customUrl: customProxy }),
        fetchWithResidentialProxy(eventUrl, { apiKey: scraperKey, provider: scraperProvider, customUrl: customProxy }),
        fetchWithResidentialProxy(incidentsUrl, { apiKey: scraperKey, provider: scraperProvider, customUrl: customProxy })
      ]);

      if (lineupsData && (lineupsData.home?.players || lineupsData.away?.players)) {
        const homeTeamName = eventData?.event?.homeTeam?.name || eventData?.homeTeam?.name || 'Local';
        const awayTeamName = eventData?.event?.awayTeam?.name || eventData?.awayTeam?.name || 'Visitante';
        
        try {
          const enriched = await enrichPlayersWithRealData(
            homeTeamName,
            awayTeamName,
            lineupsData.home?.players || [],
            lineupsData.away?.players || []
          );
          if (lineupsData.home) lineupsData.home.players = enriched.enrichedHome;
          if (lineupsData.away) lineupsData.away.players = enriched.enrichedAway;
        } catch (enrichErr) {
          console.warn('Silent fallback on enrichment error:', enrichErr);
        }

        return res.json({
          event: eventData?.event || eventData || null,
          lineups: lineupsData,
          incidents: incidentsData?.incidents || incidentsData || null
        });
      }

      // 2. If blocked or unavailable, trigger intelligent AI & procedural resolution
      console.log(`Direct fetch for event #${eventId} blocked. Resolving via AI Gateway...`);
      const aiPayload = await resolveMatchWithAI(`Sofascore Event ID #${eventId}`, eventId);
      return res.json(aiPayload);
    } catch (error: any) {
      console.error(`Error resolving Sofascore event #${eventId}:`, error);
      try {
        const fallback = await resolveMatchWithAI(`Sofascore Event ID #${eventId}`, eventId);
        return res.json(fallback);
      } catch (aiErr: any) {
        return res.status(500).json({ error: aiErr?.message || 'Error del servidor al procesar el partido' });
      }
    }
  });

  // 6. General Analyze Endpoint (handles URLs, query strings, match slugs)
  app.post('/api/sofascore/analyze', async (req, res) => {
    const { url, query, eventId, apiKey, provider, customUrl } = req.body || {};
    const target = url || query || `Event #${eventId}`;

    if (!target) {
      return res.status(400).json({ error: 'Se requiere una URL o consulta del partido' });
    }

    try {
      // If event ID is present, try residential proxy fetch first
      const rawId = eventId || (url ? (url.match(/(?:#(?:id:)?|\/event\/)(\d+)/i) || url.match(/[#&?]id:?([0-9]+)/i))?.[1] : null);
      if (rawId && /^\d+$/.test(rawId)) {
        try {
          const sofaUrl = `https://www.sofascore.com/api/v1/event/${rawId}/lineups`;
          const eventUrl = `https://www.sofascore.com/api/v1/event/${rawId}`;
          const incidentsUrl = `https://www.sofascore.com/api/v1/event/${rawId}/incidents`;

          const [lineups, eventData, incidentsData] = await Promise.all([
            fetchWithResidentialProxy(sofaUrl, { apiKey, provider, customUrl }),
            fetchWithResidentialProxy(eventUrl, { apiKey, provider, customUrl }),
            fetchWithResidentialProxy(incidentsUrl, { apiKey, provider, customUrl })
          ]);

          if (lineups && (lineups.home?.players || lineups.away?.players)) {
            return res.json({
              event: eventData?.event || eventData || { id: parseInt(rawId, 10) },
              lineups,
              incidents: incidentsData?.incidents || incidentsData || []
            });
          }
        } catch {
          // fallback to AI
        }
      }

      const matchData = await resolveMatchWithAI(target, rawId);
      return res.json(matchData);
    } catch (err: any) {
      console.error('Error in /api/sofascore/analyze:', err);
      return res.status(500).json({ error: err?.message || 'Error analizando el partido' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scouting Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
