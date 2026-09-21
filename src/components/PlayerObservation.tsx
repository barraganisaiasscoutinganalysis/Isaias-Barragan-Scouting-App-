import React, { useState, useEffect } from 'react';
import { Save, Check, Clock } from 'lucide-react';

interface PlayerObservationProps {
  initialComment: string;
  onSave: (comment: string) => Promise<void> | void;
  lastUpdated?: string;
}

export const PlayerObservation: React.FC<PlayerObservationProps> = ({
  initialComment,
  onSave,
  lastUpdated,
}) => {
  const [comment, setComment] = useState(initialComment || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setComment(initialComment || '');
    setIsDirty(false);
  }, [initialComment]);

  const handleSave = async () => {
    await onSave(comment);
    setIsDirty(false);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  return (
    <div className="space-y-2 rounded-lg bg-[#0F172A] border border-[#334155] p-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          Observación del jugador
        </label>
        <span className="text-[11px] font-mono text-[#94A3B8]">
          {comment.length} caracteres
        </span>
      </div>

      <textarea
        rows={4}
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setIsDirty(true);
          setIsSaved(false);
        }}
        placeholder="Escribí tus observaciones sobre el desempeño del jugador..."
        className="w-full p-3 rounded bg-[#0A0D14] border border-[#334155] focus:border-blue-500 text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed font-sans"
      />

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748B]">
          {lastUpdated ? (
            <>
              <Clock className="w-3 h-3" />
              <span>Guardado en este informe</span>
            </>
          ) : (
            <span>Sin notas previas</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty && !isSaved}
          className={`px-3.5 py-1.5 rounded text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
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
              <span>Guardar observación</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
