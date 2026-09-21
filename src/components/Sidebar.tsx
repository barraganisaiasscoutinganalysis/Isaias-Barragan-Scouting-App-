import React from 'react';
import { 
  FileText, 
  Users, 
  Settings, 
  Shield, 
  Activity, 
  LogOut, 
  LogIn, 
  ChevronRight,
  Database,
  Palette,
  FileImage
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: 'dashboard' | 'report' | 'players' | 'settings' | 'image-analysis';
  onNavigate: (view: 'dashboard' | 'players' | 'settings' | 'image-analysis') => void;
  hasActiveReport: boolean;
  onOpenActiveReport?: () => void;
  onOpenRecovery?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  hasActiveReport,
  onOpenActiveReport,
  onOpenRecovery,
  isOpen = false,
  onClose,
}) => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { theme, setIsEditorOpen } = useTheme();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside 
        style={{ backgroundColor: theme.bgHeader, borderColor: theme.borderCard }}
        className={`fixed md:static inset-y-0 left-0 z-50 w-[240px] md:w-[220px] shrink-0 border-r flex flex-col h-full select-none transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
      {/* Brand Logo Container */}
      <div className="p-3 border-b border-[#334155]/40 min-h-[70px] flex items-center justify-center">
        <Logo size="sm" />
      </div>

      {/* Navigation */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto pt-5">
        <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
          Plataforma
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all ${
            currentView === 'dashboard'
              ? 'bg-[#1E293B] text-white border border-[#334155] shadow-sm'
              : 'text-[#94A3B8] hover:bg-[#111827] hover:text-[#E5E7EB]'
          }`}
        >
          <FileText className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-amber-400' : 'text-[#64748B]'}`} />
          <span>Informes</span>
        </button>

        {hasActiveReport && (
          <button
            onClick={onOpenActiveReport}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-all ${
              currentView === 'report'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-[#94A3B8] hover:bg-[#111827] hover:text-[#E5E7EB]'
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="truncate">Partido Activo</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        )}

        <button
          onClick={() => onNavigate('image-analysis')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all ${
            currentView === 'image-analysis'
              ? 'bg-[#1E293B] text-white border border-[#334155] shadow-sm'
              : 'text-[#94A3B8] hover:bg-[#111827] hover:text-[#E5E7EB]'
          }`}
        >
          <FileImage className={`w-4 h-4 ${currentView === 'image-analysis' ? 'text-amber-400' : 'text-[#64748B]'}`} />
          <span>Analizar Imágenes</span>
        </button>

        <button
          onClick={() => onNavigate('players')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all ${
            currentView === 'players'
              ? 'bg-[#1E293B] text-white border border-[#334155] shadow-sm'
              : 'text-[#94A3B8] hover:bg-[#111827] hover:text-[#E5E7EB]'
          }`}
        >
          <Users className={`w-4 h-4 ${currentView === 'players' ? 'text-amber-400' : 'text-[#64748B]'}`} />
          <span>Jugadores</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all ${
            currentView === 'settings'
              ? 'bg-[#1E293B] text-white border border-[#334155] shadow-sm'
              : 'text-[#94A3B8] hover:bg-[#111827] hover:text-[#E5E7EB]'
          }`}
        >
          <Settings className={`w-4 h-4 ${currentView === 'settings' ? 'text-amber-400' : 'text-[#64748B]'}`} />
          <span>Ajustes</span>
        </button>

        <button
          onClick={() => {
            setIsEditorOpen(true);
            if (onClose) onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium text-[#94A3B8] hover:bg-[#111827] hover:text-amber-400 transition-all cursor-pointer mt-1"
        >
          <Palette className="w-4 h-4 text-amber-400" />
          <span>Editar Colores</span>
        </button>

        {onOpenRecovery && (
          <button
            onClick={() => {
              onOpenRecovery();
              if (onClose) onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer mt-1"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Recuperar Datos</span>
          </button>
        )}

        {/* Source indicator badge */}
        <div className="pt-6 px-2">
          <div className="p-2.5 rounded bg-[#111827] border border-[#334155]/60 text-[11px]">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] font-semibold mb-1">
              <Database className="w-3 h-3" />
              <span>DATA ENGINE</span>
            </div>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Capa de adaptador Sofascore activa con persistencia local & Firestore.
            </p>
          </div>
        </div>
      </div>

      {/* User Footer with Firebase Auth */}
      <div className="p-3 border-t border-[#334155]/40 bg-[#0A0D14]">
        {user ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-[#111827] border border-[#334155]/50">
            <div className="flex items-center gap-2 min-w-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Scout'} className="w-7 h-7 rounded-full border border-amber-400/40 object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs flex items-center justify-center font-bold">
                  {user.email?.[0].toUpperCase() || 'S'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate leading-tight">
                  {user.displayName || 'Scout Autorizado'}
                </p>
                <p className="text-[10px] text-emerald-400 font-mono truncate">Cloud Sync Activo</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Cerrar sesión"
              className="p-1.5 text-[#94A3B8] hover:text-rose-400 hover:bg-[#1E293B] rounded transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 text-xs font-medium transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar sesión Google</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
};
