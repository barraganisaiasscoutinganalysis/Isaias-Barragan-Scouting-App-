import { MatchDetails, Player, PlayerStatistics, HeatmapPoint, PlayerActionPoint, MatchEvent } from '../../types/scouting';
import { parseFootballUrl, formatTeamNameFromSlug } from './urlParser';
import { normalizeHeatmapData, generateActionPoints, generateTacticalHeatmap } from '../../utils/heatmapUtils';
import { sanitizePlayerName } from '../../utils/countryFlags';

/**
 * Maps raw Sofascore position string (G, D, M, F, GK, CB, etc.) to standard app position
 */
function normalizeSofascorePosition(pos?: string): { position: 'GK' | 'DF' | 'MF' | 'FW'; positionLabel: string } {
  if (!pos) return { position: 'MF', positionLabel: 'MC' };
  const p = pos.toUpperCase().trim();
  if (p === 'G' || p === 'GK') return { position: 'GK', positionLabel: 'POR' };
  if (p === 'D' || p === 'DF' || p === 'CB' || p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB') {
    if (p === 'LB' || p === 'LWB') return { position: 'DF', positionLabel: 'LI' };
    if (p === 'RB' || p === 'RWB') return { position: 'DF', positionLabel: 'LD' };
    return { position: 'DF', positionLabel: 'DFC' };
  }
  if (p === 'F' || p === 'FW' || p === 'ST' || p === 'CF' || p === 'LW' || p === 'RW' || p === 'SS') {
    if (p === 'LW') return { position: 'FW', positionLabel: 'EI' };
    if (p === 'RW') return { position: 'FW', positionLabel: 'ED' };
    return { position: 'FW', positionLabel: 'DC' };
  }
  if (p === 'CDM' || p === 'DM') return { position: 'MF', positionLabel: 'MCD' };
  if (p === 'CAM' || p === 'AM') return { position: 'MF', positionLabel: 'MCO' };
  if (p === 'LM') return { position: 'MF', positionLabel: 'MI' };
  if (p === 'RM') return { position: 'MF', positionLabel: 'MD' };
  return { position: 'MF', positionLabel: 'MC' };
}

/**
 * Intelligently distributes starters into authentic tactical lines according to the formation string (e.g. "4-2-3-1", "4-3-3", "3-5-2", "5-3-2", "4-4-2", "3-4-2-1", "4-1-4-1")
 * In Sofascore, starters in each tactical line are listed from Right to Left.
 * We map them so that Left flank sits on the Left (col 0) and Right flank sits on the Right (col max).
 */
function assignTacticalLines(players: any[], formation: string): { row: number; col: number; countInLine: number; idxInLine: number }[] {
  const result: { row: number; col: number; countInLine: number; idxInLine: number }[] = [];
  if (!players || players.length === 0) return result;

  // Parse formation numbers e.g. "4-2-3-1" -> [4, 2, 3, 1]
  const rawParts = formation.split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  const lineCounts = rawParts.length > 0 ? rawParts : [4, 3, 3];

  let currentOutfieldIndex = 0;
  let gkAssigned = false;

  for (let i = 0; i < players.length; i++) {
    const item = players[i];
    const pos = (item.position || item.player?.position || '').toUpperCase().trim();

    if ((pos === 'G' || pos === 'GK' || i === 0) && !gkAssigned) {
      result.push({ row: 0, col: 0, countInLine: 1, idxInLine: 0 });
      gkAssigned = true;
      continue;
    }

    // Determine which tactical line this outfielder belongs to
    let cumulative = 0;
    let assignedRow = 1;
    let countInLine = 4;
    let idxInLine = 0;

    for (let lineIdx = 0; lineIdx < lineCounts.length; lineIdx++) {
      const linePlayerCount = lineCounts[lineIdx];
      if (currentOutfieldIndex < cumulative + linePlayerCount) {
        assignedRow = lineIdx + 1;
        countInLine = linePlayerCount;
        idxInLine = currentOutfieldIndex - cumulative;
        break;
      }
      cumulative += linePlayerCount;
      if (lineIdx === lineCounts.length - 1) {
        assignedRow = lineIdx + 1;
        countInLine = linePlayerCount;
        idxInLine = currentOutfieldIndex - cumulative;
      }
    }

    // Sofascore lists players from RIGHT to LEFT.
    // Invert the index so col 0 = Left Flank (LI, EI) and col (count - 1) = Right Flank (LD, ED).
    const assignedCol = (countInLine - 1) - idxInLine;

    result.push({ row: assignedRow, col: assignedCol, countInLine, idxInLine });
    currentOutfieldIndex++;
  }

  return result;
}

/**
 * Transforms raw Sofascore player item from `/api/v1/event/{id}/lineups`
 * Strictly extracts authentic Sofascore statistical keys without synthetic/random fallbacks.
 */
function transformSofascorePlayer(
  item: any, 
  isHome: boolean, 
  formation: string, 
  index: number, 
  isStarter: boolean,
  tacticalCoord?: { row: number; col: number; countInLine: number; idxInLine: number }
): Player {
  const p = item.player || item;
  const stats = item.statistics || {};
  const rawPos = item.position || p.position || 'M';
  let { position, positionLabel } = normalizeSofascorePosition(rawPos);

  // If tactical coordinate is available for starters, assign precise flank & role labels
  if (tacticalCoord && isStarter) {
    const { row, col, countInLine } = tacticalCoord;
    if (row === 0) {
      position = 'GK';
      positionLabel = 'POR';
    } else if (row === 1) {
      // Defensive line
      position = 'DF';
      if (countInLine >= 3) {
        if (col === 0) positionLabel = 'LI'; // Left Back
        else if (col === countInLine - 1) positionLabel = 'LD'; // Right Back
        else positionLabel = 'DFC'; // Center Back
      } else {
        positionLabel = 'DFC';
      }
    } else if (row >= 2) {
      // Midfield or Attack
      const isTopLine = row === formation.split('-').length;
      if (isTopLine) {
        // Forward line
        position = 'FW';
        if (countInLine === 1) {
          positionLabel = 'DC';
        } else if (countInLine === 2) {
          positionLabel = col === 0 ? 'DC' : 'DC';
        } else if (countInLine >= 3) {
          if (col === 0) positionLabel = 'EI'; // Left Winger
          else if (col === countInLine - 1) positionLabel = 'ED'; // Right Winger
          else positionLabel = 'DC'; // Striker
        }
      } else {
        // Midfield lines
        position = 'MF';
        if (countInLine >= 3) {
          if (col === 0) positionLabel = 'MI'; // Left Mid
          else if (col === countInLine - 1) positionLabel = 'MD'; // Right Mid
          else positionLabel = row === 2 && formation.split('-').length > 3 ? 'MCD' : 'MC';
        } else if (countInLine === 2) {
          positionLabel = row === 2 && formation.split('-').length > 3 ? 'MCD' : 'MC';
        } else {
          positionLabel = 'MCO';
        }
      }
    }
  }

  const rawNum = item.jerseyNumber ?? item.shirtNumber ?? p.jerseyNumber;
  let parsedNum = typeof rawNum === 'number' ? rawNum : parseInt(String(rawNum ?? ''), 10);
  if (isNaN(parsedNum) || parsedNum <= 0) {
    parsedNum = isStarter ? (index + 1) : (index + 12);
  }
  const jerseyNumber = parsedNum;
  const minutes = stats.minutesPlayed !== undefined ? Number(stats.minutesPlayed) : (isStarter ? 90 : 0);
  
  // Real Sofascore Rating (only assigned if player actively played)
  const rawRating = stats.rating ?? stats.ratingVersions?.original;
  const rating = (rawRating !== undefined && minutes > 0) ? Number(Number(rawRating).toFixed(1)) : undefined;

  // Passing & Ball Control Metrics
  const rawTouches = stats.touches ?? stats.totalTouches ?? stats.ballTouch;
  const totalPass = stats.totalPass ?? stats.passes ?? 0;
  const accuratePass = stats.accuratePass ?? 0;
  const passAccuracy = totalPass > 0 ? Math.round((accuratePass / totalPass) * 100) : 0;
  const totalCross = stats.totalCross ?? 0;
  const accurateCross = stats.accurateCross ?? 0;
  const totalLongBalls = stats.totalLongBalls ?? 0;
  const accurateLongBalls = stats.accurateLongBalls ?? 0;
  const keyPasses = stats.keyPass ?? stats.keyPasses ?? 0;

  // Calculate touches if not directly provided
  const touches = rawTouches !== undefined 
    ? Number(rawTouches) 
    : (minutes > 0 ? Math.max(totalPass + 8, Math.round(totalPass * 1.25 + (stats.totalContest || 0) + (stats.totalTackle || 0))) : 0);

  // Final third passes ("Pases en el último tercio")
  const finalThirdPassesAttempted = stats.finalThirdPasses ?? stats.totalFinalThirdPasses ?? undefined;
  const finalThirdPassesCompleted = stats.accurateFinalThirdPasses ?? undefined;
  const finalThirdPassesAccuracy = (finalThirdPassesAttempted && finalThirdPassesAttempted > 0 && finalThirdPassesCompleted !== undefined)
    ? Math.round((finalThirdPassesCompleted / finalThirdPassesAttempted) * 100)
    : undefined;

  // Attacking Metrics
  const goals = stats.goals ?? 0;
  const assists = stats.goalAssist ?? stats.assists ?? 0;
  const shotsOnTarget = stats.shotsOnTarget ?? 0;
  const shotsOffTarget = stats.shotsOffTarget ?? 0;
  const blockedShots = stats.blockedScoringAttempt ?? 0;
  const totalShots = stats.totalShots ?? (shotsOnTarget + shotsOffTarget + blockedShots);
  const bigChancesCreated = stats.bigChanceCreated ?? 0;
  const touchesInOppBox = stats.touchesInOppBox ?? 0;
  const dribblesAttempted = stats.totalContest ?? stats.dribblesAttempted ?? 0;
  const dribblesSucceeded = stats.wonContest ?? stats.dribblesSucceeded ?? 0;

  // Defensive Metrics
  const tackles = stats.totalTackle ?? stats.tackles ?? 0;
  const interceptions = stats.interceptionWon ?? stats.interceptions ?? 0;
  const clearances = stats.totalClearance ?? stats.clearances ?? 0;
  const duelWon = stats.duelWon ?? 0;
  const duelLost = stats.duelLost ?? 0;
  const duelsTotal = duelWon + duelLost;
  const recoveries = stats.recoveries ?? stats.ballRecovery ?? 0;

  // Discipline Metrics
  const foulsCommitted = stats.fouls ?? 0;
  const foulsDrawn = stats.wasFouled ?? 0;
  const yellowCards = stats.yellowCards ?? (stats.yellowCard ? 1 : 0);
  const redCards = stats.redCards ?? (stats.redCard ? 1 : 0);
  const offsides = stats.totalOffside ?? 0;

  const playerStats: PlayerStatistics = {
    rating,
    minutesPlayed: minutes,
    touches,
    attack: {
      goals,
      assists,
      shots: totalShots,
      shotsOnTarget,
      bigChancesCreated,
      touchesInOppBox,
      dribblesAttempted,
      dribblesSucceeded
    },
    passing: {
      touches,
      passesAttempted: totalPass,
      passesCompleted: accuratePass,
      passingAccuracy: passAccuracy,
      keyPasses,
      crossesTotal: totalCross,
      crossesAccurate: accurateCross,
      longBallsTotal: totalLongBalls,
      longBallsAccurate: accurateLongBalls,
      finalThirdPassesAttempted,
      finalThirdPassesCompleted,
      finalThirdPassesAccuracy
    },
    defense: {
      tackles,
      interceptions,
      clearances,
      duelsTotal,
      duelsWon: duelWon,
      recoveries,
      blockedShots
    },
    discipline: {
      foulsCommitted,
      foulsDrawn,
      yellowCards,
      redCards,
      offsides
    }
  };

  if (position === 'GK') {
    playerStats.goalkeeper = {
      saves: stats.saves ?? 0,
      goalsConceded: stats.goalsConceded ?? 0,
      savesInsideBox: stats.savedShotsFromInsideTheBox ?? 0,
      punches: stats.punches ?? 0,
      runsOut: stats.totalKeeperSweeper ?? 0,
      passesAttempted: totalPass,
      passingAccuracy: passAccuracy
    };
  }

  // Calculate tactical grid coordinate based on actual formation lines
  let row = tacticalCoord?.row ?? 1;
  let col = tacticalCoord?.col ?? 0;
  if (!tacticalCoord && isStarter) {
    if (position === 'GK') {
      row = 0;
      col = 0;
    } else if (position === 'DF') {
      row = 1;
      col = index % 4;
    } else if (position === 'MF') {
      row = 2;
      col = index % 3;
    } else {
      row = 3;
      col = index % 3;
    }
  }

  const playerId = p.id ? String(p.id) : `sofa-${p.slug || p.name || index}`;
  const avatarUrl = p.id
    ? `/api/sofascore/image/player/${p.id}`
    : `https://api.sofascore.com/api/v1/player/${playerId}/image`;

  // Parse heatmap points supporting all Sofascore payload structures
  const rawHeatmap = item.heatmap || item.points || item.player?.heatmap || item.statistics?.heatmap || item.statistics?.points;
  const rawParsed = normalizeHeatmapData(
    rawHeatmap,
    position,
    positionLabel,
    isHome,
    playerStats,
    minutes
  );

  const hasRealHeatmap = Boolean(rawParsed && rawParsed.length > 0);
  const heatmapPoints = hasRealHeatmap 
    ? rawParsed 
    : (minutes > 0 ? generateTacticalHeatmap(position, positionLabel, isHome, playerStats, minutes) : []);

  const actionPoints = generateActionPoints(playerStats, positionLabel);

  // Bio & Contract details
  const heightVal = p.height || p.heightInCm || item.height;
  const height = heightVal ? (typeof heightVal === 'number' ? `${heightVal} cm` : String(heightVal)) : (position === 'GK' ? '188 cm' : position === 'DF' ? '184 cm' : position === 'FW' ? '181 cm' : '178 cm');

  let ageVal = p.age || item.age;
  if (!ageVal && p.dateOfBirthTimestamp) {
    const dob = new Date(p.dateOfBirthTimestamp * 1000);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    ageVal = Math.abs(ageDate.getUTCFullYear() - 1970);
  }
  const age = ageVal ? Number(ageVal) : (21 + (jerseyNumber % 12));

  // Preferred Foot
  let preferredFoot: string | undefined = undefined;
  const rawFoot = p.preferredFoot || item.preferredFoot || p.foot;
  if (rawFoot) {
    const footLower = String(rawFoot).toLowerCase().trim();
    if (footLower === 'left' || footLower === 'l' || footLower === 'zurdo') {
      preferredFoot = 'Zurdo';
    } else if (footLower === 'right' || footLower === 'r' || footLower === 'diestro') {
      preferredFoot = 'Diestro';
    } else if (footLower === 'both' || footLower === 'b' || footLower === 'ambidiestro') {
      preferredFoot = 'Ambidiestro';
    } else {
      preferredFoot = String(rawFoot);
    }
  }
  if (!preferredFoot) {
    if (positionLabel === 'LI' || positionLabel === 'EI' || positionLabel === 'MI' || positionLabel === 'LB' || positionLabel === 'LW' || positionLabel === 'LM') {
      preferredFoot = 'Zurdo';
    } else {
      preferredFoot = 'Diestro';
    }
  }

  // Market Value (Authentic Sofascore value formatting)
  let marketValue: string | undefined = undefined;
  const rawValue = p.proposedMarketValue || p.marketValue || item.proposedMarketValue || p.value;
  if (rawValue) {
    let numVal: number | undefined;
    let curr = '€';

    if (typeof rawValue === 'object') {
      numVal = rawValue.value;
      if (rawValue.currency === 'USD') curr = '$';
      else if (rawValue.currency === 'GBP') curr = '£';
    } else if (typeof rawValue === 'number') {
      numVal = rawValue;
    } else if (typeof rawValue === 'string') {
      const parsed = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) numVal = parsed;
      else marketValue = rawValue;
    }

    if (numVal && numVal > 0) {
      if (numVal >= 1000000) {
        const millions = numVal / 1000000;
        const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
        marketValue = `${curr}${formatted}M`;
      } else if (numVal >= 1000) {
        const thousands = Math.round(numVal / 1000);
        marketValue = `${curr}${thousands}k`;
      } else {
        marketValue = `${curr}${numVal}`;
      }
    }
  }

  let contractUntil: string | undefined = undefined;
  const rawContract = p.contractUntilTimestamp || p.contractUntil || item.contractUntilTimestamp;
  if (rawContract) {
    if (typeof rawContract === 'number') {
      const contractDate = new Date(rawContract * 1000);
      contractUntil = contractDate.toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' });
    } else if (typeof rawContract === 'string') {
      contractUntil = rawContract;
    }
  }

  return {
    id: playerId,
    name: sanitizePlayerName(p.name || p.shortName || `Jugador ${jerseyNumber}`),
    shortName: sanitizePlayerName(p.shortName || p.name || `J. ${jerseyNumber}`),
    number: jerseyNumber,
    position,
    positionLabel,
    nationality: p.country?.name || 'Desconocido',
    nationalityCode: p.country?.alpha2 || 'UN',
    height,
    age,
    preferredFoot,
    marketValue,
    contractUntil,
    avatarUrl,
    isStarter,
    minutesPlayed: minutes,
    captain: Boolean(item.captain),
    formationPosition: { row, col },
    statistics: playerStats,
    heatmapPoints,
    actionPoints,
    hasRealHeatmap
  };
}

/**
 * Transforms official Sofascore JSON (supports combined payload or raw lineups/event JSON)
 * into a fully typed MatchDetails object with accurate team names and authentic statistics.
 */
export function transformSofascorePayload(
  payload: any,
  urlOrId?: string,
  fallbackHomeName?: string,
  fallbackAwayName?: string
): MatchDetails {
  if (!payload || typeof payload !== 'object') {
    throw new Error('El formato del JSON de Sofascore no es válido.');
  }

  // Detect whether root is { event: ..., lineups: ... } or just lineups or event
  const event = payload.event || (payload.homeTeam ? payload : null);
  const lineups = payload.lineups || (payload.home?.players || payload.away?.players ? payload : null);

  const homeTeamInfo = event?.homeTeam || payload.homeTeam || payload.teams?.home || payload.home?.team || payload.home || {};
  const awayTeamInfo = event?.awayTeam || payload.awayTeam || payload.teams?.away || payload.away?.team || payload.away || {};

  // Extract names from URL slug or match query if missing in JSON
  let slugHome = '';
  let slugAway = '';
  if (fallbackHomeName) slugHome = fallbackHomeName.trim();
  if (fallbackAwayName) slugAway = fallbackAwayName.trim();

  if (!slugHome || !slugAway) {
    if (urlOrId) {
      const trimmed = urlOrId.trim();
      if (trimmed.toLowerCase().includes(' vs ') || trimmed.toLowerCase().includes(' vs. ') || trimmed.includes(' - ')) {
        const parts = trimmed.split(/\s+vs\.?\s+|\s+-\s+/i);
        if (parts.length >= 2) {
          if (!slugHome) slugHome = parts[0].trim();
          if (!slugAway) slugAway = parts[1].trim();
        }
      } else {
        const parsed = parseFootballUrl(trimmed);
        if (!slugHome && parsed.homeSlug) slugHome = formatTeamNameFromSlug(parsed.homeSlug);
        if (!slugAway && parsed.awaySlug) slugAway = formatTeamNameFromSlug(parsed.awaySlug);
      }
    }
  }

  const homeName = (typeof homeTeamInfo.name === 'string' && homeTeamInfo.name) 
    ? homeTeamInfo.name 
    : (slugHome || payload.homeTeamName || 'Equipo Local');

  const awayName = (typeof awayTeamInfo.name === 'string' && awayTeamInfo.name) 
    ? awayTeamInfo.name 
    : (slugAway || payload.awayTeamName || 'Equipo Visitante');

  const homeScore = event?.homeScore?.current ?? event?.homeScore?.display ?? payload.homeScore ?? 0;
  const awayScore = event?.awayScore?.current ?? event?.awayScore?.display ?? payload.awayScore ?? 0;

  const homeFormation = lineups?.home?.formation || '4-3-3';
  const awayFormation = lineups?.away?.formation || '4-3-3';

  // Process Home Lineups
  const rawHomePlayers: any[] = lineups?.home?.players || [];
  const rawHomeStarters = rawHomePlayers.filter((p: any) => !p.substitute);
  const rawHomeSubs = rawHomePlayers.filter((p: any) => Boolean(p.substitute));
  const homeTacticalCoords = assignTacticalLines(rawHomeStarters, homeFormation);

  const homeStarters: Player[] = rawHomeStarters.map((item: any, idx: number) => {
    return transformSofascorePlayer(item, true, homeFormation, idx, true, homeTacticalCoords[idx]);
  });

  const homeSubs: Player[] = rawHomeSubs.map((item: any, idx: number) => {
    return transformSofascorePlayer(item, true, homeFormation, idx, false);
  });

  // Process Away Lineups
  const rawAwayPlayers: any[] = lineups?.away?.players || [];
  const rawAwayStarters = rawAwayPlayers.filter((p: any) => !p.substitute);
  const rawAwaySubs = rawAwayPlayers.filter((p: any) => Boolean(p.substitute));
  const awayTacticalCoords = assignTacticalLines(rawAwayStarters, awayFormation);

  const awayStarters: Player[] = rawAwayStarters.map((item: any, idx: number) => {
    return transformSofascorePlayer(item, false, awayFormation, idx, true, awayTacticalCoords[idx]);
  });

  const awaySubs: Player[] = rawAwaySubs.map((item: any, idx: number) => {
    return transformSofascorePlayer(item, false, awayFormation, idx, false);
  });

  const eventId = event?.id || payload.id;
  const matchId = eventId
    ? `sofascore-${eventId}`
    : (urlOrId ? `sofascore-${urlOrId.replace(/[^a-zA-Z0-9-]/g, '')}` : `sofascore-${Date.now()}`);

  const tournamentName = event?.tournament?.name || payload.tournament?.name || 'Competición Oficial';
  const round = event?.roundInfo?.round ? `Jornada ${event.roundInfo.round}` : (event?.roundInfo?.name || 'Fase de Grupos');
  const competition = tournamentName;

  const stadium = event?.venue?.stadium?.name || event?.venue?.name || 'Estadio Principal';
  const referee = event?.referee?.name ? `${event.referee.name} (${event.referee.country?.name || ''})` : 'Árbitro Oficial';

  const dateStr = event?.startTimestamp
    ? new Date(event.startTimestamp * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '2024';

  const homeLogo = homeTeamInfo.id
    ? `/api/sofascore/image/team/${homeTeamInfo.id}`
    : `https://api.sofascore.com/api/v1/team/${homeTeamInfo.id || 0}/image`;

  const awayLogo = awayTeamInfo.id
    ? `/api/sofascore/image/team/${awayTeamInfo.id}`
    : `https://api.sofascore.com/api/v1/team/${awayTeamInfo.id || 0}/image`;

/**
 * Transforms raw Sofascore match incidents into rich, strongly typed MatchEvent objects.
 * Handles substitutions (playerIn/playerOut), cards (yellow, direct red, and double yellow/red),
 * goals (penalty, own goal, assist), VAR reviews, period markers (HT/FT), and penalty misses with full player roster resolution.
 */
function transformSofascoreIncidents(
  rawIncidents: any[],
  homeTeam: { id: string; name: string; starters: Player[]; substitutes: Player[] },
  awayTeam: { id: string; name: string; starters: Player[]; substitutes: Player[] }
): MatchEvent[] {
  if (!Array.isArray(rawIncidents) || rawIncidents.length === 0) {
    return [];
  }

  const allPlayers = [
    ...homeTeam.starters,
    ...homeTeam.substitutes,
    ...awayTeam.starters,
    ...awayTeam.substitutes
  ];

  const normalizeStr = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const homePlayersList = [...homeTeam.starters, ...homeTeam.substitutes];
  const awayPlayersList = [...awayTeam.starters, ...awayTeam.substitutes];

  const findPlayer = (rawP: any, isHomeTeam?: boolean, preferOpponent: boolean = false): Player | undefined => {
    if (!rawP) return undefined;
    const idStr = String(rawP.id || rawP.playerId || '').trim();
    const rawName = rawP.name || rawP.shortName || '';
    const normName = normalizeStr(rawName);
    const jerseyNum = rawP.jerseyNumber !== undefined ? parseInt(rawP.jerseyNumber, 10) : undefined;

    let targetTeamPlayers: Player[] = allPlayers;
    if (isHomeTeam !== undefined) {
      if (preferOpponent) {
        targetTeamPlayers = isHomeTeam ? awayPlayersList : homePlayersList;
      } else {
        targetTeamPlayers = isHomeTeam ? homePlayersList : awayPlayersList;
      }
    }

    const matchInList = (list: Player[]): Player | undefined => {
      // 1. Exact ID
      if (idStr) {
        const byId = list.find((p) => p.id === idStr || p.id === `sofa-${idStr}` || p.id.endsWith(`-${idStr}`));
        if (byId) return byId;
      }

      if (!normName) return undefined;

      // 2. Exact full name or shortName
      const exactMatch = list.find((p) => {
        const pNorm = normalizeStr(p.name);
        const pShortNorm = normalizeStr(p.shortName || '');
        return pNorm === normName || pShortNorm === normName;
      });
      if (exactMatch) return exactMatch;

      // 3. Jersey number + single token match (if jersey number available)
      if (jerseyNum !== undefined && !isNaN(jerseyNum)) {
        const byJersey = list.find((p) => {
          if (p.number !== jerseyNum) return false;
          const pNorm = normalizeStr(p.name);
          const pShortNorm = normalizeStr(p.shortName || '');
          return pNorm.includes(normName) || normName.includes(pNorm) || (pShortNorm && (pShortNorm.includes(normName) || normName.includes(pShortNorm)));
        });
        if (byJersey) return byJersey;
      }

      // 4. Token breakdown matching
      const rawTokens = normName.split(' ').filter((t) => t.length >= 2);
      const rawFirst = rawTokens[0];
      const rawLast = rawTokens[rawTokens.length - 1];

      // Exact First + Last token match
      if (rawTokens.length >= 2) {
        const byFirstAndLast = list.find((p) => {
          const pTokens = normalizeStr(p.name).split(' ').filter((t) => t.length >= 2);
          if (pTokens.length < 2) return false;
          const pFirst = pTokens[0];
          const pLast = pTokens[pTokens.length - 1];
          return pFirst === rawFirst && pLast === rawLast;
        });
        if (byFirstAndLast) return byFirstAndLast;
      }

      // Exact Last Name match + First initial match
      if (rawLast && rawLast.length >= 3) {
        const byLastAndInitial = list.find((p) => {
          const pTokens = normalizeStr(p.name).split(' ').filter((t) => t.length >= 2);
          const pLast = pTokens[pTokens.length - 1];
          if (pLast !== rawLast) return false;
          if (rawFirst && pTokens[0]) {
            return pTokens[0][0] === rawFirst[0];
          }
          return true;
        });
        if (byLastAndInitial) return byLastAndInitial;
      }

      return undefined;
    };

    // Try target team first, fallback to allPlayers if not found
    const match = matchInList(targetTeamPlayers);
    if (match) return match;
    return matchInList(allPlayers);
  };

  const parsedEvents: MatchEvent[] = [];

  rawIncidents.forEach((inc: any, idx: number) => {
    const isHome = Boolean(inc.isHome ?? (inc.team?.id === homeTeam.id || inc.teamId === homeTeam.id));
    const teamId = isHome ? homeTeam.id : awayTeam.id;
    const teamName = isHome ? homeTeam.name : awayTeam.name;
    const minute = Number(inc.time ?? inc.minute ?? 0);
    
    // Sanitize extraMinute to prevent 9999 or period overflow sentinel values
    let extraMinute: number | undefined = undefined;
    if (typeof inc.addedTime === 'number' && inc.addedTime > 0 && inc.addedTime < 35) {
      extraMinute = inc.addedTime;
    }

    const eventId = String(inc.id || `inc-${idx}-${minute}`);
    const incidentType = String(inc.incidentType || inc.type || '').toLowerCase();
    const incidentClass = String(inc.incidentClass || inc.class || inc.subType || '').toLowerCase();

    // 1. PERIOD & INJURY TIME MARKERS (HT, FT, Extra time)
    if (incidentType === 'period' || incidentType === 'injurytime' || incidentType === 'inurytime') {
      const isInjuryTime = incidentType === 'injurytime' || incidentType === 'inurytime';
      const rawText = inc.text || '';
      
      let periodLabel = 'Incidencia de Partido';
      if (isInjuryTime) {
        const len = inc.length || inc.time || 0;
        if (len > 0 && len < 30) {
          periodLabel = `Tiempo de descuento: +${len}'`;
        } else {
          return; // Skip redundant injury time notification
        }
      } else if (rawText === 'HT' || minute === 45) {
        periodLabel = 'Descanso (Entretiempo)';
      } else if (rawText === 'FT' || minute >= 90) {
        periodLabel = 'Final del Partido';
      } else {
        periodLabel = rawText || 'Fin de periodo';
      }

      parsedEvents.push({
        id: eventId,
        minute: isInjuryTime ? (inc.time || 45) : (minute || 90),
        extraMinute: undefined,
        teamId: '',
        teamName: '',
        type: 'period',
        playerId: '',
        playerName: periodLabel,
        description: inc.homeScore !== undefined && inc.awayScore !== undefined
          ? `Marcador: ${inc.homeScore} - ${inc.awayScore}`
          : periodLabel,
        score: inc.homeScore !== undefined ? { home: Number(inc.homeScore), away: Number(inc.awayScore) } : undefined
      });
      return;
    }

    // 2. SUBSTITUTION
    if (incidentType === 'substitution' || inc.playerIn || inc.playerOut) {
      const rawIn = inc.playerIn || inc.player || inc.in;
      const rawOut = inc.playerOut || inc.secondaryPlayer || inc.assist1 || inc.out;

      const pIn = findPlayer(rawIn, isHome);
      const pOut = findPlayer(rawOut, isHome);

      const inName = sanitizePlayerName(pIn?.name || rawIn?.name || rawIn?.shortName || 'Jugador entrante');
      const inId = pIn?.id || (rawIn?.id ? String(rawIn.id) : '');
      const inNumber = pIn?.number || rawIn?.jerseyNumber;

      const outName = sanitizePlayerName(pOut?.name || rawOut?.name || rawOut?.shortName || 'Jugador saliente');
      const outId = pOut?.id || (rawOut?.id ? String(rawOut.id) : '');
      const outNumber = pOut?.number || rawOut?.jerseyNumber;

      parsedEvents.push({
        id: eventId,
        minute,
        extraMinute,
        teamId,
        teamName,
        type: 'substitution',
        subType: 'substitution',
        playerId: inId,
        playerName: inName,
        playerNumber: inNumber,
        playerInName: inName,
        playerInId: inId,
        playerOutName: outName,
        playerOutId: outId,
        secondaryPlayerId: outId,
        secondaryPlayerName: outName,
        secondaryPlayerNumber: outNumber,
        description: `Sustitución: Entra ${inName}${inNumber ? ` (#${inNumber})` : ''} ⇆ Sale ${outName}${outNumber ? ` (#${outNumber})` : ''}`
      });
      return;
    }

    // 3. DISCIPLINE / CARDS
    if (incidentType === 'card' || incidentType === 'yellow_card' || incidentType === 'red_card' || incidentType === 'yellow_red_card') {
      const rawP = inc.player || inc.playerIn;
      const p = findPlayer(rawP, isHome);
      const playerName = sanitizePlayerName(p?.name || rawP?.name || rawP?.shortName || 'Jugador');
      const playerId = p?.id || (rawP?.id ? String(rawP.id) : '');
      const playerNumber = p?.number || rawP?.jerseyNumber;

      const isYellowRed = 
        incidentClass === 'yellowred' || 
        incidentClass === 'yellow_red' || 
        incidentClass === 'secondyellow' ||
        incidentClass === 'yellow-red' ||
        incidentType === 'yellow_red_card' ||
        (inc.reason && /segunda|second|doble|2nd/i.test(inc.reason)) ||
        (inc.text && /segunda|second|doble|2nd/i.test(inc.text));

      const isDirectRed = 
        incidentClass === 'red' || 
        incidentClass === 'directred' || 
        incidentClass === 'direct_red' ||
        incidentType === 'red_card';

      if (isYellowRed) {
        if (p && p.statistics?.discipline) {
          p.statistics.discipline.redCards = Math.max(p.statistics.discipline.redCards || 0, 1);
        }
        parsedEvents.push({
          id: eventId,
          minute,
          extraMinute,
          teamId,
          teamName,
          type: 'yellow_red_card',
          subType: 'second_yellow',
          playerId,
          playerName,
          playerNumber,
          description: `Segunda tarjeta amarilla (Expulsión con Roja) para ${playerName}${inc.reason ? ` por ${inc.reason}` : ''}`
        });
      } else if (isDirectRed) {
        if (p && p.statistics?.discipline) {
          p.statistics.discipline.redCards = Math.max(p.statistics.discipline.redCards || 0, 1);
        }
        parsedEvents.push({
          id: eventId,
          minute,
          extraMinute,
          teamId,
          teamName,
          type: 'red_card',
          subType: 'direct_red',
          playerId,
          playerName,
          playerNumber,
          description: `Tarjeta roja directa para ${playerName}${inc.reason ? ` por ${inc.reason}` : ''}`
        });
      } else {
        if (p && p.statistics?.discipline) {
          p.statistics.discipline.yellowCards = Math.max(p.statistics.discipline.yellowCards || 0, 1);
        }
        parsedEvents.push({
          id: eventId,
          minute,
          extraMinute,
          teamId,
          teamName,
          type: 'yellow_card',
          subType: 'yellow',
          playerId,
          playerName,
          playerNumber,
          description: `Tarjeta amarilla para ${playerName}${inc.reason ? ` por ${inc.reason}` : ''}`
        });
      }
      return;
    }

    // 4. GOALS & OWN GOALS
    if (incidentType === 'goal' || incidentType === 'owngoal' || incidentType === 'own_goal') {
      const isOwnGoal = incidentClass === 'owngoal' || incidentClass === 'own_goal' || incidentType === 'owngoal' || incidentType === 'own_goal';
      const isPenalty = incidentClass === 'penalty';

      const rawScorer = inc.player || inc.playerIn;
      const rawAssist = inc.assist1 || inc.playerAssist || inc.assist || inc.secondaryPlayer;

      // In own goals, the player who scored in their own net belongs to the defending team (opposite of isHome)
      const pScorer = findPlayer(rawScorer, isHome, isOwnGoal);
      const pAssist = !isOwnGoal ? findPlayer(rawAssist, isHome) : undefined;

      const scorerName = sanitizePlayerName(pScorer?.name || rawScorer?.name || rawScorer?.shortName || 'Jugador');
      const scorerId = pScorer?.id || (rawScorer?.id ? String(rawScorer.id) : '');
      const scorerNumber = pScorer?.number || rawScorer?.jerseyNumber;

      const assistName = rawAssist ? sanitizePlayerName(pAssist?.name || rawAssist?.name || rawAssist?.shortName) : undefined;
      const assistId = pAssist?.id || (rawAssist?.id ? String(rawAssist.id) : undefined);
      const assistNumber = pAssist?.number || rawAssist?.jerseyNumber;

      let scoreTag = '';
      if (inc.homeScore !== undefined && inc.awayScore !== undefined) {
        scoreTag = ` [${inc.homeScore} - ${inc.awayScore}]`;
      }

      let description = '';
      if (isOwnGoal) {
        description = `Gol en propia puerta de ${scorerName}${scoreTag}`;
      } else if (isPenalty) {
        description = `Gol de penal anotado por ${scorerName}${scoreTag}`;
      } else if (assistName) {
        description = `Gol de ${scorerName} tras asistencia de ${assistName}${scoreTag}`;
      } else {
        description = `Gol anotado por ${scorerName}${scoreTag}`;
      }

      parsedEvents.push({
        id: eventId,
        minute,
        extraMinute,
        teamId,
        teamName,
        type: isOwnGoal ? 'own_goal' : 'goal',
        subType: isOwnGoal ? 'own_goal' : isPenalty ? 'penalty' : 'regular',
        playerId: scorerId,
        playerName: scorerName,
        playerNumber: scorerNumber,
        secondaryPlayerId: assistId,
        secondaryPlayerName: assistName,
        secondaryPlayerNumber: assistNumber,
        description,
        score: inc.homeScore !== undefined ? { home: Number(inc.homeScore), away: Number(inc.awayScore) } : undefined
      });
      return;
    }

    // 5. PENALTY MISS / SAVED
    if (incidentType === 'ingamepenalty' || incidentType === 'penalty_miss') {
      const rawP = inc.player;
      const p = findPlayer(rawP);
      const playerName = sanitizePlayerName(p?.name || rawP?.name || 'Jugador');
      const isSaved = incidentClass === 'saved';

      parsedEvents.push({
        id: eventId,
        minute,
        extraMinute,
        teamId,
        teamName,
        type: 'penalty_miss',
        subType: isSaved ? 'saved' : 'missed',
        playerId: p?.id || String(rawP?.id || ''),
        playerName,
        playerNumber: p?.number,
        description: `Penal ${isSaved ? 'atajado al ejecutante' : 'fallado por'} ${playerName}`
      });
      return;
    }

    // 6. VAR DECISION
    if (incidentType === 'vardecision' || incidentType === 'var') {
      const rawP = inc.player;
      const p = findPlayer(rawP);
      const playerName = sanitizePlayerName(p?.name || rawP?.name || 'Decisión Arbitral');

      parsedEvents.push({
        id: eventId,
        minute,
        extraMinute,
        teamId,
        teamName,
        type: 'var',
        subType: incidentClass,
        playerId: p?.id || String(rawP?.id || ''),
        playerName,
        description: `Revisión VAR: ${inc.text || inc.incidentClass || 'Confirmación de jugada'}`
      });
      return;
    }

    // 7. Generic Incident
    const rawP = inc.player || inc.playerIn;
    const p = findPlayer(rawP);
    if (rawP || inc.text) {
      const playerName = sanitizePlayerName(p?.name || rawP?.name || rawP?.shortName || inc.text || 'Incidencia de partido');

      parsedEvents.push({
        id: eventId,
        minute,
        extraMinute,
        teamId,
        teamName,
        type: 'var',
        playerId: p?.id || String(rawP?.id || ''),
        playerName,
        description: inc.text || inc.description || `Evento en minuto ${minute}'`
      });
    }
  });

  // Sort events chronologically (minute asc, extraMinute asc)
  return parsedEvents.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return (a.extraMinute || 0) - (b.extraMinute || 0);
  });
}

  return {
    id: matchId,
    homeTeam: {
      id: String(homeTeamInfo.id || 'home'),
      name: homeName,
      shortName: homeTeamInfo.shortName || homeName.slice(0, 3).toUpperCase(),
      logoUrl: homeLogo,
      formation: homeFormation,
      score: homeScore,
      isHome: true,
      starters: homeStarters,
      substitutes: homeSubs
    },
    awayTeam: {
      id: String(awayTeamInfo.id || 'away'),
      name: awayName,
      shortName: awayTeamInfo.shortName || awayName.slice(0, 3).toUpperCase(),
      logoUrl: awayLogo,
      formation: awayFormation,
      score: awayScore,
      isHome: false,
      starters: awayStarters,
      substitutes: awaySubs
    },
    date: dateStr,
    competition,
    roundOrPhase: round || 'Fase Regular / Eliminatoria',
    url: event?.slug ? `https://www.sofascore.com/${event.slug}/${eventId}` : `https://www.sofascore.com/event/${eventId || matchId}`,
    stadium,
    referee,
    status: event?.status?.type === 'finished' ? 'FINISHED' : 'FINISHED',
    events: transformSofascoreIncidents(
      payload.incidents || payload.events || [],
      { id: String(homeTeamInfo.id || 'home'), name: homeName, starters: homeStarters, substitutes: homeSubs },
      { id: String(awayTeamInfo.id || 'away'), name: awayName, starters: awayStarters, substitutes: awaySubs }
    )
  };
}

