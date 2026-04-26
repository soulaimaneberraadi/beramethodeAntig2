import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { HRWorker } from './WorkerModal';

interface Avance {
    id: string;
    worker_id: string;
    full_name: string;
    salaire_base: number;
    date_demande: string;
    montant: number;
    montant_approuve: number;
    statut: 'DEMANDE' | 'APPROUVEE' | 'REJETEE';
    motif: string | null;
}

const STATUT_CONFIG = {
    DEMANDE: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
    APPROUVEE: { label: 'Approuvée', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
    REJETEE: { label: 'Rejetée', cls: 'bg-red-100 text-red-700', icon: XCircle },
};

interface Props { workers: HRWorker[]; }

export default function AvancesTab({ workers }: Props) {
    const [avances, setAvances] = useState<Avance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ worker_id: '', montant: '', motif: '' });
    const [saving, setSaving] = useState(false);

    const fetchAvances = () => {
        setLoading(true);
        fetch('/api/hr/avances', { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(setAvances)
            .catch(() => setAvances([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAvances(); }, []);

    const handleSubmit = async () => {
        if (!form.worker_id || !form.montant) return;
        setSaving(true);
        try {
            await fetch('/api/hr/avances', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    worker_id: form.worker_id,
                    montant: parseFloat(form.montant),
                    motif: form.motif || null,
                    date_demande: new Date().toISOString().split('T')[0]
                })
            });
            setShowForm(false);
            setForm({ worker_id: '', montant: '', motif: '' });
            fetchAvances();
        } finally { setSaving(false); }
    };

    const handleUpdateStatut = async (id: string, statut: 'APPROUVEE' | 'REJETEE') => {
        const label = statut === 'APPROUVEE' ? 'approuver' : 'rejeter';
        if (!window.confirm(`Voulez-vous vraiment ${label} cette avance ?`)) return;
        await fetch(`/api/hr/avances/${id}/statut`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut })
        });
        fetchAvances();
    };

    const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-all';

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                <p className="text-sm text-slate-500">
                    <strong className="text-slate-800">{avances.length}</strong> demande(s) au total
                </p>
                <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-xl shadow-md shadow-orange-500/30 transition-all">
                    <Plus className="w-4 h-4" /> Nouvelle Avance
                </button>
            </div>

            {/* New Avance Form */}
            {showForm && (
                <div className="mx-6 mt-4 mb-2 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <h4 className="font-black text-slate-800 mb-3">Nouvelle demande d'avance</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Ouvrier</label>
                            <select value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))} className={inputCls}>
                                <option value="">Sélectionner...</option>
                                {workers.filter(w => w.is_active).map(w => (
                                    <option key={w.id} value={w.id}>{w.full_name} — {w.matricule}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Montant (MAD)</label>
                            <input type="number" min="0" value={form.montant}
                                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                                className={inputCls} placeholder="Ex: 500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Motif (optionnel)</label>
                            <input value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} className={inputCls} placeholder="Raison..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Annuler</button>
                        <button onClick={handleSubmit} disabled={saving || !form.worker_id || !form.montant}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-xl disabled:opacity-60 transition-all">
                            {saving ? 'Envoi...' : 'Soumettre'}
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-auto p-6 space-y-3">
                {loading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)
                ) : avances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                        <p className="font-bold text-slate-400 text-lg">Aucune demande d'avance</p>
                        <p className="text-sm text-slate-400">Créez une nouvelle demande avec le bouton ci-dessus.</p>
                    </div>
                ) : avances.map(a => {
                    const cfg = STATUT_CONFIG[a.statut];
                    const Icon = cfg.icon;
                    return (
                        <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                                    {a.full_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800">{a.full_name}</p>
                                    <p className="text-xs text-slate-400">{new Date(a.date_demande).toLocaleDateString('fr-FR')} {a.motif ? `· ${a.motif}` : ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="font-black text-lg text-slate-800">{a.montant.toLocaleString('fr-FR')} MAD</p>
                                    <p className="text-xs text-slate-400">Salaire base: {(a.salaire_base || 0).toLocaleString('fr-FR')} MAD</p>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.cls}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {cfg.label}
                                </div>
                                {a.statut === 'DEMANDE' && (
                                    <div className="flex gap-1">
                                        <button onClick={() => handleUpdateStatut(a.id, 'APPROUVEE')}
                                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg transition-colors">
                                            Approuver
                                        </button>
                                        <button onClick={() => handleUpdateStatut(a.id, 'REJETEE')}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors">
                                            Rejeter
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
