import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ModelData, SuiviData, AppSettings, PlanningEvent, PosteSuiviData, Operation } from '../types';
import { calculateSectionDates, getActiveSection } from '../utils/planning';
import {
    Activity, Printer, PackageCheck, Plus, Trash2, CalendarDays, Box, Target,
    AlertTriangle, ShieldAlert, Timer, CheckCircle2, Factory, Filter, Settings2,
    BarChart3, TrendingUp, ListChecks, Clock, ChevronDown, ChevronUp, Users,
    Wrench, AlertCircle, Save, X, Edit3, Eye, Layers, Zap, ArrowRight,
    RefreshCw, MessageSquare, ArrowUpDown, Hash, Scissors, Gauge
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// MINI CHART COMPONENTS (No Recharts dependency needed)
// ═══════════════════════════════════════════════════════════════

function MiniBarChart({ data, color = '#6366f1', height = 60 }: { data: number[]; color?: string; height?: number }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const barW = Math.max(4, Math.min(24, Math.floor(200 / data.length) - 2));
    return (
        <svg width={data.length * (barW + 2)} height={height} className="block">
            {data.map((v, i) => {
                const h = (v / max) * (height - 4);
                return (
                    <rect key={i} x={i * (barW + 2)} y={height - h - 2} width={barW}
                        height={h} rx={2} fill={color} opacity={0.85} />
                );
            })}
        </svg>
    );
}

function MiniLineChart({ data, color = '#10b981', height = 50, width = 180 }: { data: number[]; color?: string; height?: number; width?: number }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const points = data.map((v, i) => `${i * step},${height - 4 - ((v - min) / range) * (height - 8)}`).join(' ');
    return (
        <svg width={width} height={height} className="block">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((v, i) => {
                const y = height - 4 - ((v - min) / range) * (height - 8);
                return <circle key={i} cx={i * step} cy={y} r={2.5} fill={color} />;
            })}
        </svg>
    );
}

// ═══════════════════════════════════════════════════════════════
// SUIVI MODEL HEADER (model identity + live time)
// ═══════════════════════════════════════════════════════════════

const HALA_LABEL: Record<string, { label: string; cls: string }> = {
    EN_COURS:   { label: 'En cours',    cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    TERMINE:    { label: 'Terminé',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    EN_ATTENTE: { label: 'En attente',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    BLOQUE:     { label: 'Bloqué',      cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const KISBA_LABEL: Record<string, string> = {
    COUPE:      'Coupé',
    EN_COURS:   'En cours',
    NON_LANCE:  'Non lancé',
    AUTRE:      'Autre',
};

function SuiviModelHeader({
    model,
    planning,
    currentHourLabel,
    baseTime,
    onUpdateMeta,
}: {
    model: ModelData | null;
    planning: PlanningEvent | null;
    currentHourLabel: string;
    baseTime: number;
    onUpdateMeta?: (modelId: string, patch: Partial<ModelData['meta_data']>) => void;
}) {
    if (!model) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 flex items-center gap-3 text-slate-500">
                <Box className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Aucun modèle actif</p>
                    <p className="text-[11px] text-slate-400">Sélectionnez un modèle dans le filtre, ou démarrez un planning pour qu'il apparaisse automatiquement.</p>
                </div>
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-bold shadow-sm">
                    <Clock className="w-3.5 h-3.5" /> {currentHourLabel}
                </span>
            </div>
        );
    }

    const meta = model.meta_data;
    const front = model.images?.front || model.image || null;
    const back = model.images?.back || null;
    const hala = meta.hala ? HALA_LABEL[meta.hala] : null;
    const kisba = meta.kisba ? KISBA_LABEL[meta.kisba] : null;
    const qty = planning?.qteTotal ?? meta.quantity ?? 0;
    const produced = planning?.qteProduite ?? 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-indigo-50/40 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-3 p-3">
                {/* Left: images */}
                <div className="flex gap-2 shrink-0">
                    <div className="w-20 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                        {front
                            ? <img src={front} alt={meta.nom_modele} className="w-full h-full object-cover" />
                            : <Box className="w-7 h-7 text-slate-300" />
                        }
                    </div>
                    {back && (
                        <div className="w-14 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hidden sm:block">
                            <img src={back} alt={`${meta.nom_modele} (back)`} className="w-full h-full object-cover opacity-90" />
                        </div>
                    )}
                </div>

                {/* Right: info grid */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-black text-slate-800 truncate flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                                {meta.nom_modele}
                                {meta.reference && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Réf. {meta.reference}
                                    </span>
                                )}
                            </h2>
                            {meta.category && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{meta.category}</p>
                            )}
                        </div>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 text-[11px] font-black shadow-sm">
                            <Clock className="w-3.5 h-3.5" /> Maintenant&nbsp;{currentHourLabel}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <HeaderStat icon={<Hash className="w-3.5 h-3.5" />} label="Qté"
                            value={`${produced}/${qty}`} />
                        <HeaderStat icon={<Timer className="w-3.5 h-3.5" />} label="Temps SAM"
                            value={`${baseTime.toFixed(2)} min`} />
                        <HeaderEditable
                            icon={<Gauge className="w-3.5 h-3.5" />}
                            label="Avancement (todm)"
                            value={meta.todm || ''}
                            placeholder="ex: 60%"
                            editable={!!onUpdateMeta}
                            onChange={v => onUpdateMeta?.(model.id, { todm: v })}
                        />
                        <HeaderSelect
                            icon={<Scissors className="w-3.5 h-3.5" />}
                            label="Coupe (kisba)"
                            value={meta.kisba || ''}
                            options={[
                                { v: '', label: '—' },
                                { v: 'COUPE', label: 'Coupé' },
                                { v: 'EN_COURS', label: 'En cours' },
                                { v: 'NON_LANCE', label: 'Non lancé' },
                                { v: 'AUTRE', label: 'Autre' },
                            ]}
                            editable={!!onUpdateMeta}
                            onChange={v => onUpdateMeta?.(model.id, { kisba: (v || undefined) as ModelData['meta_data']['kisba'] })}
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">État (hala) :</span>
                        {onUpdateMeta ? (
                            <select
                                value={meta.hala || ''}
                                onChange={e => onUpdateMeta(model.id, { hala: (e.target.value || undefined) as ModelData['meta_data']['hala'] })}
                                className={`px-2 py-0.5 rounded-md border text-[11px] font-bold cursor-pointer outline-none ${hala ? hala.cls : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                <option value="">—</option>
                                <option value="EN_COURS">En cours</option>
                                <option value="TERMINE">Terminé</option>
                                <option value="EN_ATTENTE">En attente</option>
                                <option value="BLOQUE">Bloqué</option>
                            </select>
                        ) : hala ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${hala.cls}`}>
                                <CheckCircle2 className="w-3 h-3" /> {hala.label}
                            </span>
                        ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                        )}
                        {planning?.chaineId && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                                <Factory className="w-3 h-3" /> {planning.chaineId}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function HeaderStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {icon}{label}
            </div>
            <div className="text-xs font-black text-slate-800 mt-0.5 truncate" title={value}>{value}</div>
        </div>
    );
}

function HeaderEditable({ icon, label, value, placeholder, editable, onChange }: {
    icon: React.ReactNode; label: string; value: string; placeholder?: string;
    editable: boolean; onChange: (v: string) => void;
}) {
    return (
        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {icon}{label}
            </div>
            {editable ? (
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder || '—'}
                    onChange={e => onChange(e.target.value)}
                    className="w-full text-xs font-black text-slate-800 bg-transparent outline-none mt-0.5 focus:bg-slate-50 rounded"
                />
            ) : (
                <div className="text-xs font-black text-slate-800 mt-0.5 truncate" title={value}>{value || '—'}</div>
            )}
        </div>
    );
}

function HeaderSelect({ icon, label, value, options, editable, onChange }: {
    icon: React.ReactNode; label: string; value: string;
    options: { v: string; label: string }[];
    editable: boolean; onChange: (v: string) => void;
}) {
    const display = options.find(o => o.v === value)?.label || '—';
    return (
        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {icon}{label}
            </div>
            {editable ? (
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full text-xs font-black text-slate-800 bg-transparent outline-none mt-0.5 cursor-pointer focus:bg-slate-50 rounded"
                >
                    {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
            ) : (
                <div className="text-xs font-black text-slate-800 mt-0.5 truncate">{display}</div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

type SuiviTab = 'modele' | 'postes' | 'charts' | 'history';

interface SuiviProductionProps {
    models: ModelData[];
    setModels?: React.Dispatch<React.SetStateAction<ModelData[]>>;
    suivis: SuiviData[];
    setSuivis: React.Dispatch<React.SetStateAction<SuiviData[]>>;
    planningEvents?: PlanningEvent[];
    settings: AppSettings;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SuiviProduction({ models, setModels, suivis = [], setSuivis, planningEvents = [], settings }: SuiviProductionProps) {

    // ─── Update model meta_data fields (todm/kisba/hala) inline from header ───
    const updateModelMeta = useCallback((modelId: string, patch: Partial<ModelData['meta_data']>) => {
        if (!setModels) return;
        setModels(prev => prev.map(m => m.id === modelId
            ? { ...m, meta_data: { ...m.meta_data, ...patch } }
            : m));
    }, [setModels]);

    // ─── Active Tab ───
    const [activeTab, setActiveTab] = useState<SuiviTab>('modele');

    // ─── Filter States ───
    const [filterChaine, setFilterChaine] = useState<string>('ALL');
    const [filterModele, setFilterModele] = useState<string>('ALL');
    const [filterDate, setFilterDate] = useState<string>('ALL');

    // ─── Postes Suivi State ───
    const [posteSuivis, setPosteSuivis] = useState<PosteSuiviData[]>([]);
    const [loadingPostes, setLoadingPostes] = useState(false);
    const [savingPostes, setSavingPostes] = useState(false);
    const [expandedPosteModel, setExpandedPosteModel] = useState<string | null>(null);

    // ─── History State ───
    const [historyDateRange, setHistoryDateRange] = useState<'7d' | '30d' | 'all'>('7d');

    // ─── Current Hour (live, refreshed every minute) ───
    const computeHourKey = () => {
        const d = new Date();
        const hh = d.getHours().toString().padStart(2, '0');
        return { key: `h${hh}00`, label: `${hh}:00` };
    };
    const [currentHour, setCurrentHour] = useState(computeHourKey);
    useEffect(() => {
        const id = setInterval(() => setCurrentHour(computeHourKey()), 60_000);
        return () => clearInterval(id);
    }, []);

    // ─── Dynamic HOURS from Settings ───
    const { HOURS, HOUR_KEYS } = useMemo(() => {
        const startStr = settings.workingHoursStart || "08:00";
        const endStr = settings.workingHoursEnd || "18:00";
        const pauses = settings.pauses || [];

        let startMin = parseInt(startStr.split(':')[0]) * 60 + parseInt(startStr.split(':')[1]);
        if (isNaN(startMin)) startMin = 480;

        let endMin = parseInt(endStr.split(':')[0]) * 60 + parseInt(endStr.split(':')[1]);
        if (isNaN(endMin)) endMin = 1080;

        const hoursArr: string[] = [];
        const keysArr: string[] = [];

        for (let m = startMin; m < endMin; m += 60) {
            const blockEnd = m + 60;
            let overlap = 0;
            pauses.forEach(p => {
                const pStart = parseInt(p.start.split(':')[0]) * 60 + parseInt(p.start.split(':')[1]);
                const pEnd = parseInt(p.end.split(':')[0]) * 60 + parseInt(p.end.split(':')[1]);
                const overlapStart = Math.max(m, pStart);
                const overlapEnd = Math.min(blockEnd, pEnd);
                if (overlapEnd > overlapStart) overlap += (overlapEnd - overlapStart);
            });

            if (overlap < 30) {
                const hStart = Math.floor(m / 60).toString().padStart(2, '0');
                const mStart = (m % 60).toString().padStart(2, '0');
                hoursArr.push(`${hStart}:${mStart}`);
                keysArr.push(`h${hStart}${mStart}`);
            }
        }

        if (hoursArr.length === 0) {
            return {
                HOURS: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
                HOUR_KEYS: ['h0800', 'h0900', 'h1000', 'h1100', 'h1400', 'h1500', 'h1600', 'h1700']
            };
        }

        return { HOURS: hoursArr, HOUR_KEYS: keysArr };
    }, [settings.workingHoursStart, settings.workingHoursEnd, settings.pauses]);

    // ─── Load Postes Suivi from API ───
    const loadPosteSuivis = useCallback(async () => {
        setLoadingPostes(true);
        try {
            const res = await fetch('/api/poste-suivi', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setPosteSuivis(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to load poste suivis:', e);
        } finally {
            setLoadingPostes(false);
        }
    }, []);

    useEffect(() => {
        loadPosteSuivis();
    }, [loadPosteSuivis]);

    // ─── Save Postes Suivi to API ───
    const savePosteSuivis = useCallback(async (data: PosteSuiviData[]) => {
        setSavingPostes(true);
        try {
            await fetch('/api/poste-suivi', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suivis: data })
            });
        } catch (e) {
            console.error('Failed to save poste suivis:', e);
        } finally {
            setSavingPostes(false);
        }
    }, []);

    // ─── Filter Options ───
    const allChains = useMemo(() => {
        const chains = new Set<string>();
        planningEvents.forEach(p => chains.add(p.chaineId));
        return Array.from(chains).sort();
    }, [planningEvents]);

    const allModels = useMemo(() => {
        const mods = new Set<{ id: string; name: string }>();
        planningEvents.forEach(p => {
            if (filterChaine !== 'ALL' && p.chaineId !== filterChaine) return;
            const m = models.find(mod => mod.id === p.modelId);
            if (m) mods.add({ id: m.id, name: m.meta_data.nom_modele });
        });
        return Array.from(mods)
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [planningEvents, models, filterChaine]);

    const allDates = useMemo(() => {
        const dts = new Set<string>();
        suivis.forEach(s => {
            const plan = planningEvents.find(p => p.id === s.planningId);
            if (plan && (filterChaine === 'ALL' || plan.chaineId === filterChaine) && (filterModele === 'ALL' || plan.modelId === filterModele)) {
                dts.add(s.date);
            }
        });
        return Array.from(dts).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [suivis, planningEvents, filterChaine, filterModele]);

    // ─── Grouped Data ───
    const groupedData = useMemo(() => {
        const chains: Record<string, {
            chaineId: string; superviseur: string;
            productionFiles: Record<string, { planningId: string; model: ModelData; events: SuiviData[] }>;
        }> = {};

        // 1. Initialize chains and productionFiles from active planningEvents
        planningEvents.forEach(plan => {
            if (filterChaine !== 'ALL' && plan.chaineId !== filterChaine) return;
            if (filterModele !== 'ALL' && plan.modelId !== filterModele) return;
            const model = models.find(m => m.id === plan.modelId);
            if (!model || model.workflowStatus === 'EXPORT') return;

            if (!chains[plan.chaineId]) {
                chains[plan.chaineId] = {
                    chaineId: plan.chaineId,
                    superviseur: plan.superviseur || 'Superviseur',
                    productionFiles: {}
                };
            }
            chains[plan.chaineId].productionFiles[plan.id] = {
                planningId: plan.id,
                model: model,
                events: []
            };
        });

        // 2. Map existing suivis into the appropriate productionFiles
        suivis.forEach(s => {
            if (filterDate !== 'ALL' && s.date !== filterDate) return;
            const plan = planningEvents.find(p => p.id === s.planningId);
            if (!plan) return;
            // The chain and file should exist from step 1, unless filtered out
            if (chains[plan.chaineId] && chains[plan.chaineId].productionFiles[plan.id]) {
                chains[plan.chaineId].productionFiles[plan.id].events.push(s);
            }
        });

        const sortedChains = Object.values(chains).sort((a, b) => a.chaineId.localeCompare(b.chaineId));
        sortedChains.forEach(chain => {
            Object.values(chain.productionFiles).forEach(pf => {
                pf.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            });
        });
        return sortedChains;
    }, [suivis, planningEvents, models, filterChaine, filterModele, filterDate]);

    // ─── Active Model + Planning for the Header (live) ───
    // Logic: if a model filter is set, show that one; otherwise use the most recent IN_PROGRESS planning event.
    const headerContext = useMemo(() => {
        let planning: PlanningEvent | null = null;
        let model: ModelData | null = null;

        if (filterModele !== 'ALL') {
            model = models.find(m => m.id === filterModele) || null;
            const matches = planningEvents.filter(p => p.modelId === filterModele);
            // Prefer IN_PROGRESS, then latest dateLancement
            planning = matches.find(p => p.status === 'IN_PROGRESS')
                || matches.sort((a, b) => (b.dateLancement || '').localeCompare(a.dateLancement || ''))[0]
                || null;
        } else {
            const inProgress = planningEvents
                .filter(p => p.status === 'IN_PROGRESS')
                .sort((a, b) => (b.dateLancement || '').localeCompare(a.dateLancement || ''));
            planning = inProgress[0] || null;
            if (planning) model = models.find(m => m.id === planning!.modelId) || null;
        }

        return { model, planning };
    }, [filterModele, models, planningEvents]);

    // ─── Active Planning Events (for postes tab) ───
    const activePlanningModels = useMemo(() => {
        return planningEvents
            .filter(p => {
                if (filterChaine !== 'ALL' && p.chaineId !== filterChaine) return false;
                if (filterModele !== 'ALL' && p.modelId !== filterModele) return false;
                const model = models.find(m => m.id === p.modelId);
                return model && model.workflowStatus !== 'EXPORT';
            })
            .map(p => {
                const model = models.find(m => m.id === p.modelId)!;
                return { planning: p, model };
            });
    }, [planningEvents, models, filterChaine, filterModele]);


    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    const getBaseTime = (model: ModelData) => {
        return (model.gamme_operatoire || []).reduce((acc, op) => acc + (op.time || 0), 0);
    };

    const getDayName = (dateStr: string) => {
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return days[new Date(dateStr).getDay()] || '';
    };

    // R1% = (P_jour × SAM) / (ouvriers_modèle × heures × 60) × 100
    // R2% = same formula with totalWorkers as denominator
    const calcR = (suivi: SuiviData, baseTime: number, useTotal = false) => {
        if (!suivi.totalHeure || baseTime === 0) return 0;
        const activeHours = HOUR_KEYS.filter(k => (suivi.sorties[k] ?? -1) >= 0).length;
        if (activeHours === 0) return 0;
        const workers = useTotal ? suivi.totalWorkers : (suivi.ouvriers_modele || suivi.totalWorkers);
        if (!workers) return 0;
        const presenceMinutes = workers * activeHours * 60;
        if (presenceMinutes === 0) return 0;
        const production = Math.max(0, suivi.totalHeure - (suivi.defauts?.reduce((acc, d) => acc + d.quantity, 0) || 0));
        return Math.round((production * baseTime) / presenceMinutes * 100);
    };
    const calculateEfficiency = (suivi: SuiviData, baseTime: number) => calcR(suivi, baseTime, false);

    const calculateModelEfficiency = (events: SuiviData[], baseTime: number) => {
        if (baseTime === 0) return 0;
        let totalProduction = 0;
        let totalPresenceMinutes = 0;
        events.forEach(s => {
            const activeHours = HOUR_KEYS.filter(k => (s.sorties[k] ?? -1) >= 0).length;
            const workers = s.ouvriers_modele || s.totalWorkers;
            if (!workers || !activeHours) return;
            totalProduction += Math.max(0, s.totalHeure - (s.defauts?.reduce((a, d) => a + d.quantity, 0) || 0));
            totalPresenceMinutes += workers * activeHours * 60;
        });
        if (totalPresenceMinutes === 0) return 0;
        return Math.round((totalProduction * baseTime) / totalPresenceMinutes * 100);
    };

    // ═══════════════════════════════════════════════════════════
    // ACTIONS — Modèle Level
    // ═══════════════════════════════════════════════════════════

    const handleUpdateHourly = (id: string, hourKey: string, value: string) => {
        let val = parseInt(value);
        if (isNaN(val) || val < 0) val = -1;
        setSuivis(prev => prev.map(s => {
            if (s.id === id) {
                const newSorties = { ...s.sorties, [hourKey]: val === -1 ? undefined : val };
                const totalHeure = Object.values(newSorties).reduce((a, b) => (a || 0) + (b || 0), 0);
                return { ...s, sorties: newSorties, totalHeure };
            }
            return s;
        }));
    };

    const handleDowntimeChange = (id: string, hourKey: string, reason: string) => {
        setSuivis(prev => prev.map(s => s.id === id ? { ...s, downtimes: { ...(s.downtimes || {}), [hourKey]: reason } } : s));
    };

    const handleDefectChange = (id: string, value: string) => {
        const val = Math.max(0, parseInt(value) || 0);
        setSuivis(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, defauts: val > 0 ? [{ id: '1', hour: 'all', type: 'General', quantity: val, notes: '' }] : [] };
            }
            return s;
        }));
    };

    const handleUpdateWorker = (id: string, field: string, value: string) => {
        const val = Math.max(0, parseInt(value) || 0);
        setSuivis(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, [field]: val };
                updated.totalWorkers = (Number(updated.chaf) || 0) + (Number(updated.recta) || 0) + (Number(updated.sujet) || 0) + (Number(updated.transp) || 0) + (Number(updated.man) || 0) + (Number(updated.sp) || 0) + (Number(updated.stager) || 0);
                return updated;
            }
            return s;
        }));
    };

    const handleAddDay = (planningId: string) => {
        const existingSuivis = suivis.filter(s => s.planningId === planningId);
        let nextDateStr = new Date().toISOString().split('T')[0];
        if (existingSuivis.length > 0) {
            const sorted = [...existingSuivis].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastDate = new Date(sorted[0].date);
            lastDate.setDate(lastDate.getDate() + 1);
            nextDateStr = lastDate.toISOString().split('T')[0];
        }
        while (suivis.some(s => s.planningId === planningId && s.date === nextDateStr)) {
            const d = new Date(nextDateStr);
            d.setDate(d.getDate() + 1);
            nextDateStr = d.toISOString().split('T')[0];
        }
        const newSuivi: SuiviData = {
            id: `suivi_${Date.now()}`, planningId, date: nextDateStr,
            entrer: 0, sorties: {}, totalHeure: 0, pJournaliere: 400,
            enCour: 0, resteEntrer: 0, resteSortie: 0,
            chaf: 1, recta: 0, sujet: 0, transp: 1, man: 0, sp: 0, stager: 0,
            ouvriers_modele: 0, absent: 0, totalWorkers: 2
        };
        setSuivis(prev => [...prev, newSuivi]);
    };

    const handleDeleteSuivi = (id: string) => {
        if (confirm('Supprimer cette ligne ?')) {
            setSuivis(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleSectionToggle = (id: string) => {
        setSuivis(prev => prev.map(s => {
            if (s.id !== id) return s;
            const cycle: (typeof s.activeSection)[] = [undefined, 'PREPARATION', 'MONTAGE', 'BOTH'];
            const idx = cycle.indexOf(s.activeSection);
            return { ...s, activeSection: cycle[(idx + 1) % cycle.length] };
        }));
    };

    const handleExport = (model: ModelData) => {
        if (confirm(`Clôturer la production pour ${model.meta_data.nom_modele} ?`)) {
            const event = new CustomEvent('export-model', { detail: { modelId: model.id } });
            window.dispatchEvent(event);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // ACTIONS — Postes Level
    // ═══════════════════════════════════════════════════════════

    const handlePosteFieldChange = (posteId: string, planningId: string, date: string, field: keyof PosteSuiviData, value: any) => {
        setPosteSuivis(prev => {
            const existing = prev.find(ps => ps.posteId === posteId && ps.planningId === planningId && ps.date === date);
            if (existing) {
                return prev.map(ps => (ps.posteId === posteId && ps.planningId === planningId && ps.date === date)
                    ? { ...ps, [field]: value }
                    : ps
                );
            } else {
                const modelId = planningEvents.find(p => p.id === planningId)?.modelId || '';
                const newEntry: PosteSuiviData = {
                    id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    planningId, modelId, posteId, date,
                    pieces_entrees: 0, pieces_sorties: 0, pieces_defaut: 0, problemes: [],
                    [field]: value
                };
                return [...prev, newEntry];
            }
        });
    };

    const handleSavePostesSuivi = async () => {
        if (expandedPosteModel) {
            const toSave = posteSuivis.filter(ps => ps.planningId === expandedPosteModel);
            await savePosteSuivis(toSave);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // TAB BADGES
    // ═══════════════════════════════════════════════════════════

    const tabs: { id: SuiviTab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'modele', label: 'Modèle', icon: <Layers className="w-4 h-4" /> },
        { id: 'postes', label: 'Postes', icon: <ListChecks className="w-4 h-4" />, badge: posteSuivis.length },
        { id: 'charts', label: 'Graphiques', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'history', label: 'Historique', icon: <Clock className="w-4 h-4" /> },
    ];

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto pb-24">
            {/* ═══ HEADER + TABS ═══ */}
            <div className="bg-white px-4 sm:px-6 py-3 flex flex-col gap-3 shrink-0 shadow-sm z-20 print:hidden sticky top-0 border-b border-slate-200">
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <h1 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                        SUIVI DE PRODUCTION
                    </h1>
                    <div className="flex items-center gap-2">
                        {savingPostes && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 animate-pulse">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enregistrement...
                            </span>
                        )}
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 shadow-sm">
                            <Printer className="w-4 h-4" /> Imprimer
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap relative
                                ${activeTab === tab.id
                                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black leading-none">{tab.badge}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Filtres :</span>
                    </div>
                    <select className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm cursor-pointer"
                        value={filterChaine} onChange={e => { setFilterChaine(e.target.value); setFilterModele('ALL'); setFilterDate('ALL'); }}>
                        <option value="ALL">Toutes les Chaînes</option>
                        {allChains.map(c => <option key={c} value={c}>{settings.chainNames?.[c] || c}</option>)}
                    </select>
                    <select className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm cursor-pointer"
                        value={filterModele} onChange={e => setFilterModele(e.target.value)}>
                        <option value="ALL">Tous les Modèles</option>
                        {allModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {activeTab !== 'postes' && (
                        <select className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm cursor-pointer"
                            value={filterDate} onChange={e => setFilterDate(e.target.value)}>
                            <option value="ALL">Tous les Jours</option>
                            {allDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString('fr-FR')}</option>)}
                        </select>
                    )}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-[10px] font-bold shadow-sm" title="Géré depuis la page Paramètres">
                        <Settings2 className="w-3 h-3" /> Horaires sync.
                    </div>
                </div>

                {/* Model Header (visible across all tabs) */}
                <SuiviModelHeader
                    model={headerContext.model}
                    planning={headerContext.planning}
                    currentHourLabel={currentHour.label}
                    baseTime={headerContext.model ? getBaseTime(headerContext.model) : 0}
                    onUpdateMeta={updateModelMeta}
                />
            </div>

            {/* ═══ CONTENT AREA ═══ */}
            <div className="p-4 sm:p-6">
                {activeTab === 'modele' && <TabModele />}
                {activeTab === 'postes' && <TabPostes />}
                {activeTab === 'charts' && <TabCharts />}
                {activeTab === 'history' && <TabHistory />}
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════
    // TAB: MODÈLE (Enhanced existing view)
    // ═══════════════════════════════════════════════════════════════

    function TabModele() {
        if (groupedData.length === 0) {
            return (
                <div className="text-center py-20">
                    <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-400">Aucune production pour ce filtre</h2>
                    <p className="text-sm text-slate-400 mt-2">Ajoutez des données de suivi depuis le Planning</p>
                </div>
            );
        }

        return (
            <div className="space-y-12">
                {groupedData.map(chain => {
                    // Extract all models for this chain
                    const chainFiles = Object.values(chain.productionFiles).sort((a, b) => {
                        const evA = planningEvents.find(p => p.id === a.planningId);
                        const evB = planningEvents.find(p => p.id === b.planningId);
                        return ((evA?.startDate || evA?.dateLancement || '') < (evB?.startDate || evB?.dateLancement || '') ? -1 : 1);
                    });

                    // Flatten all events across all models in this chain
                    const allEvents: { modelFile: typeof chainFiles[0], event: SuiviData }[] = [];
                    chainFiles.forEach(file => {
                        file.events.forEach(ev => allEvents.push({ modelFile: file, event: ev }));
                    });
                    
                    // Sort events by date
                    allEvents.sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());

                    return (
                        <div key={chain.chaineId} className="bg-white border-2 border-slate-300 shadow-xl overflow-x-auto text-[11px] font-bold">
                            {/* EXCEL HEADER - Chain Name */}
                            <div className="py-2 px-4 border-b-2 border-slate-300 flex items-center bg-slate-50">
                                <div className="w-[120px] text-center font-black tracking-widest text-indigo-900 border-2 border-indigo-200 bg-white py-1 uppercase">
                                    {settings.chainNames?.[chain.chaineId] || chain.chaineId}
                                </div>
                                <div className="flex-1 text-center text-xl font-black text-rose-600 tracking-wider">
                                    {chain.superviseur.toUpperCase()}
                                </div>
                            </div>

                            {/* TOP TABLE - MODELS SUMMARY */}
                            <table className="w-full border-collapse whitespace-nowrap text-center text-slate-800">
                                <thead>
                                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-[9px] tracking-widest uppercase">
                                        <th className="border-r border-slate-300 p-2 text-left w-[180px]">Designation / Model</th>
                                        <th className="border-r border-slate-300 p-2 w-[80px]">Couleur</th>
                                        <th className="border-r border-slate-300 p-2">Tem Article Pour Chin(min)</th>
                                        <th className="border-r border-slate-300 p-2">Total Piece</th>
                                        <th className="border-r border-slate-300 p-2">Total de commande</th>
                                        <th className="border-r border-slate-300 p-2">Le reste de piece</th>
                                        <th className="border-r border-slate-300 p-2">Le reste par (J)</th>
                                        <th className="border-r border-slate-300 p-2">M.R</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chainFiles.map(file => {
                                        const planEv = planningEvents.find(p => p.id === file.planningId);
                                        const modelColor = planEv?.color || '#3b82f6';
                                        
                                        const baseTime = getBaseTime(file.model);
                                        const totalProduced = file.events.reduce((acc, s) => acc + s.totalHeure, 0);
                                        const targetQuantity = file.model.meta_data.quantity || 1;
                                        const resteProduire = targetQuantity - totalProduced;
                                        
                                        const avgPerHour = totalProduced / (file.events.reduce((acc, s) => acc + HOUR_KEYS.filter(k => (s.sorties[k] ?? -1) >= 0).length, 0) || 1);
                                        const dailyTarget = file.events.length > 0 ? Math.round(targetQuantity / file.events.length) : targetQuantity;
                                        const hourlyTarget = Math.round(dailyTarget / HOURS.length) || 1;
                                        const resteParJ = hourlyTarget > 0 ? (resteProduire / (hourlyTarget * HOURS.length)).toFixed(2) : '0';
                                        
                                        const overallEff = calculateModelEfficiency(file.events, baseTime);

                                        return (
                                            <tr key={file.planningId} className="border-b border-slate-200">
                                                <td className="border-r border-slate-300 p-1.5 text-left font-black">{file.model.meta_data.nom_modele}</td>
                                                <td className="border-r border-slate-300 p-1.5">
                                                    <div className="w-full h-4 rounded-sm border border-slate-300" style={{ backgroundColor: modelColor }}></div>
                                                </td>
                                                <td className="border-r border-slate-300 p-1.5 font-bold">{baseTime.toFixed(2)}</td>
                                                <td className="border-r border-slate-300 p-1.5 font-black">{totalProduced}</td>
                                                <td className="border-r border-slate-300 p-1.5 font-bold text-rose-600">{-targetQuantity}</td>
                                                <td className="border-r border-slate-300 p-1.5 font-bold">{resteProduire}</td>
                                                <td className="border-r border-slate-300 p-1.5 font-bold">{resteParJ}</td>
                                                <td className={`border-r border-slate-300 p-1.5 font-black ${overallEff >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>{overallEff}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* SPACER */}
                            <div className="h-6 bg-slate-50 border-b-2 border-slate-300" />

                            {/* BOTTOM TABLE - DAILY TRACKING MATRIX */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse whitespace-nowrap text-center text-slate-800">
                                    <thead>
                                        <tr className="bg-slate-200 border-b border-slate-300 text-[8px] uppercase tracking-wider">
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[70px]">Date</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[70px]">Day</th>
                                            <th colSpan={HOURS.length} className="border-r border-slate-300 p-1">Sortie Par Heure</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 bg-yellow-100 min-w-[60px]">P. Journalier</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 bg-yellow-100 min-w-[50px]">Total Heures</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Chaf</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Recta</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Sujet</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Transp</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Man</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Sp</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[30px]">Stager</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 bg-amber-100 min-w-[50px]">Total M</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 bg-amber-100 min-w-[50px]">Total R</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[40px]">M.R</th>
                                            <th rowSpan={2} className="border-r border-slate-300 p-1 min-w-[50px] bg-emerald-50">R. Tolat Day%</th>
                                            <th rowSpan={2} className="p-1 w-8"></th>
                                        </tr>
                                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px]">
                                            {HOURS.map((h, i) => {
                                                const k = HOUR_KEYS[i];
                                                const isNow = k === currentHour.key;
                                                return (
                                                    <th key={h}
                                                        className={`border-r border-slate-300 p-1.5 font-bold ${isNow ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400 ring-inset' : ''}`}
                                                        title={isNow ? "Heure en cours" : undefined}
                                                    >
                                                        {h}{isNow && <span className="ml-1 text-[8px] font-black uppercase">·now</span>}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allEvents.map(({ modelFile, event: s }) => {
                                            const planEv = planningEvents.find(p => p.id === s.planningId);
                                            const color = planEv?.color || '#3b82f6';
                                            const hexToRgbA = (hex: string, alpha: number) => {
                                                const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
                                                return `rgba(${r},${g},${b},${alpha})`;
                                            };
                                            const lightColor = hexToRgbA(color, 0.4);
                                            const strongColor = hexToRgbA(color, 0.9);
                                            
                                            const baseTime = getBaseTime(modelFile.model);
                                            const eff = calcR(s, baseTime, false);
                                            const effColorBg = eff >= 80 ? 'bg-emerald-500' : eff >= 60 ? 'bg-amber-400' : eff > 0 ? 'bg-rose-400' : 'bg-slate-200';
                                            
                                            const activeHoursCount = HOUR_KEYS.filter(k => (s.sorties[k] ?? -1) >= 0).length;

                                            return (
                                                <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                                    <td className="border-r border-slate-300 max-w-[80px]">
                                                        <input type="date" className="w-full text-center bg-transparent p-1.5 outline-none font-bold" value={s.date}
                                                            onChange={e => setSuivis(prev => prev.map(x => x.id === s.id ? { ...x, date: e.target.value } : x))} />
                                                    </td>
                                                    <td className="border-r border-slate-300 font-black text-white px-2" style={{ backgroundColor: strongColor }}>
                                                        {getDayName(s.date)}
                                                    </td>
                                                    {HOURS.map((h, i) => {
                                                        const k = HOUR_KEYS[i];
                                                        const val = s.sorties[k];
                                                        const isFilled = val !== undefined && val >= 0;
                                                        const isNow = k === currentHour.key;
                                                        return (
                                                            <td key={h}
                                                                className={`border-r border-slate-300 h-full p-0 relative ${isNow ? 'ring-2 ring-amber-400 ring-inset' : ''}`}
                                                                style={{ backgroundColor: isFilled ? lightColor : (isNow ? 'rgba(252, 211, 77, 0.15)' : 'transparent') }}
                                                            >
                                                                <input type="number" min="0" className="w-full h-full p-1.5 text-center bg-transparent outline-none border border-transparent focus:bg-white placeholder:text-transparent"
                                                                    value={val === undefined ? '' : val} onChange={e => handleUpdateHourly(s.id, k, e.target.value)} placeholder="-" />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-r border-slate-300 p-1.5 bg-yellow-100 font-black">{s.totalHeure || ''}</td>
                                                    <td className="border-r border-slate-300 p-1.5 bg-yellow-50 font-bold">{activeHoursCount > 0 ? activeHoursCount * (s.totalWorkers || 1) : ''}</td>
                                                    
                                                    {/* Work Staff */}
                                                    {(['chaf', 'recta', 'sujet', 'transp', 'man', 'sp', 'stager'] as const).map(role => (
                                                        <td key={role} className="border-r border-slate-300 p-0">
                                                            <input type="number" min="0" className="w-full h-full p-1 text-center bg-transparent outline-none focus:bg-white"
                                                                value={String(s[role] ?? '')} onChange={e => handleUpdateWorker(s.id, role, e.target.value)} />
                                                        </td>
                                                    ))}
                                                    
                                                    <td className="border-r border-slate-300 p-1.5 font-black bg-amber-100">{s.totalWorkers}</td>
                                                    <td className="border-r border-slate-300 p-0">
                                                        <input type="number" min="0" className="w-full h-full p-1 text-center bg-amber-50 outline-none focus:bg-white font-bold"
                                                                value={String(s.ouvriers_modele ?? '')} onChange={e => handleUpdateWorker(s.id, 'ouvriers_modele', e.target.value)} />
                                                    </td>
                                                    
                                                    <td className="border-r border-slate-300 p-1.5 font-black">
                                                        {s.totalHeure > 0 ? `${eff}%` : ''}
                                                    </td>
                                                    <td className="border-r border-slate-300 p-1.5 font-black text-emerald-900 bg-emerald-100">
                                                        {s.totalHeure > 0 ? `${eff}%` : ''}
                                                    </td>
                                                    <td className="p-1">
                                                        <button onClick={() => handleDeleteSuivi(s.id)} className="p-1 text-slate-300 hover:text-rose-600 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Actions per Chain */}
                            <div className="p-3 bg-slate-100 border-t-2 border-slate-300 flex justify-end gap-2">
                                {chainFiles.map(file => {
                                    const c = planningEvents.find(p => p.id === file.planningId)?.color || '#3b82f6';
                                    return (
                                        <button key={file.planningId} onClick={() => handleAddDay(file.planningId)} 
                                                className="px-3 py-1.5 text-white font-bold rounded shadow-sm text-xs flex items-center gap-1 hover:opacity-90 transition-opacity"
                                                style={{ backgroundColor: c }}>
                                            <Plus className="w-3.5 h-3.5" /> Ajouter shift ({file.model.meta_data.nom_modele.slice(0, 8)})
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                    );
                })}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // TAB: POSTES (New — Phase 4)
    // ═══════════════════════════════════════════════════════════════

    function TabPostes() {
        const today = new Date().toISOString().split('T')[0];

        if (activePlanningModels.length === 0) {
            return (
                <div className="text-center py-20">
                    <ListChecks className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-400">Aucun modèle actif trouvé</h2>
                    <p className="text-sm text-slate-400 mt-2">Les modèles du Planning ayant des opérations apparaîtront ici</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {activePlanningModels.map(({ planning, model }) => {
                    const operations = model.gamme_operatoire || [];
                    if (operations.length === 0) return null;
                    const isExpanded = expandedPosteModel === planning.id;

                    // Get postes suivi for this model
                    const modelPosteSuivis = posteSuivis.filter(ps => ps.planningId === planning.id && ps.date === today);

                    // Stats
                    const totalEntrees = modelPosteSuivis.reduce((a, ps) => a + ps.pieces_entrees, 0);
                    const totalSorties = modelPosteSuivis.reduce((a, ps) => a + ps.pieces_sorties, 0);
                    const totalDefauts = modelPosteSuivis.reduce((a, ps) => a + ps.pieces_defaut, 0);

                    return (
                        <div key={planning.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Collapsible Header */}
                            <button
                                onClick={() => setExpandedPosteModel(isExpanded ? null : planning.id)}
                                className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50/50 hover:to-white transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <Layers className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-black text-slate-800">{model.meta_data.nom_modele}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {settings.chainNames?.[planning.chaineId] || planning.chaineId} • {operations.length} opérations • {today}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:flex items-center gap-4 text-xs font-bold">
                                        <span className="text-emerald-600"><ArrowRight className="w-3 h-3 inline mr-1" />{totalEntrees} ent.</span>
                                        <span className="text-indigo-600"><ArrowRight className="w-3 h-3 inline mr-1" />{totalSorties} sort.</span>
                                        {totalDefauts > 0 && <span className="text-rose-600"><ShieldAlert className="w-3 h-3 inline mr-1" />{totalDefauts} déf.</span>}
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-slate-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border-collapse min-w-[700px]">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="py-2 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                                                    <th className="py-2 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opération</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20">Machine</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20">Tps Prévu</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider w-20">Entrées</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-indigo-600 uppercase tracking-wider w-20">Sorties</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-rose-600 uppercase tracking-wider w-20">Défauts</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wider w-24">Tps Réel</th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20">Écart</th>
                                                    <th className="py-2 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {operations.map((op, idx) => {
                                                    const ps = modelPosteSuivis.find(p => p.posteId === op.id);
                                                    const tempsPrevu = op.time || 0;
                                                    const tempsReel = ps?.temps_reel_par_piece || 0;
                                                    const ecart = tempsReel > 0 && tempsPrevu > 0 ? Math.round(((tempsReel - tempsPrevu) / tempsPrevu) * 100) : 0;
                                                    const ecartClass = ecart > 15 ? 'text-rose-600 bg-rose-50' : ecart > 0 ? 'text-amber-600 bg-amber-50' : ecart < -5 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500';

                                                    return (
                                                        <tr key={op.id} className="hover:bg-indigo-50/20 transition-colors">
                                                            <td className="py-2 px-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                            <td className="py-2 px-3">
                                                                <div className="flex items-center gap-2">
                                                                    {op.section === 'PREPARATION' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                                                    {op.section === 'MONTAGE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                                    {(!op.section || op.section === 'GLOBAL') && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                                                                    <span className="text-sm font-bold text-slate-800">{op.description || `Opération ${idx + 1}`}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-3 text-center">
                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{op.machineName || '-'}</span>
                                                            </td>
                                                            <td className="py-2 px-3 text-center text-xs font-bold text-slate-600">{tempsPrevu.toFixed(2)}m</td>
                                                            <td className="py-2 px-3">
                                                                <input type="number" min="0"
                                                                    className="w-full h-7 text-center text-sm font-bold bg-emerald-50/50 border border-transparent hover:border-emerald-300 focus:border-emerald-400 focus:bg-white rounded outline-none transition-all placeholder:text-slate-300"
                                                                    value={ps?.pieces_entrees || ''}
                                                                    onChange={e => handlePosteFieldChange(op.id, planning.id, today, 'pieces_entrees', parseInt(e.target.value) || 0)}
                                                                    placeholder="0" />
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <input type="number" min="0"
                                                                    className="w-full h-7 text-center text-sm font-bold bg-indigo-50/50 border border-transparent hover:border-indigo-300 focus:border-indigo-400 focus:bg-white rounded outline-none transition-all placeholder:text-slate-300"
                                                                    value={ps?.pieces_sorties || ''}
                                                                    onChange={e => handlePosteFieldChange(op.id, planning.id, today, 'pieces_sorties', parseInt(e.target.value) || 0)}
                                                                    placeholder="0" />
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <input type="number" min="0"
                                                                    className="w-full h-7 text-center text-sm font-bold bg-rose-50/50 border border-transparent hover:border-rose-300 focus:border-rose-400 focus:bg-white rounded outline-none transition-all text-rose-600 placeholder:text-slate-300"
                                                                    value={ps?.pieces_defaut || ''}
                                                                    onChange={e => handlePosteFieldChange(op.id, planning.id, today, 'pieces_defaut', parseInt(e.target.value) || 0)}
                                                                    placeholder="0" />
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <input type="number" min="0" step="0.01"
                                                                    className="w-full h-7 text-center text-sm font-bold bg-white border border-slate-200 hover:border-amber-300 focus:border-amber-400 rounded outline-none transition-all placeholder:text-slate-300"
                                                                    value={ps?.temps_reel_par_piece || ''}
                                                                    onChange={e => handlePosteFieldChange(op.id, planning.id, today, 'temps_reel_par_piece', parseFloat(e.target.value) || 0)}
                                                                    placeholder="min" />
                                                            </td>
                                                            <td className="py-2 px-3 text-center">
                                                                {tempsReel > 0 && (
                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${ecartClass}`}>
                                                                        {ecart > 0 ? '+' : ''}{ecart}%
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <input type="text"
                                                                    className="w-full h-7 text-xs font-medium bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white rounded outline-none transition-all placeholder:text-slate-300 px-2"
                                                                    value={ps?.notes || ''}
                                                                    onChange={e => handlePosteFieldChange(op.id, planning.id, today, 'notes', e.target.value)}
                                                                    placeholder="Notes..." />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Save Button */}
                                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400">{modelPosteSuivis.length} entrées pour aujourd'hui</span>
                                        <button
                                            onClick={handleSavePostesSuivi}
                                            disabled={savingPostes}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                                        >
                                            <Save className="w-4 h-4" />
                                            {savingPostes ? 'Enregistrement...' : 'Sauvegarder Postes'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // TAB: CHARTS (Phase 4 — Production Charts)
    // ═══════════════════════════════════════════════════════════════

    function TabCharts() {
        if (groupedData.length === 0) {
            return (
                <div className="text-center py-20">
                    <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-400">Aucune donnée à afficher</h2>
                </div>
            );
        }

        // Prepare chart data per model
        const chartModels = groupedData.flatMap(chain =>
            Object.values(chain.productionFiles).map(file => {
                const baseTime = getBaseTime(file.model);
                const dailyProduced = file.events.map(s => s.totalHeure);
                const dailyEfficiency = file.events.map(s => calculateEfficiency(s, baseTime));
                const dailyDefects = file.events.map(s => s.defauts?.reduce((a, d) => a + d.quantity, 0) || 0);
                const dailyWorkers = file.events.map(s => s.totalWorkers);
                const cumulativeProduced = dailyProduced.reduce<number[]>((acc, v) => {
                    acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v);
                    return acc;
                }, []);

                return {
                    ...file,
                    baseTime,
                    dailyProduced,
                    dailyEfficiency,
                    dailyDefects,
                    dailyWorkers,
                    cumulativeProduced,
                    chaineName: settings.chainNames?.[groupedData.find(c => Object.values(c.productionFiles).some(pf => pf.planningId === file.planningId))?.chaineId || ''] || ''
                };
            })
        );

        return (
            <div className="space-y-6">
                {chartModels.map(cm => (
                    <div key={cm.planningId} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                        <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            {cm.model.meta_data.nom_modele}
                            {cm.chaineName && <span className="text-xs font-bold text-slate-400 ml-2">— {cm.chaineName}</span>}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Production Journalière */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Production / Jour</p>
                                <MiniBarChart data={cm.dailyProduced} color="#6366f1" height={60} />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 font-bold">Moy: {Math.round(cm.dailyProduced.reduce((a, b) => a + b, 0) / (cm.dailyProduced.length || 1))}</span>
                                    <span className="text-[10px] text-indigo-600 font-black">Max: {Math.max(...cm.dailyProduced, 0)}</span>
                                </div>
                            </div>

                            {/* Cumul de Production */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cumul Production</p>
                                <MiniLineChart data={cm.cumulativeProduced} color="#10b981" height={60} width={180} />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 font-bold">{cm.events.length} jours</span>
                                    <span className="text-[10px] text-emerald-600 font-black">Total: {cm.cumulativeProduced[cm.cumulativeProduced.length - 1] || 0}</span>
                                </div>
                            </div>

                            {/* Rendement */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Rendement %</p>
                                <MiniLineChart data={cm.dailyEfficiency} color="#f59e0b" height={60} width={180} />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 font-bold">Moy: {Math.round(cm.dailyEfficiency.reduce((a, b) => a + b, 0) / (cm.dailyEfficiency.length || 1))}%</span>
                                    <span className={`text-[10px] font-black ${cm.dailyEfficiency[cm.dailyEfficiency.length - 1] >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        Dernier: {cm.dailyEfficiency[cm.dailyEfficiency.length - 1] || 0}%
                                    </span>
                                </div>
                            </div>

                            {/* Défauts */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Défauts / Jour</p>
                                <MiniBarChart data={cm.dailyDefects} color="#ef4444" height={60} />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 font-bold">Total: {cm.dailyDefects.reduce((a, b) => a + b, 0)}</span>
                                    <span className="text-[10px] text-rose-600 font-black">
                                        Taux: {cm.cumulativeProduced[cm.cumulativeProduced.length - 1] > 0
                                            ? ((cm.dailyDefects.reduce((a, b) => a + b, 0) / cm.cumulativeProduced[cm.cumulativeProduced.length - 1]) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // TAB: HISTORY (Phase 4 — Timeline view)
    // ═══════════════════════════════════════════════════════════════

    function TabHistory() {
        const now = new Date();
        const dateLimit = historyDateRange === '7d' ? new Date(now.getTime() - 7 * 86400000)
            : historyDateRange === '30d' ? new Date(now.getTime() - 30 * 86400000)
                : null;

        const filteredHistory = suivis
            .filter(s => {
                if (dateLimit && new Date(s.date) < dateLimit) return false;
                const plan = planningEvents.find(p => p.id === s.planningId);
                if (!plan) return false;
                if (filterChaine !== 'ALL' && plan.chaineId !== filterChaine) return false;
                if (filterModele !== 'ALL' && plan.modelId !== filterModele) return false;
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Group by date
        const grouped = filteredHistory.reduce<Record<string, { date: string; entries: (SuiviData & { model?: ModelData; chaine?: string })[] }>>((acc, s) => {
            if (!acc[s.date]) acc[s.date] = { date: s.date, entries: [] };
            const plan = planningEvents.find(p => p.id === s.planningId);
            const model = plan ? models.find(m => m.id === plan.modelId) : undefined;
            acc[s.date].entries.push({ ...s, model, chaine: plan?.chaineId });
            return acc;
        }, {});

        const dateGroups = Object.values(grouped).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="space-y-4">
                {/* Date Range Selector */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                    <Clock className="w-4 h-4 text-slate-400 ml-2" />
                    <span className="text-xs font-bold text-slate-500 mr-2">Période :</span>
                    {(['7d', '30d', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setHistoryDateRange(range)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${historyDateRange === range
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : 'Tout'}
                        </button>
                    ))}
                    <div className="flex-1" />
                    <span className="text-xs font-bold text-slate-400">{filteredHistory.length} entrées</span>
                </div>

                {dateGroups.length === 0 ? (
                    <div className="text-center py-16">
                        <Clock className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-slate-400">Aucun historique trouvé</h2>
                    </div>
                ) : (
                    dateGroups.map(group => (
                        <div key={group.date} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Date Header */}
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700">
                                    {new Date(group.date).getDate()}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{getDayName(group.date)}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{new Date(group.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div className="flex-1" />
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="font-bold text-emerald-600">
                                        Σ {group.entries.reduce((a, e) => a + e.totalHeure, 0)} pcs
                                    </span>
                                    <span className="font-bold text-slate-400">
                                        {group.entries.length} ligne{group.entries.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Entries */}
                            <div className="divide-y divide-slate-100">
                                {group.entries.map(entry => {
                                    const baseTime = entry.model ? getBaseTime(entry.model) : 0;
                                    const eff = calculateEfficiency(entry, baseTime);
                                    return (
                                        <div key={entry.id} className="px-4 py-2 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                            <div className={`w-2 h-2 rounded-full ${eff >= 80 ? 'bg-emerald-500' : eff >= 60 ? 'bg-amber-500' : eff > 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">{entry.model?.meta_data.nom_modele || 'Modèle inconnu'}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{settings.chainNames?.[entry.chaine || ''] || entry.chaine}</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                                                <span className="text-slate-500"><Users className="w-3 h-3 inline mr-1" />{entry.totalWorkers}</span>
                                                <span className="text-emerald-600">{entry.totalHeure} pcs</span>
                                                <span className={`px-2 py-0.5 rounded text-white ${eff >= 80 ? 'bg-emerald-500' : eff >= 60 ? 'bg-amber-500' : eff > 0 ? 'bg-rose-500' : 'bg-slate-300'}`}>
                                                    {eff}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    }
}
