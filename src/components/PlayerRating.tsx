import React, { useState, useEffect } from 'react';
import { ScoutRatingLevel, ScoutEvaluation } from '../types/scouting';
import { Star, Check } from 'lucide-react';

interface PlayerRatingProps {
  currentRating?: number;
  currentRatingLevel?: ScoutRatingLevel;
  onChange: (rating: number | undefined, level: ScoutRatingLevel | undefined) => void;
}

export const PlayerRating: React.FC<PlayerRatingProps> = ({
  currentRating,
  currentRatingLevel,
  onChange,
}) => {
  const [ratingVal, setRatingVal] = useState<string>(currentRating ? String(currentRating) : '');
  const [level, setLevel] = useState<ScoutRatingLevel | undefined>(currentRatingLevel);

  useEffect(() => {
    setRatingVal(currentRating ? String(currentRating) : '');
    setLevel(currentRatingLevel);
  }, [currentRating, currentRatingLevel]);

  const handleLevelSelect = (newLevel: ScoutRatingLevel) => {
    const next = level === newLevel ? undefined : newLevel;
    setLevel(next);
    const num = ratingVal ? parseFloat(ratingVal) : undefined;
    onChange(num, next);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRatingVal(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 1.0 && num <= 10.0) {
      // Auto assign level based on score guidelines if not manually set
      let autoLevel: ScoutRatingLevel = level || 'MEDIUM';
      if (!level) {
        if (num >= 8.0) autoLevel = 'HIGH';
        else if (num < 6.0) autoLevel = 'LOW';
        else autoLevel = 'MEDIUM';
      }
      onChange(num, autoLevel);
    } else if (raw === '') {
      onChange(undefined, level);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" />
          <span>Valoración del Scout</span>
        </label>
        <span className="text-[10px] font-mono text-[#94A3B8]">Manual (1.0 — 10.0)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Categorical Scout Tiers: HIGH (#10B981), MEDIUM (#FACC15), LOW (#EF4444) */}
        <div className="flex items-center gap-1.5 bg-[#0F172A] p-1 rounded border border-[#334155]">
          <button
            type="button"
            onClick={() => handleLevelSelect('HIGH')}
            className={`flex-1 py-1 px-2 rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              level === 'HIGH'
                ? 'bg-[#10B981] text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'text-[#94A3B8] hover:text-[#10B981]'
            }`}
          >
            {level === 'HIGH' && <Check className="w-3 h-3" />}
            <span>HIGH</span>
          </button>

          <button
            type="button"
            onClick={() => handleLevelSelect('MEDIUM')}
            className={`flex-1 py-1 px-2 rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              level === 'MEDIUM'
                ? 'bg-[#FACC15] text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                : 'text-[#94A3B8] hover:text-[#FACC15]'
            }`}
          >
            {level === 'MEDIUM' && <Check className="w-3 h-3" />}
            <span>MED</span>
          </button>

          <button
            type="button"
            onClick={() => handleLevelSelect('LOW')}
            className={`flex-1 py-1 px-2 rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              level === 'LOW'
                ? 'bg-[#EF4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'text-[#94A3B8] hover:text-[#EF4444]'
            }`}
          >
            {level === 'LOW' && <Check className="w-3 h-3" />}
            <span>LOW</span>
          </button>
        </div>

        {/* Numerical Input 1.0 - 10.0 */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="1.0"
            max="10.0"
            value={ratingVal}
            onChange={handleNumberChange}
            placeholder="Score (1-10)"
            className="w-full bg-[#0F172A] border border-[#334155] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {ratingVal && (
            <div
              className={`w-9 h-8 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                parseFloat(ratingVal) >= 8.0
                  ? 'bg-emerald-500/20 text-[#10B981] border border-[#10B981]/40'
                  : parseFloat(ratingVal) >= 6.0
                  ? 'bg-amber-500/20 text-[#FACC15] border border-[#FACC15]/40'
                  : 'bg-rose-500/20 text-[#EF4444] border border-[#EF4444]/40'
              }`}
            >
              {parseFloat(ratingVal).toFixed(1)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
