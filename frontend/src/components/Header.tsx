import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Moon, Sun, LogOut, User, LogIn, ChevronDown, Settings, LayoutGrid, ShieldAlert, HelpCircle } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  factionName: string;
  bannerLogoDark?: string | null;
  bannerLogoLight?: string | null;
  branding?: {
    header_link_to_faction: boolean;
    hide_panel_header: boolean;
    header_bg_color: string | null;
    header_gradient_enabled: boolean;
    header_gradient_color: string | null;
    header_gradient_direction: string;
    shortname: string;
  };
  user: any;
  userRole?: any;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDark, toggleTheme, factionName, bannerLogoDark, bannerLogoLight, branding, user, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.is_superadmin;
  const roleColor = userRole?.color || 'var(--muted)';
  const isFactionPage = !!branding?.shortname;
  const activeBanner = isDark ? bannerLogoDark : (bannerLogoLight || bannerLogoDark);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getHeaderStyle = () => {
    if (!branding?.header_bg_color) return {};
    
    if (branding.header_gradient_enabled && branding.header_gradient_color) {
      return {
        background: `linear-gradient(${branding.header_gradient_direction.replace('to-', 'to ')}, ${branding.header_bg_color}, ${branding.header_gradient_color})`,
        borderBottom: 'none'
      };
    }
    
    return {
      backgroundColor: branding.header_bg_color,
      borderBottom: 'none'
    };
  };

  const handlePanelLogoClick = () => {
    if (branding?.header_link_to_faction && branding.shortname) {
      navigate(`/${branding.shortname}/roster`);
    } else {
      navigate('/');
    }
  };

  const handleFactionLogoClick = () => {
    if (branding?.shortname) {
      navigate(`/${branding.shortname}/roster`);
    }
  };

  return (
    <header 
      className="topbar h-[var(--nav-h)] bg-surface border-b border-border flex items-center px-6 gap-2.5 sticky top-0 z-[300] shrink-0"
      style={getHeaderStyle()}
    >
      {!branding?.hide_panel_header && (
        <div 
          onClick={handlePanelLogoClick}
          className="logo flex items-center gap-2 text-accent font-black uppercase italic tracking-tighter text-lg hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Shield size={20} fill="currentColor" fillOpacity={0.2} />
          Faction Panel
        </div>
      )}

      {isFactionPage && (
        <div 
            className={`flex items-center h-6 pl-2.5 cursor-pointer hover:opacity-80 transition-opacity ${!branding?.hide_panel_header ? 'ml-1.5 border-l border-border' : ''}`}
            onClick={handleFactionLogoClick}
        >
            {activeBanner ? (
            <img src={activeBanner} alt={factionName} className="max-h-[20px] w-auto object-contain drop-shadow-sm" />
            ) : (
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted">
                {factionName}
            </span>
            )}
        </div>
      )}

      <div className="flex-1" />

      {user && (
        <button 
            onClick={() => navigate('/help')}
            className="p-1.5 text-muted hover:text-accent transition-colors flex items-center gap-2 mr-2"
            title="Help Center"
        >
            <HelpCircle size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Help</span>
        </button>
      )}

      {user ? (
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 mr-4 hover:bg-border/30 p-1.5 rounded-lg transition-colors group"
          >
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
            <ChevronDown size={14} className={`text-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl py-2 z-[400] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-border mb-2">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Signed in as</p>
                <p className="text-xs font-black truncate">{user.username}</p>
              </div>

              {isFactionPage && (
                <button 
                  onClick={() => {
                    navigate('/');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface transition-colors"
                >
                  <LayoutGrid size={14} />
                  Faction Selection
                </button>
              )}

              <button 
                onClick={() => {
                  navigate('/account/settings');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface transition-colors"
              >
                <Settings size={14} />
                Account Settings
              </button>

              {isSuperAdmin && (
                <button 
                  onClick={() => {
                    navigate('/superadmin');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
                >
                  <ShieldAlert size={14} />
                  Superadmin Panel
                </button>
              )}

              <div className="border-t border-border mt-2 pt-2">
                <button 
                  onClick={() => {
                    onLogout();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
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

      <div className="flex items-center gap-1.5 border-l border-border pl-4 mr-2">
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

      {!user && (
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
