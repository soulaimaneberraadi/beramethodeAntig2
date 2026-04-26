import React, { useState } from 'react';
import { Search, Edit2, Trash2, Phone, Calendar, Briefcase, Users } from 'lucide-react';
import { HRWorker } from './WorkerModal';

const ROLE_COLORS: Record<string, string> = {
    OPERATOR: 'bg-blue-100 text-blue-700',
    SUPERVISOR: 'bg-purple-100 text-purple-700',
    MECHANIC: 'bg-yellow-100 text-yellow-700',
    QUALITY: 'bg-green-100 text-green-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    LOGISTICS: 'bg-slate-100 text-slate-700',
};

interface Props {
    workers: HRWorker[];
    loading: boolean;
    onEdit: (worker: HRWorker) => void;
    onDelete: (id: string) => void;
}

export default function AnnuaireTab({ workers, loading, onEdit, onDelete }: Props) {
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const filtered = workers.filter(w => {
        const matchSearch = !search ||
            w.full_name.toLowerCase().includes(search.toLowerCase()) ||
            w.matricule.toLowerCase().includes(search.toLowerCase()) ||
            (w.cin || '').toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === 'all' || w.role === filterRole;
        return matchSearch && matchRole;
    });

    const handleDelete = (worker: HRWorker) => {
        if (!window.confirm(`Supprimer "${worker.full_name}" ?`)) return;
        onDelete(worker.id);
    };

    if (loading) {
        return (
            <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search + Filter */}
            <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Chercher par nom, matricule, CIN..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-all"
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none focus:border-orange-400 transition-all"
                >
                    <option value="all">Tous les rôles</option>
                    <option value="OPERATOR">Opérateur</option>
                    <option value="SUPERVISOR">Superviseur</option>
                    <option value="MECHANIC">Mécanicien</option>
                    <option value="QUALITY">Qualité</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="LOGISTICS">Logistique</option>
                </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-500 text-lg">Aucun ouvrier trouvé</p>
                            <p className="text-sm text-slate-400 mt-1">
                                {search || filterRole !== 'all'
                                    ? 'Aucun résultat pour cette recherche.'
                                    : 'Ajoutez votre premier ouvrier avec le bouton ci-dessus'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Ouvrier</th>
                                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Rôle</th>
                                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Téléphone</th>
                                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Embauche</th>
                                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Contrat</th>
                                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Salaire</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(w => (
                                <tr key={w.id} className="hover:bg-orange-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                                                {w.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{w.full_name}</p>
                                                <p className="text-xs text-slate-400">{w.matricule} {w.cin ? `· ${w.cin}` : ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[w.role] || 'bg-slate-100 text-slate-600'}`}>
                                            {w.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            {w.phone ? <><Phone className="w-3.5 h-3.5" /><span>{w.phone}</span></> : <span className="text-slate-300">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{w.date_embauche ? new Date(w.date_embauche).toLocaleDateString('fr-FR') : '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{w.type_contrat}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-bold text-slate-700">
                                        {w.salaire_base > 0 ? `${w.salaire_base.toLocaleString('fr-FR')} MAD` : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(w)}
                                                className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400 flex items-center justify-center transition-colors"
                                                title="Modifier"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(w)}
                                                className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 flex items-center justify-center transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
