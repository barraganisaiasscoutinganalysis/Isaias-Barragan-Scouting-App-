import { MatchDetails, HeatmapPoint, PlayerActionPoint } from '../../types/scouting';

/**
 * Procedural generator for natural football heatmaps and action coordinates based on position
 */
export function generatePositionHeatmap(position: string, minutes: number): HeatmapPoint[] {
  if (minutes === 0) return [];

  const points: HeatmapPoint[] = [];
  const baseCount = Math.min(65, Math.floor(minutes * 0.7) + 12);

  // Position cluster anchors (0-100 x: length from own goal to opp goal, y: width 0 to 100)
  let anchors: { x: number; y: number; weight: number }[] = [];

  switch (position) {
    case 'GK':
      anchors = [
        { x: 8, y: 50, weight: 0.7 },
        { x: 14, y: 50, weight: 0.4 },
        { x: 6, y: 35, weight: 0.2 },
        { x: 6, y: 65, weight: 0.2 },
      ];
      break;
    case 'CB':
      anchors = [
        { x: 26, y: 40, weight: 0.6 },
        { x: 34, y: 42, weight: 0.5 },
        { x: 18, y: 45, weight: 0.4 },
        { x: 45, y: 48, weight: 0.2 },
      ];
      break;
    case 'LB':
      anchors = [
        { x: 30, y: 15, weight: 0.6 },
        { x: 55, y: 12, weight: 0.7 },
        { x: 72, y: 14, weight: 0.5 },
        { x: 82, y: 16, weight: 0.3 },
      ];
      break;
    case 'RB':
      anchors = [
        { x: 30, y: 85, weight: 0.6 },
        { x: 55, y: 88, weight: 0.7 },
        { x: 72, y: 86, weight: 0.5 },
        { x: 82, y: 84, weight: 0.3 },
      ];
      break;
    case 'CDM':
    case 'CM':
      anchors = [
        { x: 44, y: 50, weight: 0.8 },
        { x: 52, y: 35, weight: 0.6 },
        { x: 52, y: 65, weight: 0.6 },
        { x: 36, y: 50, weight: 0.5 },
        { x: 65, y: 50, weight: 0.4 },
      ];
      break;
    case 'CAM':
      anchors = [
        { x: 66, y: 50, weight: 0.8 },
        { x: 72, y: 35, weight: 0.6 },
        { x: 72, y: 65, weight: 0.6 },
        { x: 82, y: 50, weight: 0.5 },
      ];
      break;
    case 'LW':
    case 'LM':
      anchors = [
        { x: 68, y: 15, weight: 0.8 },
        { x: 82, y: 18, weight: 0.7 },
        { x: 78, y: 28, weight: 0.5 },
        { x: 52, y: 15, weight: 0.4 },
      ];
      break;
    case 'RW':
    case 'RM':
      anchors = [
        { x: 68, y: 85, weight: 0.8 },
        { x: 82, y: 82, weight: 0.7 },
        { x: 78, y: 72, weight: 0.5 },
        { x: 52, y: 85, weight: 0.4 },
      ];
      break;
    case 'ST':
    case 'CF':
      anchors = [
        { x: 84, y: 50, weight: 0.8 },
        { x: 76, y: 42, weight: 0.6 },
        { x: 76, y: 58, weight: 0.6 },
        { x: 91, y: 50, weight: 0.5 },
      ];
      break;
    default:
      anchors = [{ x: 50, y: 50, weight: 0.6 }];
  }

  for (let i = 0; i < baseCount; i++) {
    const anchor = anchors[i % anchors.length];
    const spread = 12;
    const x = Math.max(3, Math.min(97, anchor.x + (Math.random() - 0.5) * spread * 2));
    const y = Math.max(4, Math.min(96, anchor.y + (Math.random() - 0.5) * spread * 2));
    const intensity = Number((Math.min(1.0, Math.max(0.2, anchor.weight * (0.6 + Math.random() * 0.4)))).toFixed(2));

    points.push({ x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), intensity });
  }

  return points;
}

export function generatePlayerActions(position: string, minutes: number): PlayerActionPoint[] {
  if (minutes === 0) return [];
  const actions: PlayerActionPoint[] = [];
  const count = Math.min(25, Math.floor(minutes / 4));

  const types: PlayerActionPoint['type'][] = 
    position === 'GK' ? ['pass', 'carry'] :
    ['DF', 'CB', 'LB', 'RB'].includes(position) ? ['pass', 'tackle', 'aerial', 'cross', 'carry'] :
    ['ST', 'CF', 'LW', 'RW'].includes(position) ? ['shot', 'pass', 'cross', 'carry', 'foul'] :
    ['pass', 'tackle', 'carry', 'cross', 'shot'];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const minute = Math.floor(Math.random() * minutes) + 1;
    const outcome = Math.random() > 0.22 ? 'success' : 'failed';
    const x = Math.floor(Math.random() * 85) + 10;
    const y = Math.floor(Math.random() * 85) + 8;

    actions.push({
      id: `act-${i}-${minute}`,
      minute,
      x,
      y,
      type,
      outcome,
      label: `${minute}' ${type.toUpperCase()}`
    });
  }

  return actions.sort((a, b) => a.minute - b.minute);
}

export const MOCK_REAL_MADRID_VS_MAN_CITY: MatchDetails = {
  id: "sofascore-123456",
  url: "https://www.sofascore.com/real-madrid-manchester-city/hsbjsgb#id:123456",
  competition: "UEFA Champions League",
  competitionLogo: "https://img.sofascore.com/api/v1/unique-tournament/7/image",
  roundOrPhase: "Cuartos de final - Vuelta",
  date: "17 Abr 2024, 21:00 CEST",
  stadium: "Etihad Stadium, Manchester",
  referee: "Daniele Orsato (Italia)",
  status: "FINISHED",
  homeTeam: {
    id: "mancity",
    name: "Manchester City",
    shortName: "MCI",
    logoUrl: "https://img.sofascore.com/api/v1/team/17/image",
    formation: "4-1-4-1",
    score: 1,
    isHome: true,
    starters: [
      {
        id: "ederson-31",
        name: "Ederson",
        shortName: "Ederson",
        number: 31,
        position: "GK",
        positionLabel: "POR",
        nationality: "Brasil",
        nationalityCode: "BR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/138534/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 0, col: 2 },
        statistics: {
          rating: 7.2,
          minutesPlayed: 120,
          goalkeeper: {
            saves: 4,
            goalsConceded: 1,
            savesInsideBox: 3,
            punches: 1,
            runsOut: 2,
            passesAttempted: 42,
            passingAccuracy: 88
          },
          passing: {
            passesAttempted: 42,
            passesCompleted: 37,
            passingAccuracy: 88,
            keyPasses: 0,
            crossesTotal: 0,
            crossesAccurate: 0,
            longBallsTotal: 12,
            longBallsAccurate: 8
          },
          discipline: { foulsCommitted: 0, foulsDrawn: 0, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('GK', 120),
        actionPoints: generatePlayerActions('GK', 120)
      },
      {
        id: "kyle-walker-2",
        name: "Kyle Walker",
        shortName: "K. Walker",
        number: 2,
        position: "DF",
        positionLabel: "LD",
        nationality: "Inglaterra",
        nationalityCode: "GB-ENG",
        avatarUrl: "https://img.sofascore.com/api/v1/player/41982/image",
        isStarter: true,
        minutesPlayed: 120,
        captain: true,
        formationPosition: { row: 1, col: 4 },
        statistics: {
          rating: 7.4,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 1, shotsOnTarget: 0, bigChancesCreated: 0, touchesInOppBox: 2, dribblesAttempted: 3, dribblesSucceeded: 2 },
          passing: { passesAttempted: 98, passesCompleted: 89, passingAccuracy: 91, keyPasses: 1, crossesTotal: 4, crossesAccurate: 1, longBallsTotal: 5, longBallsAccurate: 3 },
          defense: { tackles: 3, interceptions: 2, clearances: 4, duelsTotal: 9, duelsWon: 7, recoveries: 6, blockedShots: 1 },
          discipline: { foulsCommitted: 1, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RB', 120),
        actionPoints: generatePlayerActions('RB', 120)
      },
      {
        id: "manuel-akanji-25",
        name: "Manuel Akanji",
        shortName: "M. Akanji",
        number: 25,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Suiza",
        nationalityCode: "CH",
        avatarUrl: "https://img.sofascore.com/api/v1/player/345511/image",
        isStarter: true,
        minutesPlayed: 112,
        formationPosition: { row: 1, col: 3 },
        statistics: {
          rating: 7.3,
          minutesPlayed: 112,
          attack: { goals: 0, assists: 0, shots: 2, shotsOnTarget: 0, bigChancesCreated: 1, touchesInOppBox: 1 },
          passing: { passesAttempted: 114, passesCompleted: 108, passingAccuracy: 95, keyPasses: 2, longBallsTotal: 7, longBallsAccurate: 5 },
          defense: { tackles: 2, interceptions: 1, clearances: 2, duelsTotal: 6, duelsWon: 4, recoveries: 5 },
          discipline: { foulsCommitted: 1, foulsDrawn: 0, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 112),
        actionPoints: generatePlayerActions('CB', 112)
      },
      {
        id: "ruben-dias-3",
        name: "Rúben Dias",
        shortName: "R. Dias",
        number: 3,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Portugal",
        nationalityCode: "PT",
        avatarUrl: "https://img.sofascore.com/api/v1/player/365111/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 1, col: 1 },
        statistics: {
          rating: 7.1,
          minutesPlayed: 120,
          passing: { passesAttempted: 126, passesCompleted: 119, passingAccuracy: 94, keyPasses: 0, longBallsTotal: 6, longBallsAccurate: 4 },
          defense: { tackles: 1, interceptions: 3, clearances: 3, duelsTotal: 5, duelsWon: 4, recoveries: 8 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 120),
        actionPoints: generatePlayerActions('CB', 120)
      },
      {
        id: "josko-gvardiol-24",
        name: "Joško Gvardiol",
        shortName: "J. Gvardiol",
        number: 24,
        position: "DF",
        positionLabel: "LI",
        nationality: "Croacia",
        nationalityCode: "HR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/985514/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 1, col: 0 },
        statistics: {
          rating: 7.8,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 3, shotsOnTarget: 1, bigChancesCreated: 1, touchesInOppBox: 6, dribblesAttempted: 4, dribblesSucceeded: 3 },
          passing: { passesAttempted: 134, passesCompleted: 121, passingAccuracy: 90, keyPasses: 3, crossesTotal: 5, crossesAccurate: 2, longBallsTotal: 8, longBallsAccurate: 6 },
          defense: { tackles: 4, interceptions: 4, clearances: 2, duelsTotal: 14, duelsWon: 10, recoveries: 9 },
          discipline: { foulsCommitted: 2, foulsDrawn: 2, yellowCards: 1, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('LB', 120),
        actionPoints: generatePlayerActions('LB', 120)
      },
      {
        id: "rodri-16",
        name: "Rodrigo Hernández",
        shortName: "Rodri",
        number: 16,
        position: "MF",
        positionLabel: "MCD",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/787258/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 2, col: 2 },
        statistics: {
          rating: 8.4,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 4, shotsOnTarget: 2, bigChancesCreated: 1, touchesInOppBox: 4 },
          passing: { passesAttempted: 157, passesCompleted: 142, passingAccuracy: 90, keyPasses: 4, crossesTotal: 2, crossesAccurate: 1, longBallsTotal: 11, longBallsAccurate: 9 },
          defense: { tackles: 5, interceptions: 3, clearances: 3, duelsTotal: 18, duelsWon: 13, recoveries: 14 },
          discipline: { foulsCommitted: 2, foulsDrawn: 3, yellowCards: 1, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CDM', 120),
        actionPoints: generatePlayerActions('CDM', 120)
      },
      {
        id: "bernardo-silva-20",
        name: "Bernardo Silva",
        shortName: "B. Silva",
        number: 20,
        position: "MF",
        positionLabel: "ED",
        nationality: "Portugal",
        nationalityCode: "PT",
        avatarUrl: "https://img.sofascore.com/api/v1/player/182512/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 3, col: 4 },
        statistics: {
          rating: 7.7,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 2, shotsOnTarget: 1, bigChancesCreated: 2, touchesInOppBox: 7, dribblesAttempted: 5, dribblesSucceeded: 3 },
          passing: { passesAttempted: 104, passesCompleted: 95, passingAccuracy: 91, keyPasses: 4, crossesTotal: 8, crossesAccurate: 3, longBallsTotal: 3, longBallsAccurate: 2 },
          defense: { tackles: 3, interceptions: 1, clearances: 0, duelsTotal: 11, duelsWon: 6, recoveries: 5 },
          discipline: { foulsCommitted: 1, foulsDrawn: 2, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RW', 120),
        actionPoints: generatePlayerActions('RW', 120)
      },
      {
        id: "kevin-de-bruyne-17",
        name: "Kevin De Bruyne",
        shortName: "K. De Bruyne",
        number: 17,
        position: "MF",
        positionLabel: "MC",
        nationality: "Bélgica",
        nationalityCode: "BE",
        avatarUrl: "https://img.sofascore.com/api/v1/player/70361/image",
        isStarter: true,
        minutesPlayed: 112,
        formationPosition: { row: 3, col: 3 },
        statistics: {
          rating: 8.6,
          minutesPlayed: 112,
          attack: { goals: 1, assists: 0, shots: 7, shotsOnTarget: 3, bigChancesCreated: 3, touchesInOppBox: 9, dribblesAttempted: 4, dribblesSucceeded: 2 },
          passing: { passesAttempted: 92, passesCompleted: 74, passingAccuracy: 80, keyPasses: 6, crossesTotal: 17, crossesAccurate: 6, longBallsTotal: 7, longBallsAccurate: 4 },
          defense: { tackles: 1, interceptions: 1, clearances: 1, duelsTotal: 7, duelsWon: 3, recoveries: 7 },
          discipline: { foulsCommitted: 1, foulsDrawn: 2, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CAM', 112),
        actionPoints: generatePlayerActions('CAM', 112)
      },
      {
        id: "phil-foden-47",
        name: "Phil Foden",
        shortName: "P. Foden",
        number: 47,
        position: "MF",
        positionLabel: "MC",
        nationality: "Inglaterra",
        nationalityCode: "GB-ENG",
        avatarUrl: "https://img.sofascore.com/api/v1/player/847721/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 3, col: 1 },
        statistics: {
          rating: 7.9,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 5, shotsOnTarget: 2, bigChancesCreated: 1, touchesInOppBox: 6, dribblesAttempted: 6, dribblesSucceeded: 4 },
          passing: { passesAttempted: 88, passesCompleted: 79, passingAccuracy: 90, keyPasses: 3, crossesTotal: 4, crossesAccurate: 1, longBallsTotal: 4, longBallsAccurate: 3 },
          defense: { tackles: 2, interceptions: 1, clearances: 0, duelsTotal: 12, duelsWon: 7, recoveries: 6 },
          discipline: { foulsCommitted: 0, foulsDrawn: 3, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CAM', 120),
        actionPoints: generatePlayerActions('CAM', 120)
      },
      {
        id: "jack-grealish-10",
        name: "Jack Grealish",
        shortName: "J. Grealish",
        number: 10,
        position: "MF",
        positionLabel: "EI",
        nationality: "Inglaterra",
        nationalityCode: "GB-ENG",
        avatarUrl: "https://img.sofascore.com/api/v1/player/228945/image",
        isStarter: true,
        minutesPlayed: 72,
        formationPosition: { row: 3, col: 0 },
        statistics: {
          rating: 7.3,
          minutesPlayed: 72,
          attack: { goals: 0, assists: 0, shots: 3, shotsOnTarget: 2, bigChancesCreated: 1, touchesInOppBox: 8, dribblesAttempted: 5, dribblesSucceeded: 4 },
          passing: { passesAttempted: 44, passesCompleted: 40, passingAccuracy: 91, keyPasses: 2, crossesTotal: 3, crossesAccurate: 1 },
          defense: { tackles: 1, interceptions: 0, clearances: 0, duelsTotal: 9, duelsWon: 6, recoveries: 3 },
          discipline: { foulsCommitted: 0, foulsDrawn: 4, yellowCards: 1, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('LW', 72),
        actionPoints: generatePlayerActions('LW', 72)
      },
      {
        id: "erling-haaland-9",
        name: "Erling Haaland",
        shortName: "E. Haaland",
        number: 9,
        position: "FW",
        positionLabel: "DC",
        nationality: "Noruega",
        nationalityCode: "NO",
        avatarUrl: "https://img.sofascore.com/api/v1/player/839956/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 4, col: 2 },
        statistics: {
          rating: 6.9,
          minutesPlayed: 90,
          attack: { goals: 0, assists: 0, shots: 5, shotsOnTarget: 1, bigChancesCreated: 0, touchesInOppBox: 7, dribblesAttempted: 1, dribblesSucceeded: 0 },
          passing: { passesAttempted: 11, passesCompleted: 7, passingAccuracy: 64, keyPasses: 1 },
          defense: { tackles: 0, interceptions: 0, clearances: 2, duelsTotal: 10, duelsWon: 4, recoveries: 1 },
          discipline: { foulsCommitted: 2, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('ST', 90),
        actionPoints: generatePlayerActions('ST', 90)
      }
    ],
    substitutes: [
      {
        id: "jeremy-doku-11",
        name: "Jérémy Doku",
        shortName: "J. Doku",
        number: 11,
        position: "FW",
        positionLabel: "EI",
        nationality: "Bélgica",
        nationalityCode: "BE",
        avatarUrl: "https://img.sofascore.com/api/v1/player/965825/image",
        isStarter: false,
        minutesPlayed: 48,
        statistics: {
          rating: 7.8,
          minutesPlayed: 48,
          attack: { goals: 0, assists: 1, shots: 2, shotsOnTarget: 0, bigChancesCreated: 2, touchesInOppBox: 12, dribblesAttempted: 11, dribblesSucceeded: 7 },
          passing: { passesAttempted: 28, passesCompleted: 23, passingAccuracy: 82, keyPasses: 3, crossesTotal: 8, crossesAccurate: 3 },
          defense: { tackles: 1, interceptions: 0, clearances: 0, duelsTotal: 14, duelsWon: 9, recoveries: 2 },
          discipline: { foulsCommitted: 1, foulsDrawn: 3, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('LW', 48),
        actionPoints: generatePlayerActions('LW', 48)
      },
      {
        id: "julian-alvarez-19",
        name: "Julián Álvarez",
        shortName: "J. Álvarez",
        number: 19,
        position: "FW",
        positionLabel: "DC",
        nationality: "Argentina",
        nationalityCode: "AR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/926705/image",
        isStarter: false,
        minutesPlayed: 30,
        statistics: {
          rating: 7.0,
          minutesPlayed: 30,
          attack: { goals: 0, assists: 0, shots: 2, shotsOnTarget: 1, bigChancesCreated: 0, touchesInOppBox: 4 },
          passing: { passesAttempted: 14, passesCompleted: 12, passingAccuracy: 86, keyPasses: 1 },
          defense: { tackles: 1, interceptions: 0, clearances: 0, duelsTotal: 3, duelsWon: 2, recoveries: 1 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('ST', 30),
        actionPoints: generatePlayerActions('ST', 30)
      },
      {
        id: "mateo-kovacic-8",
        name: "Mateo Kovačić",
        shortName: "M. Kovačić",
        number: 8,
        position: "MF",
        positionLabel: "MC",
        nationality: "Croacia",
        nationalityCode: "HR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/138876/image",
        isStarter: false,
        minutesPlayed: 8,
        statistics: {
          rating: 6.6,
          minutesPlayed: 8,
          passing: { passesAttempted: 9, passesCompleted: 8, passingAccuracy: 89, keyPasses: 0 },
          defense: { tackles: 0, interceptions: 0, clearances: 0, duelsTotal: 1, duelsWon: 1, recoveries: 1 },
          discipline: { foulsCommitted: 0, foulsDrawn: 0, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 8),
        actionPoints: generatePlayerActions('CM', 8)
      },
      {
        id: "john-stones-5",
        name: "John Stones",
        shortName: "J. Stones",
        number: 5,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Inglaterra",
        nationalityCode: "GB-ENG",
        avatarUrl: "https://img.sofascore.com/api/v1/player/176545/image",
        isStarter: false,
        minutesPlayed: 8,
        statistics: {
          rating: 6.5,
          minutesPlayed: 8,
          passing: { passesAttempted: 7, passesCompleted: 6, passingAccuracy: 86 },
          defense: { tackles: 0, interceptions: 0, clearances: 1, duelsTotal: 1, duelsWon: 1, recoveries: 0 },
          discipline: { foulsCommitted: 0, foulsDrawn: 0, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 8),
        actionPoints: generatePlayerActions('CB', 8)
      },
      {
        id: "stefan-ortega-18",
        name: "Stefan Ortega",
        shortName: "S. Ortega",
        number: 18,
        position: "GK",
        positionLabel: "POR",
        nationality: "Alemania",
        nationalityCode: "DE",
        avatarUrl: "https://img.sofascore.com/api/v1/player/110541/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: {
          minutesPlayed: 0
        },
        heatmapPoints: [],
        actionPoints: []
      },
      {
        id: "ricoh-lewis-82",
        name: "Rico Lewis",
        shortName: "R. Lewis",
        number: 82,
        position: "DF",
        positionLabel: "LD",
        nationality: "Inglaterra",
        nationalityCode: "GB-ENG",
        avatarUrl: "https://img.sofascore.com/api/v1/player/1049581/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      },
      {
        id: "sergio-gomez-21",
        name: "Sergio Gómez",
        shortName: "S. Gómez",
        number: 21,
        position: "DF",
        positionLabel: "LI",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/863934/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      },
      {
        id: "matheus-nunes-27",
        name: "Matheus Nunes",
        shortName: "M. Nunes",
        number: 27,
        position: "MF",
        positionLabel: "MC",
        nationality: "Portugal",
        nationalityCode: "PT",
        avatarUrl: "https://img.sofascore.com/api/v1/player/951235/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      }
    ]
  },
  awayTeam: {
    id: "realmadrid",
    name: "Real Madrid",
    shortName: "RMA",
    logoUrl: "https://img.sofascore.com/api/v1/team/2829/image",
    formation: "4-2-3-1",
    score: 1,
    isHome: false,
    starters: [
      {
        id: "andriy-lunin-13",
        name: "Andriy Lunin",
        shortName: "A. Lunin",
        number: 13,
        position: "GK",
        positionLabel: "POR",
        nationality: "Ucrania",
        nationalityCode: "UA",
        avatarUrl: "https://img.sofascore.com/api/v1/player/836412/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 0, col: 2 },
        statistics: {
          rating: 9.3,
          minutesPlayed: 120,
          goalkeeper: {
            saves: 8,
            goalsConceded: 1,
            savesInsideBox: 6,
            punches: 3,
            runsOut: 2,
            passesAttempted: 51,
            passingAccuracy: 61
          },
          passing: {
            passesAttempted: 51,
            passesCompleted: 31,
            passingAccuracy: 61,
            longBallsTotal: 34,
            longBallsAccurate: 14
          },
          defense: { clearances: 4, recoveries: 7 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('GK', 120),
        actionPoints: generatePlayerActions('GK', 120)
      },
      {
        id: "dani-carvajal-2",
        name: "Dani Carvajal",
        shortName: "D. Carvajal",
        number: 2,
        position: "DF",
        positionLabel: "LD",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/138541/image",
        isStarter: true,
        minutesPlayed: 110,
        formationPosition: { row: 1, col: 3 },
        statistics: {
          rating: 7.9,
          minutesPlayed: 110,
          attack: { goals: 0, assists: 0, shots: 0, touchesInOppBox: 1 },
          passing: { passesAttempted: 46, passesCompleted: 38, passingAccuracy: 83, keyPasses: 1, longBallsTotal: 6, longBallsAccurate: 4 },
          defense: { tackles: 6, interceptions: 4, clearances: 7, duelsTotal: 16, duelsWon: 11, recoveries: 5, blockedShots: 2 },
          discipline: { foulsCommitted: 3, foulsDrawn: 2, yellowCards: 1, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RB', 110),
        actionPoints: generatePlayerActions('RB', 110)
      },
      {
        id: "antonio-rudiger-22",
        name: "Antonio Rüdiger",
        shortName: "A. Rüdiger",
        number: 22,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Alemania",
        nationalityCode: "DE",
        avatarUrl: "https://img.sofascore.com/api/v1/player/132483/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 1, col: 2 },
        statistics: {
          rating: 8.2,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 1, touchesInOppBox: 1 },
          passing: { passesAttempted: 41, passesCompleted: 34, passingAccuracy: 83, longBallsTotal: 8, longBallsAccurate: 4 },
          defense: { tackles: 3, interceptions: 3, clearances: 11, duelsTotal: 12, duelsWon: 8, recoveries: 8, blockedShots: 3 },
          discipline: { foulsCommitted: 1, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 120),
        actionPoints: generatePlayerActions('CB', 120)
      },
      {
        id: "nacho-fernandez-6",
        name: "Nacho Fernández",
        shortName: "Nacho",
        number: 6,
        position: "DF",
        positionLabel: "DFC",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/103984/image",
        isStarter: true,
        minutesPlayed: 120,
        captain: true,
        formationPosition: { row: 1, col: 1 },
        statistics: {
          rating: 7.7,
          minutesPlayed: 120,
          passing: { passesAttempted: 38, passesCompleted: 32, passingAccuracy: 84, longBallsTotal: 5, longBallsAccurate: 3 },
          defense: { tackles: 2, interceptions: 2, clearances: 8, duelsTotal: 9, duelsWon: 6, recoveries: 6, blockedShots: 2 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 120),
        actionPoints: generatePlayerActions('CB', 120)
      },
      {
        id: "ferland-mendy-23",
        name: "Ferland Mendy",
        shortName: "F. Mendy",
        number: 23,
        position: "DF",
        positionLabel: "LI",
        nationality: "Francia",
        nationalityCode: "FR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/786204/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 1, col: 0 },
        statistics: {
          rating: 7.3,
          minutesPlayed: 120,
          passing: { passesAttempted: 39, passesCompleted: 36, passingAccuracy: 92, longBallsTotal: 3, longBallsAccurate: 2 },
          defense: { tackles: 3, interceptions: 2, clearances: 5, duelsTotal: 8, duelsWon: 5, recoveries: 5 },
          discipline: { foulsCommitted: 1, foulsDrawn: 1, yellowCards: 1, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('LB', 120),
        actionPoints: generatePlayerActions('LB', 120)
      },
      {
        id: "eduardo-camavinga-12",
        name: "Eduardo Camavinga",
        shortName: "E. Camavinga",
        number: 12,
        position: "MF",
        positionLabel: "MCD",
        nationality: "Francia",
        nationalityCode: "FR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/989203/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 2, col: 1 },
        statistics: {
          rating: 7.5,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 1, touchesInOppBox: 1, dribblesAttempted: 3, dribblesSucceeded: 2 },
          passing: { passesAttempted: 58, passesCompleted: 49, passingAccuracy: 84, keyPasses: 0, longBallsTotal: 4, longBallsAccurate: 2 },
          defense: { tackles: 4, interceptions: 2, clearances: 3, duelsTotal: 15, duelsWon: 9, recoveries: 8 },
          discipline: { foulsCommitted: 2, foulsDrawn: 2, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CDM', 120),
        actionPoints: generatePlayerActions('CDM', 120)
      },
      {
        id: "toni-kroos-8",
        name: "Toni Kroos",
        shortName: "T. Kroos",
        number: 8,
        position: "MF",
        positionLabel: "MC",
        nationality: "Alemania",
        nationalityCode: "DE",
        avatarUrl: "https://img.sofascore.com/api/v1/player/132488/image",
        isStarter: true,
        minutesPlayed: 79,
        formationPosition: { row: 2, col: 2 },
        statistics: {
          rating: 7.4,
          minutesPlayed: 79,
          passing: { passesAttempted: 52, passesCompleted: 48, passingAccuracy: 92, keyPasses: 1, longBallsTotal: 7, longBallsAccurate: 6 },
          defense: { tackles: 2, interceptions: 1, clearances: 2, duelsTotal: 6, duelsWon: 4, recoveries: 6 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 79),
        actionPoints: generatePlayerActions('CM', 79)
      },
      {
        id: "federico-valverde-15",
        name: "Federico Valverde",
        shortName: "F. Valverde",
        number: 15,
        position: "MF",
        positionLabel: "MD",
        nationality: "Uruguay",
        nationalityCode: "UY",
        avatarUrl: "https://img.sofascore.com/api/v1/player/828236/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 3, col: 3 },
        statistics: {
          rating: 8.0,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 1, touchesInOppBox: 2, dribblesAttempted: 2, dribblesSucceeded: 1 },
          passing: { passesAttempted: 54, passesCompleted: 46, passingAccuracy: 85, keyPasses: 1, crossesTotal: 2, crossesAccurate: 1, longBallsTotal: 5, longBallsAccurate: 4 },
          defense: { tackles: 4, interceptions: 3, clearances: 4, duelsTotal: 13, duelsWon: 8, recoveries: 9 },
          discipline: { foulsCommitted: 1, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RM', 120),
        actionPoints: generatePlayerActions('RM', 120)
      },
      {
        id: "jude-bellingham-5",
        name: "Jude Bellingham",
        shortName: "J. Bellingham",
        number: 5,
        position: "MF",
        positionLabel: "MCO",
        nationality: "Inglaterra",
        nationalityCode: "GB-ENG",
        avatarUrl: "https://img.sofascore.com/api/v1/player/991011/image",
        isStarter: true,
        minutesPlayed: 120,
        formationPosition: { row: 3, col: 1 },
        statistics: {
          rating: 7.6,
          minutesPlayed: 120,
          attack: { goals: 0, assists: 0, shots: 1, bigChancesCreated: 1, touchesInOppBox: 4, dribblesAttempted: 6, dribblesSucceeded: 4 },
          passing: { passesAttempted: 43, passesCompleted: 35, passingAccuracy: 81, keyPasses: 2, longBallsTotal: 3, longBallsAccurate: 2 },
          defense: { tackles: 3, interceptions: 2, clearances: 4, duelsTotal: 20, duelsWon: 12, recoveries: 7 },
          discipline: { foulsCommitted: 2, foulsDrawn: 5, yellowCards: 1, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CAM', 120),
        actionPoints: generatePlayerActions('CAM', 120)
      },
      {
        id: "rodrygo-11",
        name: "Rodrygo Goes",
        shortName: "Rodrygo",
        number: 11,
        position: "FW",
        positionLabel: "ED",
        nationality: "Brasil",
        nationalityCode: "BR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/924874/image",
        isStarter: true,
        minutesPlayed: 84,
        formationPosition: { row: 4, col: 3 },
        statistics: {
          rating: 7.9,
          minutesPlayed: 84,
          attack: { goals: 1, assists: 0, shots: 3, shotsOnTarget: 2, bigChancesCreated: 0, touchesInOppBox: 5, dribblesAttempted: 4, dribblesSucceeded: 2 },
          passing: { passesAttempted: 22, passesCompleted: 18, passingAccuracy: 82, keyPasses: 1 },
          defense: { tackles: 2, interceptions: 0, clearances: 1, duelsTotal: 9, duelsWon: 5, recoveries: 3 },
          discipline: { foulsCommitted: 1, foulsDrawn: 2, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RW', 84),
        actionPoints: generatePlayerActions('RW', 84)
      },
      {
        id: "vinicius-junior-7",
        name: "Vinícius Júnior",
        shortName: "Vinícius Jr.",
        number: 7,
        position: "FW",
        positionLabel: "DC",
        nationality: "Brasil",
        nationalityCode: "BR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/868812/image",
        isStarter: true,
        minutesPlayed: 102,
        formationPosition: { row: 4, col: 1 },
        statistics: {
          rating: 7.8,
          minutesPlayed: 102,
          attack: { goals: 0, assists: 1, shots: 2, shotsOnTarget: 0, bigChancesCreated: 1, touchesInOppBox: 6, dribblesAttempted: 7, dribblesSucceeded: 4 },
          passing: { passesAttempted: 24, passesCompleted: 19, passingAccuracy: 79, keyPasses: 2, crossesTotal: 3, crossesAccurate: 1 },
          defense: { tackles: 1, interceptions: 0, clearances: 0, duelsTotal: 14, duelsWon: 7, recoveries: 4 },
          discipline: { foulsCommitted: 1, foulsDrawn: 4, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('LW', 102),
        actionPoints: generatePlayerActions('LW', 102)
      }
    ],
    substitutes: [
      {
        id: "luka-modric-10",
        name: "Luka Modrić",
        shortName: "L. Modrić",
        number: 10,
        position: "MF",
        positionLabel: "MC",
        nationality: "Croacia",
        nationalityCode: "HR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/15758/image",
        isStarter: false,
        minutesPlayed: 41,
        statistics: {
          rating: 7.1,
          minutesPlayed: 41,
          attack: { goals: 0, assists: 0, shots: 0, touchesInOppBox: 1 },
          passing: { passesAttempted: 26, passesCompleted: 24, passingAccuracy: 92, keyPasses: 1, longBallsTotal: 3, longBallsAccurate: 3 },
          defense: { tackles: 1, interceptions: 1, clearances: 1, duelsTotal: 4, duelsWon: 2, recoveries: 3 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 41),
        actionPoints: generatePlayerActions('CM', 41)
      },
      {
        id: "brahim-diaz-21",
        name: "Brahim Díaz",
        shortName: "B. Díaz",
        number: 21,
        position: "FW",
        positionLabel: "ED",
        nationality: "Marruecos",
        nationalityCode: "MA",
        avatarUrl: "https://img.sofascore.com/api/v1/player/827603/image",
        isStarter: false,
        minutesPlayed: 36,
        statistics: {
          rating: 6.9,
          minutesPlayed: 36,
          attack: { goals: 0, assists: 0, shots: 1, touchesInOppBox: 2, dribblesAttempted: 4, dribblesSucceeded: 2 },
          passing: { passesAttempted: 12, passesCompleted: 10, passingAccuracy: 83, keyPasses: 0 },
          defense: { tackles: 1, interceptions: 0, clearances: 0, duelsTotal: 6, duelsWon: 3, recoveries: 2 },
          discipline: { foulsCommitted: 0, foulsDrawn: 1, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RW', 36),
        actionPoints: generatePlayerActions('RW', 36)
      },
      {
        id: "lucas-vazquez-17",
        name: "Lucas Vázquez",
        shortName: "L. Vázquez",
        number: 17,
        position: "DF",
        positionLabel: "LD",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/182510/image",
        isStarter: false,
        minutesPlayed: 18,
        statistics: {
          rating: 6.8,
          minutesPlayed: 18,
          passing: { passesAttempted: 8, passesCompleted: 7, passingAccuracy: 88 },
          defense: { tackles: 2, interceptions: 1, clearances: 2, duelsTotal: 3, duelsWon: 3, recoveries: 1 },
          discipline: { foulsCommitted: 0, foulsDrawn: 0, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('RB', 18),
        actionPoints: generatePlayerActions('RB', 18)
      },
      {
        id: "eder-militao-3",
        name: "Éder Militão",
        shortName: "É. Militão",
        number: 3,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Brasil",
        nationalityCode: "BR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/864391/image",
        isStarter: false,
        minutesPlayed: 10,
        statistics: {
          rating: 6.7,
          minutesPlayed: 10,
          passing: { passesAttempted: 4, passesCompleted: 4, passingAccuracy: 100 },
          defense: { clearances: 2, duelsTotal: 1, duelsWon: 1 },
          discipline: { foulsCommitted: 0, foulsDrawn: 0, yellowCards: 0, redCards: 0 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 10),
        actionPoints: generatePlayerActions('CB', 10)
      },
      {
        id: "kepa-arrizabalaga-25",
        name: "Kepa Arrizabalaga",
        shortName: "Kepa",
        number: 25,
        position: "GK",
        positionLabel: "POR",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/138543/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      },
      {
        id: "joselu-14",
        name: "Joselu Mato",
        shortName: "Joselu",
        number: 14,
        position: "FW",
        positionLabel: "DC",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/94541/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      },
      {
        id: "arda-guler-24",
        name: "Arda Güler",
        shortName: "A. Güler",
        number: 24,
        position: "MF",
        positionLabel: "MCO",
        nationality: "Turquía",
        nationalityCode: "TR",
        avatarUrl: "https://img.sofascore.com/api/v1/player/1107567/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      },
      {
        id: "dani-ceballos-19",
        name: "Dani Ceballos",
        shortName: "D. Ceballos",
        number: 19,
        position: "MF",
        positionLabel: "MC",
        nationality: "España",
        nationalityCode: "ES",
        avatarUrl: "https://img.sofascore.com/api/v1/player/787259/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      }
    ]
  },
  events: [
    {
      id: "ev-1",
      minute: 12,
      teamId: "realmadrid",
      teamName: "Real Madrid",
      type: "goal",
      playerId: "rodrygo-11",
      playerName: "Rodrygo Goes",
      secondaryPlayerId: "vinicius-junior-7",
      secondaryPlayerName: "Vinícius Júnior",
      description: "Gol tras rebote tras asistencia rasa al segundo palo de Vinícius Jr."
    },
    {
      id: "ev-2",
      minute: 38,
      teamId: "realmadrid",
      teamName: "Real Madrid",
      type: "yellow_card",
      playerId: "dani-carvajal-2",
      playerName: "Dani Carvajal",
      description: "Falta táctica sobre Jack Grealish frenando contraataque."
    },
    {
      id: "ev-3",
      minute: 59,
      teamId: "mancity",
      teamName: "Manchester City",
      type: "yellow_card",
      playerId: "jack-grealish-10",
      playerName: "Jack Grealish",
      description: "Reiteración de faltas tras cortar salida de Carvajal."
    },
    {
      id: "ev-4",
      minute: 61,
      teamId: "mancity",
      teamName: "Manchester City",
      type: "yellow_card",
      playerId: "josko-gvardiol-24",
      playerName: "Joško Gvardiol",
      description: "Falta sobre Jude Bellingham en mediocampo."
    },
    {
      id: "ev-5",
      minute: 72,
      teamId: "mancity",
      teamName: "Manchester City",
      type: "substitution",
      playerId: "jeremy-doku-11",
      playerName: "Jérémy Doku",
      secondaryPlayerId: "jack-grealish-10",
      secondaryPlayerName: "Jack Grealish",
      description: "Cambio ofensivo buscando desequilibrio 1vs1 por banda izquierda."
    },
    {
      id: "ev-6",
      minute: 76,
      teamId: "mancity",
      teamName: "Manchester City",
      type: "goal",
      playerId: "kevin-de-bruyne-17",
      playerName: "Kevin De Bruyne",
      secondaryPlayerId: "jeremy-doku-11",
      secondaryPlayerName: "Jérémy Doku",
      description: "Remate alto al primer toque tras rechace defectuoso de Rüdiger tras centro de Doku."
    },
    {
      id: "ev-7",
      minute: 79,
      teamId: "realmadrid",
      teamName: "Real Madrid",
      type: "substitution",
      playerId: "luka-modric-10",
      playerName: "Luka Modrić",
      secondaryPlayerId: "toni-kroos-8",
      secondaryPlayerName: "Toni Kroos",
      description: "Relevo en medular para ganar posesión y pausar asedio rival."
    },
    {
      id: "ev-8",
      minute: 84,
      teamId: "realmadrid",
      teamName: "Real Madrid",
      type: "substitution",
      playerId: "brahim-diaz-21",
      playerName: "Brahim Díaz",
      secondaryPlayerId: "rodrygo-11",
      secondaryPlayerName: "Rodrygo Goes",
      description: "Piernas frescas en banda para transición ofensiva."
    },
    {
      id: "ev-9",
      minute: 90,
      teamId: "mancity",
      teamName: "Manchester City",
      type: "substitution",
      playerId: "julian-alvarez-19",
      playerName: "Julián Álvarez",
      secondaryPlayerId: "erling-haaland-9",
      secondaryPlayerName: "Erling Haaland",
      description: "Entra Álvarez para la prórroga."
    },
    {
      id: "ev-10",
      minute: 94,
      teamId: "realmadrid",
      teamName: "Real Madrid",
      type: "yellow_card",
      playerId: "ferland-mendy-23",
      playerName: "Ferland Mendy",
      description: "Entrada a destiempo sobre Kyle Walker."
    },
    {
      id: "ev-11",
      minute: 102,
      teamId: "realmadrid",
      teamName: "Real Madrid",
      type: "substitution",
      playerId: "lucas-vazquez-17",
      playerName: "Lucas Vázquez",
      secondaryPlayerId: "vinicius-junior-7",
      secondaryPlayerName: "Vinícius Júnior",
      description: "Vinicius exhausto con calambres reemplazado por Vázquez."
    },
    {
      id: "ev-12",
      minute: 112,
      teamId: "mancity",
      teamName: "Manchester City",
      type: "substitution",
      playerId: "mateo-kovacic-8",
      playerName: "Mateo Kovačić",
      secondaryPlayerId: "kevin-de-bruyne-17",
      secondaryPlayerName: "Kevin De Bruyne",
      description: "Agotamiento muscular de De Bruyne tras enorme despliegue físico."
    }
  ]
};

// Second match for multiple reports testing: Barcelona vs PSG
export const MOCK_BARCELONA_VS_PSG: MatchDetails = {
  id: "sofascore-987654",
  url: "https://www.sofascore.com/barcelona-psg/hsgsv#id:987654",
  competition: "UEFA Champions League",
  competitionLogo: "https://img.sofascore.com/api/v1/unique-tournament/7/image",
  roundOrPhase: "Cuartos de final - Vuelta",
  date: "16 Abr 2024, 21:00 CEST",
  stadium: "Estadi Olímpic Lluís Companys, Barcelona",
  referee: "István Kovács (Rumania)",
  status: "FINISHED",
  homeTeam: {
    id: "barca",
    name: "FC Barcelona",
    shortName: "BAR",
    logoUrl: "https://img.sofascore.com/api/v1/team/2817/image",
    formation: "4-3-3",
    score: 1,
    isHome: true,
    starters: [
      {
        id: "ter-stegen-1",
        name: "Marc-André ter Stegen",
        shortName: "M. ter Stegen",
        number: 1,
        position: "GK",
        positionLabel: "POR",
        nationality: "Alemania",
        avatarUrl: "https://img.sofascore.com/api/v1/player/82878/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 0, col: 2 },
        statistics: {
          rating: 6.4,
          minutesPlayed: 90,
          goalkeeper: { saves: 5, goalsConceded: 4, passesAttempted: 44, passingAccuracy: 78 }
        },
        heatmapPoints: generatePositionHeatmap('GK', 90),
        actionPoints: generatePlayerActions('GK', 90)
      },
      {
        id: "pau-cubarsi-33",
        name: "Pau Cubarsí",
        shortName: "P. Cubarsí",
        number: 33,
        position: "DF",
        positionLabel: "DFC",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/1449551/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 1, col: 2 },
        statistics: {
          rating: 6.8,
          minutesPlayed: 90,
          passing: { passesAttempted: 48, passesCompleted: 42, passingAccuracy: 88, longBallsTotal: 6, longBallsAccurate: 4 },
          defense: { tackles: 3, clearances: 7, duelsTotal: 7, duelsWon: 5 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 90),
        actionPoints: generatePlayerActions('CB', 90)
      },
      {
        id: "ronald-araujo-4",
        name: "Ronald Araújo",
        shortName: "R. Araújo",
        number: 4,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Uruguay",
        avatarUrl: "https://img.sofascore.com/api/v1/player/926712/image",
        isStarter: true,
        minutesPlayed: 29,
        formationPosition: { row: 1, col: 1 },
        statistics: {
          rating: 4.8,
          minutesPlayed: 29,
          defense: { tackles: 1, clearances: 2, duelsTotal: 3, duelsWon: 1 },
          discipline: { foulsCommitted: 1, redCards: 1 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 29),
        actionPoints: generatePlayerActions('CB', 29)
      },
      {
        id: "pedri-8",
        name: "Pedro González López (Pedri)",
        shortName: "Pedri",
        number: 8,
        position: "MF",
        positionLabel: "MC",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/989201/image",
        isStarter: true,
        minutesPlayed: 62,
        formationPosition: { row: 2, col: 1 },
        statistics: {
          rating: 7.2,
          minutesPlayed: 62,
          passing: { passesAttempted: 35, passesCompleted: 32, passingAccuracy: 91, keyPasses: 2 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 62),
        actionPoints: generatePlayerActions('CM', 62)
      },
      {
        id: "lamine-yamal-27",
        name: "Lamine Yamal",
        shortName: "L. Yamal",
        number: 27,
        position: "FW",
        positionLabel: "ED",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/1449552/image",
        isStarter: true,
        minutesPlayed: 34,
        formationPosition: { row: 3, col: 3 },
        statistics: {
          rating: 7.6,
          minutesPlayed: 34,
          attack: { assists: 1, dribblesAttempted: 4, dribblesSucceeded: 3, touchesInOppBox: 3 },
          passing: { passesAttempted: 11, passesCompleted: 9, passingAccuracy: 82, keyPasses: 1 }
        },
        heatmapPoints: generatePositionHeatmap('RW', 34),
        actionPoints: generatePlayerActions('RW', 34)
      },
      {
        id: "robert-lewandowski-9",
        name: "Robert Lewandowski",
        shortName: "R. Lewandowski",
        number: 9,
        position: "FW",
        positionLabel: "DC",
        nationality: "Polonia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/34551/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 3, col: 1 },
        statistics: {
          rating: 6.9,
          minutesPlayed: 90,
          attack: { shots: 4, shotsOnTarget: 1, touchesInOppBox: 5 },
          passing: { passesAttempted: 22, passesCompleted: 15, passingAccuracy: 68 }
        },
        heatmapPoints: generatePositionHeatmap('ST', 90),
        actionPoints: generatePlayerActions('ST', 90)
      },
      {
        id: "raphinha-11",
        name: "Raphael Dias Belloli (Raphinha)",
        shortName: "Raphinha",
        number: 11,
        position: "FW",
        positionLabel: "EI",
        nationality: "Brasil",
        avatarUrl: "https://img.sofascore.com/api/v1/player/828237/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 3, col: 0 },
        statistics: {
          rating: 7.9,
          minutesPlayed: 90,
          attack: { goals: 1, shots: 3, shotsOnTarget: 2, touchesInOppBox: 6 },
          passing: { passesAttempted: 28, passesCompleted: 22, passingAccuracy: 78, keyPasses: 2 }
        },
        heatmapPoints: generatePositionHeatmap('LW', 90),
        actionPoints: generatePlayerActions('LW', 90)
      },
      {
        id: "ilkay-gundogan-22",
        name: "İlkay Gündoğan",
        shortName: "İ. Gündoğan",
        number: 22,
        position: "MF",
        positionLabel: "MC",
        nationality: "Alemania",
        avatarUrl: "https://img.sofascore.com/api/v1/player/41983/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 2, col: 2 },
        statistics: {
          rating: 7.1,
          minutesPlayed: 90,
          passing: { passesAttempted: 58, passesCompleted: 53, passingAccuracy: 91, keyPasses: 3 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 90),
        actionPoints: generatePlayerActions('CM', 90)
      },
      {
        id: "frenkie-de-jong-21",
        name: "Frenkie de Jong",
        shortName: "F. de Jong",
        number: 21,
        position: "MF",
        positionLabel: "MCD",
        nationality: "Países Bajos",
        avatarUrl: "https://img.sofascore.com/api/v1/player/787257/image",
        isStarter: true,
        minutesPlayed: 82,
        formationPosition: { row: 2, col: 0 },
        statistics: {
          rating: 6.7,
          minutesPlayed: 82,
          passing: { passesAttempted: 49, passesCompleted: 45, passingAccuracy: 92 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 82),
        actionPoints: generatePlayerActions('CM', 82)
      },
      {
        id: "jules-kounde-23",
        name: "Jules Koundé",
        shortName: "J. Koundé",
        number: 23,
        position: "DF",
        positionLabel: "LD",
        nationality: "Francia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/827602/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 1, col: 3 },
        statistics: {
          rating: 6.9,
          minutesPlayed: 90,
          defense: { tackles: 3, clearances: 5, duelsWon: 7, duelsTotal: 11 }
        },
        heatmapPoints: generatePositionHeatmap('RB', 90),
        actionPoints: generatePlayerActions('RB', 90)
      },
      {
        id: "joao-cancelo-2",
        name: "João Cancelo",
        shortName: "J. Cancelo",
        number: 2,
        position: "DF",
        positionLabel: "LI",
        nationality: "Portugal",
        avatarUrl: "https://img.sofascore.com/api/v1/player/182513/image",
        isStarter: true,
        minutesPlayed: 82,
        formationPosition: { row: 1, col: 0 },
        statistics: {
          rating: 6.0,
          minutesPlayed: 82,
          defense: { tackles: 2, duelsWon: 4, duelsTotal: 12 },
          discipline: { foulsCommitted: 3, yellowCards: 1 }
        },
        heatmapPoints: generatePositionHeatmap('LB', 82),
        actionPoints: generatePlayerActions('LB', 82)
      }
    ],
    substitutes: [
      {
        id: "inigo-martinez-5",
        name: "Íñigo Martínez",
        shortName: "Í. Martínez",
        number: 5,
        position: "DF",
        positionLabel: "DFC",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/132484/image",
        isStarter: false,
        minutesPlayed: 56,
        statistics: { rating: 6.5, minutesPlayed: 56 },
        heatmapPoints: generatePositionHeatmap('CB', 56),
        actionPoints: generatePlayerActions('CB', 56)
      },
      {
        id: "ferran-torres-7",
        name: "Ferran Torres",
        shortName: "F. Torres",
        number: 7,
        position: "FW",
        positionLabel: "ED",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/863935/image",
        isStarter: false,
        minutesPlayed: 28,
        statistics: { rating: 6.6, minutesPlayed: 28 },
        heatmapPoints: generatePositionHeatmap('RW', 28),
        actionPoints: generatePlayerActions('RW', 28)
      },
      {
        id: "joao-felix-14",
        name: "João Félix",
        shortName: "J. Félix",
        number: 14,
        position: "FW",
        positionLabel: "DC",
        nationality: "Portugal",
        avatarUrl: "https://img.sofascore.com/api/v1/player/951236/image",
        isStarter: false,
        minutesPlayed: 8,
        statistics: { rating: 6.4, minutesPlayed: 8 },
        heatmapPoints: generatePositionHeatmap('ST', 8),
        actionPoints: generatePlayerActions('ST', 8)
      },
      {
        id: "inaki-pena-13",
        name: "Iñaki Peña",
        shortName: "I. Peña",
        number: 13,
        position: "GK",
        positionLabel: "POR",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/836413/image",
        isStarter: false,
        minutesPlayed: 0,
        statistics: { minutesPlayed: 0 },
        heatmapPoints: [],
        actionPoints: []
      }
    ]
  },
  awayTeam: {
    id: "psg",
    name: "Paris Saint-Germain",
    shortName: "PSG",
    logoUrl: "https://img.sofascore.com/api/v1/team/1644/image",
    formation: "4-3-3",
    score: 4,
    isHome: false,
    starters: [
      {
        id: "gianluigi-donnarumma-99",
        name: "Gianluigi Donnarumma",
        shortName: "G. Donnarumma",
        number: 99,
        position: "GK",
        positionLabel: "POR",
        nationality: "Italia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/836414/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 0, col: 2 },
        statistics: {
          rating: 6.8,
          minutesPlayed: 90,
          goalkeeper: { saves: 3, goalsConceded: 1 }
        },
        heatmapPoints: generatePositionHeatmap('GK', 90),
        actionPoints: generatePlayerActions('GK', 90)
      },
      {
        id: "kylian-mbappe-7",
        name: "Kylian Mbappé",
        shortName: "K. Mbappé",
        number: 7,
        position: "FW",
        positionLabel: "DC",
        nationality: "Francia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/826478/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 3, col: 1 },
        statistics: {
          rating: 8.9,
          minutesPlayed: 90,
          attack: { goals: 2, assists: 0, shots: 7, shotsOnTarget: 5, touchesInOppBox: 11, dribblesAttempted: 6, dribblesSucceeded: 4 },
          passing: { passesAttempted: 32, passesCompleted: 28, passingAccuracy: 88, keyPasses: 2 }
        },
        heatmapPoints: generatePositionHeatmap('ST', 90),
        actionPoints: generatePlayerActions('ST', 90)
      },
      {
        id: "ousmane-dembele-10",
        name: "Ousmane Dembélé",
        shortName: "O. Dembélé",
        number: 10,
        position: "FW",
        positionLabel: "ED",
        nationality: "Francia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/826479/image",
        isStarter: true,
        minutesPlayed: 88,
        formationPosition: { row: 3, col: 3 },
        statistics: {
          rating: 8.5,
          minutesPlayed: 88,
          attack: { goals: 1, assists: 1, shots: 4, shotsOnTarget: 2, touchesInOppBox: 9, dribblesAttempted: 9, dribblesSucceeded: 6 },
          passing: { passesAttempted: 44, passesCompleted: 38, passingAccuracy: 86, keyPasses: 4 }
        },
        heatmapPoints: generatePositionHeatmap('RW', 88),
        actionPoints: generatePlayerActions('RW', 88)
      },
      {
        id: "vitinha-17",
        name: "Vítor Ferreira (Vitinha)",
        shortName: "Vitinha",
        number: 17,
        position: "MF",
        positionLabel: "MC",
        nationality: "Portugal",
        avatarUrl: "https://img.sofascore.com/api/v1/player/951237/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 2, col: 1 },
        statistics: {
          rating: 8.7,
          minutesPlayed: 90,
          attack: { goals: 1, assists: 0, shots: 3, shotsOnTarget: 1 },
          passing: { passesAttempted: 112, passesCompleted: 108, passingAccuracy: 96, keyPasses: 3 },
          defense: { tackles: 3, recoveries: 8 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 90),
        actionPoints: generatePlayerActions('CM', 90)
      },
      {
        id: "marquinhos-5",
        name: "Marcos Aoás Corrêa (Marquinhos)",
        shortName: "Marquinhos",
        number: 5,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Brasil",
        avatarUrl: "https://img.sofascore.com/api/v1/player/182514/image",
        isStarter: true,
        minutesPlayed: 90,
        captain: true,
        formationPosition: { row: 1, col: 2 },
        statistics: {
          rating: 7.7,
          minutesPlayed: 90,
          defense: { tackles: 2, clearances: 6, duelsWon: 5, duelsTotal: 6 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 90),
        actionPoints: generatePlayerActions('CB', 90)
      },
      {
        id: "lucas-hernandez-21",
        name: "Lucas Hernández",
        shortName: "L. Hernández",
        number: 21,
        position: "DF",
        positionLabel: "DFC",
        nationality: "Francia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/786205/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 1, col: 1 },
        statistics: {
          rating: 7.2,
          minutesPlayed: 90,
          defense: { tackles: 2, clearances: 4, duelsWon: 6, duelsTotal: 8 }
        },
        heatmapPoints: generatePositionHeatmap('CB', 90),
        actionPoints: generatePlayerActions('CB', 90)
      },
      {
        id: "achraf-hakimi-2",
        name: "Achraf Hakimi",
        shortName: "A. Hakimi",
        number: 2,
        position: "DF",
        positionLabel: "LD",
        nationality: "Marruecos",
        avatarUrl: "https://img.sofascore.com/api/v1/player/827604/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 1, col: 3 },
        statistics: {
          rating: 7.9,
          minutesPlayed: 90,
          attack: { assists: 1, touchesInOppBox: 6 },
          passing: { passesAttempted: 76, passesCompleted: 69, passingAccuracy: 91, keyPasses: 3 }
        },
        heatmapPoints: generatePositionHeatmap('RB', 90),
        actionPoints: generatePlayerActions('RB', 90)
      },
      {
        id: "nuno-mendes-25",
        name: "Nuno Mendes",
        shortName: "N. Mendes",
        number: 25,
        position: "DF",
        positionLabel: "LI",
        nationality: "Portugal",
        avatarUrl: "https://img.sofascore.com/api/v1/player/985515/image",
        isStarter: true,
        minutesPlayed: 90,
        formationPosition: { row: 1, col: 0 },
        statistics: {
          rating: 7.4,
          minutesPlayed: 90,
          defense: { tackles: 3, clearances: 3, duelsWon: 7, duelsTotal: 10 }
        },
        heatmapPoints: generatePositionHeatmap('LB', 90),
        actionPoints: generatePlayerActions('LB', 90)
      },
      {
        id: "fabian-ruiz-8",
        name: "Fabián Ruiz",
        shortName: "F. Ruiz",
        number: 8,
        position: "MF",
        positionLabel: "MC",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/787260/image",
        isStarter: true,
        minutesPlayed: 77,
        formationPosition: { row: 2, col: 0 },
        statistics: {
          rating: 7.5,
          minutesPlayed: 77,
          passing: { passesAttempted: 64, passesCompleted: 60, passingAccuracy: 94, keyPasses: 2 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 77),
        actionPoints: generatePlayerActions('CM', 77)
      },
      {
        id: "warren-zaire-emery-33",
        name: "Warren Zaïre-Emery",
        shortName: "W. Zaïre-Emery",
        number: 33,
        position: "MF",
        positionLabel: "MC",
        nationality: "Francia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/138877/image",
        isStarter: true,
        minutesPlayed: 80,
        formationPosition: { row: 2, col: 2 },
        statistics: {
          rating: 7.3,
          minutesPlayed: 80,
          passing: { passesAttempted: 48, passesCompleted: 44, passingAccuracy: 92 }
        },
        heatmapPoints: generatePositionHeatmap('CM', 80),
        actionPoints: generatePlayerActions('CM', 80)
      },
      {
        id: "bradley-barcola-29",
        name: "Bradley Barcola",
        shortName: "B. Barcola",
        number: 29,
        position: "FW",
        positionLabel: "EI",
        nationality: "Francia",
        avatarUrl: "https://img.sofascore.com/api/v1/player/1049582/image",
        isStarter: true,
        minutesPlayed: 77,
        formationPosition: { row: 3, col: 0 },
        statistics: {
          rating: 7.9,
          minutesPlayed: 77,
          attack: { assists: 1, touchesInOppBox: 7, dribblesAttempted: 7, dribblesSucceeded: 4 }
        },
        heatmapPoints: generatePositionHeatmap('LW', 77),
        actionPoints: generatePlayerActions('LW', 77)
      }
    ],
    substitutes: [
      {
        id: "marco-asensio-11",
        name: "Marco Asensio",
        shortName: "M. Asensio",
        number: 11,
        position: "FW",
        positionLabel: "ED",
        nationality: "España",
        avatarUrl: "https://img.sofascore.com/api/v1/player/787261/image",
        isStarter: false,
        minutesPlayed: 13,
        statistics: { rating: 6.7, minutesPlayed: 13 },
        heatmapPoints: generatePositionHeatmap('RW', 13),
        actionPoints: generatePlayerActions('RW', 13)
      },
      {
        id: "lee-kang-in-19",
        name: "Lee Kang-in",
        shortName: "Lee Kang-in",
        number: 19,
        position: "MF",
        positionLabel: "MC",
        nationality: "Corea del Sur",
        avatarUrl: "https://img.sofascore.com/api/v1/player/863936/image",
        isStarter: false,
        minutesPlayed: 13,
        statistics: { rating: 6.6, minutesPlayed: 13 },
        heatmapPoints: generatePositionHeatmap('CM', 13),
        actionPoints: generatePlayerActions('CM', 13)
      },
      {
        id: "manuel-ugarte-4",
        name: "Manuel Ugarte",
        shortName: "M. Ugarte",
        number: 4,
        position: "MF",
        positionLabel: "MCD",
        nationality: "Uruguay",
        avatarUrl: "https://img.sofascore.com/api/v1/player/926713/image",
        isStarter: false,
        minutesPlayed: 10,
        statistics: { rating: 6.5, minutesPlayed: 10 },
        heatmapPoints: generatePositionHeatmap('CDM', 10),
        actionPoints: generatePlayerActions('CDM', 10)
      }
    ]
  },
  events: [
    {
      id: "ev-barca-1",
      minute: 12,
      teamId: "barca",
      teamName: "FC Barcelona",
      type: "goal",
      playerId: "raphinha-11",
      playerName: "Raphinha",
      secondaryPlayerId: "lamine-yamal-27",
      secondaryPlayerName: "Lamine Yamal",
      description: "Gol tras genial desborde por banda derecha de Lamine Yamal."
    },
    {
      id: "ev-barca-2",
      minute: 29,
      teamId: "barca",
      teamName: "FC Barcelona",
      type: "red_card",
      playerId: "ronald-araujo-4",
      playerName: "Ronald Araújo",
      description: "Expulsión con roja directa por derribar a Bradley Barcola siendo último hombre."
    },
    {
      id: "ev-barca-3",
      minute: 40,
      teamId: "psg",
      teamName: "Paris Saint-Germain",
      type: "goal",
      playerId: "ousmane-dembele-10",
      playerName: "Ousmane Dembélé",
      secondaryPlayerId: "bradley-barcola-29",
      secondaryPlayerName: "Bradley Barcola",
      description: "Remate con derecha arriba tras centro de Barcola."
    },
    {
      id: "ev-barca-4",
      minute: 54,
      teamId: "psg",
      teamName: "Paris Saint-Germain",
      type: "goal",
      playerId: "vitinha-17",
      playerName: "Vitinha",
      secondaryPlayerId: "achraf-hakimi-2",
      secondaryPlayerName: "Achraf Hakimi",
      description: "Golazo con tiro raso lejano tras saque de esquina jugado en corto."
    },
    {
      id: "ev-barca-5",
      minute: 61,
      teamId: "psg",
      teamName: "Paris Saint-Germain",
      type: "goal",
      playerId: "kylian-mbappe-7",
      playerName: "Kylian Mbappé",
      description: "Gol de penalti transformado con potencia a la escuadra."
    },
    {
      id: "ev-barca-6",
      minute: 89,
      teamId: "psg",
      teamName: "Paris Saint-Germain",
      type: "goal",
      playerId: "kylian-mbappe-7",
      playerName: "Kylian Mbappé",
      description: "Remate a placer tras dos rechaces de ter Stegen en un contragolpe fulgurante."
    }
  ]
};
