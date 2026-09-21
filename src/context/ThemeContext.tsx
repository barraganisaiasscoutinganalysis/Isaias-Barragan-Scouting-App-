import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface ThemeColors {
  primary: string;         // Main brand accent (e.g., #F9C34D gold)
  primaryText: string;     // Text color on top of primary button (e.g. #000000 or #FFFFFF)
  secondary: string;       // Secondary accent (e.g., #F59E0B)
  bgMain: string;          // Page background (e.g., #0A0D14)
  bgCard: string;          // Card surface (e.g., #111827)
  bgHeader: string;        // Header & Sidebar bg (e.g., #0B0F19)
  borderCard: string;      // Borders (e.g., #334155)
  textPrimary: string;     // Main text (e.g., #FFFFFF)
  textMuted: string;       // Subtext / labels (e.g., #94A3B8)
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'isaias-gold',
    name: 'Dorado & Negro (Oficial IB)',
    description: 'Estilo oficial con oro brillante #F9C34D y fondo negro táctico.',
    colors: {
      primary: '#F9C34D',
      primaryText: '#000000',
      secondary: '#F59E0B',
      bgMain: '#0A0D14',
      bgCard: '#111827',
      bgHeader: '#0B0F19',
      borderCard: '#334155',
      textPrimary: '#FFFFFF',
      textMuted: '#94A3B8',
    },
  },
  {
    id: 'emerald-pitch',
    name: 'Cancha Esmeralda',
    description: 'Tono verde césped profesional con acentos esmeralda y negro profundo.',
    colors: {
      primary: '#10B981',
      primaryText: '#000000',
      secondary: '#059669',
      bgMain: '#041710',
      bgCard: '#0C271D',
      bgHeader: '#081D15',
      borderCard: '#1E4E3C',
      textPrimary: '#F0FDF4',
      textMuted: '#A7F3D0',
    },
  },
  {
    id: 'sofascore-cyan',
    name: 'Ciber Azul Sofascore',
    description: 'Combinación azul eléctrico y cian futurista para análisis de datos.',
    colors: {
      primary: '#3B82F6',
      primaryText: '#FFFFFF',
      secondary: '#06B6D4',
      bgMain: '#080D1A',
      bgCard: '#10192E',
      bgHeader: '#0C1324',
      borderCard: '#1E293B',
      textPrimary: '#F8FAFC',
      textMuted: '#94A3B8',
    },
  },
  {
    id: 'crimson-passion',
    name: 'Rojo Pasión de Furia',
    description: 'Rojo intenso de alta energía sobre fondo gris carbón oscuro.',
    colors: {
      primary: '#EF4444',
      primaryText: '#FFFFFF',
      secondary: '#F87171',
      bgMain: '#120808',
      bgCard: '#1F1010',
      bgHeader: '#180B0B',
      borderCard: '#3F1A1A',
      textPrimary: '#FEF2F2',
      textMuted: '#FCA5A5',
    },
  },
  {
    id: 'pure-stealth',
    name: 'OLED Stealth Total Black',
    description: 'Negro puro #000000 con acentos blanco metálico y contraste máximo.',
    colors: {
      primary: '#E2E8F0',
      primaryText: '#000000',
      secondary: '#94A3B8',
      bgMain: '#000000',
      bgCard: '#0D0D0D',
      bgHeader: '#050505',
      borderCard: '#262626',
      textPrimary: '#FFFFFF',
      textMuted: '#A1A1AA',
    },
  },
  {
    id: 'purple-neon',
    name: 'Neón Violeta VIP',
    description: 'Púrpura vibrante neón sobre tonos noche profunda.',
    colors: {
      primary: '#A855F7',
      primaryText: '#FFFFFF',
      secondary: '#EC4899',
      bgMain: '#0E0917',
      bgCard: '#181028',
      bgHeader: '#120A1F',
      borderCard: '#33214F',
      textPrimary: '#FAF5FF',
      textMuted: '#D8B4FE',
    },
  },
];

interface ThemeContextType {
  theme: ThemeColors;
  presetId: string;
  setTheme: (colors: ThemeColors) => void;
  applyPreset: (presetId: string) => void;
  updateColorKey: (key: keyof ThemeColors, value: string) => void;
  resetToDefault: () => void;
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
  currentUserEmail: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userEmail = user?.email || null;

  const [theme, setThemeState] = useState<ThemeColors>(THEME_PRESETS[0].colors);
  const [presetId, setPresetId] = useState<string>(THEME_PRESETS[0].id);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const getStorageKey = () => {
    return userEmail ? `isaias_scout_theme_${userEmail}` : 'isaias_scout_theme_guest';
  };

  const getPresetKey = () => {
    return userEmail ? `isaias_scout_preset_${userEmail}` : 'isaias_scout_preset_guest';
  };

  // Apply CSS variables to root element
  const applyCssVariables = (colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-text', colors.primaryText);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-bg-main', colors.bgMain);
    root.style.setProperty('--theme-bg-card', colors.bgCard);
    root.style.setProperty('--theme-bg-header', colors.bgHeader);
    root.style.setProperty('--theme-border-card', colors.borderCard);
    root.style.setProperty('--theme-text-primary', colors.textPrimary);
    root.style.setProperty('--theme-text-muted', colors.textMuted);

    // Apply main background color directly to body
    document.body.style.backgroundColor = colors.bgMain;
    document.body.style.color = colors.textPrimary;
  };

  // Load user-specific theme whenever authenticated user changes
  useEffect(() => {
    const sKey = getStorageKey();
    const pKey = getPresetKey();

    const savedTheme = localStorage.getItem(sKey);
    const savedPreset = localStorage.getItem(pKey);

    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setThemeState(parsed);
        applyCssVariables(parsed);
      } catch {
        setThemeState(THEME_PRESETS[0].colors);
        applyCssVariables(THEME_PRESETS[0].colors);
      }
    } else {
      setThemeState(THEME_PRESETS[0].colors);
      applyCssVariables(THEME_PRESETS[0].colors);
    }

    if (savedPreset) {
      setPresetId(savedPreset);
    } else {
      setPresetId(THEME_PRESETS[0].id);
    }
  }, [userEmail]);

  const setTheme = (newColors: ThemeColors) => {
    setThemeState(newColors);
    localStorage.setItem(getStorageKey(), JSON.stringify(newColors));
    applyCssVariables(newColors);
  };

  const applyPreset = (id: string) => {
    const found = THEME_PRESETS.find((p) => p.id === id);
    if (found) {
      setPresetId(id);
      localStorage.setItem(getPresetKey(), id);
      setTheme(found.colors);
    }
  };

  const updateColorKey = (key: keyof ThemeColors, value: string) => {
    const updated = { ...theme, [key]: value };
    setPresetId('custom');
    localStorage.setItem(getPresetKey(), 'custom');
    setTheme(updated);
  };

  const resetToDefault = () => {
    applyPreset(THEME_PRESETS[0].id);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        presetId,
        setTheme,
        applyPreset,
        updateColorKey,
        resetToDefault,
        isEditorOpen,
        setIsEditorOpen,
        currentUserEmail: userEmail,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
