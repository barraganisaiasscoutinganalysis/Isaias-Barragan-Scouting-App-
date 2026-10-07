import { 
  CompleteMatchReport, 
  MatchReportMeta, 
  ScoutEvaluation, 
  MatchEventNote, 
  PlayerGeneralReport 
} from '../../types/scouting';
import { dataService, IDataService } from '../dataService';

export interface IStorageService extends IDataService {}

export const storageService: IStorageService = dataService;
