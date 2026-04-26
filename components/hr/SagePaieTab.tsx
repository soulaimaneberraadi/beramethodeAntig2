import React, { useState } from 'react';
import { Download, Eye } from 'lucide-react';

interface SageRow {
    matricule: string;
    full_name: string;
    salaire_base: number;
    heures_normales: number;
    heures_supp_25: number;
    heures_supp_50: number;
    prime_assiduite: number;
    prime_transport: number;
    total_avances: number;
    brut: number;
    net: number;
}

export default function SagePaieTab() {
    const now = new Date();
    const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [mois, setMois] = useState(defaultMois);
    const [preview, setPreview] = useState<SageRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasPreview, setHasPreview] = useState(false);

    const handlePreview = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hr/sage-preview/${mois}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setPreview(Array.isArray(data) ? data : data.rows || []);
                setHasPreview(true);
            }
        } catch {
            // silent
        } finally { setLoading(false); }
    };

    const handleExport = () => {
        const a = document.createElement('a');
        a.href = `/api/hr/sage-export/${mois}`;
        a.download = `sage-paie-${mois}.csv`;
        a.click();
    };

    const fmt = (n: number) => n?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

    const totalBrut = preview.reduce((a, r) => a + (r.brut || 0), 0);
    const totalNet = preview.reduce((a, r) => a + (r.net || 0), 0);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Mois</label>
                        <input type="month" value={mois} onChange={e => { setMois(e.target.value); setHasPreview(false); }}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white outline-none focus:border-orange-400 transition-all" />
                    </div>
                    <div className="mt-5">
                        <button onClick={handlePreview} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-black rounded-xl transition-all disabled:opacity-60">
                            <Eye className="w-4 h-4" />
                            {loading ? 'Chargement...' : 'Prévisualiser'}
                        </button>
                    </div>
                </div>
                {hasPreview && (
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-black rounded-xl shadow-md shadow-green-600/30 transition-all">
                        <Download className="w-4 h-4" />
                        Exporter CSV Sage
                    </button>
                )}
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto">
                {!hasPreview ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Eye className="w-8 h-8 text-slate-300" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-500 text-lg">Sélectionnez un mois</p>
                            <p className="text-sm text-slate-400 mt-1">Puis cliquez sur "Prévisualiser" pour voir le récapitulatif de paie.</p>
                        </div>
                    </div>
                ) : preview.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-slate-400 font-medium">
                        Aucune donnée pour ce mois.
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="px-6 py-3 flex items-center gap-6 bg-slate-50 border-b border-slate-100">
                            <span className="text-sm text-slate-500">{preview.length} salarié(s)</span>
                            <span className="text-sm font-bold text-slate-700">Brut total: <strong className="text-orange-600">{fmt(totalBrut)} MAD</strong></span>
                            <span className="text-sm font-bold text-slate-700">Net total: <strong className="text-green-600">{fmt(totalNet)} MAD</strong></span>
                        </div>
                        <table className="w-full text-sm min-w-[900px]">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 sticky top-0">
                                    {['Matricule', 'Nom', 'Salaire Base', 'H. Norm', 'Supp 25%', 'Supp 50%', 'Assiduité', 'Transport', 'Avances', 'Brut', 'Net'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {preview.map((row, i) => (
                                    <tr key={i} className="hover:bg-orange-50/20 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.matricule}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{row.full_name}</td>
                                        <td className="px-4 py-3 text-slate-700">{fmt(row.salaire_base)}</td>
                                        <td className="px-4 py-3 text-slate-700">{row.heures_normales?.toFixed(2) || '0.00'}h</td>
                                        <td className="px-4 py-3 text-amber-600 font-bold">{row.heures_supp_25?.toFixed(2) || '0.00'}h</td>
                                        <td className="px-4 py-3 text-red-600 font-bold">{row.heures_supp_50?.toFixed(2) || '0.00'}h</td>
                                        <td className="px-4 py-3 text-slate-700">{fmt(row.prime_assiduite)}</td>
                                        <td className="px-4 py-3 text-slate-700">{fmt(row.prime_transport)}</td>
                                        <td className="px-4 py-3 text-red-600 font-bold">-{fmt(row.total_avances)}</td>
                                        <td className="px-4 py-3 font-black text-slate-800">{fmt(row.brut)}</td>
                                        <td className="px-4 py-3 font-black text-green-700">{fmt(row.net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}
