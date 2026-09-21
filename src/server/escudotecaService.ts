import fs from 'fs';
import path from 'path';

export interface EscudotecaClub {
  slug: string;
  name: string;
  league: string;
  pageUrl: string;
  badgeUrl: string;
  proxiedUrl: string;
  score?: number;
}

// Special dictionary for common Argentine and international club slugs to display names
const KNOWN_CLUB_NAMES: Record<string, string> = {
  camioneros: 'Deportivo Camioneros',
  boca: 'Boca Juniors',
  boca_2026: 'Boca Juniors (2026)',
  river: 'River Plate',
  racing: 'Racing Club',
  independiente: 'Independiente',
  sanlorenzo: 'San Lorenzo',
  huracan: 'Huracán',
  velez: 'Vélez Sarsfield',
  estudiantes: 'Estudiantes de La Plata',
  estudiantesrc: 'Estudiantes de Río Cuarto',
  gimnasia: 'Gimnasia y Esgrima La Plata',
  gimnasiamendoza: 'Gimnasia y Esgrima de Mendoza',
  gimnasiaytiro: 'Gimnasia y Tiro de Salta',
  rosariocentral: 'Rosario Central',
  newells: "Newell's Old Boys",
  talleres: 'Talleres de Córdoba',
  belgrano: 'Belgrano de Córdoba',
  instituto: 'Instituto de Córdoba',
  lanus: 'Lanús',
  banfield: 'Banfield',
  platense: 'Platense',
  argentinos: 'Argentinos Juniors',
  defensa: 'Defensa y Justicia',
  centralcordoba: 'Central Córdoba (SdE)',
  tigre: 'Tigre',
  barracas: 'Barracas Central',
  riestra: 'Deportivo Riestra',
  union: 'Unión de Santa Fe',
  sarmiento: 'Sarmiento de Junín',
  aldosivi: 'Aldosivi',
  almirante: 'Almirante Brown',
  allboys: 'All Boys',
  almagro: 'Almagro',
  arsenal: 'Arsenal de Sarandí',
  atlanta: 'Atlanta',
  atleticotucuman: 'Atlético Tucumán',
  atleticorafaela: 'Atlético de Rafaela',
  chacarita: 'Chacarita Juniors',
  chacofor_ever: 'Chaco For Ever',
  quilmes: 'Quilmes',
  ferro: 'Ferro Carril Oeste',
  moron: 'Deportivo Morón',
  temperley: 'Temperley',
  nueva_chicago: 'Nueva Chicago',
  sanmartinsj: 'San Martín de San Juan',
  sanmartintuc: 'San Martín de Tucumán',
  deportivomaipu: 'Deportivo Maipú',
  brownadrogue: 'Brown de Adrogué',
  brown_madryn: 'Guillermo Brown (P. Madryn)',
  deportivomadryn: 'Deportivo Madryn',
  argentinomerlo: 'Argentino de Merlo',
  argquilmes: 'Argentino de Quilmes',
  flandria: 'Flandria',
  sacachispas: 'Sacachispas',
  comunicaciones: 'Comunicaciones',
  villadalmine: 'Villa Dálmine',
  acassuso: 'Acassuso',
  sanmiguel: 'San Miguel',
  losandes: 'Los Andes',
  colegiales: 'Colegiales',
  talleres_re: 'Talleres de Remedios de Escalada',
  excursionistas: 'Excursionistas',
  defensores_belgrano: 'Defensores de Belgrano',
  defensores_unidos: 'Defensores Unidos (CADU)',
  dock_sud: 'Dock Sud',
  ituzaingo: 'Ituzaingó',
  laferrere: 'Deportivo Laferrere',
  merlo: 'Deportivo Merlo',
  tristan_suarez: 'Tristán Suárez',
  uai_urquiza: 'UAI Urquiza',
  villa_san_carlos: 'Villa San Carlos',
  sanmartin_burzaco: 'San Martín de Burzaco',
  argentinorosario: 'Argentino de Rosario',
  berazategui: 'Berazategui',
  atlas: 'Atlas',
  canuelas: 'Cañuelas',
  claypole: 'Claypole',
  deportivo_espanol: 'Deportivo Español',
  elporvenir: 'El Porvenir',
  general_lamadrid: 'General Lamadrid',
  jjurquiza: 'J.J. Urquiza',
  justo_jose_urquiza: 'J.J. Urquiza',
  leandro_n_alem: 'Leandro N. Alem',
  lujan: 'Luján',
  midland: 'Ferrocarril Midland',
  muñiz: 'Muñiz',
  muniz: 'Muñiz',
  puerto_nuevo: 'Puerto Nuevo',
  real_pilar: 'Real Pilar',
  san_martin_formosa: 'San Martín de Formosa',
  san_martin_mendoza: 'San Martín de Mendoza',
  cipolletti: 'Cipolletti',
  olimpio: 'Olimpo de Bahía Blanca',
  villa_mitre: 'Villa Mitre',
  santamarina: 'Santamarina de Tandil',
  douglas_haig: 'Douglas Haig',
  juventud_antoniana: 'Juventud Antoniana',
  central_norte: 'Central Norte de Salta',
  sol_de_america: 'Sol de América',
  boca_unidos: 'Boca Unidos',
  chaco_for_ever: 'Chaco For Ever',
};

// Clean and normalize strings for fuzzy search
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');
}

// Strip common club prefix/suffix words
export function stripClubKeywords(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(club|atletico|social|deportivo|asociacion|sociedad|c\.?a\.?|c\.?s\.?y\s*d\.?|csyd|f\.?c\.?|fc|mutual|union|cultural)\b/gi, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert raw slug into formatted name if not in dictionary
function formatSlugToName(slug: string): string {
  if (KNOWN_CLUB_NAMES[slug]) return KNOWN_CLUB_NAMES[slug];
  const cleaned = slug.replace(/[_-]+/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

let cachedCatalog: EscudotecaClub[] | null = null;

/**
 * Load the Paladar Negro Escudoteca catalog
 */
export function getEscudotecaCatalog(): EscudotecaClub[] {
  if (cachedCatalog) return cachedCatalog;

  try {
    const catalogPath = path.join(process.cwd(), 'src', 'data', 'escudotecaCatalog.json');
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf8');
      const items = JSON.parse(raw);
      cachedCatalog = items.map((item: any) => ({
        slug: item.slug,
        name: formatSlugToName(item.slug),
        league: item.league,
        pageUrl: item.pageUrl,
        badgeUrl: item.badgeUrl,
        proxiedUrl: `/api/badge-proxy?url=${encodeURIComponent(item.badgeUrl)}`,
      }));
      return cachedCatalog || [];
    }
  } catch (err) {
    console.error('Error loading escudoteca catalog file:', err);
  }

  return [];
}

/**
 * Search Escudoteca clubs by team name
 */
export function searchEscudoteca(query: string, maxResults = 8): EscudotecaClub[] {
  const catalog = getEscudotecaCatalog();
  if (!query || !query.trim()) return catalog.slice(0, maxResults);

  const rawQuery = query.trim();
  const qNorm = normalizeText(rawQuery);
  const qClean = normalizeText(stripClubKeywords(rawQuery));

  const scored: EscudotecaClub[] = [];

  for (const club of catalog) {
    const slugNorm = normalizeText(club.slug);
    const nameNorm = normalizeText(club.name);
    const nameClean = normalizeText(stripClubKeywords(club.name));

    let score = 0;

    // Exact matches
    if (slugNorm === qNorm || nameNorm === qNorm) {
      score = 100;
    } else if (qClean && (slugNorm === qClean || nameClean === qClean)) {
      score = 95;
    } else if (qClean && slugNorm.startsWith(qClean)) {
      score = 90;
    } else if (qClean && qClean.length >= 3 && slugNorm.includes(qClean)) {
      score = 85;
    } else if (qClean && qClean.length >= 3 && nameClean.includes(qClean)) {
      score = 80;
    } else if (qNorm.length >= 4 && slugNorm.includes(qNorm)) {
      score = 75;
    } else if (qNorm.length >= 4 && nameNorm.includes(qNorm)) {
      score = 70;
    } else if (qClean && qClean.length >= 4 && qNorm.includes(slugNorm) && slugNorm.length >= 4) {
      score = 65;
    }

    // Boost Argentine leagues if query looks Argentine
    if (score > 0) {
      if (club.league.includes('Argentina') || club.league.includes('Primera') || club.league.includes('Federal') || club.league.includes('LPF')) {
        score += 5;
      }
      scored.push({
        ...club,
        score,
      });
    }
  }

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Deduplicate by badgeUrl
  const seen = new Set<string>();
  const results: EscudotecaClub[] = [];
  for (const item of scored) {
    if (!seen.has(item.badgeUrl)) {
      seen.add(item.badgeUrl);
      results.push(item);
      if (results.length >= maxResults) break;
    }
  }

  return results;
}

/**
 * Extract badge images directly from any external webpage URL (like paladarnegro.net, wikipedia, promiedos, etc.)
 */
export async function extractBadgesFromWebpage(
  targetUrl: string,
  teamName?: string
): Promise<{ title: string; badges: Array<{ name: string; url: string; proxiedUrl: string }> }> {
  try {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const resp = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) {
      throw new Error(`Error al acceder a la página (HTTP ${resp.status})`);
    }

    const html = await resp.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : cleanUrl;

    const badges: Array<{ name: string; url: string; proxiedUrl: string }> = [];
    const seenUrls = new Set<string>();

    // If it is paladarnegro.net/escudoteca/index.html and a team was provided, we can search in Escudoteca!
    if (cleanUrl.includes('paladarnegro.net/escudoteca') && teamName) {
      const pnMatches = searchEscudoteca(teamName, 12);
      for (const m of pnMatches) {
        if (!seenUrls.has(m.badgeUrl)) {
          seenUrls.add(m.badgeUrl);
          badges.push({
            name: `${m.name} (${m.league})`,
            url: m.badgeUrl,
            proxiedUrl: m.proxiedUrl,
          });
        }
      }
      if (badges.length > 0) {
        return { title: 'Escudoteca Paladar Negro', badges };
      }
    }

    // Generic HTML image parser: look for img src and a href ending with png, svg, jpg, webp
    const imgRegex = /(?:href|src)=["']([^"']+\.(?:png|svg|webp|jpg|jpeg))["']/gi;
    let match;

    const filterTerm = teamName ? normalizeText(stripClubKeywords(teamName)) : '';

    while ((match = imgRegex.exec(html)) !== null) {
      const rawSrc = match[1];
      // Ignore tiny icons, trackers, analytics
      if (
        rawSrc.includes('fav.png') ||
        rawSrc.includes('icon_') ||
        rawSrc.includes('google') ||
        rawSrc.includes('facebook') ||
        rawSrc.includes('twitter')
      ) {
        continue;
      }

      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(rawSrc, cleanUrl).href;
      } catch {
        continue;
      }

      if (seenUrls.has(absoluteUrl)) continue;

      const filename = absoluteUrl.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

      // If team filter provided, check if filename or url contains it
      if (filterTerm && filterTerm.length >= 3) {
        const normName = normalizeText(nameWithoutExt);
        if (!normName.includes(filterTerm) && !filterTerm.includes(normName)) {
          continue;
        }
      }

      seenUrls.add(absoluteUrl);
      badges.push({
        name: formatSlugToName(nameWithoutExt),
        url: absoluteUrl,
        proxiedUrl: `/api/badge-proxy?url=${encodeURIComponent(absoluteUrl)}`,
      });

      if (badges.length >= 24) break;
    }

    return { title, badges };
  } catch (err: any) {
    console.error('Error extracting badges from page:', err);
    throw err;
  }
}
