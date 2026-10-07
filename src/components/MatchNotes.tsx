import React, { useState, useEffect } from 'react';
import { Save, Check, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface MatchNotesProps {
  initialNotes: string;
  onSaveNotes: (notes: string) => Promise<void> | void;
}

export const MatchNotes: React.FC<MatchNotesProps> = ({
  initialNotes,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState(initialNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setNotes(initialNotes || '');
    setIsDirty(false);
    setSaveError(null);
  }, [initialNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveNotes(notes);
      setIsDirty(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e: any) {
      console.error('Error guardando notas de partido:', e);
      setSaveError('Error al sincronizar notas en Firestore. Tus cambios no se han perdido. Reintentá.');
    } finally {
      setIsSaving(false);
    }
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
          setSaveError(null);
        }}
        placeholder="Registrá patrones, contexto, claves tácticas y jugadores a seguir en próximos encuentros..."
        className="w-full p-3 rounded bg-[#0A0D14] border border-[#334155] focus:border-blue-500 text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed font-sans"
      />

      {saveError && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-1.5 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-mono text-[#64748B]">
          Persistido en el informe general
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || (!isDirty && !isSaved && !saveError)}
          className={`px-4 py-2 rounded text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : saveError
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : isDirty
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              : 'bg-[#1E293B] text-[#64748B] border border-[#334155] cursor-default'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Guardado</span>
            </>
          ) : saveError ? (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Reintentar</span>
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
