import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HRWorker } from './WorkerModal';

interface KPI {
    total: number;
    actifs: number;
    presents_today: number;
    absents_today: number;
    supp_hours_month: number;
}

interface ChartPoint { date: string; presents: number; }

interface Props { workers: HRWorker[]; }

export default function StatistiquesTab({ workers }: Props) {
    const [kpi, setKpi] = useState<KPI>({ total: 0, actifs: 0, presents_today: 0, absents_today: 0, supp_hours_month: 0 });
    const [chart, setChart] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const total = workers.length;
        const actifs = workers.filter(w => w.is_active).length;

        fetch(`/api/hr/pointage?date=${today}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => {
                const presents = data.filter(d => d.statut === 'PRESENT' || d.statut === 'RETARD').length;
                const suppTotal = data.reduce((acc, d) => acc + (d.heures_supp_25 || 0) + (d.heures_supp_50 || 0), 0);
                setKpi({ total, actifs, presents_today: presents, absents_today: actifs - presents, supp_hours_month: +suppTotal.toFixed(1) });
            })
            .catch(() => setKpi({ total, actifs, presents_today: 0, absents_today: actifs, supp_hours_month: 0 }));

        // Build last 14 days chart from pointage
        const days: ChartPoint[] = [];
        const promises: Promise<void>[] = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            const p = fetch(`/api/hr/pointage?date=${dateStr}`, { credentials: 'include' })
                .then(r => r.ok ? r.json() : [])
                .then((data: any[]) => {
                    days.push({ date: label, presents: data.filter((x: any) => x.statut === 'PRESENT' || x.statut === 'RETARD').length });
                })
                .catch(() => { days.push({ date: label, presents: 0 }); });
            promises.push(p);
        }
        Promise.all(promises).then(() => {
            days.sort((a, b) => {
                const [ad, am] = a.date.split('/').map(Number);
                const [bd, bm] = b.date.split('/').map(Number);
                return am !== bm ? am - bm : ad - bd;
            });
            setChart(days);
            setLoading(false);
        });
    }, [workers]);

    const kpiCards = [
        { label: 'Total Ouvriers', value: kpi.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Actifs', value: kpi.actifs, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Présents Aujourd\'hui', value: kpi.presents_today, icon: UserCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Absents Aujourd\'hui', value: kpi.absents_today, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'H. Supp Aujourd\'hui', value: `${kpi.supp_hours_month}h`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {kpiCards.map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <p className="text-2xl font-black text-slate-800">{loading ? '...' : card.value}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1 leading-tight">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-black text-slate-800 mb-4">Présence — 14 derniers jours</h3>
                {loading ? (
                    <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                formatter={(v: number) => [`${v} présents`, '']}
                            />
                            <Line type="monotone" dataKey="presents" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
