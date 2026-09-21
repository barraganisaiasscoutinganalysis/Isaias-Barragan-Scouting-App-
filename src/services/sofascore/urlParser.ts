export interface ParsedMatchUrl {
  valid: boolean;
  provider: 'sofascore' | 'fotmob' | 'besoccer' | 'direct';
  matchId: string;
  slug: string;
  homeSlug: string;
  awaySlug: string;
  extractedId?: string;
  normalizedUrl: string;
}

const ROUTE_TOKENS_TO_IGNORE = new Set([
  'es', 'en', 'pt', 'fr', 'de', 'it', 'ru', 'tr', 'ar',
  'football', 'futbol', 'futebol', 'soccer', 'calcio', 'fussball',
  'partido', 'partidos', 'match', 'matches', 'partida', 'partita', 'spiel', 'spiele',
  'tournament', 'torneo', 'team', 'equipo', 'api', 'event', 'events'
]);

const KNOWN_PREFIX_TEAMS = [
  'real-madrid', 'manchester-city', 'manchester-united', 'atletico-madrid',
  'borussia-dortmund', 'bayern-munchen', 'bayern-munich', 'bayer-leverkusen',
  'boca-juniors', 'river-plate', 'racing-club', 'san-lorenzo',
  'celta-vigo', 'real-sociedad', 'athletic-club', 'rayo-vallecano', 'deportivo-alaves',
  'aston-villa', 'crystal-palace', 'west-ham', 'nottingham-forest', 'wolverhampton-wanderers',
  'paris-saint-germain', 'inter-miami', 'newcastle-united', 'sheffield-united',
  'sporting-cp'
];

export function parseFootballUrl(rawInput: string): ParsedMatchUrl {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, provider: 'direct', matchId: '', slug: '', homeSlug: '', awaySlug: '', normalizedUrl: '' };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, provider: 'direct', matchId: '', slug: '', homeSlug: '', awaySlug: '', normalizedUrl: '' };
  }

  let provider: 'sofascore' | 'fotmob' | 'besoccer' | 'direct' = 'direct';
  let extractedId: string | undefined;

  // 1. Detect platform provider
  if (/sofascore\.com/i.test(trimmed)) {
    provider = 'sofascore';
  } else if (/fotmob\.com/i.test(trimmed)) {
    provider = 'fotmob';
  } else if (/besoccer\.com/i.test(trimmed)) {
    provider = 'besoccer';
  }

  // 2. Extract match ID if present in query, hash or trailing numeric segment
  const idMatch =
    trimmed.match(/[#&?]id:?([0-9]+)/i) ||
    trimmed.match(/[\/&#?]id:?([0-9]+)/i) ||
    trimmed.match(/\/match\/([0-9]+)/i) ||
    trimmed.match(/#([0-9]{5,})/);

  if (idMatch) {
    extractedId = idMatch[1];
  }

  let homeSlug = '';
  let awaySlug = '';
  let slug = '';

  // 3. Handle free text queries: e.g. "Arsenal vs Chelsea" or "Boca Juniors - River Plate"
  if (!trimmed.startsWith('http') && (trimmed.toLowerCase().includes(' vs ') || trimmed.toLowerCase().includes(' vs. ') || trimmed.includes(' - '))) {
    const parts = trimmed.split(/\s+vs\.?\s+|\s+-\s+/i);
    if (parts.length >= 2) {
      homeSlug = parts[0].trim().toLowerCase().replace(/\s+/g, '-');
      awaySlug = parts[1].trim().toLowerCase().replace(/\s+/g, '-');
      slug = `${homeSlug}-vs-${awaySlug}`;
      const matchId = `direct-${slug}`;
      return {
        valid: true,
        provider: 'direct',
        matchId,
        slug,
        homeSlug,
        awaySlug,
        extractedId,
        normalizedUrl: trimmed
      };
    }
  }

  // 4. Handle BeSoccer format: /partido/real-madrid/manchester-city-fc/202422731
  if (provider === 'besoccer') {
    const besoccerMatch = trimmed.match(/partido\/([^/]+)\/([^/]+)(?:\/([0-9]+))?/i);
    if (besoccerMatch) {
      homeSlug = besoccerMatch[1].replace(/-(fc|cf)$/i, '').toLowerCase();
      awaySlug = besoccerMatch[2].replace(/-(fc|cf)$/i, '').toLowerCase();
      if (!extractedId && besoccerMatch[3]) {
        extractedId = besoccerMatch[3];
      }
      slug = `${homeSlug}-vs-${awaySlug}`;
      const matchId = extractedId ? `besoccer-${extractedId}` : `besoccer-${slug}`;
      return {
        valid: true,
        provider,
        matchId,
        slug,
        homeSlug,
        awaySlug,
        extractedId,
        normalizedUrl: trimmed
      };
    }
  }

  // 5. Handle FotMob format: /matches/arsenal-vs-chelsea/2v3b4c#4193859
  if (provider === 'fotmob') {
    const fotmobVsMatch = trimmed.match(/([a-z0-9-]+)-vs-([a-z0-9-]+)/i);
    if (fotmobVsMatch) {
      homeSlug = fotmobVsMatch[1].replace(/-(fc|cf)$/i, '').toLowerCase();
      awaySlug = fotmobVsMatch[2].split('/')[0].split('#')[0].replace(/-(fc|cf)$/i, '').toLowerCase();
      slug = `${homeSlug}-vs-${awaySlug}`;
      const matchId = extractedId ? `fotmob-${extractedId}` : `fotmob-${slug}`;
      return {
        valid: true,
        provider,
        matchId,
        slug,
        homeSlug,
        awaySlug,
        extractedId,
        normalizedUrl: trimmed
      };
    }
  }

  // 6. Universal Sofascore & generic URL parser
  let path = trimmed.replace(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?\/?/i, '');
  path = path.replace(/[#?].*$/, '');

  const segments = path.split('/').filter(Boolean);
  const meaningfulSegments = segments.filter((seg) => !ROUTE_TOKENS_TO_IGNORE.has(seg.toLowerCase()));

  // Search for the match slug segment containing hyphens
  let foundSlug = '';
  for (const seg of meaningfulSegments) {
    // Skip random 6-8 char base62 hashes like 'RobsXob' or 'Egbshnb' without hyphens
    if (/^[A-Za-z0-9]{6,8}$/.test(seg) && !seg.includes('-')) continue;
    // Skip purely numeric IDs
    if (/^[0-9]+$/.test(seg)) continue;

    if (seg.includes('-vs-') || seg.includes('-')) {
      foundSlug = seg;
      break;
    }
  }

  if (!foundSlug && meaningfulSegments.length > 0) {
    foundSlug = meaningfulSegments[0];
  }

  if (foundSlug) {
    slug = foundSlug.toLowerCase();
    if (slug.includes('-vs-')) {
      const split = slug.split('-vs-');
      homeSlug = split[0].replace(/-(fc|cf)$/i, '');
      awaySlug = split[1].replace(/-(fc|cf)$/i, '');
    } else {
      // Check multi-word team prefixes
      let foundHome = '';
      for (const prefix of KNOWN_PREFIX_TEAMS) {
        if (slug.startsWith(prefix + '-')) {
          foundHome = prefix;
          break;
        }
      }
      if (foundHome) {
        homeSlug = foundHome;
        awaySlug = slug.slice(foundHome.length + 1).replace(/-(fc|cf)$/i, '');
      } else {
        const words = slug.split('-');
        const mid = Math.floor(words.length / 2);
        homeSlug = words.slice(0, Math.max(1, mid)).join('-').replace(/-(fc|cf)$/i, '');
        awaySlug = words.slice(Math.max(1, mid)).join('-').replace(/-(fc|cf)$/i, '');
      }
    }
  } else {
    slug = trimmed.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }

  const matchId = extractedId
    ? `${provider}-${extractedId}`
    : `${provider}-${slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;

  return {
    valid: slug.length > 2,
    provider,
    matchId,
    slug,
    homeSlug,
    awaySlug,
    extractedId,
    normalizedUrl: trimmed
  };
}

export function formatTeamNameFromSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
