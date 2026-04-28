import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BureauCard } from './components/BureauCard';
import { RosterTable } from './components/RosterTable';
import { INITIAL_DATA } from './constants';
import { Faction, Division } from './types';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [faction] = useState<Faction>(INITIAL_DATA[0]);
  const [activeDivId, setActiveDivId] = useState<string>(faction.divisions[0].id);

  const activeDivision = faction.divisions.find(d => d.id === activeDivId) || faction.divisions[0];

  useEffect(() => {
    const saved = localStorage.getItem('bp-rosters-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bp-rosters-theme', theme);
  };

  const totalMembers = activeDivision.leadership.length + 
    activeDivision.bureaus.reduce((acc, b) => 
      acc + b.leadership.length + b.units.reduce((uAcc, u) => uAcc + u.members.length, 0), 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header isDark={isDark} toggleTheme={toggleTheme} factionName={faction.name} />

      <div className="flex flex-1 relative">
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0">
          {/* Division Tabs */}
          <div className="tabs-bar bg-bg border-b border-border flex items-end px-2.5 h-[var(--tab-h)] sticky top-[var(--nav-h)] z-[210] overflow-x-auto scrollbar-none">
            {faction.divisions.map(div => (
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
                  {/* Division Hero */}
                  <div className="div-hero w-full flex items-center p-1.5 pl-10 border border-border border-b-0 bg-card rounded-t-lg relative gap-2.5 h-[34px]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ backgroundColor: activeDivision.color }} />
                    <div className="flex-1 text-center text-text font-extrabold text-[15px] uppercase tracking-tighter">
                      {activeDivision.name}
                    </div>
                    <div className="text-[9.5px] text-muted shrink-0 pr-4">
                      <strong className="text-accent">{totalMembers}</strong> PERSONNEL
                    </div>
                  </div>

                  {/* Division Leadership */}
                  <div className="div-leadership w-full border border-border bg-card mb-4">
                    <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
                      <span className="text-[9px] font-bold tracking-widest text-muted uppercase">Division Leadership</span>
                    </div>
                    <RosterTable members={activeDivision.leadership} isLeadership accentColor={activeDivision.color} />
                  </div>

                  {/* Bureaus Row (Columns) */}
                  <div className="bureaus-container flex flex-wrap gap-4 justify-start items-start w-full">
                    {activeDivision.bureaus.map(bureau => (
                      <div key={bureau.id} className="bureau-col flex flex-col min-w-[450px] flex-1 max-w-[calc(50%-8px)]">
                        <BureauCard bureau={bureau} />
                      </div>
                    ))}
                    {activeDivision.bureaus.length === 0 && (
                      <div className="py-20 text-muted opacity-30 text-center w-full col-span-full uppercase tracking-widest font-bold">
                        No active bureaus in this division
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
