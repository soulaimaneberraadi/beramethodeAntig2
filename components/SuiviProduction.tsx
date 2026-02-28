import React, { useState, useEffect, useMemo } from 'react';
import { ModelData, SuiviData, AppSettings } from '../types';
import { Activity, Calendar, Hash, Layers, Users, Clock, Printer, Save, Barcode, AlertTriangle, ShieldAlert, BadgeInfo, Play, CheckCircle2, Trash2, Plus } from 'lucide-react';

interface SuiviProductionProps {
    models: ModelData[];
    suivis: SuiviData[];
    setSuivis: React.Dispatch<React.SetStateAction<SuiviData[]>>;
    settings: AppSettings;
}

export default function SuiviProduction({ models, suivis = [], setSuivis, settings }: SuiviProductionProps) {
    const [selectedSuiviId, setSelectedSuiviId] = useState<string>('');
    const [client, setClient] = useState('BERAMETHODE SA');
    const [dateExport, setDateExport] = useState(new Date().toISOString().split('T')[0]);

    // Auto-select latest suivi if none selected or selected doesn't exist
    useEffect(() => {
        if (suivis && suivis.length > 0) {
            if (!selectedSuiviId || !suivis.find(s => s.id === selectedSuiviId)) {
                // Select the most recently added setting (last in array)
                setSelectedSuiviId(suivis[suivis.length - 1].id);
            }
        } else {
            setSelectedSuiviId('');
        }
    }, [suivis, selectedSuiviId]);

    // Kiosk Mode State
    const [isKioskMode, setIsKioskMode] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [scanMessage, setScanMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // New state variables for filtering
    const [dateFilter, setDateFilter] = useState('');
    const [chaineFilter, setChaineFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const ALL_CHAINES = useMemo(() => Array.from({ length: settings.chainsCount }, (_, i) => `CHAINE ${i + 1}`), [settings.chainsCount]);

    // Active Suivi Object
    const activeSuivi = suivis.find(s => s.id === selectedSuiviId) || null;
    const actualModel = activeSuivi ? models.find(m => m.id === activeSuivi.planningId) || models[0] : null;

    // Hourly tracking state
    const HOURS = ['08:30', '09:30', '10:30', '11:30', '14:30', '15:30', '16:30', '17:30', '18:30', '19:30'];
    const HOUR_KEYS = ['h0830', 'h0930', 'h1030', 'h1130', 'h1430', 'h1530', 'h1630', 'h1730', 'h1830', 'h1930'] as const;

    const pJournaliereTarget = activeSuivi?.pJournaliere || 400; // Default target
    const targetPerHour = Math.round(pJournaliereTarget / 10);

    const handleHourlyChange = (hourKey: keyof SuiviData['sorties'], value: string) => {
        if (!activeSuivi || !setSuivis) return;

        const val = parseInt(value) || 0;
        setSuivis(prev => prev.map(s => {
            if (s.id === selectedSuiviId) {
                const newSorties = { ...s.sorties, [hourKey]: val };
                const totalHeure = Object.values(newSorties).reduce((a, b) => (a || 0) + (b || 0), 0);
                return {
                    ...s,
                    sorties: newSorties,
                    totalHeure,
                    enCour: s.entrer - totalHeure,
                    resteSortie: (s.resteEntrer + s.entrer) - totalHeure
                };
            }
            return s;
        }));
    };

    const handleDowntimeChange = (hourKey: string, reason: string) => {
        if (!activeSuivi || !setSuivis) return;
        setSuivis(prev => prev.map(s => {
            if (s.id === selectedSuiviId) {
                const newDowntimes = { ...(s.downtimes || {}), [hourKey]: reason };
                return { ...s, downtimes: newDowntimes };
            }
            return s;
        }));
    };

    const handleWorkerChange = (role: string, value: string) => {
        if (!activeSuivi || !setSuivis) return;
        const val = parseInt(value) || 0;
        setSuivis(prev => prev.map(s => {
            if (s.id === selectedSuiviId) {
                const updated = { ...s, [role]: val };
                updated.totalWorkers = (updated.machinistes || 0) + (updated.tracage || 0) + (updated.preparation || 0) + (updated.finition || 0) + (updated.controle || 0);
                return updated;
            }
            return s;
        }));
    };

    const handleEntrerChange = (val: string) => {
        if (!activeSuivi || !setSuivis) return;
        const entrer = parseInt(val) || 0;
        setSuivis(prev => prev.map(s => {
            if (s.id === selectedSuiviId) {
                return {
                    ...s,
                    entrer,
                    enCour: entrer - s.totalHeure,
                    resteEntrer: s.resteEntrer > 0 ? s.resteEntrer : s.resteEntrer
                };
            }
            return s;
        }));
    };

    // --- QC Defauts Logic ---
    const addDefect = () => {
        if (!activeSuivi || !setSuivis) return;
        const newDefect = { id: Date.now().toString(), hour: HOURS[0], type: 'Couture', quantity: 1, notes: '' };
        setSuivis(prev => prev.map(s => s.id === selectedSuiviId ? { ...s, defauts: [...(s.defauts || []), newDefect] } : s));
    };

    const updateDefect = (id: string, field: string, value: any) => {
        if (!activeSuivi || !setSuivis) return;
        setSuivis(prev => prev.map(s => {
            if (s.id === selectedSuiviId) {
                return { ...s, defauts: (s.defauts || []).map(d => d.id === id ? { ...d, [field]: value } : d) };
            }
            return s;
        }));
    };

    const removeDefect = (id: string) => {
        if (!activeSuivi || !setSuivis) return;
        setSuivis(prev => prev.map(s => s.id === selectedSuiviId ? { ...s, defauts: (s.defauts || []).filter(d => d.id !== id) } : s));
    }

    // --- OEE / TRS Calculation ---
    // TRS = Disponibilité * Performance * Qualité
    const calculateTRS = () => {
        if (!activeSuivi) return { d: 0, p: 0, q: 0, trs: 0, defects: 0 };

        const totalProductionHours = 10; // 10 slots
        let hoursWorked = 0;
        let totalDowntimePenalty = 0;

        // Calculate hours that have actual production recorded
        HOURS.forEach((h, idx) => {
            const key = HOUR_KEYS[idx];
            if ((activeSuivi.sorties[key] ?? -1) >= 0) { // Has value
                hoursWorked++;
                if (activeSuivi.downtimes && activeSuivi.downtimes[key]) {
                    totalDowntimePenalty += 0.2; // roughly say 12 mins lost per reason as a mock metric
                }
            }
        });

        if (hoursWorked === 0) return { d: 0, p: 0, q: 0, trs: 0, defects: 0 };

        // Disponibilité (Availability) = (Hours Worked - Downtime) / Hours Worked
        const disponibilite = Math.max(0, (hoursWorked - totalDowntimePenalty) / hoursWorked);

        // Performance = (Total Produced / Operating Hours) / Optimal Rate
        const currentRate = activeSuivi.totalHeure / hoursWorked;
        const performance = Math.min(1, currentRate / targetPerHour);

        // Qualité = (Good - Defects) / Good
        const totalDefects = (activeSuivi.defauts || []).reduce((acc, def) => acc + def.quantity, 0);
        const quality = activeSuivi.totalHeure > 0 ? Math.max(0, (activeSuivi.totalHeure - totalDefects) / activeSuivi.totalHeure) : 1;

        const trs = (disponibilite * performance * quality) * 100;

        return {
            d: Math.round(disponibilite * 100),
            p: Math.round(performance * 100),
            q: Math.round(quality * 100),
            trs: Math.round(trs),
            defects: totalDefects
        };
    };

    const trsData = calculateTRS();

    // --- Kiosk Mode Logic ---
    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSuivi || !actualModel || !setSuivis) return;

        // Find if this barcode exists in the model's ordreCoupe (mock validation)
        const order = actualModel.ordreCoupe;
        let found = false;
        let qty = 1;

        if (order && order.faisceaux) {
            const faisceau = order.faisceaux.find(f => f.codeBarre === scannedBarcode);
            if (faisceau) {
                found = true;
                qty = faisceau.quantite;
            }
        } else {
            // Mock success for testing if no logic present
            found = true;
            qty = 10; // default bundle size
        }

        if (found) {
            // Find current active hour (mock: just take the first one without target met or just the current physical time)
            // For demo, just add to h0830 or the current lowest hour
            const hourKey = HOUR_KEYS.find(k => (activeSuivi.sorties[k] || 0) < targetPerHour) || HOUR_KEYS[0];

            const currentVal = activeSuivi.sorties[hourKey] || 0;
            handleHourlyChange(hourKey, (currentVal + qty).toString());

            setScanMessage({ text: `Succès : +${qty} pièces enregistrées sur le Faisceau ${scannedBarcode}`, type: 'success' });
        } else {
            setScanMessage({ text: `Erreur : Faisceau non reconnu.`, type: 'error' });
        }

        setScannedBarcode('');
        setTimeout(() => setScanMessage(null), 3000);
    };


    return (
        <div className="h-full flex flex-col bg-slate-50 relative pb-20 overflow-y-auto">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-20 print:hidden sticky top-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        MES Avancé : Suivi & TRS
                    </h1>
                    <p className="text-slate-500 mt-1">Fiche journalière intelligente (Downtime, OEE/TRS, Codes-Barres).</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-bold text-slate-800"
                        value={selectedSuiviId}
                        onChange={e => setSelectedSuiviId(e.target.value)}
                    >
                        <option value="">Sélectionner un Suivi Lancer...</option>
                        {suivis.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.date} - Suivi {s.id.split('_')[1]}
                            </option>
                        ))}
                    </select>
                    <select
                        value={chaineFilter}
                        onChange={(e) => setChaineFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-medium cursor-pointer"
                    >
                        <option value="">Toutes Chaînes</option>
                        {ALL_CHAINES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition-all border border-slate-300">
                        <Printer className="w-4 h-4" /> Imprimer
                    </button>
                    {activeSuivi && (
                        <button onClick={() => setIsKioskMode(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 transition-all">
                            <Barcode className="w-4 h-4" /> Kiosque Scan
                        </button>
                    )}
                </div>
            </div>

            {/* CONTENT = EXCEL LIKE SHEET */}
            {!activeSuivi ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <Layers className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="font-medium text-lg text-slate-600 mb-2">Aucun suivi sélectionné.</p>
                    <p className="text-sm">Allez dans le <strong>Planning</strong> et lancez la production pour initier un suivi.</p>
                </div>
            ) : (
                <div className="flex-1 p-6 w-full max-w-none mx-auto print:p-0 print:m-0 print:max-w-none space-y-6">

                    {/* TRS / OEE DASHBOARD */}
                    <div className="grid grid-cols-4 gap-4 print:hidden">
                        <div className="bg-slate-800 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <Activity className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">T.R.S (OEE)</span>
                            </div>
                            <div className={`text-5xl font-black ${trsData.trs >= 80 ? 'text-emerald-400' : trsData.trs >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {trsData.trs}<span className="text-2xl opacity-50">%</span>
                            </div>
                            <p className="text-xs opacity-60 mt-2">Taux de Rendement Synthétique</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Disponibilité</span>
                            <div className="text-3xl font-black text-slate-800">{trsData.d}%</div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${trsData.d}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Performance</span>
                            <div className="text-3xl font-black text-slate-800">{trsData.p}%</div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-amber-500 h-full" style={{ width: `${trsData.p}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Qualité</span>
                            <div className="text-3xl font-black text-slate-800">{trsData.q}%</div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${trsData.q}%` }}></div>
                            </div>
                            {trsData.defects > 0 && <span className="text-[10px] text-red-500 font-bold mt-2 absolute bottom-2 right-4">{trsData.defects} défauts signalés</span>}
                        </div>
                    </div>


                    {/* The "Sheet" */}
                    <div className="bg-white border border-slate-300 shadow-xl print:shadow-none print:border-none p-8 print:p-0" id="suivi-sheet">

                        {/* SHEET HEADER */}
                        <div className="flex justify-between items-start mb-6 border-b-2 border-slate-800 pb-4">
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">Suivi & TRS</h1>
                                <p className="text-slate-600 font-bold tracking-widest uppercase flex items-center gap-2">
                                    BERAMETHODE <BadgeInfo className="w-4 h-4 text-slate-400" /> Phase 13
                                </p>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                {trsData.trs < 65 && activeSuivi.totalHeure > 0 && (
                                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg animate-pulse print:hidden">
                                        <AlertTriangle className="w-5 h-5" />
                                        <div className="text-left leading-tight">
                                            <span className="block text-[9px] font-black uppercase">Andon Alert</span>
                                            <span className="block text-xs font-bold">TRS Critique ({trsData.trs}%)</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-slate-500 uppercase text-xs">Date</p>
                                    <p className="text-xl font-black text-slate-800">{activeSuivi.date}</p>
                                </div>
                            </div>
                        </div>

                        {/* INFO GRID */}
                        <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-4 border border-slate-300 rounded-lg">
                            <div className="space-y-2">
                                <div className="flex border-b border-slate-200 pb-1">
                                    <span className="w-32 font-bold text-slate-600 uppercase text-xs">Client</span>
                                    <input type="text" className="flex-1 bg-transparent font-black text-sm outline-none uppercase text-slate-800" value={client} onChange={e => setClient(e.target.value)} />
                                </div>
                                <div className="flex border-b border-slate-200 pb-1">
                                    <span className="w-32 font-bold text-slate-600 uppercase text-xs">Model Ref</span>
                                    <span className="flex-1 font-black text-indigo-700 text-sm">{actualModel?.meta_data.nom_modele || 'N/A'} {actualModel?.meta_data.reference ? `(${actualModel.meta_data.reference})` : ''}</span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-1">
                                    <span className="w-32 font-bold text-slate-600 uppercase text-xs">Coupes</span>
                                    <span className="flex-1 font-black text-sm text-slate-800">{activeSuivi.resteEntrer + activeSuivi.entrer} pcs</span>
                                </div>
                            </div>
                            <div className="space-y-2 border-l border-slate-200 pl-6">
                                <div className="flex border-b border-slate-200 pb-1">
                                    <span className="w-32 font-bold text-slate-600 uppercase text-xs">Date Livraison</span>
                                    <input type="date" className="flex-1 bg-transparent font-black text-sm outline-none text-slate-800" value={dateExport} onChange={e => setDateExport(e.target.value)} />
                                </div>
                                <div className="flex border-b border-slate-200 pb-1 text-emerald-700">
                                    <span className="w-32 font-bold uppercase text-xs opacity-70">Total Sortie</span>
                                    <span className="flex-1 font-black text-sm text-right">{activeSuivi.totalHeure} pcs</span>
                                </div>
                                <div className="flex border-b border-slate-200 pb-1 text-rose-700">
                                    <span className="w-32 font-bold uppercase text-xs opacity-70">Reste (Manque)</span>
                                    <span className="flex-1 font-black text-sm text-right">{(activeSuivi.resteEntrer + activeSuivi.entrer) - activeSuivi.totalHeure} pcs</span>
                                </div>
                            </div>
                            <div className="col-span-1 flex flex-col justify-center items-center bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-indigo-800 uppercase text-center block mb-1">Objectif S. Horaire (P° / 10h)</span>
                                <div className="flex items-end gap-1 text-indigo-700">
                                    <span className="text-4xl font-black">{targetPerHour}</span>
                                    <span className="font-bold text-sm mb-1 pb-1 border-b border-indigo-300">pcs/h</span>
                                </div>
                            </div>
                        </div>

                        {/* HOURLY SORTIE & EFFECTIFS WRAPPER */}
                        <div className="flex gap-6 mb-8">
                            {/* HOURLY SORTIE */}
                            <div className="flex-1 relative">
                                <div className="bg-slate-800 text-white font-bold text-center py-2 uppercase tracking-widest text-sm rounded-t-lg">
                                    Sortie Par Heure & Suivi d'Arrêt
                                </div>
                                <table className="w-full border-collapse border border-slate-200 shadow-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                                            <th className="py-3 px-2 w-12 text-slate-500"><Clock className="w-4 h-4 mx-auto" /></th>
                                            <th className="py-3 px-2 text-xs uppercase tracking-wider font-bold text-slate-700 text-left">Heure</th>
                                            <th className="py-3 px-2 text-xs uppercase tracking-wider font-bold text-indigo-700 text-center w-28">Réalisé</th>
                                            <th className="py-3 px-2 text-xs uppercase tracking-wider font-bold text-rose-600 text-left print:hidden">Motif d'arrêt (Downtime)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {HOURS.map((hour, idx) => {
                                            const hourKey = HOUR_KEYS[idx];
                                            const val = activeSuivi.sorties[hourKey];
                                            const isUnderTarget = val !== undefined && val < targetPerHour;
                                            const isFilled = val !== undefined;

                                            return (
                                                <tr key={hour} className={`transition-colors border-b border-slate-100 ${isUnderTarget ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                                                    <td className="py-2.5 px-2 text-center text-slate-400 font-medium text-xs border-r border-slate-100">{idx + 1}</td>
                                                    <td className="py-2.5 px-2 font-bold text-slate-800 border-r border-slate-100">{hour}</td>
                                                    <td className="p-0 border-r border-slate-100 relative">
                                                        <input
                                                            type="number"
                                                            className={`w-full h-full min-h-[44px] text-center font-black text-lg outline-none transition-colors ${isUnderTarget ? 'text-rose-600 bg-rose-50/50 focus:bg-rose-100' : 'text-indigo-700 bg-transparent focus:bg-indigo-50'}`}
                                                            value={val === undefined ? '' : val}
                                                            onChange={e => handleHourlyChange(hourKey, e.target.value)}
                                                            placeholder="-"
                                                        />
                                                        {isFilled && !isUnderTarget && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />}
                                                    </td>
                                                    <td className="p-0 h-full print:hidden bg-slate-50/30">
                                                        {isUnderTarget ? (
                                                            <div className="flex items-center h-full px-2 gap-2 h-full min-h-[44px]">
                                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                                <select
                                                                    className="w-full bg-transparent text-xs text-rose-700 font-bold outline-none cursor-pointer"
                                                                    value={activeSuivi.downtimes?.[hourKey] || ''}
                                                                    onChange={e => handleDowntimeChange(hourKey, e.target.value)}
                                                                >
                                                                    <option value="">-- Raison de perte --</option>
                                                                    <option value="Panne Machine">Panne Machine</option>
                                                                    <option value="Manque Fourniture">Manque Fourniture</option>
                                                                    <option value="Absence Opérateur">Absence Opérateur</option>
                                                                    <option value="Coupure Courant">Coupure Courant</option>
                                                                    <option value="Réglage Retardé">Réglage Retardé</option>
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-emerald-600 text-[10px] font-bold uppercase tracking-widest pt-3 opacity-50">Objectif Atteint</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 border-t-2 border-slate-300">
                                            <td colSpan={2} className="py-3 px-4 text-right font-black uppercase text-slate-800">Total Sortie :</td>
                                            <td className="py-3 text-center text-2xl font-black text-white bg-indigo-600">{activeSuivi.totalHeure}</td>
                                            <td className="print:hidden bg-slate-200"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* RIGHT COLUMN : ENTRER & EFFECTIFS */}
                            <div className="w-[380px] space-y-6">

                                {/* FLUX STATUS */}
                                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                    <div className="bg-slate-800 text-white font-bold text-center py-2.5 uppercase tracking-widest text-sm border-b border-slate-700">
                                        Entrées & En Cours
                                    </div>
                                    <table className="w-full border-collapse border-b border-slate-200 bg-white">
                                        <tbody>
                                            <tr className="border-b border-slate-100">
                                                <td className="py-3 px-4 font-bold text-xs uppercase text-slate-600 bg-slate-50 w-1/2 border-r border-slate-100">Lot Entré (Mise en p°)</td>
                                                <td className="p-0 relative">
                                                    <input type="number" className="w-full h-full min-h-[44px] text-center font-black text-xl outline-none focus:bg-slate-50 text-slate-800"
                                                        value={activeSuivi.entrer || ''}
                                                        onChange={e => handleEntrerChange(e.target.value)} />
                                                </td>
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                                <td className="py-3 px-4 font-bold text-xs uppercase text-slate-600 bg-slate-50 border-r border-slate-100 text-amber-800 bg-amber-50">En Cour de Chaîne</td>
                                                <td className="text-center font-black text-3xl text-amber-600 bg-amber-50/50 py-2">{activeSuivi.enCour}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 px-4 font-bold text-xs uppercase text-slate-600 bg-slate-50 border-r border-slate-100">Reste Avant Sortie</td>
                                                <td className="text-center font-black text-xl text-slate-500 py-2">{(activeSuivi.resteEntrer + activeSuivi.entrer) - activeSuivi.totalHeure}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* EFFECTIFS (N.O) */}
                                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                    <div className="bg-amber-600 text-white font-bold text-center py-2.5 uppercase tracking-widest text-sm border-b border-amber-700 flex items-center justify-center gap-2">
                                        <Users className="w-4 h-4" /> Effectif (N.O) Direct
                                    </div>
                                    <table className="w-full border-collapse bg-white">
                                        <tbody>
                                            {['machinistes', 'tracage', 'preparation', 'finition', 'controle'].map((role, i) => (
                                                <tr key={role} className="border-b border-slate-100 group">
                                                    <td className="py-2.5 px-4 font-bold text-xs uppercase text-slate-600 bg-slate-50 w-1/2 border-r border-slate-100 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                        {role === 'tracage' ? 'Traçage/Coupe' : role}
                                                    </td>
                                                    <td className="p-0">
                                                        <input type="number"
                                                            className="w-full text-center font-bold outline-none py-2 text-slate-800 group-hover:bg-slate-50 transition-colors"
                                                            value={String(activeSuivi[role as keyof SuiviData] || '')}
                                                            onChange={e => handleWorkerChange(role, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-amber-100 border-t-2 border-amber-200">
                                                <td className="py-3 px-4 text-right font-black uppercase tracking-wider text-amber-900 border-r border-amber-200">Total N.O :</td>
                                                <td className="py-3 text-center text-3xl font-black text-amber-700">{activeSuivi.totalWorkers}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* REGISTRE DES DEFAUTS (QC) */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-3 border-b-2 border-slate-800 pb-2">
                                <h3 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                                    Registre des Défauts (In-Line QC)
                                </h3>
                                <button onClick={addDefect} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm print:hidden">
                                    <Plus className="w-3.5 h-3.5" /> Ajouter Défaut
                                </button>
                            </div>

                            {(!activeSuivi.defauts || activeSuivi.defauts.length === 0) ? (
                                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 font-medium">
                                    Aucun défaut enregistré pour le moment. La qualité est à 100%.
                                </div>
                            ) : (
                                <table className="w-full border-collapse border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                                    <thead className="bg-slate-100 border-b-2 border-slate-200 text-left">
                                        <tr>
                                            <th className="py-3 px-4 text-xs font-bold uppercase text-slate-600 w-32 border-r border-slate-200">Heure</th>
                                            <th className="py-3 px-4 text-xs font-bold uppercase text-slate-600 w-48 border-r border-slate-200">Type de Défaut</th>
                                            <th className="py-3 px-4 text-xs font-bold uppercase text-slate-600 w-32 text-center border-r border-slate-200">Quantité (Pcs)</th>
                                            <th className="py-3 px-4 text-xs font-bold uppercase text-slate-600">Observation</th>
                                            <th className="py-3 px-4 w-12 print:hidden"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeSuivi.defauts.map((def) => (
                                            <tr key={def.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                                                <td className="p-0 border-r border-slate-100">
                                                    <select
                                                        className="w-full h-full min-h-[44px] bg-transparent outline-none px-4 text-sm font-bold text-slate-700 cursor-pointer"
                                                        value={def.hour}
                                                        onChange={(e) => updateDefect(def.id, 'hour', e.target.value)}
                                                    >
                                                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-0 border-r border-slate-100">
                                                    <select
                                                        className="w-full h-full min-h-[44px] bg-transparent outline-none px-4 text-sm font-bold text-rose-700 cursor-pointer"
                                                        value={def.type}
                                                        onChange={(e) => updateDefect(def.id, 'type', e.target.value)}
                                                    >
                                                        <option value="Couture">Problème Couture (Fil/Aiguille)</option>
                                                        <option value="Tache">Tache Huile/Saleté</option>
                                                        <option value="Coupe">Défaut de Coupe</option>
                                                        <option value="Mesure">Hors Tolérance (Mesure)</option>
                                                        <option value="Accessoire">Accessoire Manquant/Cassé</option>
                                                    </select>
                                                </td>
                                                <td className="p-0 border-r border-slate-100">
                                                    <input
                                                        type="number" min="1"
                                                        className="w-full h-full min-h-[44px] bg-transparent outline-none px-4 text-center text-lg font-black text-slate-900"
                                                        value={def.quantity}
                                                        onChange={(e) => updateDefect(def.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <input
                                                        type="text"
                                                        className="w-full h-full min-h-[44px] bg-transparent outline-none px-4 text-sm font-medium text-slate-600"
                                                        placeholder="Note additionnelle..."
                                                        value={def.notes}
                                                        onChange={(e) => updateDefect(def.id, 'notes', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2 text-center print:hidden">
                                                    <button onClick={() => removeDefect(def.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KIOSK MODE BARCODE MODAL */}
            {isKioskMode && (
                <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200 print:hidden">
                    <button onClick={() => setIsKioskMode(false)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 bg-white/10 rounded-full transition-all">
                        ✖ Fermer Kiosque
                    </button>

                    <div className="text-center mb-12">
                        <div className="w-24 h-24 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-600/50">
                            <Barcode className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-2">Scanner Faisceau</h2>
                        <p className="text-indigo-200 text-lg">Préparez la douchette ou entrez le code manuellement.</p>
                    </div>

                    <form onSubmit={handleBarcodeSubmit} className="w-full max-w-2xl relative">
                        <input
                            type="text"
                            autoFocus
                            className="w-full bg-slate-800 border-4 border-slate-700 text-white text-5xl font-black text-center py-8 rounded-3xl outline-none focus:border-indigo-500 transition-all shadow-2xl placeholder:opacity-20"
                            placeholder="CODE-BARRES..."
                            value={scannedBarcode}
                            onChange={(e) => setScannedBarcode(e.target.value)}
                        />
                        <button type="submit" className="hidden">Submit</button>
                    </form>

                    <div className="h-24 mt-8 flex items-center justify-center">
                        {scanMessage && (
                            <div className={`px-8 py-4 rounded-xl text-xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${scanMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'}`}>
                                {scanMessage.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                                {scanMessage.text}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-8 text-slate-500 text-sm font-bold tracking-widest uppercase">
                        BeraMethode • MES Execution System
                    </div>
                </div>
            )}
        </div>
    );
}

// Ensure Trash2 and Plus imports are present. Let's add them via top import line if omitted.
// I see I already added Plus, Barcode, AlertTriangle, ShieldAlert, BadgeInfo, Play, CheckCircle2.
