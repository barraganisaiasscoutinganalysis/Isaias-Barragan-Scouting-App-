export interface KnownPlayerDef {
  name: string;
  number: number;
  positionLabel: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  avatarId?: number;
  row?: number;
  col?: number;
}

export interface KnownTeamProfile {
  id: string;
  name: string;
  shortName: string;
  sofascoreTeamId: number;
  formation: string;
  stadium: string;
  defaultStarters: Array<KnownPlayerDef & { row: number; col: number }>;
  defaultSubs: Array<KnownPlayerDef>;
}

export const KNOWN_TEAMS_EXTENDED: Record<string, KnownTeamProfile> = {
  'real-madrid': {
    id: 'real-madrid',
    name: 'Real Madrid',
    shortName: 'RMA',
    sofascoreTeamId: 2829,
    formation: '4-3-3',
    stadium: 'Estadio Santiago Bernabéu, Madrid',
    defaultStarters: [
      { name: 'Thibaut Courtois', number: 1, positionLabel: 'GK', position: 'GK', avatarId: 874311, row: 0, col: 2 },
      { name: 'Dani Carvajal', number: 2, positionLabel: 'RB', position: 'DF', avatarId: 44615, row: 1, col: 4 },
      { name: 'Éder Militão', number: 3, positionLabel: 'CB', position: 'DF', avatarId: 835265, row: 1, col: 3 },
      { name: 'Antonio Rüdiger', number: 22, positionLabel: 'CB', position: 'DF', avatarId: 985558, row: 1, col: 1 },
      { name: 'Ferland Mendy', number: 23, positionLabel: 'LB', position: 'DF', avatarId: 859345, row: 1, col: 0 },
      { name: 'Federico Valverde', number: 8, positionLabel: 'CM', position: 'MF', avatarId: 849807, row: 2, col: 3 },
      { name: 'Aurélien Tchouaméni', number: 14, positionLabel: 'CDM', position: 'MF', avatarId: 934236, row: 2, col: 2 },
      { name: 'Jude Bellingham', number: 5, positionLabel: 'CAM', position: 'MF', avatarId: 987970, row: 2, col: 1 },
      { name: 'Rodrygo Goes', number: 11, positionLabel: 'RW', position: 'FW', avatarId: 935570, row: 3, col: 4 },
      { name: 'Kylian Mbappé', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 856714, row: 3, col: 2 },
      { name: 'Vinícius Júnior', number: 7, positionLabel: 'LW', position: 'FW', avatarId: 859424, row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Andriy Lunin', number: 13, positionLabel: 'GK', position: 'GK' },
      { name: 'Luka Modrić', number: 10, positionLabel: 'CM', position: 'MF' },
      { name: 'Eduardo Camavinga', number: 6, positionLabel: 'CM', position: 'MF' },
      { name: 'Brahim Díaz', number: 21, positionLabel: 'CAM', position: 'MF' },
      { name: 'Arda Güler', number: 15, positionLabel: 'RW', position: 'MF' },
      { name: 'Endrick', number: 16, positionLabel: 'ST', position: 'FW' },
      { name: 'Lucas Vázquez', number: 17, positionLabel: 'RB', position: 'DF' },
    ],
  },
  'manchester-city': {
    id: 'manchester-city',
    name: 'Manchester City',
    shortName: 'MCI',
    sofascoreTeamId: 17,
    formation: '4-2-3-1',
    stadium: 'Etihad Stadium, Mánchester',
    defaultStarters: [
      { name: 'Ederson Moraes', number: 31, positionLabel: 'GK', position: 'GK', avatarId: 115049, row: 0, col: 2 },
      { name: 'Kyle Walker', number: 2, positionLabel: 'RB', position: 'DF', avatarId: 42199, row: 1, col: 4 },
      { name: 'Rúben Dias', number: 3, positionLabel: 'CB', position: 'DF', avatarId: 859341, row: 1, col: 3 },
      { name: 'Manuel Akanji', number: 25, positionLabel: 'CB', position: 'DF', avatarId: 835264, row: 1, col: 1 },
      { name: 'Joško Gvardiol', number: 24, positionLabel: 'LB', position: 'DF', avatarId: 875883, row: 1, col: 0 },
      { name: 'Rodri Cascante', number: 16, positionLabel: 'CDM', position: 'MF', avatarId: 793663, row: 2, col: 1 },
      { name: 'Bernardo Silva', number: 20, positionLabel: 'CM', position: 'MF', avatarId: 288337, row: 2, col: 3 },
      { name: 'Phil Foden', number: 47, positionLabel: 'RW', position: 'FW', avatarId: 934236, row: 3, col: 4 },
      { name: 'Kevin De Bruyne', number: 17, positionLabel: 'CAM', position: 'MF', avatarId: 301287, row: 3, col: 2 },
      { name: 'Jérémy Doku', number: 11, positionLabel: 'LW', position: 'FW', avatarId: 985558, row: 3, col: 0 },
      { name: 'Erling Haaland', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 931086, row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Stefan Ortega', number: 18, positionLabel: 'GK', position: 'GK' },
      { name: 'İlkay Gündoğan', number: 19, positionLabel: 'CM', position: 'MF' },
      { name: 'Jack Grealish', number: 10, positionLabel: 'LW', position: 'FW' },
      { name: 'Mateo Kovačić', number: 8, positionLabel: 'CM', position: 'MF' },
      { name: 'John Stones', number: 5, positionLabel: 'CB', position: 'DF' },
      { name: 'Savinho', number: 26, positionLabel: 'RW', position: 'FW' },
      { name: 'Matheus Nunes', number: 27, positionLabel: 'CM', position: 'MF' },
    ],
  },
  'barcelona': {
    id: 'barcelona',
    name: 'FC Barcelona',
    shortName: 'BAR',
    sofascoreTeamId: 2817,
    formation: '4-2-3-1',
    stadium: 'Estadi Olímpic Lluís Companys, Barcelona',
    defaultStarters: [
      { name: 'Marc-André ter Stegen', number: 1, positionLabel: 'GK', position: 'GK', avatarId: 115049, row: 0, col: 2 },
      { name: 'Jules Koundé', number: 23, positionLabel: 'RB', position: 'DF', avatarId: 859345, row: 1, col: 4 },
      { name: 'Pau Cubarsí', number: 2, positionLabel: 'CB', position: 'DF', avatarId: 935570, row: 1, col: 3 },
      { name: 'Iñigo Martínez', number: 5, positionLabel: 'CB', position: 'DF', avatarId: 859424, row: 1, col: 1 },
      { name: 'Alejandro Balde', number: 3, positionLabel: 'LB', position: 'DF', avatarId: 835264, row: 1, col: 0 },
      { name: 'Marc Casadó', number: 17, positionLabel: 'CDM', position: 'MF', avatarId: 793663, row: 2, col: 1 },
      { name: 'Pedri González', number: 8, positionLabel: 'CM', position: 'MF', avatarId: 849807, row: 2, col: 3 },
      { name: 'Lamine Yamal', number: 19, positionLabel: 'RW', position: 'FW', avatarId: 987970, row: 3, col: 4 },
      { name: 'Dani Olmo', number: 20, positionLabel: 'CAM', position: 'MF', avatarId: 856714, row: 3, col: 2 },
      { name: 'Raphinha Dias', number: 11, positionLabel: 'LW', position: 'FW', avatarId: 934236, row: 3, col: 0 },
      { name: 'Robert Lewandowski', number: 9, positionLabel: 'ST', position: 'FW', avatarId: 184941, row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Iñaki Peña', number: 13, positionLabel: 'GK', position: 'GK' },
      { name: 'Fermín López', number: 16, positionLabel: 'CAM', position: 'MF' },
      { name: 'Gavi Páez', number: 6, positionLabel: 'CM', position: 'MF' },
      { name: 'Frenkie de Jong', number: 21, positionLabel: 'CM', position: 'MF' },
      { name: 'Ferran Torres', number: 7, positionLabel: 'ST', position: 'FW' },
      { name: 'Pau Víctor', number: 18, positionLabel: 'ST', position: 'FW' },
      { name: 'Eric García', number: 24, positionLabel: 'CB', position: 'DF' },
    ],
  },
  'psg': {
    id: 'psg',
    name: 'Paris Saint-Germain',
    shortName: 'PSG',
    sofascoreTeamId: 1644,
    formation: '4-3-3',
    stadium: 'Parc des Princes, París',
    defaultStarters: [
      { name: 'Gianluigi Donnarumma', number: 1, positionLabel: 'GK', position: 'GK', avatarId: 874311, row: 0, col: 2 },
      { name: 'Achraf Hakimi', number: 2, positionLabel: 'RB', position: 'DF', avatarId: 859345, row: 1, col: 4 },
      { name: 'Marquinhos Correa', number: 5, positionLabel: 'CB', position: 'DF', avatarId: 935570, row: 1, col: 3 },
      { name: 'Willian Pacho', number: 51, positionLabel: 'CB', position: 'DF', avatarId: 859424, row: 1, col: 1 },
      { name: 'Nuno Mendes', number: 25, positionLabel: 'LB', position: 'DF', avatarId: 835264, row: 1, col: 0 },
      { name: 'Vitinha Ferreira', number: 17, positionLabel: 'CM', position: 'MF', avatarId: 793663, row: 2, col: 3 },
      { name: 'Warren Zaïre-Emery', number: 33, positionLabel: 'CDM', position: 'MF', avatarId: 301287, row: 2, col: 2 },
      { name: 'Fabián Ruiz', number: 8, positionLabel: 'CM', position: 'MF', avatarId: 856714, row: 2, col: 1 },
      { name: 'Ousmane Dembélé', number: 10, positionLabel: 'RW', position: 'FW', avatarId: 934236, row: 3, col: 4 },
      { name: 'Marco Asensio', number: 11, positionLabel: 'ST', position: 'FW', avatarId: 849807, row: 3, col: 2 },
      { name: 'Bradley Barcola', number: 29, positionLabel: 'LW', position: 'FW', avatarId: 191398, row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Matvey Safonov', number: 39, positionLabel: 'GK', position: 'GK' },
      { name: 'Randal Kolo Muani', number: 23, positionLabel: 'ST', position: 'FW' },
      { name: 'Lee Kang-in', number: 19, positionLabel: 'CAM', position: 'MF' },
      { name: 'Lucas Beraldo', number: 35, positionLabel: 'CB', position: 'DF' },
      { name: 'Désiré Doué', number: 14, positionLabel: 'LW', position: 'FW' },
      { name: 'Lucas Hernández', number: 21, positionLabel: 'LB', position: 'DF' },
    ],
  },
  'manchester-united': {
    id: 'manchester-united',
    name: 'Manchester United',
    shortName: 'MUN',
    sofascoreTeamId: 35,
    formation: '4-2-3-1',
    stadium: 'Old Trafford, Mánchester',
    defaultStarters: [
      { name: 'André Onana', number: 24, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Noussair Mazraoui', number: 3, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Matthijs de Ligt', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Lisandro Martínez', number: 6, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Diogo Dalot', number: 20, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Kobbie Mainoo', number: 37, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Casemiro', number: 18, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Alejandro Garnacho', number: 17, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Bruno Fernandes', number: 8, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Marcus Rashford', number: 10, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
      { name: 'Rasmus Højlund', number: 9, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Altay Bayındır', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'Joshua Zirkzee', number: 11, positionLabel: 'ST', position: 'FW' },
      { name: 'Amad Diallo', number: 16, positionLabel: 'RW', position: 'FW' },
      { name: 'Christian Eriksen', number: 14, positionLabel: 'CM', position: 'MF' },
      { name: 'Harry Maguire', number: 5, positionLabel: 'CB', position: 'DF' },
      { name: 'Mason Mount', number: 7, positionLabel: 'CAM', position: 'MF' },
    ],
  },
  'tottenham': {
    id: 'tottenham',
    name: 'Tottenham Hotspur',
    shortName: 'TOT',
    sofascoreTeamId: 33,
    formation: '4-3-3',
    stadium: 'Tottenham Hotspur Stadium, Londres',
    defaultStarters: [
      { name: 'Guglielmo Vicario', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Pedro Porro', number: 23, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Cristian Romero', number: 17, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Micky van de Ven', number: 37, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Destiny Udogie', number: 13, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Pape Matar Sarr', number: 29, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Yves Bissouma', number: 8, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'James Maddison', number: 10, positionLabel: 'CAM', position: 'MF', row: 2, col: 1 },
      { name: 'Dejan Kulusevski', number: 21, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Dominic Solanke', number: 19, positionLabel: 'ST', position: 'FW', row: 3, col: 2 },
      { name: 'Son Heung-min', number: 7, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Fraser Forster', number: 20, positionLabel: 'GK', position: 'GK' },
      { name: 'Brennan Johnson', number: 22, positionLabel: 'RW', position: 'FW' },
      { name: 'Richarlison', number: 9, positionLabel: 'ST', position: 'FW' },
      { name: 'Rodrigo Bentancur', number: 30, positionLabel: 'CM', position: 'MF' },
      { name: 'Timo Werner', number: 16, positionLabel: 'LW', position: 'FW' },
      { name: 'Radu Drăgușin', number: 6, positionLabel: 'CB', position: 'DF' },
    ],
  },
  'bayer-leverkusen': {
    id: 'bayer-leverkusen',
    name: 'Bayer Leverkusen',
    shortName: 'B04',
    sofascoreTeamId: 2681,
    formation: '3-4-2-1',
    stadium: 'BayArena, Leverkusen',
    defaultStarters: [
      { name: 'Lukáš Hrádecký', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Edmond Tapsoba', number: 12, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Jonathan Tah', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 2 },
      { name: 'Piero Hincapié', number: 3, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Jeremie Frimpong', number: 30, positionLabel: 'RWB', position: 'DF', row: 2, col: 4 },
      { name: 'Granit Xhaka', number: 34, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Robert Andrich', number: 8, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Alejandro Grimaldo', number: 20, positionLabel: 'LWB', position: 'DF', row: 2, col: 0 },
      { name: 'Florian Wirtz', number: 10, positionLabel: 'CAM', position: 'MF', row: 3, col: 3 },
      { name: 'Martin Terrier', number: 11, positionLabel: 'CAM', position: 'MF', row: 3, col: 1 },
      { name: 'Victor Boniface', number: 22, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Matěj Kovář', number: 17, positionLabel: 'GK', position: 'GK' },
      { name: 'Patrik Schick', number: 14, positionLabel: 'ST', position: 'FW' },
      { name: 'Jonas Hofmann', number: 7, positionLabel: 'CAM', position: 'MF' },
      { name: 'Exequiel Palacios', number: 25, positionLabel: 'CM', position: 'MF' },
      { name: 'Amine Adli', number: 21, positionLabel: 'LW', position: 'FW' },
    ],
  },
  'juventus': {
    id: 'juventus',
    name: 'Juventus',
    shortName: 'JUV',
    sofascoreTeamId: 2687,
    formation: '4-2-3-1',
    stadium: 'Allianz Stadium, Turín',
    defaultStarters: [
      { name: 'Michele Di Gregorio', number: 29, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Nicolò Savona', number: 37, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Federico Gatti', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Bremer', number: 3, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Andrea Cambiaso', number: 27, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Manuel Locatelli', number: 5, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Khéphren Thuram', number: 19, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Francisco Conceição', number: 7, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Teun Koopmeiners', number: 8, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Kenan Yildiz', number: 10, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
      { name: 'Dušan Vlahović', number: 9, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Mattia Perin', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'Douglas Luiz', number: 26, positionLabel: 'CM', position: 'MF' },
      { name: 'Weston McKennie', number: 16, positionLabel: 'CM', position: 'MF' },
      { name: 'Nicolás González', number: 11, positionLabel: 'RW', position: 'FW' },
      { name: 'Timothy Weah', number: 22, positionLabel: 'RW', position: 'FW' },
    ],
  },
  'napoli': {
    id: 'napoli',
    name: 'Napoli',
    shortName: 'NAP',
    sofascoreTeamId: 2714,
    formation: '4-3-3',
    stadium: 'Estadio Diego Armando Maradona, Nápoles',
    defaultStarters: [
      { name: 'Alex Meret', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Giovanni Di Lorenzo', number: 22, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Amir Rrahmani', number: 13, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Alessandro Buongiorno', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Mathías Olivera', number: 17, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'André-Frank Zambo Anguissa', number: 99, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Stanislav Lobotka', number: 68, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Scott McTominay', number: 8, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Matteo Politano', number: 21, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Romelu Lukaku', number: 11, positionLabel: 'ST', position: 'FW', row: 3, col: 2 },
      { name: 'Khvicha Kvaratskhelia', number: 77, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Elia Caprile', number: 25, positionLabel: 'GK', position: 'GK' },
      { name: 'David Neres', number: 7, positionLabel: 'RW', position: 'FW' },
      { name: 'Giacomo Raspadori', number: 81, positionLabel: 'ST', position: 'FW' },
      { name: 'Giovanni Simeone', number: 18, positionLabel: 'ST', position: 'FW' },
      { name: 'Billy Gilmour', number: 6, positionLabel: 'CM', position: 'MF' },
    ],
  },
  'inter-miami': {
    id: 'inter-miami',
    name: 'Inter Miami CF',
    shortName: 'MIA',
    sofascoreTeamId: 345097,
    formation: '4-3-3',
    stadium: 'Chase Stadium, Fort Lauderdale',
    defaultStarters: [
      { name: 'Drake Callender', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Marcelo Weigandt', number: 57, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Tomás Avilés', number: 6, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'David Martínez', number: 14, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Jordi Alba', number: 18, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Federico Redondo', number: 55, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Sergio Busquets', number: 5, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Julian Gressel', number: 24, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Lionel Messi', number: 10, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Luis Suárez', number: 9, positionLabel: 'ST', position: 'FW', row: 3, col: 2 },
      { name: 'Robert Taylor', number: 16, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'CJ dos Santos', number: 99, positionLabel: 'GK', position: 'GK' },
      { name: 'Leonardo Campana', number: 8, positionLabel: 'ST', position: 'FW' },
      { name: 'Benjamin Cremaschi', number: 30, positionLabel: 'CM', position: 'MF' },
      { name: 'Diego Gómez', number: 20, positionLabel: 'CM', position: 'MF' },
      { name: 'Matías Rojas', number: 7, positionLabel: 'CAM', position: 'MF' },
    ],
  },
  'racing-club': {
    id: 'racing-club',
    name: 'Racing Club',
    shortName: 'RAC',
    sofascoreTeamId: 3208,
    formation: '3-4-1-2',
    stadium: 'Estadio Presidente Perón (El Cilindro), Avellaneda',
    defaultStarters: [
      { name: 'Gabriel Arias', number: 21, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Marco Di Cesare', number: 2, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Santiago Sosa', number: 13, positionLabel: 'CB', position: 'DF', row: 1, col: 2 },
      { name: 'Agustín Basso', number: 22, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Gastón Martirena', number: 15, positionLabel: 'RWB', position: 'DF', row: 2, col: 4 },
      { name: 'Juan Nardoni', number: 5, positionLabel: 'CM', position: 'MF', row: 2, col: 2 },
      { name: 'Agustín Almendra', number: 32, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Gabriel Rojas', number: 27, positionLabel: 'LWB', position: 'DF', row: 2, col: 0 },
      { name: 'Juan Fernando Quintero', number: 8, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Adrián Martínez', number: 9, positionLabel: 'ST', position: 'FW', row: 4, col: 3 },
      { name: 'Maximiliano Salas', number: 7, positionLabel: 'ST', position: 'FW', row: 4, col: 1 },
    ],
    defaultSubs: [
      { name: 'Facundo Cambeses', number: 25, positionLabel: 'GK', position: 'GK' },
      { name: 'Bruno Zuculini', number: 36, positionLabel: 'CDM', position: 'MF' },
      { name: 'Santiago Solari', number: 28, positionLabel: 'RW', position: 'FW' },
      { name: 'Johan Carbonero', number: 17, positionLabel: 'LW', position: 'FW' },
      { name: 'Baltasar Rodríguez', number: 22, positionLabel: 'CAM', position: 'MF' },
    ],
  },
  'brazil': {
    id: 'brazil',
    name: 'Brasil',
    shortName: 'BRA',
    sofascoreTeamId: 4748,
    formation: '4-2-3-1',
    stadium: 'Estadio Maracanã, Río de Janeiro',
    defaultStarters: [
      { name: 'Alisson Becker', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Danilo Luiz', number: 2, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Marquinhos', number: 4, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Gabriel Magalhães', number: 14, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Guilherme Arana', number: 6, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'André Trindade', number: 18, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Bruno Guimarães', number: 5, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Rodrygo Goes', number: 10, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Lucas Paquetá', number: 8, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Vinícius Júnior', number: 7, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
      { name: 'Endrick', number: 9, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'Bento Krepski', number: 12, positionLabel: 'GK', position: 'GK' },
      { name: 'Raphinha', number: 11, positionLabel: 'RW', position: 'FW' },
      { name: 'Savinho', number: 20, positionLabel: 'RW', position: 'FW' },
      { name: 'João Gomes', number: 15, positionLabel: 'CM', position: 'MF' },
      { name: 'Lucas Beraldo', number: 17, positionLabel: 'CB', position: 'DF' },
    ],
  },
  'spain': {
    id: 'spain',
    name: 'España',
    shortName: 'ESP',
    sofascoreTeamId: 4698,
    formation: '4-3-3',
    stadium: 'Estadio Santiago Bernabéu, Madrid',
    defaultStarters: [
      { name: 'David Raya', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Dani Carvajal', number: 2, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Robin Le Normand', number: 3, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Aymeric Laporte', number: 14, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Marc Cucurella', number: 24, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Fabián Ruiz', number: 8, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Rodri Cascante', number: 16, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Pedri González', number: 20, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Lamine Yamal', number: 19, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Álvaro Morata', number: 7, positionLabel: 'ST', position: 'FW', row: 3, col: 2 },
      { name: 'Nico Williams', number: 17, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Álex Remiro', number: 13, positionLabel: 'GK', position: 'GK' },
      { name: 'Dani Olmo', number: 10, positionLabel: 'CAM', position: 'MF' },
      { name: 'Mikel Oyarzabal', number: 21, positionLabel: 'ST', position: 'FW' },
      { name: 'Martín Zubimendi', number: 18, positionLabel: 'CDM', position: 'MF' },
      { name: 'Ferran Torres', number: 11, positionLabel: 'LW', position: 'FW' },
      { name: 'Alejandro Grimaldo', number: 12, positionLabel: 'LB', position: 'DF' },
    ],
  },
  'uruguay': {
    id: 'uruguay',
    name: 'Uruguay',
    shortName: 'URU',
    sofascoreTeamId: 4725,
    formation: '4-3-3',
    stadium: 'Estadio Centenario, Montevideo',
    defaultStarters: [
      { name: 'Sergio Rochet', number: 1, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Nahitan Nández', number: 8, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'José María Giménez', number: 2, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Mathías Olivera', number: 16, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Matías Viña', number: 17, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Federico Valverde', number: 15, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Manuel Ugarte', number: 5, positionLabel: 'CDM', position: 'MF', row: 2, col: 2 },
      { name: 'Nicolás De La Cruz', number: 7, positionLabel: 'CM', position: 'MF', row: 2, col: 1 },
      { name: 'Facundo Pellistri', number: 11, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'Darwin Núñez', number: 19, positionLabel: 'ST', position: 'FW', row: 3, col: 2 },
      { name: 'Maximiliano Araújo', number: 20, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
    ],
    defaultSubs: [
      { name: 'Franco Israel', number: 23, positionLabel: 'GK', position: 'GK' },
      { name: 'Rodrigo Bentancur', number: 6, positionLabel: 'CM', position: 'MF' },
      { name: 'Giorgian De Arrascaeta', number: 10, positionLabel: 'CAM', position: 'MF' },
      { name: 'Luis Suárez', number: 9, positionLabel: 'ST', position: 'FW' },
      { name: 'Brian Rodríguez', number: 25, positionLabel: 'LW', position: 'FW' },
    ],
  },
  'colombia': {
    id: 'colombia',
    name: 'Colombia',
    shortName: 'COL',
    sofascoreTeamId: 4820,
    formation: '4-2-3-1',
    stadium: 'Estadio Metropolitano Roberto Meléndez, Barranquilla',
    defaultStarters: [
      { name: 'Camilo Vargas', number: 12, positionLabel: 'GK', position: 'GK', row: 0, col: 2 },
      { name: 'Daniel Muñoz', number: 21, positionLabel: 'RB', position: 'DF', row: 1, col: 4 },
      { name: 'Davinson Sánchez', number: 23, positionLabel: 'CB', position: 'DF', row: 1, col: 3 },
      { name: 'Carlos Cuesta', number: 2, positionLabel: 'CB', position: 'DF', row: 1, col: 1 },
      { name: 'Johan Mojica', number: 17, positionLabel: 'LB', position: 'DF', row: 1, col: 0 },
      { name: 'Richard Ríos', number: 6, positionLabel: 'CM', position: 'MF', row: 2, col: 3 },
      { name: 'Jefferson Lerma', number: 16, positionLabel: 'CDM', position: 'MF', row: 2, col: 1 },
      { name: 'Jhon Arias', number: 11, positionLabel: 'RW', position: 'FW', row: 3, col: 4 },
      { name: 'James Rodríguez', number: 10, positionLabel: 'CAM', position: 'MF', row: 3, col: 2 },
      { name: 'Luis Díaz', number: 7, positionLabel: 'LW', position: 'FW', row: 3, col: 0 },
      { name: 'Jhon Córdoba', number: 24, positionLabel: 'ST', position: 'FW', row: 4, col: 2 },
    ],
    defaultSubs: [
      { name: 'David Ospina', number: 1, positionLabel: 'GK', position: 'GK' },
      { name: 'Luis Sinisterra', number: 18, positionLabel: 'LW', position: 'FW' },
      { name: 'Juan Fernando Quintero', number: 20, positionLabel: 'CAM', position: 'MF' },
      { name: 'Rafael Santos Borré', number: 19, positionLabel: 'ST', position: 'FW' },
      { name: 'Jorge Carrascal', number: 8, positionLabel: 'CAM', position: 'MF' },
      { name: 'Yaser Asprilla', number: 22, positionLabel: 'RW', position: 'FW' },
    ],
  },
};

/**
 * Procedural name generator tailored to the team's language/region
 * so NO team ever gets "Jugador 1" or "Suplente 14".
 */
export function generateRealisticPlayerName(teamName: string, role: string, number: number): { name: string; shortName: string } {
  const lower = teamName.toLowerCase();

  const isSpanish = /spain|españa|madrid|barcelona|sevilla|betis|valencia|bilbao|sociedad|vigo|getafe|rayo|alaves|osasuna|mallorca|las palmas|argentina|boca|river|racing|independiente|san lorenzo|velez|estudiantes|lanus|rosario|newell|colombia|uruguay|chile|peru|mexico/i.test(lower);
  const isBrazilian = /brazil|brasil|flamengo|palmeiras|sao paulo|corinthians|santos|gremio|internacional|cruzeiro|atletico mineiro|fluminense|botafogo|vasco/i.test(lower);
  const isItalian = /italy|italia|milan|inter|juve|roma|lazio|napoli|atalanta|fiorentina|torino|bologna|udinese|genoa|cagliari|parma|monza|empoli|verona/i.test(lower);
  const isGerman = /germany|deutschland|bayern|dortmund|leverkusen|leipzig|frankfurt|stuttgart|wolfsburg|gladbach|freiburg|bremen|mainz|augsburg|union berlin/i.test(lower);
  const isFrench = /france|francia|paris|psg|marseille|lyon|monaco|lille|rennes|nice|lens|strasbourg|toulouse|reims|nantes|montpellier/i.test(lower);

  let firstNames: string[];
  let lastNames: string[];

  if (isBrazilian) {
    firstNames = ['Gabriel', 'Lucas', 'Matheus', 'Rodrigo', 'Felipe', 'Thiago', 'Guilherme', 'Gustavo', 'Danilo', 'Rafael', 'Vinicius', 'Eduardo', 'Caio', 'Bruno', 'Leonardo'];
    lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida'];
  } else if (isItalian) {
    firstNames = ['Lorenzo', 'Matteo', 'Federico', 'Marco', 'Andrea', 'Alessandro', 'Gianluca', 'Davide', 'Simone', 'Francesco', 'Nicolo', 'Edoardo', 'Riccardo', 'Gabriele', 'Tommaso'];
    lastNames = ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa'];
  } else if (isGerman) {
    firstNames = ['Lukas', 'Jonas', 'Maximilian', 'Felix', 'Niklas', 'Tim', 'Leon', 'Moritz', 'Jan', 'Florian', 'David', 'Alexander', 'Julian', 'Tobias', 'Sebastian'];
    lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein'];
  } else if (isFrench) {
    firstNames = ['Antoine', 'Thomas', 'Alexandre', 'Mathis', 'Maxime', 'Nicolas', 'Julien', 'Clément', 'Romain', 'Valentin', 'Lucas', 'Hugo', 'Enzo', 'Nathan', 'Léo'];
    lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia'];
  } else if (isSpanish) {
    firstNames = ['Mateo', 'Lucas', 'Thiago', 'Agustín', 'Tomás', 'Ignacio', 'Joaquín', 'Martín', 'Santiago', 'Nicolás', 'Federico', 'Facundo', 'Lautaro', 'Julián', 'Rodrigo'];
    lastNames = ['Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'Gómez', 'Sánchez', 'Díaz', 'Álvarez', 'Romero', 'Torres', 'Benítez', 'Castro', 'Morales'];
  } else {
    // English / International
    firstNames = ['Jack', 'Harry', 'Callum', 'Oliver', 'George', 'James', 'Charlie', 'Thomas', 'Jacob', 'Alfie', 'William', 'Joshua', 'Liam', 'Daniel', 'Ethan'];
    lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Edwards'];
  }

  // Pick deterministically based on teamName and number
  const seed = (teamName.length * 17 + number * 31 + role.charCodeAt(0)) % 1000;
  const firstName = firstNames[seed % firstNames.length];
  const lastName = lastNames[(seed * 3) % lastNames.length];

  return {
    name: `${firstName} ${lastName}`,
    shortName: `${firstName[0]}. ${lastName}`
  };
}
