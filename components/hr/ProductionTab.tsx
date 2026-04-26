import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { HRWorker } from './WorkerModal';

interface ProdRow {
    worker_id: string;
    full_name: string;
    pieces_produites: number;
    pieces_defaut: number;
    taux_qualite: number;
    existingId: string | null;
}

interface Props { workers: HRWorker[]; }

export default function ProductionTab({ workers }: Props) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState<ProdRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!workers.length) return;
        fetch(`/api/hr/production?date=${date}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => {
                const map: Record<string, any> = {};
                data.forEach(d => { map[d.worker_id] = d; });
                setRows(workers.filter(w => w.is_active).map(w => ({
                    worker_id: w.id,
                    full_name: w.full_name,
                    pieces_produites: map[w.id]?.pieces_produites || 0,
                    pieces_defaut: map[w.id]?.pieces_defaut || 0,
                    taux_qualite: map[w.id]?.taux_qualite || 0,
                    existingId: map[w.id]?.id || null
                })));
            })
            .catch(() => setRows(workers.filter(w => w.is_active).map(w => ({
                worker_id: w.id, full_name: w.full_name,
                pieces_produites: 0, pieces_defaut: 0, taux_qualite: 0, existingId: null
            }))));
    }, [date, workers]);

    const updateRow = (idx: number, field: 'pieces_produites' | 'pieces_defaut', val: number) => {
        setRows(prev => {
            const next = [...prev];
            const row = { ...next[idx], [field]: val };
            const total = row.pieces_produites + row.pieces_defaut;
            row.taux_qualite = total > 0 ? +((row.pieces_produites / total) * 100).toFixed(1) : 0;
            next[idx] = row;
            return next;
        });
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = rows.filter(r => r.pieces_produites > 0 || r.pieces_defaut > 0).map(r => ({
                id: r.existingId || undefined,
                worker_id: r.worker_id,
                date,
                pieces_produites: r.pieces_produites,
                pieces_defaut: r.pieces_defaut,
                taux_qualite: r.taux_qualite
            }));
            for (const p of payload) {
                await fetch('/api/hr/production', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(p)
                });
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally { setSaving(false); }
    };

    const totalPieces = rows.reduce((a, r) => a + r.pieces_produites, 0);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-4">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white outline-none focus:border-orange-400 transition-all" />
                    <span className="text-sm text-slate-500">
                        Total: <strong className="text-slate-800">{totalPieces}</strong> pièces
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {saved && <span className="text-sm font-bold text-green-600">✓ Sauvegardé</span>}
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-xl shadow-md shadow-orange-500/30 transition-all disabled:opacity-60">
                        <Save className="w-4 h-4" />
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                            {['Ouvrier', 'Pièces Produites', 'Pièces Défaut', 'Taux Qualité'].map(h => (
                                <th key={h} className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((row, idx) => (
                            <tr key={row.worker_id} className="hover:bg-orange-50/20 transition-colors">
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                                            {row.full_name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-slate-800">{row.full_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <input type="number" min="0" value={row.pieces_produites || ''}
                                        onChange={e => updateRow(idx, 'pieces_produites', parseInt(e.target.value) || 0)}
                                        className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 text-center" />
                                </td>
                                <td className="px-6 py-3">
                                    <input type="number" min="0" value={row.pieces_defaut || ''}
                                        onChange={e => updateRow(idx, 'pieces_defaut', parseInt(e.target.value) || 0)}
                                        className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-red-600 outline-none focus:border-orange-400 text-center" />
                                </td>
                                <td className="px-6 py-3">
                                    {row.taux_qualite > 0 ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 max-w-24 bg-slate-100 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${row.taux_qualite >= 95 ? 'bg-green-500' : row.taux_qualite >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${row.taux_qualite}%` }} />
                                            </div>
                                            <span className={`font-black text-sm ${row.taux_qualite >= 95 ? 'text-green-600' : row.taux_qualite >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {row.taux_qualite}%
                                            </span>
                                        </div>
                                    ) : <span className="text-slate-300">—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
