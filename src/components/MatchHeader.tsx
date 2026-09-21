import React from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Trophy, 
  FileDown, 
  Image as ImageIcon,
  Share2,
  Check,
  FileText,
  Pencil
} from 'lucide-react';
import { MatchDetails } from '../types/scouting';

interface MatchHeaderProps {
  match: MatchDetails;
  onBack: () => void;
  onExportPDF: () => void;
  onExportPNG: () => void;
  onOpenDossier?: () => void;
  onOpenEdit?: () => void;
  onOpenNotes?: () => void;
  onDelete?: () => void;
  hasNotes?: boolean;
  isExporting?: boolean;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  match,
  onBack,
  onExportPDF,
  onExportPNG,
  onOpenDossier,
  onOpenEdit,
  onOpenNotes,
  onDelete,
  hasNotes = false,
  isExporting = false,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  return (
    <div id="match-header-section" className="relative border-b border-[#334155] bg-gradient-to-b from-[#111827] to-[#0A0D14] px-3 py-2.5 sm:px-4 sm:py-3 md:p-6 select-none overflow-hidden shrink-0">
      {/* Background glow lines */}
      <div className="absolute top-0 right-1/4 w-96 h-20 bg-blue-500/10 blur-3xl pointer-events-none"></div>

      {/* Top Bar: Breadcrumb & Export Actions */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 pb-2 border-b border-[#334155]/40 text-xs">
        <div className="flex items-center gap-1.5 text-[#94A3B8] text-[11px] truncate min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-white hover:text-blue-400 transition-colors font-medium cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Informes</span>
          </button>
          <span className="text-blue-400 font-mono font-medium truncate text-[10px] sm:text-[11px]">
            • {match.competition} {match.roundOrPhase ? `(${match.roundOrPhase})` : ''}
          </span>
        </div>

        {/* Action Buttons: Edit, Notes, Dossier, PDF, PNG, Delete */}
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
          {onOpenNotes && (
            <button
              type="button"
              onClick={onOpenNotes}
              className={`px-2 py-1 rounded font-mono text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                hasNotes 
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 font-bold' 
                  : 'bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white border border-[#334155]'
              }`}
              title="Ver o editar notas del partido"
            >
              <FileText className={`w-3 h-3 ${hasNotes ? 'text-emerald-400' : 'text-[#64748B]'}`} />
              <span className="hidden xs:inline">{hasNotes ? 'Notas ●' : 'Notas'}</span>
            </button>
          )}

          {onOpenEdit && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-mono text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              title="Editar datos del partido"
            >
              <Pencil className="w-3 h-3 text-amber-400" />
              <span className="font-bold hidden sm:inline">Editar</span>
            </button>
          )}

          {onOpenDossier && (
            <button
              type="button"
              onClick={onOpenDossier}
              className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 font-mono text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title="Abrir Dossier de Scouting"
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span className="hidden xs:inline">Dossier</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportPDF}
            disabled={isExporting}
            className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white font-mono text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            title="Exportar como PDF"
          >
            <FileDown className="w-3 h-3 text-blue-400" />
            <span className="hidden xs:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={onExportPNG}
            disabled={isExporting}
            className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white font-mono text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            title="Exportar como PNG"
          >
            <ImageIcon className="w-3 h-3 text-purple-400" />
            <span className="hidden xs:inline">PNG</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-1.5 py-1 rounded bg-[#1E293B] hover:bg-rose-500/20 text-rose-400 font-mono text-[10px] sm:text-[11px] transition-all cursor-pointer"
              title="Eliminar informe"
            >
              Borrar
            </button>
          )}
        </div>
      </div>

      {/* Hero Visual Match Score & Teams (Compact on mobile) */}
      <div className="relative z-10 pt-2 pb-1.5 flex items-center justify-between gap-2">
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base md:text-xl font-black text-white tracking-tight truncate">
              {match.homeTeam.name}
            </h2>
            <p className="text-[10px] font-mono text-blue-400 truncate">{match.homeTeam.formation} (L)</p>
          </div>
          <img
            src={match.homeTeam.logoUrl || `/api/sofascore/image/team/${match.homeTeam.id}`}
            alt={match.homeTeam.name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain shrink-0 filter drop-shadow"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/api/sofascore/image/team/')) {
                target.src = `/api/sofascore/image/team/${match.homeTeam.id}`;
              }
            }}
          />
        </div>

        {/* Center Score Badge */}
        <div className="flex flex-col items-center shrink-0 px-3 py-1 rounded-lg bg-[#0F172A] border border-[#334155] shadow">
          <div className="flex items-center gap-1.5 font-mono font-black text-lg sm:text-xl md:text-2xl text-white tracking-widest">
            <span>{match.homeTeam.score}</span>
            <span className="text-[#64748B] text-sm">:</span>
            <span>{match.awayTeam.score}</span>
          </div>
          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
            {match.status}
          </span>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1 justify-start text-left min-w-0">
          <img
            src={match.awayTeam.logoUrl || `/api/sofascore/image/team/${match.awayTeam.id}`}
            alt={match.awayTeam.name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain shrink-0 filter drop-shadow"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/api/sofascore/image/team/')) {
                target.src = `/api/sofascore/image/team/${match.awayTeam.id}`;
              }
            }}
          />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base md:text-xl font-black text-white tracking-tight truncate">
              {match.awayTeam.name}
            </h2>
            <p className="text-[10px] font-mono text-purple-400 truncate">{match.awayTeam.formation} (V)</p>
          </div>
        </div>
      </div>

      {/* Expandable Match Details / Toggle */}
      <div className="relative z-15 pt-1 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="text-[10px] font-mono text-[#94A3B8] hover:text-white flex items-center gap-1 bg-[#1E293B]/60 hover:bg-[#1E293B] px-2.5 py-0.5 rounded-full border border-[#334155] transition-colors cursor-pointer"
        >
          <span>{isDetailsOpen ? '▲ Ocultar info del partido' : '▼ Ver estadio, fecha y árbitro'}</span>
        </button>

        {isDetailsOpen && (
          <div className="mt-2 pt-2 border-t border-[#334155]/50 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#94A3B8] font-mono animate-fadeIn w-full">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#64748B]" />
              <span>{match.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#64748B]" />
              <span>{match.stadium}</span>
            </div>
            {match.referee && (
              <div className="text-[#64748B]">
                Árbitro: <span className="text-[#94A3B8]">{match.referee}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
