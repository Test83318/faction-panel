import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Moon, Sun, LogOut, User, LogIn } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  factionName: string;
  user: any;
  userRole?: any;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDark, toggleTheme, factionName, user, userRole, onLogout }) => {
  const isSuperAdmin = user?.is_superadmin;
  const roleColor = userRole?.color || 'var(--muted)';

  return (
    <header className="topbar h-[var(--nav-h)] bg-surface border-b border-border flex items-center px-5 gap-2.5 sticky top-0 z-[300] shrink-0">
      <div className="logo flex items-center gap-1.5 text-accent font-extrabold text-[16px] tracking-tight hover:opacity-80 transition-opacity cursor-pointer">
        <Shield size={18} fill="currentColor" fillOpacity={0.2} />
        Faction Panel
      </div>

      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted pl-1.5 border-l border-border ml-0.5">
        {factionName}
      </span>

      <div className="flex-1" />

      {user ? (
        <>
          <div className="flex items-center gap-3 mr-4">
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-bold text-text leading-none">{user.username}</span>
              {isSuperAdmin ? (
                <span 
                  className="text-[8px] font-black uppercase tracking-tighter"
                  style={{ 
                    color: '#FFD700',
                    textShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
                  }}
                >
                  Superadmin
                </span>
              ) : userRole ? (
                <span 
                  className="text-[8px] font-black uppercase tracking-tighter"
                  style={{ color: roleColor }}
                >
                  {userRole.name}
                </span>
              ) : (
                <span className="text-[8px] font-black text-muted uppercase tracking-tighter">Guest</span>
              )}
            </div>
            <div 
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isSuperAdmin ? 'shadow-[0_0_10px_rgba(255,215,0,0.3)] border border-[#FFD700]/30' : 'bg-border'}`}
              style={isSuperAdmin ? { backgroundColor: '#FFD700' } : { borderLeft: `3px solid ${roleColor}` }}
            >
              <User size={14} className={isSuperAdmin ? 'text-black' : 'text-muted'} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 mr-4">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-text leading-none">Guest User</span>
            <span className="text-[8px] font-black text-muted uppercase tracking-tighter">Read Only</span>
          </div>
          <div className="w-7 h-7 bg-border/50 rounded-full flex items-center justify-center text-muted/50 border border-dashed border-border">
            <User size={14} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 border-l border-border pl-4">
        <span className="text-[10px] text-muted hidden sm:block">Dark</span>
        <button 
          onClick={toggleTheme}
          className="relative w-[34px] h-[19px] bg-border rounded-full cursor-pointer transition-colors"
          style={{ backgroundColor: isDark ? 'var(--accent)' : 'var(--border)' }}
        >
          <div 
            className="absolute top-[3px] left-[3px] w-[13px] h-[13px] bg-surface rounded-full transition-transform shadow-sm flex items-center justify-center overflow-hidden"
            style={{ transform: isDark ? 'translateX(15px)' : 'translateX(0)' }}
          >
            {isDark ? <Moon size={8} className="text-accent" /> : <Sun size={8} className="text-muted" />}
          </div>
        </button>
      </div>

      {user ? (
        <div className="ml-2.5">
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-muted border border-border px-2.5 py-1 rounded hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={10} />
            Logout
          </button>
        </div>
      ) : (
        <div className="ml-2.5">
          <Link 
            to="/"
            className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-accent border border-accent/30 px-3 py-1 rounded hover:bg-accent/10 transition-all"
          >
            <LogIn size={10} />
            Login
          </Link>
        </div>
      )}
    </header>
  );
};
