import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { AppSettings } from '../types';
import WorkerModal, { HRWorker } from './hr/WorkerModal';
import AnnuaireTab from './hr/AnnuaireTab';
import PointageTab from './hr/PointageTab';
import StatistiquesTab from './hr/StatistiquesTab';
import ProductionTab from './hr/ProductionTab';
import AvancesTab from './hr/AvancesTab';
import SagePaieTab from './hr/SagePaieTab';

type TabKey = 'annuaire' | 'pointage' | 'statistiques' | 'production' | 'avances' | 'sage';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'annuaire', label: 'Annuaire' },
    { key: 'pointage', label: 'Pointage' },
    { key: 'statistiques', label: 'Statistiques' },
    { key: 'production', label: 'Production' },
    { key: 'avances', label: 'Avances' },
    { key: 'sage', label: 'Sage Paie' },
];

interface Props {
    settings: AppSettings;
}

export default function Effectifs({ settings: _settings }: Props) {
    const [workers, setWorkers] = useState<HRWorker[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('annuaire');
    const [showModal, setShowModal] = useState(false);
    const [editWorker, setEditWorker] = useState<HRWorker | null>(null);

    const fetchWorkers = useCallback(() => {
        setLoading(true);
        fetch('/api/hr/workers', { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(data => setWorkers(Array.isArray(data) ? data : []))
            .catch(() => setWorkers([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

    const handleAdd = () => {
        setEditWorker(null);
        setShowModal(true);
    };

    const handleEdit = (worker: HRWorker) => {
        setEditWorker(worker);
        setShowModal(true);
    };

    const handleSave = (saved: HRWorker) => {
        setWorkers(prev => {
            const exists = prev.find(w => w.id === saved.id);
            return exists ? prev.map(w => w.id === saved.id ? saved : w) : [saved, ...prev];
        });
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/hr/workers/${id}`, { method: 'DELETE', credentials: 'include' });
        setWorkers(prev => prev.filter(w => w.id !== id));
    };

    const activeCount = workers.filter(w => w.is_active).length;

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] shrink-0 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestion RH</h1>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {loading ? 'Chargement...' : `${activeCount} ouvrier${activeCount !== 1 ? 's' : ''} enregistré${activeCount !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-md shadow-blue-600/30 transition-all hover:-translate-y-0.5"
                    >
                        <UserPlus className="w-4 h-4" />
                        Ajouter Ouvrier
                    </button>
                </div>

                {/* TABS */}
                <div className="flex gap-1 mt-4">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                activeTab === tab.key
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'annuaire' && (
                    <AnnuaireTab
                        workers={workers}
                        loading={loading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
                {activeTab === 'pointage' && <PointageTab workers={workers} />}
                {activeTab === 'statistiques' && <StatistiquesTab workers={workers} />}
                {activeTab === 'production' && <ProductionTab workers={workers} />}
                {activeTab === 'avances' && <AvancesTab workers={workers} />}
                {activeTab === 'sage' && <SagePaieTab />}
            </div>

            {/* MODAL */}
            {showModal && (
                <WorkerModal
                    worker={editWorker}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}
