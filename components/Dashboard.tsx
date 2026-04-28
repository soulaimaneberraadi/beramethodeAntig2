import React, { useMemo, useState, useEffect } from 'react';
import { ModelData, SuiviData, PlanningEvent, AppSettings, AppTask } from '../types';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, Cell, ComposedChart, Line
} from 'recharts';
import {
    Users, Activity, Layers, TrendingUp, Download, AlertTriangle, ShieldAlert,
    CheckCircle2, ListTodo, CalendarClock, Package, Banknote, Factory,
    RefreshCw, Wifi, WifiOff, Clock, ArrowUpRight
} from 'lucide-react';

// ── Types API ───────────────────────────────────────────────────────────────
interface StockAlert {
    id: string;
    designation: string;
    reference: string;
    stockAlerte: number;
    categorie: string;
    stock_actuel: number;
}

interface DashboardKPIs {
    planning: { total: number; en_cours: number; termines: number; qte_total: number; qte_produite: number; avancement: number };
    effectifs: { total: number; cdi: number; presents: number; absents: number; retards: number; taux_presence: number };
    stock: { nb_produits: number; valeur_totale: number; nb_alertes: number; alertes: StockAlert[] };
    rh: { avances_encours: number; demandes_attente: number };
    charts: {
        prod_7j: Array<{ date: string; total: number }>;
        mouvements_7j: Array<{ date: string; total_entrees: number }>;
        prod_par_chaine: Array<{ chaine: string; total: number; jours: number }>;
    };
}

// ── Props ───────────────────────────────────────────────────────────────────
interface DashboardProps {
    models: ModelData[];
    suivis: SuiviData[];
    planningEvents: PlanningEvent[];
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    onOpenAgenda: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

const fmtMAD = (n: number) =>
    new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n) + ' MAD';

const CHAIN_COLORS = ['#2149C1', '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

// ── Hook polling ─────────────────────────────────────────────────────────────
function useDashboardKPIs(intervalMs = 30000) {
    const [data, setData] = useState<DashboardKPIs | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/dashboard/kpis', { credentials: 'include' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
            setLastUpdated(new Date());
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, intervalMs);
        return () => clearInterval(id);
    }, []);

    return { data, loading, error, lastUpdated, refetch: fetchData };
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    sub?: string;
    badge?: { text: string; color: string };
}
const KpiCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, badge }: KpiCardProps) => (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
        </div>
        {badge && (
            <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${badge.color}`}>
                {badge.text}
            </span>
        )}
    </div>
);

// ── Mini skeleton ─────────────────────────────────────────────────────────────
const Skeleton = ({ h = 'h-6', w = 'w-full' }: { h?: string; w?: string }) => (
    <div className={`${h} ${w} bg-slate-100 rounded-lg animate-pulse`} />
);

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard({ models, suivis, planningEvents, settings, setSettings, onOpenAgenda }: DashboardProps) {
    const { data, loading, error, lastUpdated, refetch } = useDashboardKPIs(30000);

    // ── TRS real-time from suivi props ────────────────────────────────────────
    const { globalTRS, pJournaliere, productionData, efficiencyData, andonAlerts } = useMemo(() => {
        let totalH = 0, totalTarget = 0, sumTRS = 0, countTRS = 0;
        const hourlyAcc = { h0830: 0, h0930: 0, h1030: 0, h1130: 0, h1430: 0, h1530: 0, h1630: 0, h1730: 0, h1830: 0, h1930: 0 };
        const chaineMap = new Map<string, { totalH: number; target: number }>();
        const alerts: { title: string; trs: number; time: string }[] = [];

        suivis.forEach(suivi => {
            totalH += suivi.totalHeure || 0;
            const target = suivi.pJournaliere || 400;
            totalTarget += target;

            (Object.keys(hourlyAcc) as Array<keyof typeof hourlyAcc>).forEach(k => {
                hourlyAcc[k] += (suivi.sorties[k as keyof typeof suivi.sorties] as number) || 0;
            });

            const event = planningEvents.find(e => e.id === suivi.planningId);
            if (event) {
                const ch = event.chaineId;
                const ex = chaineMap.get(ch) || { totalH: 0, target: 0 };
                chaineMap.set(ch, { totalH: ex.totalH + (suivi.totalHeure || 0), target: ex.target + target });
            }

            const tph = target / 10;
            let hoursWorked = 0, downtimePenalty = 0;
            ['h0830','h0930','h1030','h1130','h1430','h1530','h1630','h1730','h1830','h1930'].forEach(k => {
                const v = suivi.sorties[k as keyof typeof suivi.sorties] as number | undefined;
                if (v !== undefined && v >= 0) {
                    hoursWorked++;
                    if (suivi.downtimes?.[k]) downtimePenalty += 0.2;
                }
            });

            if (hoursWorked > 0) {
                const dispo = Math.max(0, (hoursWorked - downtimePenalty) / hoursWorked);
                const perf = Math.min(1, (suivi.totalHeure / hoursWorked) / tph);
                const defects = (suivi.defauts || []).reduce((a, d) => a + d.quantity, 0);
                const qual = suivi.totalHeure > 0 ? Math.max(0, (suivi.totalHeure - defects) / suivi.totalHeure) : 1;
                const trs = Math.round(dispo * perf * qual * 100);
                sumTRS += trs; countTRS++;
                if (trs < 65) alerts.push({ title: `Alerte TRS Chaîne ${event?.chaineId || '?'}`, trs, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
            }
        });

        const labels = ['08:30','09:30','10:30','11:30','14:30','15:30','16:30','17:30','18:30','19:30'];
        const keys = ['h0830','h0930','h1030','h1130','h1430','h1530','h1630','h1730','h1830','h1930'];
        const tph = suivis.length > 0 ? totalTarget / 10 : 0;
        let cumP = 0, cumT = 0;
        const pData = labels.map((label, i) => {
            cumP += hourlyAcc[keys[i] as keyof typeof hourlyAcc] || 0;
            cumT += tph;
            return { time: label, pCount: Math.round(cumP), target: Math.round(cumT) };
        });

        const eData: { name: string; rendement: number; fill: string }[] = [];
        let ci = 0;
        chaineMap.forEach((v, ch) => {
            eData.push({ name: ch, rendement: v.target > 0 ? Math.min(100, Math.round((v.totalH / v.target) * 100)) : 0, fill: CHAIN_COLORS[ci++ % CHAIN_COLORS.length] });
        });
        if (eData.length === 0) eData.push({ name: 'CH 1', rendement: 0, fill: CHAIN_COLORS[0] });

        return {
            globalTRS: countTRS > 0 ? Math.round(sumTRS / countTRS) : 0,
            pJournaliere: totalH,
            productionData: pData,
            efficiencyData: eData,
            andonAlerts: alerts
        };
    }, [suivis, planningEvents]);

    // ── Task management ───────────────────────────────────────────────────────
    const [skipModal, setSkipModal] = useState<AppTask | null>(null);
    const [skipText, setSkipText] = useState('');

    const updateTask = (id: string, status: AppTask['status'], reason?: string) => {
        setSettings(prev => ({
            ...prev,
            tasks: prev.tasks?.map(t => t.id === id ? { ...t, status, skipReason: reason } : t) || []
        }));
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const pendingTasks = (settings.tasks || []).filter(t => t.status === 'PENDING' && t.date <= todayStr);

    // ── Prep chart data from API ──────────────────────────────────────────────
    const prod7jData = (data?.charts.prod_7j || []).map(r => ({ ...r, label: fmtDate(r.date) }));
    const chainData = (data?.charts.prod_par_chaine || []).map((r, i) => ({ ...r, fill: CHAIN_COLORS[i % CHAIN_COLORS.length] }));

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-y-auto">

            {/* ─ HEADER ───────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tableau de Bord</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Données réelles · Rafraîchissement automatique toutes les 30 secondes</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            {error ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
                            {error ? 'Hors ligne' : `MAJ ${lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                        </span>
                    )}
                    <button
                        onClick={refetch}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Actualiser
                    </button>
                </div>
            </div>

            <div className="w-full px-8 py-6 space-y-6 pb-20">

                {/* ─ KPI CARDS (API data) ──────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                                <Skeleton h="h-4" w="w-24" />
                                <Skeleton h="h-8" w="w-32" />
                                <Skeleton h="h-3" w="w-40" />
                            </div>
                        ))
                    ) : (
                        <>
                            <KpiCard
                                icon={Factory}
                                iconBg="bg-blue-50" iconColor="text-blue-600"
                                label="Planning Production"
                                value={`${data?.planning.en_cours ?? 0} OF en cours`}
                                sub={`${data?.planning.total ?? 0} total · ${data?.planning.termines ?? 0} terminés`}
                                badge={data?.planning.avancement !== undefined ? {
                                    text: `${data.planning.avancement}%`,
                                    color: data.planning.avancement >= 75 ? 'bg-emerald-100 text-emerald-700' : data.planning.avancement >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                } : undefined}
                            />
                            <KpiCard
                                icon={Users}
                                iconBg="bg-emerald-50" iconColor="text-emerald-600"
                                label="Effectifs & Présence"
                                value={`${data?.effectifs.presents ?? 0} / ${data?.effectifs.total ?? 0}`}
                                sub={`${data?.effectifs.retards ?? 0} retards · ${data?.effectifs.absents ?? 0} absents`}
                                badge={data?.effectifs.taux_presence !== undefined ? {
                                    text: `${data.effectifs.taux_presence}%`,
                                    color: data.effectifs.taux_presence >= 90 ? 'bg-emerald-100 text-emerald-700' : data.effectifs.taux_presence >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                } : undefined}
                            />
                            <KpiCard
                                icon={Package}
                                iconBg="bg-amber-50" iconColor="text-amber-600"
                                label="Inventaire Magasin"
                                value={fmtMAD(data?.stock.valeur_totale ?? 0)}
                                sub={`${data?.stock.nb_produits ?? 0} références en stock`}
                                badge={data?.stock.nb_alertes ? {
                                    text: `⚠️ ${data.stock.nb_alertes} alertes`,
                                    color: 'bg-rose-100 text-rose-700'
                                } : { text: '✓ OK', color: 'bg-emerald-100 text-emerald-700' }}
                            />
                            <KpiCard
                                icon={Banknote}
                                iconBg="bg-purple-50" iconColor="text-purple-600"
                                label="RH & Avances"
                                value={fmtMAD(data?.rh.avances_encours ?? 0)}
                                sub={`${data?.rh.demandes_attente ?? 0} demande(s) appro en attente`}
                                badge={data?.rh.demandes_attente ? {
                                    text: `${data.rh.demandes_attente} attente`,
                                    color: 'bg-amber-100 text-amber-700'
                                } : undefined}
                            />
                        </>
                    )}
                </div>

                {/* ─ PRODUCTION 7J + CHAÎNES ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Production 7 jours */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Production — 7 derniers jours</h3>
                                <p className="text-xs text-slate-400">Pièces produites agrégées (toutes chaînes)</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-slate-300" />
                        </div>
                        {loading ? (
                            <div className="h-52 flex items-center justify-center">
                                <Skeleton h="h-full" />
                            </div>
                        ) : prod7jData.length === 0 ? (
                            <div className="h-52 flex flex-col items-center justify-center text-slate-300 gap-2">
                                <Activity className="w-8 h-8" />
                                <span className="text-sm font-bold">Aucune donnée de suivi</span>
                            </div>
                        ) : (
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={prod7jData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradProd7j" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2149C1" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#2149C1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-4} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(v: number) => [v.toLocaleString('fr-FR'), 'Pièces']}
                                            labelFormatter={(l) => `Jour : ${l}`}
                                        />
                                        <Area type="monotone" dataKey="total" name="Pièces" stroke="#2149C1" strokeWidth={2.5} fill="url(#gradProd7j)" dot={{ r: 3, fill: '#2149C1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Production par chaîne */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Par Chaîne (7j)</h3>
                                <p className="text-xs text-slate-400">Volume produit par chaîne</p>
                            </div>
                            <Layers className="w-5 h-5 text-slate-300" />
                        </div>
                        {loading ? (
                            <div className="h-52"><Skeleton h="h-full" /></div>
                        ) : chainData.length === 0 ? (
                            <div className="h-52 flex flex-col items-center justify-center text-slate-300 gap-2">
                                <Factory className="w-8 h-8" />
                                <span className="text-sm font-bold">Aucune chaîne active</span>
                            </div>
                        ) : (
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chainData} layout="vertical" margin={{ top: 0, right: 20, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <YAxis dataKey="chaine" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} width={55} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(v: number) => [v.toLocaleString('fr-FR'), 'Pièces']}
                                        />
                                        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                            {chainData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─ ALERTES STOCK + TÂCHES + TRS SECTION ────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Stock Alertes */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-64">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Alertes Stock
                            </h3>
                            {!loading && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data?.stock.nb_alertes ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {data?.stock.nb_alertes ?? 0} alerte(s)
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="h-10" />)
                            ) : data?.stock.alertes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-1">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-60" />
                                    <span className="text-xs font-bold opacity-70">Tous les stocks sont OK</span>
                                </div>
                            ) : (
                                data?.stock.alertes.map(a => (
                                    <div key={a.id} className="flex items-center gap-2 p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{a.designation}</p>
                                            <p className="text-[10px] text-rose-600">{a.stock_actuel} / {a.stockAlerte} min.</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md shrink-0">
                                            {Math.round((a.stock_actuel / Math.max(a.stockAlerte, 1)) * 100)}%
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Tasks Widget */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-64">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <ListTodo className="w-4 h-4 text-indigo-500" />
                                Tâches Courantes
                            </h3>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                {pendingTasks.length} en attente
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {pendingTasks.map(task => (
                                <div key={task.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                                    <div className="cursor-pointer" onClick={onOpenAgenda}>
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{task.assigneeName}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${task.date < todayStr ? 'text-rose-600 bg-rose-50 border border-rose-200' : 'text-amber-500 bg-amber-50'}`}>
                                                <CalendarClock className="w-2.5 h-2.5" /> {task.date}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 leading-tight">{task.text}</p>
                                    </div>
                                    <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
                                        <button onClick={() => updateTask(task.id, 'DONE_OK')} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[9px] font-bold py-1 rounded-lg transition-colors">OK</button>
                                        <button onClick={() => updateTask(task.id, 'DONE_NOT_OK')} className="flex-1 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[9px] font-bold py-1 rounded-lg transition-colors">KO</button>
                                        <button onClick={() => setSkipModal(task)} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[9px] font-bold py-1 rounded-lg transition-colors">SKIP</button>
                                    </div>
                                </div>
                            ))}
                            {pendingTasks.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-50" />
                                    <span className="text-xs font-bold opacity-70 text-center">Aucune tâche en attente</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alertes Andon */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-64">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                            Alertes Andon (TRS)
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {andonAlerts.map((a, i) => (
                                <div key={i} className="flex gap-2.5 p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                                    <div className="w-7 h-7 rounded-full bg-rose-200 flex items-center justify-center shrink-0">
                                        <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-rose-900">{a.title}</p>
                                        <p className="text-[10px] text-rose-700">TRS critique : <span className="font-black">{a.trs}%</span> · {a.time}</p>
                                    </div>
                                </div>
                            ))}
                            {andonAlerts.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-50" />
                                    <span className="text-xs font-bold opacity-70">Aucune alerte Andon</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─ TRS TEMPS RÉEL (SUIVI PROPS) ─────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Suivi Temps Réel — Production du Jour</h3>
                            <p className="text-xs text-slate-400">Données issues des fiches de Suivi de Production · TRS Global : <span className={`font-black ${globalTRS >= 75 ? 'text-emerald-600' : globalTRS >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>{globalTRS}%</span></p>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">P° Journalière</p>
                                <p className="text-xl font-black text-slate-800">{pJournaliere.toLocaleString()} pcs</p>
                            </div>
                            <button
                                onClick={() => {
                                    const rows = ['Heure,P° Réelle,Objectif'];
                                    productionData.forEach(r => rows.push(`${r.time},${r.pCount},${r.target}`));
                                    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `prod_${todayStr}.csv`; a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> CSV
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Cumulative hourly chart */}
                        <div className="lg:col-span-2 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={productionData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradRT" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-4} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" name="P° Réelle" dataKey="pCount" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRT)" />
                                    <Area type="monotone" name="Objectif" dataKey="target" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Efficiency per chain */}
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={efficiencyData} layout="vertical" margin={{ top: 0, right: 20, left: 4, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} width={55} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(v: number) => [`${v}%`, 'Rendement']} />
                                    <Bar dataKey="rendement" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                        {efficiencyData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>

            {/* ─ SKIP MODAL ───────────────────────────────────────────────── */}
            {skipModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">Motif d'annulation (obligatoire)</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-sm border border-amber-100 flex gap-2 items-start">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>Ignorer : <span className="font-bold">"{skipModal.text}"</span></p>
                            </div>
                            <textarea
                                value={skipText}
                                onChange={e => setSkipText(e.target.value)}
                                placeholder="Ex: Machine en panne, Attente fourniture..."
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 h-24 resize-none"
                                autoFocus
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                            <button onClick={() => { setSkipModal(null); setSkipText(''); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                Annuler
                            </button>
                            <button
                                onClick={() => { if (skipText.trim()) { updateTask(skipModal.id, 'SKIPPED', skipText.trim()); setSkipModal(null); setSkipText(''); } }}
                                disabled={!skipText.trim()}
                                className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
