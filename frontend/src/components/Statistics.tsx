import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Layout, Settings2, Trash2, Shield, Search, ChevronRight } from 'lucide-react';
import api from '../api';
import { StatisticsModel } from '../types';
import toast from 'react-hot-toast';
import { StatisticsModelModal } from './StatisticsModelModal';
import { StatisticsPermissionsModal } from './StatisticsPermissionsModal';

interface StatisticsProps {
  shortname: string;
  user: any;
  permissions: string[];
  rosters: any[];
  datasets: any[];
  recordData: any[];
}

export const Statistics: React.FC<StatisticsProps> = ({ shortname, user, permissions, rosters, datasets, recordData }) => {
  const [models, setModels] = useState<StatisticsModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState<StatisticsModel | boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<StatisticsModel | null>(null);

  const canCreate = permissions.includes('create_statistics_model') || permissions.includes('global_statistics_moderation');

  const fetchModels = async () => {
    try {
      const res = await api.get(`/factions/${shortname}/statistics`);
      setModels(res.data);
    } catch (err) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [shortname]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dashboard? All widgets inside will be lost.')) return;
    const loadToast = toast.loading('Deleting...');
    try {
      await api.delete(`/statistics/${id}`);
      setModels(prev => prev.filter(m => m.id !== id));
      toast.success('Deleted', { id: loadToast });
    } catch (err) {
      toast.error('Failed to delete', { id: loadToast });
    }
  };

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-text">Faction Statistics</h1>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Custom data dashboards and analytical insights</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-black text-[10px] uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            <Plus size={14} /> Create Dashboard
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border bg-surface/30 flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-accent transition-colors"
                    placeholder="Search dashboards..."
                  />
              </div>
          </div>

          <div className="divide-y divide-border">
              {filteredModels.map(model => (
                  <div key={model.id} className="group hover:bg-surface/50 transition-colors flex items-center">
                      <Link 
                        to={`/${shortname}/statistics/${model.id}`}
                        className="flex-1 px-6 py-5 flex items-center gap-5"
                      >
                          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                              <Layout size={24} />
                          </div>
                          <div className="flex-1">
                              <h3 className="text-sm font-black uppercase tracking-widest text-text group-hover:text-accent transition-colors">{model.name}</h3>
                              <div className="flex items-center gap-4 mt-1">
                                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{model.widgets_count || 0} Widgets</span>
                                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Created by {model.creator?.username}</span>
                              </div>
                          </div>
                          <ChevronRight size={20} className="text-muted opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                      </Link>
                      
                      {model.user_permissions?.modify_statistics && (
                        <div className="px-6 flex items-center gap-2 border-l border-border h-24 my-auto">
                             <button 
                                onClick={() => setShowModal(model)}
                                className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
                                title="Edit Dashboard Settings"
                            >
                                <Settings2 size={18} />
                            </button>
                            <button 
                                onClick={() => setShowPermissionsModal(model)}
                                className="p-2 text-muted hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
                                title="Manage Permissions"
                            >
                                <Shield size={18} />
                            </button>
                            <button 
                                onClick={() => handleDelete(model.id)}
                                className="p-2 text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                                title="Delete Dashboard"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                      )}
                  </div>
              ))}

              {filteredModels.length === 0 && !loading && (
                  <div className="py-20 flex flex-col items-center justify-center opacity-40">
                      <Layout size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">No dashboards found</p>
                  </div>
              )}
          </div>
      </div>

      {showModal && (
        <StatisticsModelModal 
            shortname={shortname}
            model={typeof showModal === 'object' ? showModal : undefined}
            onClose={() => setShowModal(false)}
            onSave={() => {
                setShowModal(false);
                fetchModels();
            }}
        />
      )}

      {showPermissionsModal && (
          <StatisticsPermissionsModal 
            model={showPermissionsModal}
            shortname={shortname}
            onClose={() => setShowPermissionsModal(null)}
          />
      )}
    </div>
  );
};

export default Statistics;

