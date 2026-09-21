import React, { useState, useEffect } from 'react';
import { Save, Check, FileText } from 'lucide-react';

interface MatchNotesProps {
  initialNotes: string;
  onSaveNotes: (notes: string) => Promise<void> | void;
}

export const MatchNotes: React.FC<MatchNotesProps> = ({
  initialNotes,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState(initialNotes || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setNotes(initialNotes || '');
    setIsDirty(false);
  }, [initialNotes]);

  const handleSave = async () => {
    await onSaveNotes(notes);
    setIsDirty(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="rounded-lg bg-[#111827] border border-[#334155] p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Notas del Partido
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#94A3B8]">
          {notes.length} caracteres
        </span>
      </div>

      <textarea
        rows={4}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setIsDirty(true);
          setIsSaved(false);
        }}
        placeholder="Registrá patrones, contexto, claves tácticas y jugadores a seguir en próximos encuentros..."
        className="w-full p-3 rounded bg-[#0A0D14] border border-[#334155] focus:border-blue-500 text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed font-sans"
      />

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-mono text-[#64748B]">
          Persistido en el informe general
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty && !isSaved}
          className={`px-4 py-2 rounded text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : isDirty
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              : 'bg-[#1E293B] text-[#64748B] border border-[#334155] cursor-default'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Guardado</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Guardar notas</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
