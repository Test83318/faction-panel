import React from 'react';
import { Database, Users, Shield, Zap, Layout, CheckSquare, List, Link as LinkIcon, Code, Heart, Layers, Table, Info, ExternalLink } from 'lucide-react';

export default function Welcome() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-20 space-y-32">
            {/* Hero Section */}
            <section className="text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-black text-accent uppercase tracking-[0.2em] animate-fade-in">
                    <Zap size={12} />
                    Project Antelope
                </div>
                <h1 className="text-6xl font-black uppercase tracking-tighter text-text leading-none">
                    The end of the <br />
                    <span className="text-accent">Spreadsheet Era.</span>
                </h1>
                <p className="max-w-2xl mx-auto text-lg text-muted font-medium italic">
                    "I was using Google Spreadsheets to track my faction members and I just said... Fuck this shit."
                </p>
            </section>

            {/* History & Perspective */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="space-y-6">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Early Development</h2>
                    <div className="space-y-4 text-muted leading-relaxed">
                        <p>
                            Antelope started in early 2025. This project was born out of pure frustration. I was tired of seeing every faction struggle with the same broken spreadsheets. It was time for something better.
                        </p>
                        <p>
                            Getting here wasn't easy. I restarted the project four times from scratch. It's been a Blade app, a Next.js app, and even a Nocobase implementation before I landed on this architecture. Every restart was a pain, but it's why the system is as fast and stable as it is now.
                        </p>
                        <p>
                            I built this alone. No committees, no corporate roadmaps. I just wanted a system that actually works for the people running organizations, without all the useless bloat.
                        </p>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Code size={120} />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Layers size={24} />
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-tight">The Tech</h3>
                        <p className="text-sm text-muted font-medium">
                            The stack is straightforward: React, TypeScript, Laravel 13, and PostgreSQL. It's fast, it's reliable, and it's built to actually work. We skipped the corporate fluff to focus on solid code that solves real problems.
                        </p>
                        <div className="pt-4 flex gap-2">
                            <span className="px-2 py-1 bg-surface border border-border rounded text-[8px] font-black uppercase tracking-widest text-muted">React + TS</span>
                            <span className="px-2 py-1 bg-surface border border-border rounded text-[8px] font-black uppercase tracking-widest text-muted">Laravel 13</span>
                            <span className="px-2 py-1 bg-surface border border-border rounded text-[8px] font-black uppercase tracking-widest text-muted">PostgreSQL</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature: Rosters */}
            <section className="space-y-12">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <Users className="text-accent" size={32} />
                        Advanced Rosters
                    </h2>
                    <p className="text-muted mt-4 font-medium leading-relaxed">
                        Rosters shouldn't just be static text. In Antelope, they're dynamic. We use hierarchical sections, bureaus, and units to keep things organized. Everything is structured with tags, checkboxes, and automated links that actually do something.
                    </p>
                </div>

                <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl p-6 space-y-6">
                    {/* Leadership Style Section */}
                    <div className="div-leadership w-full border border-border bg-card group relative overflow-hidden rounded-sm" style={{ '--accent': 'var(--accent)' } as any}>
                        <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-text uppercase">Department Leadership</span>
                        </div>
                        <div className="rt-wrap overflow-x-auto">
                            <table className="rt-table bg-border/5">
                                <colgroup>
                                    <col className="w-[24px]" />
                                    <col className="w-[30%]" />
                                    <col className="w-[30%]" />
                                    <col className="w-[40%]" />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className="rt-th" style={{ borderLeft: '3px solid var(--accent)' }}>#</th>
                                        <th className="rt-th">Name</th>
                                        <th className="rt-th">Rank</th>
                                        <th className="rt-th">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="rt-tr">
                                        <td className="rt-td text-muted opacity-50" style={{ borderLeft: '3px solid var(--accent)' }}>1</td>
                                        <td className="rt-td p-0"><div className="flex items-center justify-center h-full text-[10px] font-bold">John Doe</div></td>
                                        <td className="rt-td p-0"><div className="flex items-center justify-center h-full text-[10px] font-bold">Chief of Department</div></td>
                                        <td className="rt-td p-0">
                                            <div className="flex flex-col items-center justify-center h-full gap-0.5">
                                                <span className="text-[10px] font-bold text-accent">Active</span>
                                                <div className="flex gap-0.5">
                                                    <span className="text-[6px] text-accent font-black bg-accent/10 px-1 rounded uppercase">Lead</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="rt-tr">
                                        <td className="rt-td text-muted opacity-50" style={{ borderLeft: '3px solid var(--accent)' }}>2</td>
                                        <td className="rt-td p-0"><div className="flex items-center justify-center h-full text-[10px] font-bold">Jane Smith</div></td>
                                        <td className="rt-td p-0"><div className="flex items-center justify-center h-full text-[10px] font-bold">Assistant Chief</div></td>
                                        <td className="rt-td p-0"><div className="flex items-center justify-center h-full text-[10px] font-bold">Active</div></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bureau/Section Style Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bureau-card border border-border rounded-lg bg-card shadow-[var(--sh)] flex flex-col group relative" style={{ '--accent': '#10b981' } as any}>
                            <div className="bureau-card-top flex h-[24px] items-stretch border-b border-border bg-surface shrink-0 rounded-t-lg overflow-hidden">
                                <div className="w-[5px] shrink-0 bg-[#10b981]" />
                                <div className="flex-1 flex items-center px-2 justify-center gap-1.5 overflow-hidden">
                                    <span className="font-bold text-[11px] text-text uppercase truncate">Patrol Operations</span>
                                </div>
                            </div>
                            <div className="rt-wrap overflow-x-auto">
                                <table className="rt-table">
                                    <thead>
                                        <tr>
                                            <th className="rt-th" style={{ borderLeft: '3px solid #10b981' }}>#</th>
                                            <th className="rt-th">Officer</th>
                                            <th className="rt-th">Badge</th>
                                            <th className="rt-th">Certs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="rt-tr">
                                            <td className="rt-td text-muted opacity-50" style={{ borderLeft: '3px solid #10b981' }}>1</td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">Robert Paulson</div></td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">#1029</div></td>
                                            <td className="rt-td p-0 h-[34px]">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-[1px] bg-blue-500" />
                                                    <div className="w-1.5 h-1.5 rounded-[1px] bg-yellow-500" />
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className="rt-tr">
                                            <td className="rt-td text-muted opacity-50" style={{ borderLeft: '3px solid #10b981' }}>2</td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">Tyler Durden</div></td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">#4492</div></td>
                                            <td className="rt-td p-0 h-[34px]">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-[1px] bg-red-500" />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bureau-card border border-border rounded-lg bg-card shadow-[var(--sh)] flex flex-col group relative" style={{ '--accent': '#f59e0b' } as any}>
                            <div className="bureau-card-top flex h-[24px] items-stretch border-b border-border bg-surface shrink-0 rounded-t-lg overflow-hidden">
                                <div className="w-[5px] shrink-0 bg-[#f59e0b]" />
                                <div className="flex-1 flex items-center px-2 justify-center gap-1.5 overflow-hidden">
                                    <span className="font-bold text-[11px] text-text uppercase truncate">Traffic Bureau</span>
                                </div>
                            </div>
                            <div className="rt-wrap overflow-x-auto">
                                <table className="rt-table">
                                    <thead>
                                        <tr>
                                            <th className="rt-th" style={{ borderLeft: '3px solid #f59e0b' }}>#</th>
                                            <th className="rt-th">Officer</th>
                                            <th className="rt-th">Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="rt-tr">
                                            <td className="rt-td text-muted opacity-50" style={{ borderLeft: '3px solid #f59e0b' }}>1</td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">Arthur Dent</div></td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">T-10</div></td>
                                        </tr>
                                        <tr className="rt-tr">
                                            <td className="rt-td text-muted opacity-50" style={{ borderLeft: '3px solid #f59e0b' }}>2</td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">Ford Prefect</div></td>
                                            <td className="rt-td p-0 h-[34px]"><div className="text-[10px] font-bold uppercase">T-11</div></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature: Databases */}
            <section className="space-y-12">
                <div className="max-w-2xl ml-auto text-right">
                    <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-end gap-4">
                        Relational Databases
                        <Database className="text-accent" size={32} />
                    </h2>
                    <p className="text-muted mt-4 font-medium leading-relaxed">
                        Flat data is useless. Antelope lets you build custom schemas with real relational linking. Link a personnel record directly to a disciplinary database or a vehicle registration system without breaking anything. It just works.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-surface border-b border-border flex items-center justify-between">
                        <span className="text-[10px] font-black text-muted uppercase tracking-widest">Simulation: Records & Schema</span>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Schema Setup</h4>
                            <div className="space-y-2">
                                <div className="p-3 bg-surface border border-border rounded-lg flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Full Name</span>
                                    <span className="text-[8px] font-black text-muted uppercase tracking-widest bg-card px-1.5 py-0.5 rounded">Text</span>
                                </div>
                                <div className="p-3 bg-surface border border-border rounded-lg flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Birth Date</span>
                                    <span className="text-[8px] font-black text-muted uppercase tracking-widest bg-card px-1.5 py-0.5 rounded">Date</span>
                                </div>
                                <div className="p-3 bg-surface border border-border rounded-lg flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-tight">License Type</span>
                                    <span className="text-[8px] font-black text-muted uppercase tracking-widest bg-card px-1.5 py-0.5 rounded">Select</span>
                                </div>
                                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-accent">Linked Vehicle</span>
                                    <span className="text-[8px] font-black text-accent uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded flex items-center gap-1"><LinkIcon size={8}/> Link</span>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Record View</h4>
                            <div className="bg-white text-black p-8 border-t-4 border-accent shadow-lg">
                                <div className="border-b border-black/10 pb-2 mb-6 flex justify-between items-end">
                                    <h5 className="text-xl font-serif font-black uppercase tracking-widest">Official Record</h5>
                                    <span className="text-[8px] font-bold uppercase">Ref: #PRF10294</span>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[8px] font-bold uppercase text-black/50">Subject Name</label>
                                            <div className="font-serif text-lg border-b border-black/10">Michael Desanta</div>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-bold uppercase text-black/50">Residence</label>
                                            <div className="font-serif text-lg border-b border-black/10">Rockford Hills</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[8px] font-bold uppercase text-black/50">Status</label>
                                            <div className="font-serif text-lg border-b border-black/10">Active</div>
                                        </div>
                                        <div className="p-4 bg-accent/5 border border-accent/20 rounded">
                                            <label className="block text-[8px] font-black uppercase text-accent mb-2">Linked Vehicle</label>
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <div className="p-1 bg-white border border-accent/20 rounded text-accent"><Table size={12}/></div>
                                                <span>Buffalo STX (88KKK99)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature: Integrations & Permissions */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">GTA:W Integration</h3>
                    </div>
                    <p className="text-muted leading-relaxed font-medium">
                        We've got native GTA:W API integration. It handles the boring stuff by automatically syncing characters, membership status, and history. No more manual tracking; your roster actually reflects what's happening in-game.
                    </p>
                    <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Character Sync Status</span>
                            <span className="px-2 py-1 bg-success/10 text-success rounded text-[8px] font-black uppercase tracking-widest">Operational</span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[94%] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        </div>
                        <p className="text-[9px] text-muted font-bold uppercase tracking-widest">94% of characters successfully mapped to local profiles.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                            <Shield size={24} />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Permission Hierarchy</h3>
                    </div>
                    <p className="text-muted leading-relaxed font-medium">
                        Think of it as a mix between Discord and PhpBB. It's all about weights where higher ranked roles override the lower ones. Every role, group, and roster gets its own granular permissions.
                    </p>
                    <p className="text-muted leading-relaxed font-medium">
                        Groups are built directly into the permission system. Assign users to groups, and those groups carry their own weights. Access is calculated on the fly, ensuring seniority and security stay tight.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                            <div className="text-[10px] font-black text-accent uppercase tracking-widest">Weight System</div>
                            <p className="text-[9px] text-muted font-bold leading-normal uppercase">Roles with higher weights override permissions of lower weight roles automatically.</p>
                        </div>
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                            <div className="text-[10px] font-black text-accent uppercase tracking-widest">Group Access</div>
                            <p className="text-[9px] text-muted font-bold leading-normal uppercase">Group permissions contribute to the dynamic calculation of user access levels.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Open Source & Access */}
            <section className="bg-accent/5 border border-accent/20 rounded-[3rem] p-12 text-center space-y-8">
                <div className="max-w-2xl mx-auto space-y-4">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">The Future is Open</h2>
                    <p className="text-muted font-medium">
                        Management tools should be for everyone, not just the "official" factions. Anyone can jump in, create a space, and start using this. There is no gatekeeping or external validation. If you need it, use it.
                    </p>
                    <p className="text-accent font-black uppercase tracking-widest text-xs">
                        The source code will be released publicly on GitHub a few weeks after the initial launch.
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-8 pt-4">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="text-accent" size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Open Source</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckSquare className="text-accent" size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Self Hostable</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckSquare className="text-accent" size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Cost</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="pt-20 border-t border-border text-center space-y-12 pb-10">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Project Contributors</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                        <div className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold uppercase tracking-tight">Booskit (Sole Developer)</div>
                        {/* Space for future contributors */}
                        <div className="px-4 py-2 border border-dashed border-border rounded-xl text-xs font-bold uppercase tracking-tight text-muted/30">Contributor Space</div>
                        <div className="px-4 py-2 border border-dashed border-border rounded-xl text-xs font-bold uppercase tracking-tight text-muted/30">Contributor Space</div>
                    </div>
                </div>
                <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] flex flex-col items-center gap-4">
                    <span>Made with <span className="text-red-500 mx-1">❤️</span> by Booskit</span>
                    <div className="flex items-center gap-4 opacity-50">
                        <span>EST. 2025</span>
                        <div className="w-1 h-1 rounded-full bg-muted" />
                        <span>VER {new Date().getFullYear()}.0.0</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
