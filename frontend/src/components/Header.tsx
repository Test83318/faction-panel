import React from 'react';
import { Shield, Moon, Sun, LogIn } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  factionName: string;
}

export const Header: React.FC<HeaderProps> = ({ isDark, toggleTheme, factionName }) => {
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

      <div className="flex items-center gap-1.5">
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

      <div className="ml-2.5">
        <button className="auth-btn flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-muted border border-border px-2.5 py-1 rounded hover:text-accent hover:border-accent transition-all">
          <LogIn size={10} />
          Login
        </button>
      </div>
    </header>
  );
};
