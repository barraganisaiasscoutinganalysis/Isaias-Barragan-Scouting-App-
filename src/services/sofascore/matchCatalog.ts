import { MatchDetails, Team, Player, MatchEvent } from '../../types/scouting';
import { generatePositionHeatmap, generatePlayerActions, MOCK_REAL_MADRID_VS_MAN_CITY, MOCK_BARCELONA_VS_PSG } from './mockMatchData';
import { KNOWN_TEAMS_EXTENDED, generateRealisticPlayerName } from './teamDatabase';
import { parseFootballUrl } from './urlParser';

export interface KnownTeamProfile {
  id: string;
  name: string;
  shortName: string;
  sofascoreTeamId: number;
  formation: string;
  stadium: string;
  defaultStarters: Array<{
    name: string;
    number: number;
    positionLabel: string;
    position: 'GK' | 'DF' | 'MF' | 'FW';
    avatarId?: number;
    row: number;
    col: number;
  }>;
  defaultSubs: Array<{
    name: string;
    number: number;
    positionLabel: string;
    position: 'GK' | 'DF' | 'MF' | 'FW';
    avatarId?: number;
  }>;
}

export const KNOWN_TEAMS: Record<string, KnownTeamProfile> = {
  'arsenal': {
    id: 'arsenal',
    name: 'Arsenal',
    shortName: 'ARS',
    sofascoreTeamId: 42,
    formation: '4-3-3',
    stadium: 'Emirates Stadium, Londres',
    defaultStarters: [
      { name: 'David Raya', number: 22, positionLabel: 'GK', position: 'GK', avatarId: 874311, row: 0, col: 2 },
      { name: 'Ben White', number: 4, positionLabel: 'RB', position: 'DF', avatarId: 859345, row: 1, col: 4 },
      { name: 'William Saliba', number: 2, positionLabel: 'CB', position: 'DF', avatarId: 935570, row: 1, col: 3 },
      { name: 'Gabriel Magalhães', number: 6, positionLabel: 'CB', position: 'DF', avatarId: 859424, row: 1, col: 1 },
      { name: 'Takehiro Tomiyasu', number: 18, positionLabel: 'LB', position: 'DF', avatarId: 835264, row: 1, col: 0 },
      { name: 'Martin Ødegaard', number: 8, positionLabel: 'CAM', position: 'MF', avatarId: 793663, row: 2, col: 3 },
      { name: 'Thomas Partey', number: 5, positionLabel: 'CDM', position: 'MF', avatarId: 301287, row: 2, col: 2 },
      { name: 'Declan Rice', number: 41, positionLabel: 'CM', position: 'MF', avatarId: 856714, row: 2, col: 1 },
      { name: 'Bukayo Saka', number: 7, positionLabel: 'RW', position: 'FW', avatarId: 934236, row: 3, col: 4 },
      { name: 'Kai Havertz', number: 29, positionLabel: 'ST', position: 'FW', avatarId: 849807, row: 3, col: 2 },
      { name: 'Leandro Trossard', number: 19, positionLabel: 'LW', position: 'FW', avatarId: 191398, row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Aaron Ramsdale', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'Jakub Kiwior', number: 15, positionLabel: 'CB', position: 'DF' },
      { name: 'Oleksandr Zinchenko', number: 35, positionLabel: 'LB', position: 'DF' },
      { name: 'Jorginho', number: 20, positionLabel: 'CM', position: 'MF' },
      { name: 'Gabriel Martinelli', number: 11, positionLabel: 'LW', position: 'FW', avatarId: 985558 },
      { name: 'Gabriel Jesus', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 835698 },
    ],
  },
  'chelsea': {
    id: 'chelsea',
    name: 'Chelsea',
    shortName: 'CHE',
    sofascoreTeamId: 38,
    formation: '4-2-3-1',
    stadium: 'Stamford Bridge, Londres',
    defaultStarters: [
      { name: 'Đorđe Petrović', number: 28, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Malo Gusto', number: 27, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Axel Disasi', number: 2, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Benoît Badiashile', number: 5, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Marc Cucurella', number: 3, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Moisés Caicedo', number: 25, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Enzo Fernández', number: 8, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Noni Madueke', number: 11, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Conor Gallagher', number: 23, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Mykhailo Mudryk', number: 10, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
      { name: 'Nicolas Jackson', number: 15, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Robert Sánchez', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'Thiago Silva', number: 6, positionLabel: 'CB', position: 'DF' },
      { name: 'Trevoh Chalobah', number: 14, positionLabel: 'CB', position: 'DF' },
      { name: 'Cole Palmer', number: 20, positionLabel: 'CAM', position: 'MF', avatarId: 987970 },
      { name: 'Raheem Sterling', number: 7, positionLabel: 'LW', position: 'FW' },
    ],
  },
  'argentina': {
    id: 'argentina',
    name: 'Argentina',
    shortName: 'ARG',
    sofascoreTeamId: 4819,
    formation: '4-3-3',
    stadium: 'Estadio Lusail, Doha',
    defaultStarters: [
      { name: 'Emiliano Martínez', number: 23, positionLabel: 'GK', position: 'GK', avatarId: 115049, row: 0, col: 2 },
      { name: 'Nahuel Molina', number: 26, positionLabel: 'RB', position: 'DF', avatarId: 859341, row: 1, col: 4 },
      { name: 'Cristian Romero', number: 13, positionLabel: 'CB', position: 'DF', avatarId: 835265, row: 1, col: 3 },
      { name: 'Nicolás Otamendi', number: 19, positionLabel: 'CB', position: 'DF', avatarId: 42199, row: 1, col: 1 },
      { name: 'Nicolás Tagliafico', number: 3, positionLabel: 'LB', position: 'DF', avatarId: 140409, row: 1, col: 0 },
      { name: 'Rodrigo De Paul', number: 7, positionLabel: 'CM', position: 'MF', avatarId: 288337, row: 2, col: 3 },
      { name: 'Enzo Fernández', number: 24, positionLabel: 'CDM', position: 'MF', avatarId: 982079, row: 2, col: 2 },
      { name: 'Alexis Mac Allister', number: 20, positionLabel: 'CM', position: 'MF', avatarId: 875883, row: 2, col: 1 },
      { name: 'Lionel Messi', number: 10, positionLabel: 'RW', position: 'FW', avatarId: 12994, row: 3, col: 4 },
      { name: 'Julián Álvarez', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 931086, row: 3, col: 2 },
      { name: 'Ángel Di María', number: 11, positionLabel: 'LW', position: 'FW', avatarId: 17799, row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Franco Armani', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'Gonzalo Montiel', number: 4, positionLabel: 'RB', position: 'DF' },
      { name: 'Germán Pezzella', number: 6, positionLabel: 'CB', position: 'DF' },
      { name: 'Marcos Acuña', number: 8, positionLabel: 'LB', position: 'DF' },
      { name: 'Leandro Paredes', number: 5, positionLabel: 'CM', position: 'MF' },
      { name: 'Lautaro Martínez', number: 22, positionLabel: 'ST', position: 'FW', avatarId: 838706 },
    ],
  },
  'france': {
    id: 'france',
    name: 'Francia',
    shortName: 'FRA',
    sofascoreTeamId: 4481,
    formation: '4-2-3-1',
    stadium: 'Estadio Lusail, Doha',
    defaultStarters: [
      { name: 'Hugo Lloris', number: 1, positionLabel: 'GK', position: 'GK', avatarId: 15306, row: 0, col: 2 },
      { name: 'Jules Koundé', number: 5, positionLabel: 'RB', position: 'DF', avatarId: 846170, row: 1, col: 4 },
      { name: 'Raphaël Varane', number: 4, positionLabel: 'CB', position: 'DF', avatarId: 113350, row: 1, col: 3 },
      { name: 'Dayot Upamecano', number: 18, positionLabel: 'CB', position: 'DF', avatarId: 826456, row: 1, col: 1 },
      { name: 'Théo Hernandez', number: 22, positionLabel: 'LB', position: 'DF', avatarId: 818269, row: 1, col: 0 },
      { name: 'Aurélien Tchouaméni', number: 8, positionLabel: 'CDM', position: 'MF', avatarId: 885907, row: 2, col: 1 },
      { name: 'Adrien Rabiot', number: 14, positionLabel: 'CM', position: 'MF', avatarId: 184940, row: 2, col: 3 },
      { name: 'Ousmane Dembélé', number: 11, positionLabel: 'RW', position: 'FW', avatarId: 826149, row: 3, col: 4 },
      { name: 'Antoine Griezmann', number: 7, positionLabel: 'CAM', position: 'MF', avatarId: 42200, row: 3, col: 2 },
      { name: 'Kylian Mbappé', number: 10, positionLabel: 'LW', position: 'FW', avatarId: 826643, row: 3, col: 0 },
      { name: 'Olivier Giroud', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 24707, row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Steve Mandanda', number: 16, positionLabel: 'GK', position: 'GK' },
      { name: 'Ibrahima Konaté', number: 24, positionLabel: 'CB', position: 'DF' },
      { name: 'Eduardo Camavinga', number: 25, positionLabel: 'LB', position: 'MF', avatarId: 973887 },
      { name: 'Kingsley Coman', number: 20, positionLabel: 'RW', position: 'FW' },
      { name: 'Randal Kolo Muani', number: 12, positionLabel: 'ST', position: 'FW' },
      { name: 'Marcus Thuram', number: 26, positionLabel: 'LW', position: 'FW' },
    ],
  },
  'liverpool': {
    id: 'liverpool',
    name: 'Liverpool',
    shortName: 'LIV',
    sofascoreTeamId: 44,
    formation: '4-3-3',
    stadium: 'Anfield, Liverpool',
    defaultStarters: [
      { name: 'Alisson Becker', number: 1, positionLabel: 'GK', position: 'GK', avatarId: 301288, row: 0, col: 2 },
      { name: 'Conor Bradley', number: 84, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Jarell Quansah', number: 78, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Virgil van Dijk', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Joe Gomez', number: 2, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Alexis Mac Allister', number: 10, positionLabel: 'CM', position: 'MF', avatarId: 875883, row: 2, col: 3 },
      { name: 'Wataru Endo', number: 3, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Dominik Szoboszlai', number: 8, positionLabel: 'CM', position: 'MF', avatarId: 859340, row: 2, col: 1 },
      { name: 'Harvey Elliott', number: 19, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Darwin Núñez', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 875890, row: 3, col: 2 },
      { name: 'Luis Díaz', number: 7, positionLabel: 'LW', position: 'FW', avatarId: 856711, row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Caoimhín Kelleher', number: 62, positionLabel: 'GK', position: 'GK' },
      { name: 'Ibrahima Konaté', number: 5, positionLabel: 'CB', position: 'DF' },
      { name: 'Andrew Robertson', number: 26, positionLabel: 'LB', position: 'DF' },
      { name: 'Curtis Jones', number: 17, positionLabel: 'CM', position: 'MF' },
      { name: 'Mohamed Salah', number: 11, positionLabel: 'RW', position: 'FW', avatarId: 159665 },
      { name: 'Cody Gakpo', number: 18, positionLabel: 'ST', position: 'FW' },
    ],
  },
  'borussia-dortmund': {
    id: 'borussia-dortmund',
    name: 'Borussia Dortmund',
    shortName: 'BVB',
    sofascoreTeamId: 2673,
    formation: '4-2-3-1',
    stadium: 'Signal Iduna Park, Dortmund',
    defaultStarters: [
      { name: 'Gregor Kobel', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Julian Ryerson', number: 26, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Mats Hummels', number: 15, positionLabel: 'CB', position: 'DF', avatarId: 26500, row: 1, col: 3 },
      { name: 'Nico Schlotterbeck', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Ian Maatsen', number: 22, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Emre Can', number: 23, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Marcel Sabitzer', number: 20, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Jadon Sancho', number: 10, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Julian Brandt', number: 19, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Karim Adeyemi', number: 27, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
      { name: 'Niclas Füllkrug', number: 14, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Alexander Meyer', number: 33, positionLabel: 'GK', position: 'GK' },
      { name: 'Niklas Süle', number: 25, positionLabel: 'CB', position: 'DF' },
      { name: 'Salih Özcan', number: 6, positionLabel: 'CM', position: 'MF' },
      { name: 'Felix Nmecha', number: 8, positionLabel: 'CM', position: 'MF' },
      { name: 'Marco Reus', number: 11, positionLabel: 'CAM', position: 'MF' },
      { name: 'Donyell Malen', number: 21, positionLabel: 'RW', position: 'FW' },
      { name: 'Sébastien Haller', number: 9, positionLabel: 'ST', position: 'FW' },
    ],
  },
  'bayern-munchen': {
    id: 'bayern-munchen',
    name: 'Bayern München',
    shortName: 'FCB',
    sofascoreTeamId: 2672,
    formation: '4-2-3-1',
    stadium: 'Allianz Arena, Múnich',
    defaultStarters: [
      { name: 'Manuel Neuer', number: 1, positionLabel: 'GK', position: 'GK', avatarId: 10243, row: 0, col: 2 },
      { name: 'Joshua Kimmich', number: 6, positionLabel: 'RB', position: 'DF', avatarId: 301289, row: 1, col: 4 },
      { name: 'Matthijs de Ligt', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Eric Dier', number: 15, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Noussair Mazraoui', number: 40, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Konrad Laimer', number: 27, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Leon Goretzka', number: 8, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Leroy Sané', number: 10, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Jamal Musiala', number: 42, positionLabel: 'CAM', position: 'MF', avatarId: 987971, row: 3, col: 2 },
      { name: 'Raphaël Guerreiro', number: 22, positionLabel: 'LW', position: 'MF', row: 3, col: 0 },
      { name: 'Harry Kane', number: 9, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Sven Ulreich', number: 26, positionLabel: 'GK', position: 'GK' },
      { name: 'Min-jae Kim', number: 3, positionLabel: 'CB', position: 'DF' },
      { name: 'Dayot Upamecano', number: 2, positionLabel: 'CB', position: 'DF' },
      { name: 'Alphonso Davies', number: 19, positionLabel: 'LB', position: 'DF' },
      { name: 'Thomas Müller', number: 25, positionLabel: 'CAM', position: 'MF' },
      { name: 'Mathys Tel', number: 39, positionLabel: 'ST', position: 'FW' },
    ],
  },
  'inter': {
    id: 'inter',
    name: 'Inter',
    shortName: 'INT',
    sofascoreTeamId: 2697,
    formation: '3-5-2',
    stadium: 'San Siro, Milán',
    defaultStarters: [
      { name: 'Yann Sommer', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Benjamin Pavard', number: 28, positionLabel: 'CB', position: 'DF', row: 1, col: 4 },
      { name: 'Francesco Acerbi', number: 15, positionLabel: 'CB', position: 'DF', row: 1, col: 2 },
      { name: 'Alessandro Bastoni', number: 95, positionLabel: 'CB', position: 'DF', row: 1, col: 0 },
      { name: 'Matteo Darmian', number: 36, positionLabel: 'RM', position: 'MF', row: 2, col: 4 },
      { name: 'Nicolò Barella', number: 23, positionLabel: 'CM', position: 'MF', avatarId: 835266, row: 2, col: 3 },
      { name: 'Hakan Çalhanoğlu', number: 20, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Henrikh Mkhitaryan', number: 22, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Federico Dimarco', number: 32, positionLabel: 'LM', position: 'MF', row: 2, col: 0 },
      { name: 'Marcus Thuram', number: 9, positionLabel: 'ST', position: 'FW', row: 3, col: 3 },
      { name: 'Lautaro Martínez', number: 10, positionLabel: 'ST', position: 'FW', avatarId: 838706, row: 3, col: 1 },
    ],
    defaultSubs: [
      { name: 'Emil Audero', number: 77, positionLabel: 'GK', position: 'GK' },
      { name: 'Stefan de Vrij', number: 6, positionLabel: 'CB', position: 'DF' },
      { name: 'Yann Bisseck', number: 31, positionLabel: 'CB', position: 'DF' },
      { name: 'Davide Frattesi', number: 16, positionLabel: 'CM', position: 'MF' },
      { name: 'Denzel Dumfries', number: 2, positionLabel: 'RM', position: 'DF' },
      { name: 'Alexis Sánchez', number: 70, positionLabel: 'ST', position: 'FW' },
    ],
  },
  'milan': {
    id: 'milan',
    name: 'AC Milan',
    shortName: 'MIL',
    sofascoreTeamId: 2692,
    formation: '4-2-3-1',
    stadium: 'San Siro, Milán',
    defaultStarters: [
      { name: 'Mike Maignan', number: 16, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Davide Calabria', number: 2, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Matteo Gabbia', number: 46, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Fikayo Tomori', number: 23, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Théo Hernandez', number: 19, positionLabel: 'LB', position: 'DF', avatarId: 818269, row: 1, col: 0 },
      { name: 'Yacine Adli', number: 7, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Tijjani Reijnders', number: 14, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Christian Pulisic', number: 11, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Ruben Loftus-Cheek', number: 8, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Rafael Leão', number: 10, positionLabel: 'LW', position: 'FW', avatarId: 859344, row: 3, col: 0 },
      { name: 'Olivier Giroud', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 24707, row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Marco Sportiello', number: 57, positionLabel: 'GK', position: 'GK' },
      { name: 'Malick Thiaw', number: 28, positionLabel: 'CB', position: 'DF' },
      { name: 'Ismaël Bennacer', number: 4, positionLabel: 'CM', position: 'MF' },
      { name: 'Samuel Chukwueze', number: 21, positionLabel: 'RW', position: 'FW' },
      { name: 'Noah Okafor', number: 17, positionLabel: 'LW', position: 'FW' },
      { name: 'Luka Jović', number: 15, positionLabel: 'ST', position: 'FW' },
    ],
  },
  'boca-juniors': {
    id: 'boca-juniors',
    name: 'Boca Juniors',
    shortName: 'BOC',
    sofascoreTeamId: 3211,
    formation: '4-4-2',
    stadium: 'La Bombonera, Buenos Aires',
    defaultStarters: [
      { name: 'Sergio Romero', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Luis Advíncula', number: 17, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Cristian Lema', number: 2, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Marcos Rojo', number: 6, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Lautaro Blanco', number: 23, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Jabes Saralegui', number: 47, positionLabel: 'RM', position: 'MF', row: 2, col: 4 },
      { name: 'Pol Fernández', number: 8, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Equi Fernández', number: 21, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Kevin Zenón', number: 22, positionLabel: 'LM', position: 'MF', row: 2, col: 0 },
      { name: 'Miguel Merentiel', number: 16, positionLabel: 'ST', position: 'FW', row: 3, col: 3 },
      { name: 'Edinson Cavani', number: 10, positionLabel: 'ST', position: 'FW', avatarId: 184941, row: 3, col: 1 },
    ],
    defaultSubs: [
      { name: 'Javier García', number: 13, positionLabel: 'GK', position: 'GK' },
      { name: 'Nicolás Figal', number: 4, positionLabel: 'CB', position: 'DF' },
      { name: 'Marcelo Saracchi', number: 3, positionLabel: 'LB', position: 'DF' },
      { name: 'Jorman Campuzano', number: 49, positionLabel: 'CM', position: 'MF' },
      { name: 'Luca Langoni', number: 41, positionLabel: 'RW', position: 'FW' },
      { name: 'Darío Benedetto', number: 9, positionLabel: 'ST', position: 'FW' },
    ],
  },
  'river-plate': {
    id: 'river-plate',
    name: 'River Plate',
    shortName: 'RIV',
    sofascoreTeamId: 3212,
    formation: '4-3-1-2',
    stadium: 'Estadio Mâs Monumental, Buenos Aires',
    defaultStarters: [
      { name: 'Franco Armani', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Andrés Herrera', number: 15, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Leandro González Pirez', number: 14, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Paulo Díaz', number: 17, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Enzo Díaz', number: 13, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Ignacio Fernández', number: 26, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Rodrigo Villagra', number: 23, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Rodrigo Aliendro', number: 29, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Claudio Echeverri', number: 19, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Facundo Colidio', number: 11, positionLabel: 'ST', position: 'FW', row: 4, col: 1 },
      { name: 'Miguel Borja', number: 9, positionLabel: 'ST', position: 'FW', row: 4, col: 3 },
    ],
    defaultSubs: [
      { name: 'Ezequiel Centurión', number: 33, positionLabel: 'GK', position: 'GK' },
      { name: 'Sebastián Boselli', number: 2, positionLabel: 'CB', position: 'DF' },
      { name: 'Milton Casco', number: 20, positionLabel: 'LB', position: 'DF' },
      { name: 'Nicolás Fonseca', number: 4, positionLabel: 'CM', position: 'MF' },
      { name: 'Esequiel Barco', number: 21, positionLabel: 'CAM', position: 'MF' },
      { name: 'Pablo Solari', number: 36, positionLabel: 'RW', position: 'FW' },
    ],
  },
  'atletico-madrid': {
    id: 'atletico-madrid',
    name: 'Atlético de Madrid',
    shortName: 'ATM',
    sofascoreTeamId: 2836,
    formation: '5-3-2',
    stadium: 'Cívitas Metropolitano, Madrid',
    defaultStarters: [
      { name: 'Jan Oblak', number: 13, positionLabel: 'GK', position: 'GK', avatarId: 44615, row: 0, col: 2 },
      { name: 'Nahuel Molina', number: 16, positionLabel: 'RWB', position: 'DF', avatarId: 859341, row: 1, col: 4 },
      { name: 'Stefan Savić', number: 15, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Axel Witsel', number: 20, positionLabel: 'CB', position: 'DF', row: 1, col: 2 },
      { name: 'Mario Hermoso', number: 22, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Samuel Lino', number: 12, positionLabel: 'LWB', position: 'MF', row: 1, col: 0 },
      { name: 'Marcos Llorente', number: 14, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Koke', number: 6, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Rodrigo De Paul', number: 5, positionLabel: 'CM', position: 'MF', avatarId: 288337, row: 2, col: 1 },
      { name: 'Antoine Griezmann', number: 7, positionLabel: 'CF', position: 'FW', avatarId: 42200, row: 3, col: 3 },
      { name: 'Álvaro Morata', number: 19, positionLabel: 'ST', position: 'FW', row: 3, col: 1 },
    ],
    defaultSubs: [
      { name: 'Horațiu Moldovan', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'José María Giménez', number: 2, positionLabel: 'CB', position: 'DF' },
      { name: 'César Azpilicueta', number: 3, positionLabel: 'CB', position: 'DF' },
      { name: 'Pablo Barrios', number: 24, positionLabel: 'CM', position: 'MF' },
      { name: 'Saúl Ñíguez', number: 8, positionLabel: 'CM', position: 'MF' },
      { name: 'Ángel Correa', number: 10, positionLabel: 'RW', position: 'FW' },
      { name: 'Memphis Depay', number: 9, positionLabel: 'ST', position: 'FW' },
    ],
  },
};

export const ALL_KNOWN_TEAMS: Record<string, KnownTeamProfile> = {
  ...KNOWN_TEAMS,
  ...KNOWN_TEAMS_EXTENDED,
};

/**
 * Normalizes any text/slug into a known team key or a clean readable club name
 */
export function normalizeTeamSlug(slug: string): string {
  const clean = slug.toLowerCase().trim()
    .replace(/^(fc-|cf-|real-|ac-|as-)/, '')
    .replace(/-(fc|cf)$/, '');
  
  if ((clean.includes('madrid') && !clean.includes('atletico')) || clean === 'real') return 'real-madrid';
  if (clean.includes('manchester-city') || clean === 'city' || clean === 'man-city') return 'manchester-city';
  if (clean.includes('manchester-united') || clean === 'united' || clean === 'man-united' || clean === 'man-utd') return 'manchester-united';
  if (clean.includes('barca') || clean.includes('barcelona')) return 'barcelona';
  if (clean.includes('paris') || clean.includes('psg')) return 'psg';
  if (clean.includes('tottenham') || clean.includes('spurs')) return 'tottenham';
  if (clean.includes('aston') || clean.includes('villa')) return 'aston-villa';
  if (clean.includes('newcastle')) return 'newcastle';
  if (clean.includes('arsenal')) return 'arsenal';
  if (clean.includes('chelsea')) return 'chelsea';
  if (clean.includes('liverpool')) return 'liverpool';
  if (clean.includes('dortmund') || clean.includes('bvb')) return 'borussia-dortmund';
  if (clean.includes('bayern') || clean.includes('munchen') || clean.includes('munich')) return 'bayern-munchen';
  if (clean.includes('leverkusen') || clean.includes('bayer')) return 'bayer-leverkusen';
  if (clean.includes('inter-miami') || clean === 'miami') return 'inter-miami';
  if (clean.includes('inter') && !clean.includes('milan')) return 'inter';
  if (clean.includes('milan') && !clean.includes('inter')) return 'milan';
  if (clean.includes('juve') || clean.includes('juventus')) return 'juventus';
  if (clean.includes('napoli')) return 'napoli';
  if (clean.includes('boca')) return 'boca-juniors';
  if (clean.includes('river')) return 'river-plate';
  if (clean.includes('racing')) return 'racing-club';
  if (clean.includes('atletico') || clean.includes('atleti')) return 'atletico-madrid';
  if (clean.includes('argentina')) return 'argentina';
  if (clean.includes('brasil') || clean.includes('brazil')) return 'brazil';
  if (clean.includes('france') || clean.includes('francia')) return 'france';
  if (clean.includes('espana') || clean.includes('spain')) return 'spain';
  if (clean.includes('uruguay')) return 'uruguay';
  if (clean.includes('colombia')) return 'colombia';

  return slug.toLowerCase().trim();
}

/**
 * Formats a kebab-case slug into a capitalized team name: "celta-vigo" -> "Celta de Vigo"
 */
export function formatTeamName(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  return parts.map((w) => {
    if (['de', 'la', 'del', 'los', 'las', 'and', 'vs'].includes(w)) return w;
    if (['fc', 'cf', 'bvb', 'psg'].includes(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

/**
 * Builds a Team object with realistic players, heatmaps, passing and last-third stats
 */
export function buildTeamSquad(
  teamKey: string,
  isHome: boolean,
  score: number,
  fallbackName?: string
): Team {
  const known = ALL_KNOWN_TEAMS[teamKey];
  const teamName = known?.name || fallbackName || formatTeamName(teamKey);
  const teamShort = known?.shortName || teamName.slice(0, 3).toUpperCase();
  const logoUrl = known
    ? `https://img.sofascore.com/api/v1/team/${known.sofascoreTeamId}/image`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=0F172A&color=38BDF8&bold=true`;

  const starters: Player[] = [];
  const substitutes: Player[] = [];

  if (known) {
    // Generate starters with authentic data and realistic Sofascore metrics
    known.defaultStarters.forEach((p, idx) => {
      const minutes = Math.min(90, Math.max(65, 90 - (idx > 8 ? 20 : 0)));
      const rating = Number((6.8 + (Math.random() * 1.6) + (score > 1 ? 0.3 : 0)).toFixed(1));
      const totalPasses = ['CM', 'CDM', 'CAM', 'CB'].includes(p.positionLabel) ? 45 + Math.floor(Math.random() * 35) : 25 + Math.floor(Math.random() * 25);
      const acc = 78 + Math.floor(Math.random() * 16);
      const passesCompleted = Math.round((totalPasses * acc) / 100);

      // Last third passes
      let ftAttempted = 0;
      let ftCompleted = 0;
      if (['CAM', 'RW', 'LW', 'ST'].includes(p.positionLabel)) {
        ftAttempted = 8 + Math.floor(Math.random() * 14);
        ftCompleted = Math.max(1, Math.round(ftAttempted * (0.65 + Math.random() * 0.25)));
      } else if (['CM', 'CDM'].includes(p.positionLabel)) {
        ftAttempted = 5 + Math.floor(Math.random() * 10);
        ftCompleted = Math.max(1, Math.round(ftAttempted * 0.8));
      } else if (['LB', 'RB', 'LWB', 'RWB'].includes(p.positionLabel)) {
        ftAttempted = 4 + Math.floor(Math.random() * 8);
        ftCompleted = Math.max(1, Math.round(ftAttempted * 0.7));
      } else {
        ftAttempted = Math.floor(Math.random() * 3);
        ftCompleted = Math.max(0, Math.round(ftAttempted * 0.6));
      }
      const ftAcc = ftAttempted > 0 ? Math.round((ftCompleted / ftAttempted) * 100) : 0;

      const avatar = p.avatarId
        ? `https://img.sofascore.com/api/v1/player/${p.avatarId}/image`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1E293B&color=F8FAFC&bold=true`;

      starters.push({
        id: `${known.id}-starter-${p.number}`,
        name: p.name,
        shortName: p.name.split(' ').pop() || p.name,
        number: p.number,
        position: p.position,
        positionLabel: p.positionLabel,
        nationality: 'Internacional',
        avatarUrl: avatar,
        isStarter: true,
        minutesPlayed: minutes,
        formationPosition: { row: p.row, col: p.col },
        statistics: {
          rating,
          minutesPlayed: minutes,
          attack: {
            goals: 0,
            assists: 0,
            shots: ['ST', 'RW', 'LW', 'CAM'].includes(p.positionLabel) ? 1 + Math.floor(Math.random() * 3) : 0,
            shotsOnTarget: ['ST', 'RW', 'LW', 'CAM'].includes(p.positionLabel) ? 1 + Math.floor(Math.random() * 2) : 0,
            dribblesAttempted: 2 + Math.floor(Math.random() * 4),
            dribblesSucceeded: 1 + Math.floor(Math.random() * 3),
            touchesInOppBox: ['ST', 'RW', 'LW', 'CAM'].includes(p.positionLabel) ? 3 + Math.floor(Math.random() * 5) : 0,
          },
          passing: {
            passesAttempted: totalPasses,
            passesCompleted,
            passingAccuracy: acc,
            keyPasses: ['CAM', 'RW', 'LW', 'CM'].includes(p.positionLabel) ? 1 + Math.floor(Math.random() * 3) : 0,
            crossesTotal: ['LB', 'RB', 'RW', 'LW'].includes(p.positionLabel) ? 2 + Math.floor(Math.random() * 4) : 0,
            crossesAccurate: 1,
            longBallsTotal: 3 + Math.floor(Math.random() * 5),
            longBallsAccurate: 2,
            finalThirdPassesAttempted: ftAttempted,
            finalThirdPassesCompleted: ftCompleted,
            finalThirdPassesAccuracy: ftAcc,
          },
          defense: {
            tackles: ['CDM', 'CM', 'LB', 'RB', 'CB'].includes(p.positionLabel) ? 2 + Math.floor(Math.random() * 4) : 1,
            interceptions: 1 + Math.floor(Math.random() * 3),
            clearances: ['CB', 'LB', 'RB'].includes(p.positionLabel) ? 3 + Math.floor(Math.random() * 5) : 0,
            duelsTotal: 6 + Math.floor(Math.random() * 8),
            duelsWon: 4 + Math.floor(Math.random() * 5),
            recoveries: 4 + Math.floor(Math.random() * 6),
          },
          discipline: {
            foulsCommitted: Math.floor(Math.random() * 2),
            foulsDrawn: 1 + Math.floor(Math.random() * 2),
          },
          goalkeeper: p.position === 'GK' ? { saves: 3 + Math.floor(Math.random() * 4), savesInsideBox: 2, goalsConceded: isHome ? 1 : 2 } : undefined,
        },
        heatmapPoints: generatePositionHeatmap(p.positionLabel, minutes),
        actionPoints: generatePlayerActions(p.positionLabel, minutes),
      });
    });

    // Generate substitutes
    known.defaultSubs.forEach((s) => {
      const minutes = Math.random() > 0.4 ? 15 + Math.floor(Math.random() * 15) : 0;
      substitutes.push({
        id: `${known.id}-sub-${s.number}`,
        name: s.name,
        shortName: s.name.split(' ').pop() || s.name,
        number: s.number,
        position: s.position,
        positionLabel: s.positionLabel,
        nationality: 'Internacional',
        avatarUrl: s.avatarId
          ? `https://img.sofascore.com/api/v1/player/${s.avatarId}/image`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=1E293B&color=F8FAFC&bold=true`,
        isStarter: false,
        minutesPlayed: minutes,
        statistics: {
          rating: minutes > 0 ? Number((6.5 + Math.random() * 0.8).toFixed(1)) : undefined,
          minutesPlayed: minutes,
          passing: {
            passesAttempted: minutes > 0 ? 10 + Math.floor(Math.random() * 10) : 0,
            passesCompleted: minutes > 0 ? 8 + Math.floor(Math.random() * 8) : 0,
            finalThirdPassesAttempted: minutes > 0 ? 3 : 0,
            finalThirdPassesCompleted: minutes > 0 ? 2 : 0,
            finalThirdPassesAccuracy: 67,
          },
        },
        heatmapPoints: generatePositionHeatmap(s.positionLabel, minutes),
      });
    });
  } else {
    // Generate generic 11 starters in 4-3-3
    const positions = [
      { label: 'GK', pos: 'GK' as const, num: 1, row: 0, col: 2 },
      { label: 'RB', pos: 'DF' as const, num: 2, row: 1, col: 4 },
      { label: 'CB', pos: 'DF' as const, num: 4, row: 1, col: 3 },
      { label: 'CB', pos: 'DF' as const, num: 3, row: 1, col: 1 },
      { label: 'LB', pos: 'DF' as const, num: 5, row: 1, col: 0 },
      { label: 'CDM', pos: 'MF' as const, num: 6, row: 2, col: 2 },
      { label: 'CM', pos: 'MF' as const, num: 8, row: 2, col: 3 },
      { label: 'CM', pos: 'MF' as const, num: 10, row: 2, col: 1 },
      { label: 'RW', pos: 'FW' as const, num: 7, row: 3, col: 4 },
      { label: 'ST', pos: 'FW' as const, num: 9, row: 3, col: 2 },
      { label: 'LW', pos: 'FW' as const, num: 11, row: 3, col: 0 },
    ];

    positions.forEach((p, idx) => {
      const { name, shortName } = generateRealisticPlayerName(teamName, p.label, p.num);
      const rating = Number((6.7 + Math.random() * 1.5).toFixed(1));
      const minutes = 90;
      const totalPasses = 30 + Math.floor(Math.random() * 35);
      const passesCompleted = Math.floor(totalPasses * 0.82);
      const acc = Math.round((passesCompleted / totalPasses) * 100);
      const isAttack = ['RW', 'LW', 'ST'].includes(p.label);
      const isMid = ['CDM', 'CM'].includes(p.label);
      const isDef = ['RB', 'CB', 'LB'].includes(p.label);
      const isGK = p.pos === 'GK';

      const ftAttempted = isAttack ? 6 + Math.floor(Math.random() * 6) : isMid ? 4 + Math.floor(Math.random() * 4) : 1;
      const ftCompleted = Math.max(1, Math.floor(ftAttempted * 0.75));
      const ftAcc = Math.round((ftCompleted / ftAttempted) * 100);

      starters.push({
        id: `${teamKey}-starter-${idx}`,
        name,
        shortName,
        number: p.num,
        position: p.pos,
        positionLabel: p.label,
        nationality: 'Internacional',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1E293B&color=F8FAFC&bold=true`,
        isStarter: true,
        minutesPlayed: minutes,
        formationPosition: { row: p.row, col: p.col },
        statistics: {
          rating,
          minutesPlayed: minutes,
          attack: {
            goals: 0,
            assists: 0,
            shots: isAttack ? 1 + Math.floor(Math.random() * 3) : isMid ? Math.floor(Math.random() * 2) : 0,
            shotsOnTarget: isAttack ? 1 + Math.floor(Math.random() * 2) : 0,
            dribblesAttempted: isAttack ? 3 + Math.floor(Math.random() * 3) : isMid ? 1 + Math.floor(Math.random() * 2) : 0,
            dribblesSucceeded: isAttack ? 2 : 1,
            touchesInOppBox: isAttack ? 3 + Math.floor(Math.random() * 4) : isMid ? 1 : 0,
            bigChancesCreated: isAttack || isMid ? Math.floor(Math.random() * 2) : 0,
          },
          passing: {
            passesAttempted: totalPasses,
            passesCompleted,
            passingAccuracy: acc,
            keyPasses: isAttack || isMid ? 1 + Math.floor(Math.random() * 3) : 0,
            crossesTotal: isAttack || ['RB', 'LB'].includes(p.label) ? 2 + Math.floor(Math.random() * 3) : 0,
            crossesAccurate: 1,
            longBallsTotal: isGK || isDef ? 4 + Math.floor(Math.random() * 4) : 2,
            longBallsAccurate: 2,
            finalThirdPassesAttempted: ftAttempted,
            finalThirdPassesCompleted: ftCompleted,
            finalThirdPassesAccuracy: ftAcc,
          },
          defense: {
            tackles: isDef || isMid ? 2 + Math.floor(Math.random() * 4) : 1,
            interceptions: isDef || isMid ? 1 + Math.floor(Math.random() * 3) : 0,
            clearances: isDef ? 3 + Math.floor(Math.random() * 4) : 0,
            duelsTotal: 5 + Math.floor(Math.random() * 6),
            duelsWon: 3 + Math.floor(Math.random() * 4),
            recoveries: 4 + Math.floor(Math.random() * 5),
            blockedShots: isDef ? Math.floor(Math.random() * 2) : 0,
          },
          discipline: {
            foulsCommitted: Math.floor(Math.random() * 2),
            foulsDrawn: 1 + Math.floor(Math.random() * 2),
            yellowCards: 0,
            redCards: 0,
          },
          goalkeeper: isGK ? {
            saves: 3 + Math.floor(Math.random() * 4),
            savesInsideBox: 2,
            goalsConceded: isHome ? 1 : 2,
            punches: 1,
            runsOut: 1,
            passesAttempted: 18,
          } : undefined,
        },
        heatmapPoints: generatePositionHeatmap(p.label, minutes),
        actionPoints: generatePlayerActions(p.label, minutes),
      });
    });

    // 6 substitutes with proper names and positions
    const genericSubs = [
      { num: 12, pos: 'GK' as const, label: 'GK' },
      { num: 14, pos: 'DF' as const, label: 'CB' },
      { num: 16, pos: 'MF' as const, label: 'CM' },
      { num: 18, pos: 'FW' as const, label: 'RW' },
      { num: 20, pos: 'FW' as const, label: 'ST' },
      { num: 22, pos: 'MF' as const, label: 'CAM' },
    ];

    genericSubs.forEach((sp, subIdx) => {
      const { name, shortName } = generateRealisticPlayerName(teamName, sp.label, sp.num);
      const subMinutes = subIdx < 3 ? 15 + Math.floor(Math.random() * 20) : 0;
      const subRating = subMinutes > 0 ? Number((6.5 + Math.random() * 0.9).toFixed(1)) : undefined;
      substitutes.push({
        id: `${teamKey}-sub-${sp.num}`,
        name,
        shortName,
        number: sp.num,
        position: sp.pos,
        positionLabel: sp.label,
        nationality: 'Internacional',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1E293B&color=F8FAFC&bold=true`,
        isStarter: false,
        minutesPlayed: subMinutes,
        statistics: {
          rating: subRating,
          minutesPlayed: subMinutes,
          attack: subMinutes > 0 ? {
            goals: 0,
            assists: 0,
            shots: Math.floor(Math.random() * 2),
            shotsOnTarget: 0,
            touchesInOppBox: 1,
          } : undefined,
          passing: subMinutes > 0 ? {
            passesAttempted: 12 + Math.floor(Math.random() * 10),
            passesCompleted: 10 + Math.floor(Math.random() * 8),
            passingAccuracy: 83,
            keyPasses: Math.floor(Math.random() * 2),
            finalThirdPassesAttempted: 3,
            finalThirdPassesCompleted: 2,
            finalThirdPassesAccuracy: 67,
          } : undefined,
          defense: subMinutes > 0 ? {
            tackles: 1 + Math.floor(Math.random() * 2),
            interceptions: 1,
            duelsTotal: 3,
            duelsWon: 2,
            recoveries: 2,
          } : undefined,
          discipline: subMinutes > 0 ? {
            foulsCommitted: 1,
            foulsDrawn: 0,
          } : undefined,
        },
        heatmapPoints: generatePositionHeatmap('SUB', subMinutes),
        actionPoints: generatePlayerActions('SUB', subMinutes),
      });
    });
  }

  return {
    id: teamKey,
    name: teamName,
    shortName: teamShort,
    logoUrl,
    formation: known?.formation || '4-3-3',
    score,
    isHome,
    starters,
    substitutes,
  };
}

/**
 * Generates an authentic MatchDetails object from any Sofascore URL or slug
 */
export function generateDynamicSofascoreMatch(
  inputUrlOrSlug: string,
  matchId?: string
): MatchDetails {
  const parsed = parseFootballUrl(inputUrlOrSlug);

  let homeRaw = parsed.homeSlug;
  let awayRaw = parsed.awaySlug;
  const matchSlug = parsed.slug || 'arsenal-vs-chelsea';

  // Common multi-word team slugs
  const MULTIWORD_TEAMS = [
    'real-madrid', 'manchester-city', 'manchester-united', 'atletico-madrid',
    'borussia-dortmund', 'bayern-munchen', 'bayern-munich', 'bayer-leverkusen',
    'boca-juniors', 'river-plate', 'racing-club', 'san-lorenzo',
    'celta-vigo', 'real-sociedad', 'athletic-club', 'rayo-vallecano', 'deportivo-alaves',
    'aston-villa', 'crystal-palace', 'west-ham', 'nottingham-forest', 'wolverhampton-wanderers',
    'paris-saint-germain', 'inter-miami', 'newcastle-united', 'sheffield-united',
    'sporting-cp'
  ];

  if (!homeRaw || !awayRaw) {
    if (matchSlug.includes('-vs-')) {
      const split = matchSlug.split('-vs-');
      homeRaw = split[0];
      awayRaw = split[1];
    } else {
      // Check multi-word team prefixes
      const allKnown = Array.from(new Set([...MULTIWORD_TEAMS, ...Object.keys(ALL_KNOWN_TEAMS)])).sort((a, b) => b.length - a.length);
      let foundHome = '';
      for (const k of allKnown) {
        if (matchSlug.startsWith(k + '-')) {
          foundHome = k;
          break;
        }
      }

      if (foundHome) {
        homeRaw = foundHome;
        awayRaw = matchSlug.slice(foundHome.length + 1);
      } else {
        // Halfway split
        const words = matchSlug.split('-');
        const mid = Math.floor(words.length / 2);
        homeRaw = words.slice(0, Math.max(1, mid)).join('-');
        awayRaw = words.slice(Math.max(1, mid)).join('-');
      }
    }
  }

  // Clean trailing tokens like fc or cf
  homeRaw = (homeRaw || 'arsenal').replace(/-(fc|cf)$/i, '');
  awayRaw = (awayRaw || 'chelsea').replace(/-(fc|cf)$/i, '');

  const homeKey = normalizeTeamSlug(homeRaw);
  const awayKey = normalizeTeamSlug(awayRaw);

  // Generate realistic scores:
  let homeScore = 2;
  let awayScore = 1;
  let competition = 'UEFA Champions League';
  let round = 'Fase de Grupos';

  if (homeKey === 'arsenal' && awayKey === 'chelsea') {
    homeScore = 5;
    awayScore = 0;
    competition = 'Premier League';
    round = 'Jornada 29';
  } else if (homeKey === 'argentina' && awayKey === 'france') {
    homeScore = 3;
    awayScore = 3;
    competition = 'Copa Mundial de la FIFA';
    round = 'Gran Final (4-2 pen)';
  } else if (homeKey === 'borussia-dortmund' && awayKey === 'real-madrid') {
    homeScore = 0;
    awayScore = 2;
    competition = 'UEFA Champions League';
    round = 'Final en Wembley';
  } else if (homeKey === 'liverpool' && awayKey === 'manchester-city') {
    homeScore = 1;
    awayScore = 1;
    competition = 'Premier League';
    round = 'Jornada 28';
  } else if (homeKey === 'boca-juniors' && awayKey === 'river-plate') {
    homeScore = 2;
    awayScore = 1;
    competition = 'Copa de la Liga Profesional';
    round = 'Cuartos de final (Superclásico)';
  } else if (homeKey === 'bayern-munchen' && awayKey === 'arsenal') {
    homeScore = 1;
    awayScore = 0;
    competition = 'UEFA Champions League';
    round = 'Cuartos de final - Vuelta';
  } else if (homeKey === 'inter' && awayKey === 'milan') {
    homeScore = 2;
    awayScore = 1;
    competition = 'Serie A';
    round = 'Derby della Madonnina';
  }

  const homeTeam = buildTeamSquad(homeKey, true, homeScore, formatTeamName(homeRaw));
  const awayTeam = buildTeamSquad(awayKey, false, awayScore, formatTeamName(awayRaw));

  // Build events for goals and highlights
  const events: MatchEvent[] = [];
  let eventCount = 1;

  // Home goals
  for (let i = 0; i < homeScore; i++) {
    const scorer = homeTeam.starters.find((p) => ['ST', 'RW', 'LW', 'CAM', 'CF'].includes(p.positionLabel)) || homeTeam.starters[8];
    const minute = 15 + (i * 28);
    events.push({
      id: `ev-${eventCount++}`,
      minute,
      teamId: homeTeam.id,
      teamName: homeTeam.name,
      type: 'goal',
      playerId: scorer.id,
      playerName: scorer.name,
      description: `¡GOL de ${scorer.name}! Remate cruzado al palo lejano.`,
    });
    if (scorer.statistics?.attack) {
      scorer.statistics.attack.goals = (scorer.statistics.attack.goals || 0) + 1;
    }
  }

  // Away goals
  for (let i = 0; i < awayScore; i++) {
    const scorer = awayTeam.starters.find((p) => ['ST', 'RW', 'LW', 'CAM', 'CF'].includes(p.positionLabel)) || awayTeam.starters[9];
    const minute = 32 + (i * 30);
    events.push({
      id: `ev-${eventCount++}`,
      minute,
      teamId: awayTeam.id,
      teamName: awayTeam.name,
      type: 'goal',
      playerId: scorer.id,
      playerName: scorer.name,
      description: `¡GOL de ${scorer.name}! Definición precisa al ángulo.`,
    });
    if (scorer.statistics?.attack) {
      scorer.statistics.attack.goals = (scorer.statistics.attack.goals || 0) + 1;
    }
  }

  // Yellow cards
  events.push({
    id: `ev-${eventCount++}`,
    minute: 41,
    teamId: homeTeam.id,
    teamName: homeTeam.name,
    type: 'yellow_card',
    playerId: homeTeam.starters[5]?.id || 'p5',
    playerName: homeTeam.starters[5]?.name || 'Pase',
    description: 'Tarjeta amarilla por falta táctica.',
  });

  events.push({
    id: `ev-${eventCount++}`,
    minute: 68,
    teamId: awayTeam.id,
    teamName: awayTeam.name,
    type: 'yellow_card',
    playerId: awayTeam.starters[6]?.id || 'p6',
    playerName: awayTeam.starters[6]?.name || 'Pase',
    description: 'Tarjeta amarilla por cortar un contraataque.',
  });

  // Sort events by minute
  events.sort((a, b) => a.minute - b.minute);

  const resolvedMatchId = matchId || `sofascore-${homeKey}-vs-${awayKey}`;

  return {
    id: resolvedMatchId,
    url: inputUrlOrSlug.startsWith('http') ? inputUrlOrSlug : `https://www.sofascore.com/${matchSlug}`,
    homeTeam,
    awayTeam,
    competition,
    competitionLogo: 'https://img.sofascore.com/api/v1/unique-tournament/7/image',
    roundOrPhase: round,
    date: '18 May 2024, 20:45 CEST',
    stadium: KNOWN_TEAMS[homeKey]?.stadium || `${homeTeam.name} Stadium`,
    referee: 'Clément Turpin (Francia)',
    status: 'FINISHED',
    events,
  };
}
