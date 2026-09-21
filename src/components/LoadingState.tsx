import React from 'react';
import { Loader2, Activity, CheckCircle2 } from 'lucide-react';

interface LoadingStateProps {
  currentStage: string;
}

const STAGES = [
  "Analizando partido...",
  "Obteniendo alineaciones...",
  "Cargando estadísticas...",
  "Preparando informe..."
];

export const LoadingState: React.FC<LoadingStateProps> = ({ currentStage }) => {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0D14] min-h-[500px]">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#111827] border border-[#334155] shadow-2xl space-y-6 text-center">
        {/* Animated radar badge */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping"></div>
          <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white tracking-wide">
            Procesando Partido
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono">
            {currentStage || "Conectando con el servicio de datos..."}
          </p>
        </div>

        {/* Linear progress steps */}
        <div className="space-y-2.5 text-left pt-2">
          {STAGES.map((stage, idx) => {
            const isCompleted = currentIndex > idx;
            const isCurrent = currentIndex === idx;

            return (
              <div
                key={stage}
                className={`flex items-center justify-between p-2.5 rounded text-xs transition-all border ${
                  isCurrent
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 font-semibold'
                    : isCompleted
                    ? 'bg-[#1E293B]/40 border-transparent text-emerald-400'
                    : 'bg-transparent border-transparent text-[#64748B]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#334155] flex items-center justify-center text-[9px] font-mono">
                      {idx + 1}
                    </div>
                  )}
                  <span>{stage}</span>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-mono text-blue-400 animate-pulse">EN PROCESO</span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-mono text-emerald-400">LISTO</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
