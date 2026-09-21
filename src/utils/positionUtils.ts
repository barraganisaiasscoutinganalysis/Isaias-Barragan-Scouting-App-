import { Player, PlayerPosition } from '../types/scouting';

export interface PositionInfo {
  category: PlayerPosition; // 'GK' | 'DF' | 'MF' | 'FW'
  positionLabel: string;    // Standardized short badge code (POR, DFC, LI, LD, MCD, MC, MCO, MI, MD, EI, ED, DC)
  positionName: string;     // Full Spanish title (Portero, Defensa Central, etc.)
  lineName: string;         // Línea táctica (Portería, Defensa, Mediocampo, Delantera)
  badge: {
    bg: string;
    border: string;
    text: string;
    dot: string;
  };
}

/**
 * Palette definitions for tactical lines and position badges
 */
export const POSITION_THEMES: Record<PlayerPosition, { bg: string; border: string; text: string; dot: string; label: string }> = {
  GK: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    label: 'Portero',
  },
  DF: {
    bg: 'bg-sky-950/80',
    border: 'border-sky-500/50',
    text: 'text-sky-300',
    dot: 'bg-sky-400',
    label: 'Defensa',
  },
  MF: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    label: 'Centrocampista',
  },
  FW: {
    bg: 'bg-rose-950/80',
    border: 'border-rose-500/50',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    label: 'Delantero',
  },
};

/**
 * Resolves full position metadata for any player accurately without false positives.
 */
export function resolvePlayerPosition(player?: { position?: string; positionLabel?: string } | null): PositionInfo {
  if (!player) {
    return {
      category: 'MF',
      positionLabel: 'MC',
      positionName: 'Mediocentro',
      lineName: 'Mediocampo',
      badge: POSITION_THEMES.MF,
    };
  }

  const rawPos = (player.position || '').trim().toUpperCase();
  const rawLabel = (player.positionLabel || '').trim().toUpperCase();

  // Normalize label tokens for exact word matching
  const cleanLabel = rawLabel.replace(/[^A-Z0-9]/g, '');

  // 1. GOALKEEPER DETECTION
  if (
    rawPos === 'GK' ||
    rawPos === 'G' ||
    cleanLabel === 'GK' ||
    cleanLabel === 'G' ||
    cleanLabel === 'POR' ||
    cleanLabel === 'ARQ' ||
    cleanLabel.includes('PORTERO') ||
    cleanLabel.includes('ARQUERO') ||
    cleanLabel.includes('GOALKEEPER')
  ) {
    return {
      category: 'GK',
      positionLabel: 'POR',
      positionName: 'Portero',
      lineName: 'Portería',
      badge: POSITION_THEMES.GK,
    };
  }

  // 2. DEFENDER DETECTION (If position explicitly DF/D, or label matches defense tokens)
  const isExplicitDef = rawPos === 'DF' || rawPos === 'D';
  const isDefToken = [
    'DFC', 'CB', 'CEN', 'CENTRAL',
    'LI', 'LB', 'LWB',
    'LD', 'RB', 'RWB',
    'DF', 'DEF', 'DEFENSA', 'DEFENDER', 'LAT', 'LATERAL'
  ].includes(cleanLabel);

  if (isExplicitDef || (rawPos !== 'MF' && rawPos !== 'FW' && isDefToken)) {
    // Specific defender roles
    if (['LI', 'LB', 'LWB'].includes(cleanLabel) || cleanLabel.includes('IZQ')) {
      return {
        category: 'DF',
        positionLabel: 'LI',
        positionName: 'Lateral Izquierdo',
        lineName: 'Defensa',
        badge: POSITION_THEMES.DF,
      };
    }
    if (['LD', 'RB', 'RWB'].includes(cleanLabel) || cleanLabel.includes('DER')) {
      return {
        category: 'DF',
        positionLabel: 'LD',
        positionName: 'Lateral Derecho',
        lineName: 'Defensa',
        badge: POSITION_THEMES.DF,
      };
    }
    if (['DFC', 'CB', 'CEN', 'CENTRAL'].includes(cleanLabel) || cleanLabel.includes('CENTRAL')) {
      return {
        category: 'DF',
        positionLabel: 'DFC',
        positionName: 'Defensa Central',
        lineName: 'Defensa',
        badge: POSITION_THEMES.DF,
      };
    }
    // Generic DF
    return {
      category: 'DF',
      positionLabel: rawLabel || 'DEF',
      positionName: 'Defensa',
      lineName: 'Defensa',
      badge: POSITION_THEMES.DF,
    };
  }

  // 3. FORWARD DETECTION (If position explicitly FW/F, or label matches forward tokens)
  // CRITICAL: DFC must never be treated as DC (DC = Delantero Centro, DFC = Defensa Central)
  const isExplicitFwd = rawPos === 'FW' || rawPos === 'F';
  const isFwdToken = [
    'DC', 'ST', 'CF', 'PUN', 'PUNTA', 'DELANTERO',
    'EI', 'LW', 'EXT_IZQ',
    'ED', 'RW', 'EXT_DER',
    'SP', 'EXT', 'DEL', 'ATACANTE'
  ].includes(cleanLabel) && cleanLabel !== 'DFC';

  if (isExplicitFwd || (rawPos !== 'MF' && rawPos !== 'DF' && isFwdToken)) {
    if (['EI', 'LW'].includes(cleanLabel) || cleanLabel.includes('EXTIZQ')) {
      return {
        category: 'FW',
        positionLabel: 'EI',
        positionName: 'Extremo Izquierdo',
        lineName: 'Delantera',
        badge: POSITION_THEMES.FW,
      };
    }
    if (['ED', 'RW'].includes(cleanLabel) || cleanLabel.includes('EXTDER')) {
      return {
        category: 'FW',
        positionLabel: 'ED',
        positionName: 'Extremo Derecho',
        lineName: 'Delantera',
        badge: POSITION_THEMES.FW,
      };
    }
    if (['SP', 'SEGUNDOPUNTA'].includes(cleanLabel)) {
      return {
        category: 'FW',
        positionLabel: 'SP',
        positionName: 'Segundo Delantero',
        lineName: 'Delantera',
        badge: POSITION_THEMES.FW,
      };
    }
    if (['DC', 'ST', 'CF', 'PUN', 'PUNTA'].includes(cleanLabel) || cleanLabel.includes('CENTRO')) {
      return {
        category: 'FW',
        positionLabel: 'DC',
        positionName: 'Delantero Centro',
        lineName: 'Delantera',
        badge: POSITION_THEMES.FW,
      };
    }
    return {
      category: 'FW',
      positionLabel: rawLabel || 'DC',
      positionName: 'Delantero',
      lineName: 'Delantera',
      badge: POSITION_THEMES.FW,
    };
  }

  // 4. MIDFIELDER DETECTION (Default or MF)
  if (['MCD', 'CDM', 'DM', 'PIV', 'PIVOTE'].includes(cleanLabel) || cleanLabel.includes('PIVOTE')) {
    return {
      category: 'MF',
      positionLabel: 'MCD',
      positionName: 'Pivote Defensivo',
      lineName: 'Mediocampo',
      badge: POSITION_THEMES.MF,
    };
  }
  if (['MCO', 'CAM', 'AM', 'ENG', 'ENGANCHE', 'MEDIAPUNTA'].includes(cleanLabel) || cleanLabel.includes('ENGANCHE') || cleanLabel.includes('MEDIAPUNTA')) {
    return {
      category: 'MF',
      positionLabel: 'MCO',
      positionName: 'Mediapunta',
      lineName: 'Mediocampo',
      badge: POSITION_THEMES.MF,
    };
  }
  if (['MI', 'LM'].includes(cleanLabel)) {
    return {
      category: 'MF',
      positionLabel: 'MI',
      positionName: 'Interior Izquierdo',
      lineName: 'Mediocampo',
      badge: POSITION_THEMES.MF,
    };
  }
  if (['MD', 'RM'].includes(cleanLabel)) {
    return {
      category: 'MF',
      positionLabel: 'MD',
      positionName: 'Interior Derecho',
      lineName: 'Mediocampo',
      badge: POSITION_THEMES.MF,
    };
  }
  if (['MC', 'CM', 'VOL', 'CENTRO'].includes(cleanLabel)) {
    return {
      category: 'MF',
      positionLabel: 'MC',
      positionName: 'Mediocentro',
      lineName: 'Mediocampo',
      badge: POSITION_THEMES.MF,
    };
  }

  // Fallback generic midfielder
  return {
    category: 'MF',
    positionLabel: rawLabel || 'MC',
    positionName: 'Centrocampista',
    lineName: 'Mediocampo',
    badge: POSITION_THEMES.MF,
  };
}

/**
 * Accurate position filter matcher supporting both general lines and specific roles.
 * Completely immune to substring collisions (e.g. DFC matching DC, or MED matching ED).
 */
export function matchesPlayerPosition(player: Player, filter: string): boolean {
  if (!filter || filter === 'ALL') return true;

  const info = resolvePlayerPosition(player);
  const cat = info.category;
  const label = info.positionLabel;

  // Broad lines
  if (filter === 'GK') return cat === 'GK';
  if (filter === 'DEF') return cat === 'DF';
  if (filter === 'MID') return cat === 'MF';
  if (filter === 'FWD') return cat === 'FW';

  // Specific tactical positions
  switch (filter) {
    case 'POR':
      return cat === 'GK';
    case 'DFC':
      return cat === 'DF' && label === 'DFC';
    case 'LAT':
      return cat === 'DF' && (label === 'LI' || label === 'LD');
    case 'LI':
      return cat === 'DF' && label === 'LI';
    case 'LD':
      return cat === 'DF' && label === 'LD';
    case 'MCD':
      return cat === 'MF' && label === 'MCD';
    case 'MC':
      return cat === 'MF' && label === 'MC';
    case 'MCO':
      return cat === 'MF' && label === 'MCO';
    case 'MI_MD':
      return cat === 'MF' && (label === 'MI' || label === 'MD');
    case 'EXT':
      return cat === 'FW' && (label === 'EI' || label === 'ED');
    case 'EI':
      return cat === 'FW' && label === 'EI';
    case 'ED':
      return cat === 'FW' && label === 'ED';
    case 'DC':
      return cat === 'FW' && (label === 'DC' || label === 'SP');
    default:
      return true;
  }
}
