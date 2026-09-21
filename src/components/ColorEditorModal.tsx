import React from 'react';
import { 
  X, 
  Palette, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sliders, 
  Eye, 
  CheckCircle2 
} from 'lucide-react';
import { useTheme, THEME_PRESETS, ThemeColors } from '../context/ThemeContext';

export const ColorEditorModal: React.FC = () => {
  const { 
    theme, 
    presetId, 
    applyPreset, 
    updateColorKey, 
    resetToDefault, 
    isEditorOpen, 
    setIsEditorOpen,
    currentUserEmail
  } = useTheme();

  if (!isEditorOpen) return null;

  const colorFields: { key: keyof ThemeColors; label: string; desc: string }[] = [
    { 
      key: 'primary', 
      label: 'Acento Principal', 
      desc: 'Color de botones de acción, iconos activos y elementos destacados.' 
    },
    { 
      key: 'primaryText', 
      label: 'Texto sobre Acento', 
      desc: 'Color de texto dentro de botones con fondo de acento.' 
    },
    { 
      key: 'secondary', 
      label: 'Acento Secundario', 
      desc: 'Color de brillos, insignias y bordes de resaltado.' 
    },
    { 
      key: 'bgMain', 
      label: 'Fondo Principal de la Aplicación', 
      desc: 'Color de fondo general de toda la pantalla.' 
    },
    { 
      key: 'bgCard', 
      label: 'Fondo de Tarjetas y Módulos', 
      desc: 'Fondo de contenedores, paneles tácticos y tablas.' 
    },
    { 
      key: 'bgHeader', 
      label: 'Fondo de Barra Lateral y Cabecera', 
      desc: 'Fondo del menú de navegación y barra superior.' 
    },
    { 
      key: 'borderCard', 
      label: 'Bordes y Separadores', 
      desc: 'Líneas divisorias y marcos de las tarjetas.' 
    },
    { 
      key: 'textPrimary', 
      label: 'Texto Principal', 
      desc: 'Color de títulos, nombres de jugadores y lecturas principales.' 
    },
    { 
      key: 'textMuted', 
      label: 'Texto Secundario', 
      desc: 'Color de métricas secundarias, fechas y etiquetas.' 
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
          color: theme.textPrimary
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ backgroundColor: theme.bgHeader, borderColor: theme.borderCard }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl border flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40`, color: theme.primary }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase font-mono tracking-wide" style={{ color: theme.textPrimary }}>
                  Editor de Paleta de Colores
                </h2>
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border"
                  style={{ backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}30`, color: theme.primary }}
                >
                  {currentUserEmail ? `Cuenta: ${currentUserEmail}` : 'Perfil Local'}
                </span>
              </div>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Personaliza en tiempo real los colores principales, fondos y acentos de toda la plataforma.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditorOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
            title="Cerrar editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: theme.primary }}>
                <Sparkles className="w-4 h-4" />
                <span>Plantillas de Color Predefinidas</span>
              </label>
              <span className="text-[11px] font-mono" style={{ color: theme.textMuted }}>
                Haz clic en una plantilla para aplicar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isActive = presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className="group relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 hover:scale-[1.02]"
                    style={{
                      backgroundColor: preset.colors.bgCard,
                      borderColor: isActive ? preset.colors.primary : `${preset.colors.borderCard}`,
                      boxShadow: isActive ? `0 0 15px ${preset.colors.primary}30` : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate pr-2" style={{ color: preset.colors.textPrimary }}>
                        {preset.name}
                      </span>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: preset.colors.primary }} />
                      )}
                    </div>

                    <p className="text-[10px] line-clamp-2 leading-tight" style={{ color: preset.colors.textMuted }}>
                      {preset.description}
                    </p>

                    {/* Color Swatch Circles */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: preset.colors.primary }} title="Acento principal" />
                      <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: preset.colors.secondary }} title="Acento secundario" />
                      <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: preset.colors.bgMain }} title="Fondo de pantalla" />
                      <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: preset.colors.bgCard }} title="Fondo tarjeta" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Fine Tuning */}
          <div className="space-y-4 pt-2 border-t" style={{ borderColor: theme.borderCard }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: theme.primary }}>
                <Sliders className="w-4 h-4" />
                <span>Ajuste Fino Personalizado por Color</span>
              </label>
              {presetId === 'custom' && (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}>
                  MODO PERSONALIZADO
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colorFields.map(({ key, label, desc }) => {
                const currentValue = theme[key];

                return (
                  <div 
                    key={key} 
                    className="p-3.5 rounded-xl border space-y-2"
                    style={{ backgroundColor: theme.bgHeader, borderColor: theme.borderCard }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                        {label}
                      </span>
                      
                      {/* Hex input + Native Color Picker */}
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentValue.startsWith('#') ? currentValue : '#000000'}
                          onChange={(e) => updateColorKey(key, e.target.value)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent p-0 overflow-hidden shadow"
                          title="Elegir color"
                        />
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => updateColorKey(key, e.target.value)}
                          className="w-20 px-2 py-1 rounded text-xs font-mono font-bold uppercase border text-center focus:outline-none"
                          style={{
                            backgroundColor: theme.bgMain,
                            borderColor: theme.borderCard,
                            color: theme.textPrimary
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Preview Component */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: theme.borderCard }}>
            <label className="text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: theme.primary }}>
              <Eye className="w-4 h-4" />
              <span>Vista Previa del Resultado</span>
            </label>

            <div 
              className="p-5 rounded-xl border space-y-4 shadow-lg"
              style={{ backgroundColor: theme.bgMain, borderColor: theme.borderCard }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.secondary }}>
                    • INFORME TÁCTICO EN VIVO
                  </span>
                  <h4 className="text-base font-bold" style={{ color: theme.textPrimary }}>
                    Isaias Barragan Scouting Analysis
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    className="px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider font-mono shadow transition-transform active:scale-95 cursor-pointer"
                    style={{ backgroundColor: theme.primary, color: theme.primaryText }}
                  >
                    Botón Principal
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded text-xs font-medium border cursor-pointer"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard, color: theme.textMuted }}
                  >
                    Secundario
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg border space-y-2" style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard }}>
                <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  Así es como lucirán las tarjetas, paneles estadísticos y listas de jugadores con tu combinación de colores actual.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ backgroundColor: theme.bgHeader, borderColor: theme.borderCard }}
        >
          <button
            onClick={resetToDefault}
            className="px-3.5 py-2 rounded-lg border text-xs font-mono font-semibold flex items-center gap-2 transition-colors cursor-pointer hover:bg-white/10"
            style={{ borderColor: theme.borderCard, color: theme.textMuted }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Oficial (#F9C34D)</span>
          </button>

          <button
            onClick={() => setIsEditorOpen(false)}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase font-mono tracking-wider shadow cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
            style={{ backgroundColor: theme.primary, color: theme.primaryText }}
          >
            <Check className="w-4 h-4" />
            <span>Guardar y Aplicar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
