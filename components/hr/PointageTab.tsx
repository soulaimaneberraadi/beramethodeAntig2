import React, { useState, useEffect, useCallback } from 'react';
import { Save, CheckCircle, Clock } from 'lucide-react';
import { HRWorker } from './WorkerModal';

type Statut = 'PRESENT' | 'ABSENT' | 'CONGE' | 'MALADIE' | 'RETARD';

interface PointageRow {
    worker_id: string;
    full_name: string;
    matricule: string;
    heure_entree: string;
    heure_sortie: string;
    pause_debut: string;
    pause_fin: string;
    statut: Statut;
    motif_absence: string;
    heures_travaillees: number;
    heures_supp_25: number;
    heures_supp_50: number;
}

const STATUT_COLORS: Record<Statut, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    ABSENT: 'bg-red-100 text-red-700',
    CONGE: 'bg-blue-100 text-blue-700',
    MALADIE: 'bg-yellow-100 text-yellow-700',
    RETARD: 'bg-orange-100 text-orange-700',
};

function calculerHeures(entree: string, sortie: string, pauseDebut: string, pauseFin: string, dateStr: string) {
    if (!entree || !sortie) return { travaillees: 0, normales: 0, supp25: 0, supp50: 0 };
    const parse = (t: string) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
    let tE = parse(entree), tS = parse(sortie);
    if (tS < tE) tS += 24;
    let total = tS - tE;
    if (pauseDebut && pauseFin) {
        let pE = parse(pauseDebut), pS = parse(pauseFin);
        if (pS < pE) pS += 24;
        total = Math.max(0, total - (pS - pE));
    }
    const day = new Date(dateStr).getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) return { travaillees: +total.toFixed(2), normales: 0, supp25: 0, supp50: +total.toFixed(2) };
    const norm = Math.min(8, total);
    const rem1 = Math.max(0, total - 8);
    const s25 = Math.min(2, rem1);
    const s50 = Math.max(0, rem1 - 2);
    return { travaillees: +total.toFixed(2), normales: +norm.toFixed(2), supp25: +s25.toFixed(2), supp50: +s50.toFixed(2) };
}

interface Props { workers: HRWorker[]; }

export default function PointageTab({ workers }: Props) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState<PointageRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState(false);
    const [saved, setSaved] = useState(false);

    const buildRows = useCallback((existingData: Record<string, Partial<PointageRow>>) => {
        return workers.filter(w => w.is_active).map(w => ({
            worker_id: w.id,
            full_name: w.full_name,
            matricule: w.matricule,
            heure_entree: existingData[w.id]?.heure_entree || '08:00',
            heure_sortie: existingData[w.id]?.heure_sortie || '17:00',
            pause_debut: existingData[w.id]?.pause_debut || '12:00',
            pause_fin: existingData[w.id]?.pause_fin || '13:00',
            statut: (existingData[w.id]?.statut as Statut) || 'PRESENT',
            motif_absence: existingData[w.id]?.motif_absence || '',
            heures_travaillees: existingData[w.id]?.heures_travaillees || 0,
            heures_supp_25: existingData[w.id]?.heures_supp_25 || 0,
            heures_supp_50: existingData[w.id]?.heures_supp_50 || 0,
        }));
    }, [workers]);

    useEffect(() => {
        if (!workers.length) return;
        fetch(`/api/hr/pointage?date=${date}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => {
                const map: Record<string, Partial<PointageRow>> = {};
                data.forEach(d => { map[d.worker_id] = d; });
                setRows(buildRows(map));
            })
            .catch(() => setRows(buildRows({})));
    }, [date, workers, buildRows]);

    const updateRow = (idx: number, field: keyof PointageRow, val: string) => {
        setRows(prev => {
            const next = [...prev];
            const row = { ...next[idx], [field]: val };
            if (['heure_entree', 'heure_sortie', 'pause_debut', 'pause_fin'].includes(field)) {
                const calc = calculerHeures(row.heure_entree, row.heure_sortie, row.pause_debut, row.pause_fin, date);
                row.heures_travaillees = calc.travaillees;
                row.heures_supp_25 = calc.supp25;
                row.heures_supp_50 = calc.supp50;
            }
            next[idx] = row;
            return next;
        });
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/hr/pointage', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows.map(r => ({ ...r, date })))
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally { setSaving(false); }
    };

    const handleValidate = async () => {
        if (!window.confirm(`Valider le pointage du ${date} ?`)) return;
        setValidating(true);
        try {
            await fetch('/api/hr/pointage/validate', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date })
            });
            alert('Journée validée avec succès !');
        } finally { setValidating(false); }
    };

    const presentCount = rows.filter(r => r.statut === 'PRESENT' || r.statut === 'RETARD').length;

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-4">
                    <input
                        type="date" value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white outline-none focus:border-orange-400 transition-all"
                    />
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span><strong className="text-slate-800">{presentCount}</strong> / {rows.length} présents</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {saved && (
                        <div className="flex items-center gap-1.5 text-green-600 text-sm font-bold">
                            <CheckCircle className="w-4 h-4" /> Sauvegardé
                        </div>
                    )}
                    <button
                        onClick={handleValidate} disabled={validating}
                        className="px-4 py-2 rounded-xl border border-green-200 text-green-700 text-sm font-bold hover:bg-green-50 transition-colors disabled:opacity-60"
                    >
                        {validating ? 'Validation...' : 'Valider la journée'}
                    </button>
                    <button
                        onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-xl shadow-md shadow-orange-500/30 transition-all disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {rows.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-slate-400 font-medium">
                        Aucun ouvrier actif trouvé.
                    </div>
                ) : (
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                {['Ouvrier', 'Entrée', 'Sortie', 'Pause Dbt', 'Pause Fin', 'H. Travail', 'Supp 25%', 'Supp 50%', 'Statut'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((row, idx) => {
                                const isAbsent = row.statut === 'ABSENT' || row.statut === 'CONGE' || row.statut === 'MALADIE';
                                return (
                                    <tr key={row.worker_id} className={`hover:bg-orange-50/20 transition-colors ${isAbsent ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800">{row.full_name}</div>
                                            <div className="text-xs text-slate-400">{row.matricule}</div>
                                        </td>
                                        {(['heure_entree', 'heure_sortie', 'pause_debut', 'pause_fin'] as const).map(f => (
                                            <td key={f} className="px-3 py-3">
                                                <input
                                                    type="time"
                                                    value={row[f]}
                                                    disabled={isAbsent}
                                                    onChange={e => updateRow(idx, f, e.target.value)}
                                                    className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 bg-white outline-none focus:border-orange-400 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 font-bold text-slate-700">{isAbsent ? '—' : `${row.heures_travaillees}h`}</td>
                                        <td className="px-4 py-3 font-bold text-amber-600">{isAbsent ? '—' : row.heures_supp_25 > 0 ? `${row.heures_supp_25}h` : '—'}</td>
                                        <td className="px-4 py-3 font-bold text-red-600">{isAbsent ? '—' : row.heures_supp_50 > 0 ? `${row.heures_supp_50}h` : '—'}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={row.statut}
                                                onChange={e => updateRow(idx, 'statut', e.target.value)}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-0 outline-none cursor-pointer ${STATUT_COLORS[row.statut]}`}
                                            >
                                                <option value="PRESENT">PRÉSENT</option>
                                                <option value="RETARD">RETARD</option>
                                                <option value="ABSENT">ABSENT</option>
                                                <option value="CONGE">CONGÉ</option>
                                                <option value="MALADIE">MALADIE</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
