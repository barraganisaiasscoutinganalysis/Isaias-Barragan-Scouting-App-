/**
 * Country flag utilities using FlagCDN
 */

export function getCountryCode(nationality?: string, code?: string): string {
  if (code && code.length === 2 && code.toUpperCase() !== 'UN') {
    return code.toLowerCase();
  }
  if (!nationality) return 'un';
  const norm = nationality.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const countryMap: Record<string, string> = {
    'argentina': 'ar',
    'brasil': 'br',
    'brazil': 'br',
    'colombia': 'co',
    'uruguay': 'uy',
    'chile': 'cl',
    'peru': 'pe',
    'ecuador': 'ec',
    'paraguay': 'py',
    'venezuela': 've',
    'bolivia': 'bo',
    'espana': 'es',
    'spain': 'es',
    'francia': 'fr',
    'france': 'fr',
    'italia': 'it',
    'italy': 'it',
    'alemania': 'de',
    'germany': 'de',
    'inglaterra': 'gb-eng',
    'england': 'gb-eng',
    'reino unido': 'gb',
    'portugal': 'pt',
    'paises bajos': 'nl',
    'holanda': 'nl',
    'netherlands': 'nl',
    'belgica': 'be',
    'belgium': 'be',
    'croacia': 'hr',
    'croatia': 'hr',
    'mexico': 'mx',
    'estados unidos': 'us',
    'usa': 'us',
    'marruecos': 'ma',
    'morocco': 'ma',
    'senegal': 'sn',
    'japon': 'jp',
    'japan': 'jp',
    'corea del sur': 'kr',
    'korea': 'kr',
    'nigeria': 'ng',
    'camerun': 'cm',
    'cameroun': 'cm',
    'argelia': 'dz',
    'egipto': 'eg',
    'turquia': 'tr',
    'turkey': 'tr',
    'grecia': 'gr',
    'greece': 'gr',
    'suecia': 'se',
    'sweden': 'se',
    'noruega': 'no',
    'norway': 'no',
    'dinamarca': 'dk',
    'denmark': 'dk',
    'polonia': 'pl',
    'poland': 'pl',
    'suiza': 'ch',
    'switzerland': 'ch',
    'austria': 'at',
    'serbia': 'rs',
    'escocia': 'gb-sct',
    'gales': 'gb-wls',
    'irlanda': 'ie',
    'costa rica': 'cr',
    'panama': 'pa',
    'honduras': 'hn',
    'jamaica': 'jm',
    'canada': 'ca',
    'australia': 'au',
    'nueva zelanda': 'nz',
    'ghana': 'gh',
    'costa de marfil': 'ci',
    'ivory coast': 'ci'
  };

  for (const [key, alpha2] of Object.entries(countryMap)) {
    if (norm.includes(key)) return alpha2;
  }

  return 'un';
}

export function getCountryFlagUrl(nationality?: string, code?: string): string {
  const cCode = getCountryCode(nationality, code);
  return `https://flagcdn.com/w20/${cCode}.png`;
}

/**
 * Clean player name helper to eliminate any trailing "00", "0", "#00", "#0" or orphan digits
 */
export function sanitizePlayerName(name?: string): string {
  if (!name) return '';
  let cleaned = String(name).trim();

  // 1. Remove trailing dorsal markers and numbers (e.g. " 00", " 0", " #00", " #0", " (00)", " - 00", " Dorsal 0")
  cleaned = cleaned
    .replace(/\s*[\(\[-]?\s*(?:#|Nº|N°|No\.?|Dorsal)?\s*00?\s*[\)\]]?$/i, '')
    .replace(/\s*(?:#|Nº|N°|No\.?|Dorsal)\s*00?\b/i, '')
    .replace(/\s+00?\b/gi, '')
    .replace(/\b00?\s*$/gi, '')
    .replace(/^00?\b/gi, '')
    .trim();

  // 2. Remove trailing numbers if name ends with digit(s) preceded by space (e.g. "González 00" -> "González")
  cleaned = cleaned.replace(/\s+0+$/g, '').trim();

  // 3. Fallback for empty or invalid placeholder names
  if (!cleaned || /^jugador$/i.test(cleaned) || /^j\.$/i.test(cleaned) || /^player$/i.test(cleaned)) {
    return 'Jugador';
  }

  return cleaned;
}

export function cleanCompetitionName(comp?: string): string {
  if (!comp) return 'Competición Oficial';
  return comp
    .replace(/\s*•\s*(?:Jornada|Round|Fecha|Grupo|Group|Fase|Matchday|Week|Playoffs)\b.*$/i, '')
    .replace(/,\s*(?:Jornada|Round|Fecha|Grupo|Group|Fase|Matchday|Week|Playoffs)\b.*$/i, '')
    .replace(/\s*[-–—]\s*(?:Jornada|Round|Fecha|Grupo|Group|Fase|Matchday|Week|Playoffs)\b.*$/i, '')
    .trim();
}
