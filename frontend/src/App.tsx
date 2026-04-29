import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BureauCard } from './components/BureauCard';
import { RosterTable } from './components/RosterTable';
import Home from './components/Home';
import FactionManager from './components/FactionManager';
import Administration from './components/Administration';
import Loading from './components/Loading';
import api from './api';
import { INITIAL_DATA } from './constants';
import { Faction as FactionType } from './types';

const FactionRoster = ({ activeDivision, totalMembers, staticFaction, activeDivId, setActiveDivId }: any) => {
  return (
    <>
      <div className="tabs-bar bg-bg border-b border-border flex items-end px-2.5 h-[var(--tab-h)] sticky top-[var(--nav-h)] z-[210] overflow-x-auto scrollbar-none">
        {staticFaction.divisions.map((div: any) => (
          <button 
            key={div.id}
            onClick={() => setActiveDivId(div.id)}
            className={`tab px-3 py-1 cursor-pointer transition-all text-[10px] uppercase h-full flex items-center gap-1.5 relative border border-transparent border-b-0 -mb-[1px] rounded-t ${
              activeDivId === div.id 
                ? 'bg-card border-border text-text font-bold z-[1]' 
                : 'text-muted hover:text-text hover:bg-card/60'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: div.color }} />
            {div.name}
          </button>
        ))}
      </div>

      <main className="main flex-1 overflow-auto p-5 pb-16">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeDivId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center"
          >
            <div className="div-top-section w-full flex flex-col items-center">
              <div className="div-hero w-full flex items-center p-1.5 pl-10 border border-border border-b-0 bg-card rounded-t-lg relative gap-2.5 h-[34px]">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ backgroundColor: activeDivision.color }} />
                <div className="flex-1 text-center text-text font-extrabold text-[15px] uppercase tracking-tighter">
                  {activeDivision.name}
                </div>
                <div className="text-[9.5px] text-muted shrink-0 pr-4">
                  <strong className="text-accent">{totalMembers}</strong> PERSONNEL
                </div>
              </div>

              <div className="div-leadership w-full border border-border bg-card mb-4">
                <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
                  <span className="text-[9px] font-bold tracking-widest text-muted uppercase">Division Leadership</span>
                </div>
                <RosterTable members={activeDivision.leadership} isLeadership accentColor={activeDivision.color} />
              </div>

              <div className="bureaus-container flex flex-wrap gap-4 justify-start items-start w-full">
                {activeDivision.bureaus.map((bureau: any) => (
                  <div key={bureau.id} className="bureau-col flex flex-col min-w-[450px] flex-1 max-w-[calc(50%-8px)]">
                    <BureauCard bureau={bureau} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
};

const Dashboard = ({ user, onLogout, isDark, toggleTheme }: any) => {
  const { shortname } = useParams();
  const location = useLocation();
  const [factionData, setFactionData] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDivId, setActiveDivId] = useState<string | null>(null);

  // Mock static data for now
  const [staticFaction] = useState<FactionType>(INITIAL_DATA[0]);

  useEffect(() => {
    const fetchFactionAndPermissions = async () => {
      try {
        const [factionRes, permsRes] = await Promise.all([
          api.get(`/factions/${shortname}`),
          api.get(`/factions/${shortname}/permissions`)
        ]);
        
        setFactionData(factionRes.data);
        setPermissions(permsRes.data);
        setActiveDivId(staticFaction.divisions[0].id);

      } catch (err: any) {
        setError(err.response?.data?.message || 'Faction not found');
      } finally {
        setLoading(false);
      }
    };
    fetchFactionAndPermissions();
  }, [shortname, staticFaction.divisions]);

  if (loading) return <Loading message="Initializing Faction..." />;
  if (error) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
      <p className="mb-8">{error}</p>
      <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-blue-600 rounded font-bold">Return to Faction Selector</button>
    </div>
  );

  const activeDivision = staticFaction.divisions.find(d => d.id === activeDivId) || staticFaction.divisions[0];
  const totalMembers = activeDivision.leadership.length + 
    activeDivision.bureaus.reduce((acc, b) => 
      acc + b.leadership.length + b.units.reduce((uAcc, u) => uAcc + u.members.length, 0), 0);

  const canViewAdmin = user.is_superadmin || permissions.includes('view_admin_page');

  // Handle root faction path redirect
  if (location.pathname === `/${shortname}`) {
    return <Navigate to={`/${shortname}/roster`} replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header isDark={isDark} toggleTheme={toggleTheme} factionName={factionData.name} user={user} onLogout={onLogout} />

      <div className="flex flex-1 relative">
        <Sidebar shortname={shortname!} canViewAdmin={canViewAdmin} />

        <div className="flex flex-col flex-1 min-w-0">
          <Routes>
            <Route path="roster" element={
              <FactionRoster 
                activeDivision={activeDivision} 
                totalMembers={totalMembers} 
                staticFaction={staticFaction} 
                activeDivId={activeDivId} 
                setActiveDivId={setActiveDivId} 
              />
            } />
            <Route path="admin" element={
              canViewAdmin ? (
                <main className="main flex-1 overflow-auto p-5">
                  <Administration faction={factionData} />
                </main>
              ) : <Navigate to={`/${shortname}/roster`} />
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bp-rosters-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.get('/user');
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('access_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('access_token', token);
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bp-rosters-theme', theme);
  };

  if (loading) return <Loading message="Authenticating..." />;

  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        }}
      />
      <Routes>
        <Route path="/" element={
          user ? <FactionManager /> : <Home onLogin={handleLogin} />
        } />
        <Route path="/:shortname/*" element={
          user ? <Dashboard user={user} onLogout={handleLogout} isDark={isDark} toggleTheme={toggleTheme} /> : <Navigate to="/" />
        } />
      </Routes>
    </Router>
  );
}
