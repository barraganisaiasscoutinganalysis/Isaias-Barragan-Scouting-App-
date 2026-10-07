import { Team } from '../types/scouting';

/**
 * Normalizes and returns a distinct, disambiguated team display name.
 * Prevents name collisions between clubs sharing similar names across countries or divisions
 * (e.g. Racing Club de Argentina vs Racing de Montevideo, Independiente vs Independiente del Valle, Liverpool Uruguay vs Liverpool Inglaterra).
 */
export function getDistinctTeamName(
  teamOrName?: Partial<Team> | string | null,
  competition?: string,
  metaCompetition?: string
): string {
  if (!teamOrName) return 'Equipo';

  let rawName = '';
  let rawShortName = '';

  if (typeof teamOrName === 'string') {
    rawName = teamOrName.trim();
  } else {
    rawName = (teamOrName.name || '').trim();
    rawShortName = (teamOrName.shortName || '').trim();
  }

  // Combine competition context tokens
  const compContext = `${competition || ''} ${metaCompetition || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Prefer full, specific name over generic short name
  let name = rawName;
  if (!name || name.length <= 3) {
    name = rawShortName || rawName;
  }

  const nameNorm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 2. Disambiguate RACING
  if (nameNorm.includes('racing')) {
    if (nameNorm.includes('montevideo') || nameNorm.includes('uruguay') || compContext.includes('uruguay') || compContext.includes('auf') || compContext.includes('intermedio') || compContext.includes('clausura (u') || compContext.includes('apertura (u')) {
      return 'Racing de Montevideo (URU)';
    }
    if (nameNorm.includes('avellaneda') || nameNorm.includes('club') || compContext.includes('argentina') || compContext.includes('lpf') || compContext.includes('profesional') || compContext.includes('copa argentina')) {
      return 'Racing Club (ARG)';
    }
    // If name explicitly has distinction
    if (nameNorm === 'racing club' || nameNorm === 'racing') {
      if (compContext.includes('uruguay')) return 'Racing de Montevideo (URU)';
      if (compContext.includes('argentina')) return 'Racing Club (ARG)';
      return 'Racing Club';
    }
  }

  // 3. Disambiguate INDEPENDIENTE
  if (nameNorm.includes('independiente')) {
    if (nameNorm.includes('valle') || compContext.includes('ecuador') || compContext.includes('ligapro') || compContext.includes('pro ec')) {
      return 'Independiente del Valle';
    }
    if (nameNorm.includes('rivadavia') || nameNorm.includes('mendoza')) {
      return 'Independiente Rivadavia';
    }
    if (nameNorm.includes('medellin') || nameNorm.includes('dim') || compContext.includes('colombia') || compContext.includes('dimayor')) {
      return 'Independiente Medellín';
    }
    if (nameNorm.includes('santa fe') || nameNorm.includes('bogota')) {
      return 'Independiente Santa Fe';
    }
    if (nameNorm.includes('petrolero') || compContext.includes('bolivia')) {
      return 'Independiente Petrolero';
    }
    if (nameNorm === 'independiente' || nameNorm === 'ca independiente' || nameNorm === 'club atletico independiente') {
      if (compContext.includes('argentina') || compContext.includes('lpf') || compContext.includes('copa argentina')) {
        return 'Independiente (ARG)';
      }
    }
  }

  // 4. Disambiguate RIVER PLATE
  if (nameNorm.includes('river plate') || nameNorm === 'river') {
    if (nameNorm.includes('montevideo') || nameNorm.includes('uruguay') || compContext.includes('uruguay') || compContext.includes('auf')) {
      return 'River Plate (URU)';
    }
    if (nameNorm.includes('asuncion') || nameNorm.includes('paraguay') || compContext.includes('paraguay')) {
      return 'River Plate (PAR)';
    }
    if (compContext.includes('argentina') || compContext.includes('lpf') || nameNorm.includes('buenos aires')) {
      return 'River Plate (ARG)';
    }
    return 'River Plate';
  }

  // 5. Disambiguate NACIONAL
  if (nameNorm.includes('nacional')) {
    if (nameNorm.includes('atletico') || compContext.includes('colombia') || compContext.includes('medellin')) {
      return 'Atlético Nacional';
    }
    if (nameNorm.includes('montevideo') || nameNorm.includes('uruguay') || compContext.includes('uruguay') || compContext.includes('auf')) {
      return 'Nacional (URU)';
    }
    if (nameNorm.includes('paraguay') || compContext.includes('paraguay') || nameNorm.includes('asuncion')) {
      return 'Nacional (PAR)';
    }
    if (nameNorm.includes('funchal') || nameNorm.includes('portugal') || compContext.includes('portugal')) {
      return 'CD Nacional (POR)';
    }
  }

  // 6. Disambiguate LIVERPOOL
  if (nameNorm.includes('liverpool')) {
    if (nameNorm.includes('montevideo') || nameNorm.includes('uruguay') || compContext.includes('uruguay') || compContext.includes('auf')) {
      return 'Liverpool (URU)';
    }
    if (compContext.includes('premier') || compContext.includes('england') || compContext.includes('inglaterra') || compContext.includes('fa cup')) {
      return 'Liverpool FC (ENG)';
    }
  }

  // 7. Disambiguate EVERTON
  if (nameNorm.includes('everton')) {
    if (nameNorm.includes('vina') || nameNorm.includes('chile') || compContext.includes('chile')) {
      return 'Everton de Viña (CHI)';
    }
    if (compContext.includes('premier') || compContext.includes('england') || compContext.includes('inglaterra')) {
      return 'Everton (ENG)';
    }
  }

  // 8. Disambiguate BARCELONA
  if (nameNorm.includes('barcelona')) {
    if (nameNorm.includes('guayaquil') || nameNorm.includes('ecuador') || nameNorm.includes('sc') || compContext.includes('ecuador') || compContext.includes('ligapro')) {
      return 'Barcelona SC (ECU)';
    }
    if (compContext.includes('laliga') || compContext.includes('spain') || compContext.includes('espana') || compContext.includes('copa del rey')) {
      return 'FC Barcelona';
    }
  }

  // 9. Disambiguate ARSENAL
  if (nameNorm.includes('arsenal')) {
    if (nameNorm.includes('sarandi') || compContext.includes('argentina') || compContext.includes('primera nacional')) {
      return 'Arsenal de Sarandí';
    }
    if (compContext.includes('premier') || compContext.includes('england') || compContext.includes('inglaterra')) {
      return 'Arsenal FC (ENG)';
    }
  }

  // 10. Disambiguate WANDERERS
  if (nameNorm.includes('wanderers')) {
    if (nameNorm.includes('montevideo') || compContext.includes('uruguay') || compContext.includes('auf')) {
      return 'Montevideo Wanderers';
    }
    if (nameNorm.includes('santiago') || nameNorm.includes('valparaiso') || compContext.includes('chile')) {
      return 'Santiago Wanderers';
    }
  }

  // 11. Disambiguate BOTAFOGO
  if (nameNorm.includes('botafogo')) {
    if (nameNorm.includes('sp') || nameNorm.includes('ribeirao')) {
      return 'Botafogo-SP';
    }
    if (nameNorm.includes('pb') || nameNorm.includes('paraiba')) {
      return 'Botafogo-PB';
    }
    if (nameNorm === 'botafogo' || nameNorm.includes('rj')) {
      return 'Botafogo (RJ)';
    }
  }

  // Default: Return the clean team name
  return name;
}
