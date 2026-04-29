import React, { useState, useEffect } from 'react';
import api from '../api';

const FactionManager: React.FC = () => {
    const [myFactions, setMyFactions] = useState<any[]>([]);
    const [allFactions, setAllFactions] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form states
    const [name, setName] = useState('');
    const [shortname, setShortname] = useState('');
    const [color, setColor] = useState('#3b82f6');

    const fetchData = async () => {
        try {
            const [myRes, allRes] = await Promise.all([
                api.get('/factions'),
                api.get('/factions/all')
            ]);
            setMyFactions(myRes.data);
            setAllFactions(allRes.data);
        } catch (err) {
            console.error('Failed to fetch factions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/factions', { name, shortname, color });
            setName('');
            setShortname('');
            setShowCreate(false);
            fetchData();
        } catch (err) {
            alert('Failed to create faction');
        }
    };

    const handleJoin = async (shortname: string) => {
        try {
            await api.post('/factions/join', { shortname });
            setShowJoin(false);
            fetchData();
        } catch (err) {
            alert('Failed to join faction');
        }
    };

    if (loading) return <div className="text-white">Loading factions...</div>;

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Factions</h1>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowJoin(true)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold transition"
                        >
                            Join Faction
                        </button>
                        <button 
                            onClick={() => setShowCreate(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold transition"
                        >
                            Create Faction
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myFactions.map(faction => (
                        <div key={faction.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition cursor-pointer"
                             onClick={() => window.location.href = `/${faction.shortname}`}>
                            <div className="h-2" style={{ backgroundColor: faction.color }} />
                            <div className="p-4">
                                <h3 className="text-xl font-bold mb-1">{faction.name}</h3>
                                <p className="text-gray-400 text-sm uppercase tracking-widest">{faction.shortname}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[500]">
                        <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
                            <h2 className="text-2xl font-bold mb-4">Create New Faction</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                                    <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Shortname (URL Slug)</label>
                                    <input value={shortname} onChange={e => setShortname(e.target.value)} className="w-full bg-gray-700 border border-gray-600 p-2 rounded" required placeholder="e.g. lssd" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Color</label>
                                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-10 bg-gray-700 border border-gray-600 rounded p-1" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 bg-gray-700 rounded">Cancel</button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 rounded font-bold">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Join Modal */}
                {showJoin && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[500]">
                        <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
                            <h2 className="text-2xl font-bold mb-4">Join Faction</h2>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {allFactions.filter(f => !myFactions.find(mf => mf.shortname === f.shortname)).map(faction => (
                                    <div key={faction.shortname} className="flex justify-between items-center p-3 bg-gray-700 rounded border border-gray-600">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: faction.color }} />
                                            <span className="font-bold">{faction.name}</span>
                                        </div>
                                        <button onClick={() => handleJoin(faction.shortname)} className="text-xs bg-blue-600 px-3 py-1 rounded font-bold uppercase">Join</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowJoin(false)} className="w-full mt-6 px-4 py-2 bg-gray-700 rounded">Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FactionManager;
