import React, { useMemo } from 'react';
import { Operation, ChronoData } from '../types';
import { Activity, Clock, Percent, Calculator, FileText, ClipboardList } from 'lucide-react';

interface ChronometrageProps {
    operations: Operation[];
    chronoData: Record<string, ChronoData>;
    setChronoData: React.Dispatch<React.SetStateAction<Record<string, ChronoData>>>;
    presenceTime: number; // For P° Max (usually 8h/480m or 9h/540m)
}

export default function Chronometrage({ operations, chronoData, setChronoData, presenceTime }: ChronometrageProps) {

    const handleCellChange = (opId: string, field: keyof ChronoData, value: string) => {
        const numValue = value === '' ? undefined : parseFloat(value);

        setChronoData(prev => {
            const current = prev[opId] || { operationId: opId, majoration: 1.15 };
            const updated = { ...current, [field]: numValue };

            // Recalculate T.M (Temps Moyen) if TR1-TR5 change
            if (field.startsWith('tr')) {
                const trs = [updated.tr1, updated.tr2, updated.tr3, updated.tr4, updated.tr5].filter(v => v !== undefined && !isNaN(v)) as number[];
                if (trs.length > 0) {
                    updated.tm = trs.reduce((a, b) => a + b, 0) / trs.length;
                } else {
                    updated.tm = undefined;
                }
            }

            // Recalculate Temp Majoré and Productions
            if (updated.tm !== undefined && updated.majoration !== undefined) {
                updated.tempMajore = updated.tm * updated.majoration;
                if (updated.tempMajore > 0) {
                    updated.pMax = Math.round(presenceTime / updated.tempMajore);
                    updated.p85 = Math.round(updated.pMax * 0.85);
                } else {
                    updated.pMax = undefined;
                    updated.p85 = undefined;
                }
            } else {
                updated.tempMajore = undefined;
                updated.pMax = undefined;
                updated.p85 = undefined;
            }

            return { ...prev, [opId]: updated };
        });
    };

    // Calculate Column Totals
    const totals = useMemo(() => {
        let tmTotal = 0;
        let tempMajoreTotal = 0;

        operations.forEach(op => {
            const data = chronoData[op.id];
            if (data?.tm) tmTotal += data.tm;
            if (data?.tempMajore) tempMajoreTotal += data.tempMajore;
        });

        return {
            tm: tmTotal,
            tempMajore: tempMajoreTotal
        };
    }, [chronoData, operations]);

    return (
        <div className="min-h-full bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* A4 Paper Container */}
                <div className="bg-white rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.08)] border border-slate-200 overflow-hidden print:shadow-none print:border-none">

                    {/* Premium Header */}
                    <div className="bg-slate-800 text-white px-8 py-6 flex flex-col sm:flex-row justify-between items-center sm:items-start border-b-4 border-indigo-500 print:bg-slate-100 print:text-slate-800">
                        <div className="flex items-center gap-4 mb-4 sm:mb-0">
                            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
                                <Activity className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-wider">Fiche de Chronométrage</h1>
                                <p className="text-sm text-indigo-200 uppercase tracking-widest mt-1 print:text-slate-500">MBERATEX - Analyse Minitieuse</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-right">
                            <div className="bg-slate-700/50 px-4 py-2 rounded-md border border-slate-600 print:border-slate-300 print:bg-white">
                                <div className="text-xs text-slate-300 uppercase font-bold print:text-slate-500">Temps de Présence</div>
                                <div className="text-xl font-bold font-mono">{presenceTime} Min</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <ClipboardList className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Opérations</p>
                                <p className="text-lg font-black text-slate-800">{operations.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">T.M Global</p>
                                <p className="text-lg font-black text-slate-800">{totals.tm.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Calculator className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">T. Majoré Global</p>
                                <p className="text-lg font-black text-slate-800">{totals.tempMajore.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Objectif (85%)</p>
                                <p className="text-lg font-black text-slate-800">
                                    {totals.tempMajore > 0 ? Math.round(presenceTime / totals.tempMajore * 0.85) : 0} p/j
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Table Area */}
                    <div className="p-8 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-800">
                                    <th className="px-2 py-3 text-left font-bold text-slate-800 uppercase text-xs w-12">N°</th>
                                    <th className="px-3 py-3 text-left font-bold text-slate-800 uppercase text-xs w-1/4">Opération (Gamme)</th>
                                    <th className="px-2 py-3 text-center font-bold text-amber-600 uppercase text-xs border-r border-slate-200" title="Temps d'Analyse">TS (Min)</th>
                                    <th className="px-2 py-3 text-center font-bold text-slate-600 uppercase text-xs bg-slate-50">TR 1</th>
                                    <th className="px-2 py-3 text-center font-bold text-slate-600 uppercase text-xs bg-slate-50">TR 2</th>
                                    <th className="px-2 py-3 text-center font-bold text-slate-600 uppercase text-xs bg-slate-50">TR 3</th>
                                    <th className="px-2 py-3 text-center font-bold text-slate-600 uppercase text-xs bg-slate-50">TR 4</th>
                                    <th className="px-2 py-3 text-center font-bold text-slate-600 uppercase text-xs bg-slate-50 border-r border-slate-200">TR 5</th>
                                    <th className="px-3 py-3 text-center font-bold text-indigo-700 uppercase text-xs bg-indigo-50/50">T. Moyen</th>
                                    <th className="px-2 py-3 text-center font-bold text-slate-600 uppercase text-xs" title="Majoration (1.15 = 15%)">Maj. (%)</th>
                                    <th className="px-3 py-3 text-center font-bold text-emerald-700 uppercase text-xs bg-emerald-50/50">T. Majoré</th>
                                    <th className="px-3 py-3 text-center font-bold text-blue-700 uppercase text-xs" title="Production 100%">P° Max</th>
                                    <th className="px-3 py-3 text-center font-bold text-white uppercase text-xs bg-slate-800 rounded-tr-sm" title="Production 85%">P° 85%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {operations.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="px-4 py-12 text-center text-slate-400 bg-slate-50 border-b border-slate-200">
                                            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>Veuillez d'abord remplir la Gamme Opératoire.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    operations.map((op, index) => {
                                        const data = (chronoData[op.id] || { operationId: op.id, majoration: 1.15 }) as ChronoData;

                                        // Highlight slow pace (temps moyen > temps standard * 1.2)
                                        const isSlow = data.tm && op.time && (data.tm > op.time * 1.2);
                                        const isFast = data.tm && op.time && (data.tm < op.time * 0.8);

                                        return (
                                            <tr key={op.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-2 py-3 font-mono text-slate-400 text-xs">{String(index + 1).padStart(2, '0')}</td>
                                                <td className="px-3 py-3 text-slate-700 font-medium truncate max-w-[200px]" title={op.description}>{op.description}</td>
                                                <td className="px-2 py-3 text-center font-bold text-amber-600 bg-amber-50/10 border-r border-slate-200">
                                                    {op.time.toFixed(2)}
                                                </td>

                                                {/* TR Inputs */}
                                                {[1, 2, 3, 4, 5].map((trNum) => (
                                                    <td key={trNum} className={`px-1 py-2 bg-slate-50/30 ${trNum === 5 ? 'border-r border-slate-200' : ''}`}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-14 px-1 py-1 text-center text-sm font-mono border-b border-transparent bg-transparent hover:bg-white hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
                                                            placeholder="-"
                                                            value={data[`tr${trNum}` as keyof ChronoData] || ''}
                                                            onChange={e => handleCellChange(op.id, `tr${trNum}` as keyof ChronoData, e.target.value)}
                                                        />
                                                    </td>
                                                ))}

                                                <td className={`px-3 py-3 text-center font-mono font-bold ${isSlow ? 'text-red-600 bg-red-50' : isFast ? 'text-emerald-600 bg-emerald-50' : 'text-indigo-700 bg-indigo-50/30'}`}>
                                                    {data.tm !== undefined ? data.tm.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-16 px-1 py-1 text-center text-sm font-mono border border-slate-200 rounded shrink-0 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                            value={data.majoration || ''}
                                                            onChange={e => handleCellChange(op.id, 'majoration', e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                                                    {data.tempMajore !== undefined ? data.tempMajore.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-3 py-3 text-center font-mono text-slate-500">
                                                    {data.pMax !== undefined ? data.pMax : '-'}
                                                </td>
                                                <td className="px-3 py-3 text-center font-mono font-black text-slate-800 bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                                                    {data.p85 !== undefined ? data.p85 : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {operations.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-slate-800 bg-slate-50">
                                        <td colSpan={2} className="px-3 py-4 text-right font-black uppercase tracking-wider text-slate-800">Total Global</td>
                                        <td className="px-2 py-4 text-center font-black font-mono text-amber-600 border-r border-slate-200">
                                            {operations.reduce((acc, op) => acc + (op.time || 0), 0).toFixed(2)}
                                        </td>
                                        <td colSpan={5} className="border-r border-slate-200"></td>
                                        <td className="px-3 py-4 text-center font-black font-mono text-indigo-700 bg-indigo-100">{totals.tm.toFixed(2)}</td>
                                        <td></td>
                                        <td className="px-3 py-4 text-center font-black font-mono text-emerald-700 bg-emerald-100" colSpan={3}>{totals.tempMajore.toFixed(2)} Min</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Footer Warning / Info */}
                    <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-between items-center print:hidden">
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            Les calculs de production sont basés sur un temps de présence de {presenceTime} minutes.
                        </p>
                        <button onClick={() => window.print()} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider bg-white border border-indigo-200 px-4 py-2 rounded shadow-sm hover:shadow transition-all">
                            Imprimer Fiche
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
