import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ModelData, PlanningEvent, SuiviData, AppSettings } from '../types';
import { createPortal } from 'react-dom';
import {
    Calendar as CalendarIcon, Filter, Plus, Play, Trash2,
    Factory, CalendarDays, Clock, MoreHorizontal,
    ChevronDown, ChevronRight as ChevronRightIcon,
    Download, Search, List, LayoutDashboard, AlignLeft,
    MinusSquare, ArrowDownUp, X, Target, TrendingUp, Users,
    Layers, AlertTriangle, CheckCircle2, Zap, BarChart3, Printer, KanbanSquare
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface PlanningProps {
    models: ModelData[];
    planningEvents: PlanningEvent[];
    setPlanningEvents: React.Dispatch<React.SetStateAction<PlanningEvent[]>>;
    setModels: React.Dispatch<React.SetStateAction<ModelData[]>>;
    setSuivis: React.Dispatch<React.SetStateAction<SuiviData[]>>;
    setCurrentView: (view: 'planning' | 'suivi' | 'dashboard' | 'atelier' | 'library' | 'coupe' | 'effectifs' | 'magasin' | 'config' | 'profil' | 'admin') => void;
    settings: AppSettings;
}

const STATUS_CONFIG = {
    ON_TRACK: { label: 'En cours', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-400 border-emerald-500 hover:bg-emerald-500', pieFill: '#10b981' },
    AT_RISK: { label: 'À risque', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400 border-amber-500 hover:bg-amber-500', pieFill: '#f59e0b' },
    OFF_TRACK: { label: 'En retard', dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-400 border-rose-500 hover:bg-rose-500', pieFill: '#f43f5e' },
    DONE: { label: 'Terminé', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-400 border-blue-500 hover:bg-blue-500', pieFill: '#3b82f6' },
};

export default function Planning({ models, planningEvents, setPlanningEvents, setModels, setSuivis, setCurrentView, settings }: PlanningProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWidgets, setShowWidgets] = useState(false);

    // View & Filter States
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'gantt'>('gantt');
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<'default' | 'date'>('default');

    // Derived Stats
    const statusCounts = useMemo(() => {
        const counts = { ON_TRACK: 0, AT_RISK: 0, OFF_TRACK: 0, DONE: 0 };
        planningEvents.forEach(e => { counts[e.status || 'ON_TRACK']++; });
        return (Object.entries(counts) as [keyof typeof STATUS_CONFIG, number][])
            .filter(([, v]) => v > 0)
            .map(([k, v]) => ({ name: STATUS_CONFIG[k].label, value: v, color: STATUS_CONFIG[k].pieFill }));
    }, [planningEvents]);

    const totalPieces = planningEvents.reduce((acc, curr) => acc + curr.qteTotal, 0);
    const piecesDone = planningEvents.filter(e => e.status === 'DONE').reduce((acc, curr) => acc + curr.qteTotal, 0);

    // Form State
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedChaine, setSelectedChaine] = useState('CHAINE 1');
    const [dateLancement, setDateLancement] = useState(new Date().toISOString().split('T')[0]);
    const [dateExport, setDateExport] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [qteTotal, setQteTotal] = useState(0);
    const [superviseur, setSuperviseur] = useState('');

    // Context Menu
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eventId: string } | null>(null);

    // Resizable Pane
    const [leftPaneWidth, setLeftPaneWidth] = useState(450);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Chain Expand/Collapse
    const CHAINES = useMemo(() => Array.from({ length: settings.chainsCount }, (_, i) => `CHAINE ${i + 1}`), [settings.chainsCount]);
    const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>(
        CHAINES.reduce((acc, chain) => ({ ...acc, [chain]: true }), {})
    );

    // Current Time
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Close context menu on click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    // Resize
    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = Math.max(300, Math.min(e.clientX - containerRect.left, containerRect.width - 400));
            setLeftPaneWidth(newWidth);
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Timeline helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

    const timelineDates = useMemo(() => {
        const dates: { date: Date; dayNumber: number; dayName: string; month: number; year: number; isWeekend: boolean }[] = [];
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push({
                date: new Date(d),
                dayNumber: d.getDate(),
                dayName: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                isWeekend: d.getDay() === 0 || d.getDay() === 6
            });
        }
        return dates;
    }, [currentDate]);

    const monthsInTimeline = useMemo(() => {
        const months: { name: string; year: number; colspan: number; startDate: Date }[] = [];
        if (timelineDates.length === 0) return months;
        let currentMonth = timelineDates[0].month;
        let currentYear = timelineDates[0].year;
        let count = 0;
        let startD = timelineDates[0].date;
        timelineDates.forEach(td => {
            if (td.month !== currentMonth) {
                months.push({ name: startD.toLocaleDateString('fr-FR', { month: 'long' }), year: currentYear, colspan: count, startDate: startD });
                currentMonth = td.month;
                currentYear = td.year;
                count = 1;
                startD = td.date;
            } else { count++; }
        });
        months.push({ name: startD.toLocaleDateString('fr-FR', { month: 'long' }), year: currentYear, colspan: count, startDate: startD });
        return months;
    }, [timelineDates]);

    const [zoomMode, setZoomMode] = useState<'day' | 'week' | 'month'>('day');
    const DAY_COLUMN_WIDTH = zoomMode === 'day' ? 40 : zoomMode === 'week' ? 12 : 3;

    // Scroll to today
    const timelineRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (timelineRef.current) {
            const todayIndex = timelineDates.findIndex(d => d.date.toDateString() === currentTime.toDateString());
            if (todayIndex !== -1) {
                timelineRef.current.scrollLeft = Math.max(0, (todayIndex * DAY_COLUMN_WIDTH) - 200);
            }
        }
    }, [timelineDates, currentTime]);

    const toggleChain = (chain: string) => setExpandedChains(prev => ({ ...prev, [chain]: !prev[chain] }));
    const expandAll = () => setExpandedChains(CHAINES.reduce((acc, c) => ({ ...acc, [c]: true }), {}));
    const collapseAll = () => setExpandedChains(CHAINES.reduce((acc, c) => ({ ...acc, [c]: false }), {}));

    // Handlers
    const handleAddEvent = () => {
        if (!selectedModel || !dateLancement || !dateExport || qteTotal <= 0) {
            alert("Veuillez remplir tous les champs obligatoires (Modèle, Lancement, Export, Qté).");
            return;
        }
        const newEvent: PlanningEvent = {
            id: Date.now().toString(), modelId: selectedModel, chaineId: selectedChaine,
            dateLancement, dateExport, qteTotal, superviseur
        };
        setPlanningEvents(prev => [...prev, newEvent]);
        setShowAddModal(false);
        setSelectedModel(''); setDateExport(''); setQteTotal(0); setSuperviseur('');
    };

    const deleteEvent = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm('Êtes-vous sûr de vouloir supprimer cette planification ?')) {
            setPlanningEvents(prev => prev.filter(ev => ev.id !== id));
        }
    };

    const handleLancer = (e: React.MouseEvent, event: PlanningEvent) => {
        e.stopPropagation();
        if (!setModels || !setSuivis || !setCurrentView) { alert("Erreur de liaison technique."); return; }
        setModels(prev => prev.map(m => m.id === event.modelId ? { ...m, workflowStatus: 'SUIVI' } : m));
        const newSuivi: SuiviData = {
            id: `suivi_${Date.now()}`, planningId: event.id,
            date: new Date().toISOString().split('T')[0], entrer: 0,
            sorties: { h0830: 0, h0930: 0, h1030: 0, h1130: 0, h1430: 0, h1530: 0, h1630: 0, h1730: 0, h1830: 0, h1930: 0 },
            totalHeure: 0, pJournaliere: 0, enCour: 0,
            resteEntrer: event.qteTotal, resteSortie: event.qteTotal,
            machinistes: 0, tracage: 0, preparation: 0, finition: 0, controle: 0, totalWorkers: 0
        };
        setSuivis(prev => [...prev.filter(s => s.planningId !== event.id), newSuivi]);
        setCurrentView('suivi');
    };

    const activeEvent = planningEvents.find(e => e.id === contextMenu?.eventId);

    // Filtered & sorted events
    const processedEvents = useMemo(() => {
        let evs = [...planningEvents];
        if (searchQuery) {
            evs = evs.filter(e => {
                const m = models.find(mod => mod.id === e.modelId);
                return m?.meta_data.nom_modele.toLowerCase().includes(searchQuery.toLowerCase()) || e.chaineId.toLowerCase().includes(searchQuery.toLowerCase());
            });
        }
        if (sortMode === 'date') {
            evs.sort((a, b) => new Date(a.dateLancement).getTime() - new Date(b.dateLancement).getTime());
        }
        return evs;
    }, [planningEvents, searchQuery, sortMode, models]);

    const activeChaines = useMemo(() => {
        if (!searchQuery) return CHAINES;
        return CHAINES.filter(c => processedEvents.some(e => e.chaineId === c) || c.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [CHAINES, processedEvents, searchQuery]);

    const getSummaryBounds = (chaineId: string) => {
        const events = planningEvents.filter(e => e.chaineId === chaineId);
        if (events.length === 0) return null;
        let minDate = new Date(events[0].dateLancement);
        let maxDate = new Date(events[0].dateExport);
        events.forEach(e => {
            const l = new Date(e.dateLancement);
            const x = new Date(e.dateExport);
            if (l < minDate) minDate = l;
            if (x > maxDate) maxDate = x;
        });
        return { start: minDate, end: maxDate };
    };

    const getTimelineStyle = (startDateStr: string, endDateStr: string, isSummary: boolean = false) => {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const firstTimelineDate = new Date(timelineDates[0]?.date);
        firstTimelineDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const diffStartMs = start.getTime() - firstTimelineDate.getTime();
        const startOffsetDays = diffStartMs / (1000 * 60 * 60 * 24);
        const diffDurationMs = end.getTime() - start.getTime();
        const durationDays = Math.max(1, Math.ceil(diffDurationMs / (1000 * 60 * 60 * 24)));
        const left = startOffsetDays * DAY_COLUMN_WIDTH;
        const width = durationDays * DAY_COLUMN_WIDTH;
        return {
            left: `${Math.max(0, left)}px`,
            width: `${Math.max(DAY_COLUMN_WIDTH, width)}px`,
            top: isSummary ? '40%' : '50%',
            transform: 'translateY(-50%)',
            height: isSummary ? '8px' : '24px'
        };
    };

    const getEventProgress = (event: PlanningEvent) => {
        if (event.status === 'DONE') return 100;
        const start = new Date(event.dateLancement).getTime();
        const end = new Date(event.dateExport).getTime();
        const now = currentTime.getTime();
        if (now > start && end > start) return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
        if (now > end) return 100;
        return 0;
    };

    /* ─────────────────── RENDER ─────────────────── */
    return (
        <div className="h-full flex flex-col bg-slate-50 relative font-sans text-slate-800 overflow-hidden" ref={containerRef}>

            {/* ─── PREMIUM TOP BAR ─── */}
            <div className="flex flex-col border-b border-slate-200 bg-white shadow-sm">
                {/* Primary Row */}
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                                <KanbanSquare className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-800 tracking-tight">Planning</h1>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none">Gestion de production</p>
                            </div>
                        </div>

                        {/* View Mode Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                            {[
                                { mode: 'list' as const, icon: List, label: 'Liste' },
                                { mode: 'board' as const, icon: LayoutDashboard, label: 'Board' },
                                { mode: 'gantt' as const, icon: AlignLeft, label: 'Gantt' },
                            ].map(v => (
                                <button
                                    key={v.mode}
                                    onClick={() => setViewMode(v.mode)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === v.mode
                                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    <v.icon className="w-3.5 h-3.5" /> {v.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowWidgets(!showWidgets)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${showWidgets ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                            <BarChart3 className="w-3.5 h-3.5" /> Widgets
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all transform hover:scale-[1.02]">
                            <Plus className="w-4 h-4" /> Nouvelle Tâche
                        </button>
                    </div>
                </div>

                {/* Sub-toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <button onClick={expandAll} className="flex items-center gap-1 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"><ChevronDown className="w-3.5 h-3.5" /> Tout déplier</button>
                        <button onClick={collapseAll} className="flex items-center gap-1 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"><ChevronRightIcon className="w-3.5 h-3.5" /> Tout replier</button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button onClick={() => setSortMode(prev => prev === 'default' ? 'date' : 'default')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${sortMode === 'date' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100'}`}><ArrowDownUp className="w-3.5 h-3.5" /> Tri par date</button>
                        <button onClick={() => setShowFilter(!showFilter)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${showFilter ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100'}`}><Filter className="w-3.5 h-3.5" /> Filtre</button>
                    </div>
                    <div className="flex items-center gap-3">
                        {viewMode === 'gantt' && (
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                                {[
                                    { mode: 'day' as const, label: 'Jour' },
                                    { mode: 'week' as const, label: 'Semaine' },
                                    { mode: 'month' as const, label: 'Mois' },
                                ].map(z => (
                                    <button
                                        key={z.mode}
                                        onClick={() => setZoomMode(z.mode)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${zoomMode === z.mode
                                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        {z.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) {
                                alert("Veuillez autoriser les pop-ups pour imprimer le planning.");
                                return;
                            }

                            const html = `
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <title>Planning de Production</title>
                                        <style>
                                            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; }
                                            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                                            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                                            th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; }
                                            h1 { margin-bottom: 5px; font-size: 24px; color: #0f172a; }
                                            .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                                            .meta { color: #64748b; font-size: 14px; }
                                            .status-ON_TRACK { color: #059669; font-weight: bold; }
                                            .status-AT_RISK { color: #d97706; font-weight: bold; }
                                            .status-OFF_TRACK { color: #e11d48; font-weight: bold; }
                                            .status-DONE { color: #2563eb; font-weight: bold; }
                                            .superviseur { font-size: 10px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: bold;}
                                        </style>
                                    </head>
                                    <body>
                                        <div class="header">
                                            <h1>Plan Directeur de Production (PDP)</h1>
                                            <div class="meta">Généré le: ${new Date().toLocaleString('fr-FR')}</div>
                                        </div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Chaîne / Ligne</th>
                                                    <th>Modèle</th>
                                                    <th>Date Lancement</th>
                                                    <th>Date Livraison / Export</th>
                                                    <th>Quantité</th>
                                                    <th>Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${CHAINES.filter(c => processedEvents.some(e => e.chaineId === c)).map(chaine => {
                                const chainEvents = processedEvents.filter(e => e.chaineId === chaine);
                                return `
                                                        <tr style="background-color: #f8fafc;">
                                                            <td colspan="6" style="font-weight: 900; font-size: 14px; padding-top: 15px;">
                                                                ${settings.chainNames?.[chaine] || chaine} 
                                                                <span style="font-weight: normal; color: #64748b; font-size: 12px; margin-left: 10px;">(${chainEvents.length} commandes)</span>
                                                            </td>
                                                        </tr>
                                                        ${chainEvents.map(ev => {
                                    const model = models.find(m => m.id === ev.modelId);
                                    const modelName = model ? model.meta_data.nom_modele : 'Tâche inconnue';
                                    const statusObj = STATUS_CONFIG[ev.status || 'ON_TRACK'];

                                    return `
                                                                <tr>
                                                                    <td style="color: #94a3b8; font-size: 10px;">${ev.id.substring(0, 6)}</td>
                                                                    <td style="font-weight: bold;">
                                                                        ${modelName} 
                                                                        ${ev.superviseur ? `<br><span class="superviseur">${ev.superviseur}</span>` : ''}
                                                                    </td>
                                                                    <td>${new Date(ev.dateLancement).toLocaleDateString('fr-FR')}</td>
                                                                    <td>${new Date(ev.dateExport).toLocaleDateString('fr-FR')}</td>
                                                                    <td style="font-weight: bold;">${ev.qteTotal.toLocaleString()} pcs</td>
                                                                    <td class="status-${ev.status || 'ON_TRACK'}">${statusObj.label}</td>
                                                                </tr>
                                                            `;
                                }).join('')}
                                                    `;
                            }).join('')}
                                            </tbody>
                                        </table>
                                        <script>
                                            window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }
                                        </script>
                                    </body>
                                    </html>
                                `;

                            printWindow.document.write(html);
                            printWindow.document.close();
                        }} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimer</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── WIDGETS ─── */}
            {showWidgets && (
                <div className="bg-white border-b border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 animate-in slide-in-from-top-2 duration-200">
                    {/* Pie Chart */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col h-52">
                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2"><Target className="w-3.5 h-3.5 text-indigo-500" /> Répartition des statuts</h3>
                        <div className="flex-1 w-full">
                            {planningEvents.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-sm text-slate-400 italic">Aucune tâche planifiée</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} stroke="none">
                                            {statusCounts.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Volume */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-center gap-4 h-52">
                        <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Volume de Production</h3>
                        <div>
                            <p className="text-4xl font-black text-slate-800">{totalPieces.toLocaleString()}</p>
                            <p className="text-xs font-medium text-slate-400 mt-1">Pièces planifiées au total</p>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                <span className="text-blue-600">Terminés: {piecesDone.toLocaleString()}</span>
                                <span className="text-slate-500">{totalPieces ? Math.round((piecesDone / totalPieces) * 100) : 0}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${totalPieces ? (piecesDone / totalPieces) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Alert Summary */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 rounded-2xl text-white flex flex-col justify-between h-52 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                        <div className="z-10 relative">
                            <h3 className="text-indigo-200 font-bold text-xs uppercase mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Alertes</h3>
                            <p className="text-4xl font-black">
                                {(statusCounts.find(s => s.name === STATUS_CONFIG.OFF_TRACK.label)?.value || 0)}
                                <span className="text-lg font-medium text-indigo-200 ml-2">en retard</span>
                            </p>
                        </div>
                        <div className="z-10 relative mt-auto">
                            <p className="text-sm font-medium text-indigo-100 leading-relaxed">
                                <span className="text-white font-bold">{statusCounts.find(s => s.name === STATUS_CONFIG.AT_RISK.label)?.value || 0}</span> tâches à risque nécessitent votre attention.
                            </p>
                        </div>
                        <CalendarDays className="absolute -bottom-6 -right-6 w-32 h-32 text-indigo-500/20" />
                    </div>
                </div>
            )}

            {/* ─── FILTER BAR ─── */}
            {showFilter && (
                <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 max-w-md w-full relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 z-10" />
                        <input
                            type="text"
                            placeholder="Rechercher une tâche, chaîne, modèle..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600 z-10"><X className="w-4 h-4" /></button>
                        )}
                    </div>
                </div>
            )}

            {/* ─── MAIN CONTENT ─── */}
            {viewMode === 'board' ? (
                /* ─── BOARD / KANBAN ─── */
                <div className="flex-1 bg-slate-50 overflow-x-auto p-6 flex gap-5 items-start h-full pb-10">
                    {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(statusKey => {
                        const config = STATUS_CONFIG[statusKey];
                        const groupEvents = processedEvents.filter(e => (e.status || 'ON_TRACK') === statusKey);
                        return (
                            <div key={statusKey} className="w-80 flex-shrink-0 flex flex-col max-h-full">
                                <div className={`px-4 py-3 rounded-t-2xl border-t-4 ${config.border} border-x border-slate-200 ${config.bg} flex items-center justify-between`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></div>
                                        <h3 className="font-bold text-slate-700 text-sm">{config.label}</h3>
                                    </div>
                                    <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">{groupEvents.length}</span>
                                </div>
                                <div className="bg-white/50 border-x border-b border-slate-200 rounded-b-2xl p-2.5 flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
                                    {groupEvents.map(event => {
                                        const model = models.find(m => m.id === event.modelId);
                                        const progress = getEventProgress(event);
                                        return (
                                            <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        {settings.chainNames?.[event.chaineId] || event.chaineId}
                                                    </span>
                                                    <MoreHorizontal className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-pointer transition-colors" onClick={(e) => {
                                                        e.preventDefault();
                                                        setContextMenu({ x: e.pageX, y: e.pageY, eventId: event.id });
                                                    }} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm mb-1 leading-snug">{model?.meta_data.nom_modele || 'Tâche inconnue'}</h4>
                                                {/* Progress bar */}
                                                <div className="mt-3 mb-2">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                                        <span>Avancement</span>
                                                        <span>{progress.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${config.dot}`} style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                                                    <span className="flex items-center gap-1 font-medium"><CalendarIcon className="w-3.5 h-3.5" /> {new Date(event.dateLancement).toLocaleDateString('fr-FR')}</span>
                                                    <span className="font-bold text-slate-700">{event.qteTotal.toLocaleString()} pcs</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {groupEvents.length === 0 && (
                                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">Aucune tâche</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden relative">

                    {/* ─── LEFT PANE: TABLE ─── */}
                    <div style={{ width: viewMode === 'list' ? '100%' : leftPaneWidth }} className="flex-shrink-0 flex flex-col bg-white border-r border-slate-200 relative z-20">

                        {/* Table Header */}
                        <div className="flex items-center bg-slate-50/80 border-b border-slate-200 h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                            <div className="w-12 border-r border-slate-100 flex items-center justify-center shrink-0">#</div>
                            <div className="flex-1 px-4 flex items-center border-r border-slate-100 h-full">Nom de la tâche</div>
                            <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0">Assigné</div>
                            <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0">Statut</div>
                            <div className="w-10 flex items-center justify-center shrink-0"></div>
                        </div>

                        {/* Table Body */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white">
                            {activeChaines.map((chaine, index) => {
                                const isExpanded = expandedChains[chaine];
                                const chainEvents = processedEvents.filter(e => e.chaineId === chaine);
                                const hasEvents = chainEvents.length > 0;
                                const summaryNumber = index + 1;

                                return (
                                    <React.Fragment key={chaine}>
                                        {/* Summary Row */}
                                        <div className="flex items-stretch border-b border-slate-100 hover:bg-indigo-50/30 transition-colors group h-11">
                                            <div className="w-12 border-r border-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0 font-mono">{summaryNumber}</div>
                                            <div className="flex-1 px-3 flex items-center border-r border-slate-100 overflow-hidden">
                                                <div className="flex items-center gap-2 w-full">
                                                    <button onClick={() => toggleChain(chaine)} className={`p-0.5 rounded-md hover:bg-slate-200 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasEvents && 'opacity-0 pointer-events-none'}`}>
                                                        <ChevronRightIcon className="w-4 h-4" />
                                                    </button>
                                                    <Factory className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                    <span className="text-sm font-bold text-slate-800 truncate">{settings.chainNames?.[chaine] || chaine}</span>
                                                    {hasEvents && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md ml-1">{chainEvents.length}</span>}
                                                </div>
                                            </div>
                                            <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0"></div>
                                            <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0"></div>
                                            <div className="w-10 flex items-center justify-center shrink-0"></div>
                                        </div>

                                        {/* Child Rows */}
                                        {isExpanded && chainEvents.map((event, evIdx) => {
                                            const model = models.find(m => m.id === event.modelId);
                                            const modelName = model ? model.meta_data.nom_modele : 'Tâche inconnue';
                                            const status = event.status || 'ON_TRACK';
                                            const cfg = STATUS_CONFIG[status];

                                            return (
                                                <div key={event.id} className="flex items-stretch border-b border-slate-100 hover:bg-slate-50 transition-colors group h-11 bg-white">
                                                    <div className="w-12 border-r border-slate-100 flex items-center justify-center text-[11px] text-slate-400 shrink-0 font-mono">{summaryNumber}.{evIdx + 1}</div>
                                                    <div className="flex-1 px-3 flex items-center border-r border-slate-100 overflow-hidden pl-10">
                                                        <span className="text-[13px] font-medium text-slate-700 truncate">{modelName} <span className="text-slate-400 font-normal">• {event.qteTotal.toLocaleString()} pcs</span></span>
                                                    </div>
                                                    <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0">
                                                        {event.superviseur ? (
                                                            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-800 ring-2 ring-white flex justify-center items-center text-[9px] font-bold uppercase" title={event.superviseur}>
                                                                {event.superviseur.substring(0, 2)}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">—</span>
                                                        )}
                                                    </div>
                                                    <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0 px-1">
                                                        <select
                                                            className={`w-full text-[10px] font-bold outline-none rounded-lg py-1.5 cursor-pointer appearance-none text-center border transition-all ${cfg.bg} ${cfg.text} ${cfg.border}`}
                                                            value={status}
                                                            onChange={(e) => {
                                                                const newStatus = e.target.value as any;
                                                                setPlanningEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, status: newStatus } : ev));
                                                            }}
                                                        >
                                                            {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG.ON_TRACK][]).map(([key, val]) => (
                                                                <option key={key} value={key}>{val.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="w-10 flex items-center justify-center shrink-0">
                                                        <MoreHorizontal
                                                            className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-pointer hover:text-indigo-500 transition-colors"
                                                            onClick={(e) => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                setContextMenu({ x: e.pageX, y: e.pageY, eventId: event.id });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add task placeholder */}
                                        {isExpanded && (
                                            <div className="flex items-stretch border-b border-slate-100 h-11 group cursor-pointer hover:bg-indigo-50/30" onClick={() => { setSelectedChaine(chaine); setShowAddModal(true); }}>
                                                <div className="w-12 border-r border-slate-100 shrink-0"></div>
                                                <div className="flex-1 px-3 flex items-center border-r border-slate-100 pl-10">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 group-hover:text-indigo-600 transition-colors">
                                                        <Plus className="w-3.5 h-3.5" /> <span>Ajouter une tâche</span>
                                                    </div>
                                                </div>
                                                <div className="w-24 border-r border-slate-100"></div>
                                                <div className="w-24 border-r border-slate-100"></div>
                                                <div className="w-10"></div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* ─── SPLITTER ─── */}
                    {viewMode === 'gantt' && (
                        <div
                            className="w-1.5 bg-slate-200 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-500 z-30 transition-colors relative flex items-center justify-center group"
                            onMouseDown={startResizing}
                        >
                            <div className="h-8 w-1 bg-slate-400 rounded-full group-hover:bg-white absolute pointer-events-none"></div>
                        </div>
                    )}

                    {/* ─── RIGHT PANE: GANTT TIMELINE ─── */}
                    {viewMode === 'gantt' && (
                        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-white flex flex-col relative" ref={timelineRef}>

                            {/* Timeline Header */}
                            <div className="flex flex-col bg-white border-b border-slate-200 sticky top-0 z-20 min-w-max">
                                {/* Months */}
                                <div className="flex h-6 border-b border-slate-100">
                                    {monthsInTimeline.map((month, idx) => (
                                        <div key={idx} className={`flex items-center justify-center text-[10px] font-bold text-slate-600 border-r border-slate-100 relative tracking-wider ${zoomMode === 'month' ? '' : 'uppercase'}`} style={{ width: `${month.colspan * DAY_COLUMN_WIDTH}px` }}>
                                            <span className="sticky left-4 truncate px-1">
                                                {zoomMode === 'month' ? month.name.substring(0, 3) : month.name} {month.year}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {/* Days */}
                                <div className="flex h-6">
                                    {timelineDates.map((day, idx) => {
                                        const isToday = day.date.toDateString() === currentTime.toDateString();
                                        return (
                                            <div key={idx} className={`flex flex-col items-center justify-center border-r border-slate-100 shrink-0 relative ${day.isWeekend ? 'bg-slate-50/80 text-blue-400' : 'text-slate-500 bg-white'}`} style={{ width: `${DAY_COLUMN_WIDTH}px` }}>
                                                {zoomMode !== 'month' && (
                                                    <span className={`text-[9px] leading-none ${isToday ? 'text-white font-bold' : 'font-medium'}`}>{day.dayNumber}</span>
                                                )}
                                                {isToday && <div className="absolute inset-0 bg-indigo-500 rounded-sm -z-10"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Timeline Grid & Bars */}
                            <div className="flex-1 overflow-y-auto min-w-max relative custom-scrollbar-timeline bg-white">
                                {/* Background Grid */}
                                <div className="absolute inset-0 flex pointer-events-none z-0 h-full">
                                    {timelineDates.map((day, idx) => (
                                        <div key={idx} className={`border-r border-slate-100/60 shrink-0 h-full ${day.isWeekend ? 'bg-slate-50/50' : 'bg-transparent'}`} style={{ width: `${DAY_COLUMN_WIDTH}px` }}></div>
                                    ))}
                                </div>

                                {/* Today Marker */}
                                {(() => {
                                    const todayIndex = timelineDates.findIndex(d => d.date.toDateString() === currentTime.toDateString());
                                    if (todayIndex !== -1) {
                                        return (
                                            <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none" style={{ left: `${todayIndex * DAY_COLUMN_WIDTH + Math.floor(DAY_COLUMN_WIDTH / 2)}px` }}>
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap">
                                                    Aujourd'hui
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Row Bars */}
                                <div className="flex flex-col relative z-20">
                                    {activeChaines.map((chaine) => {
                                        const isExpanded = expandedChains[chaine];
                                        const chainEvents = processedEvents.filter(e => e.chaineId === chaine);
                                        const bounds = getSummaryBounds(chaine);

                                        return (
                                            <React.Fragment key={chaine}>
                                                {/* Summary Row */}
                                                <div className="h-11 relative w-full border-b border-transparent">
                                                    {bounds && (
                                                        <div className="absolute bg-slate-800/15 rounded-sm" style={{
                                                            ...getTimelineStyle(bounds.start.toISOString(), bounds.end.toISOString(), true),
                                                            borderLeft: '3px solid #334155',
                                                            borderRight: '3px solid #334155',
                                                            borderTop: '3px solid #334155',
                                                        }}>
                                                            <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 whitespace-nowrap">
                                                                {settings.chainNames?.[chaine] || chaine} <span className="text-slate-400 font-medium ml-1">| {bounds.start.toLocaleDateString('fr-FR')} → {bounds.end.toLocaleDateString('fr-FR')}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Child Bars */}
                                                {isExpanded && chainEvents.map((event) => {
                                                    const model = models.find(m => m.id === event.modelId);
                                                    const label = model?.meta_data.nom_modele || 'Tâche';
                                                    const progress = getEventProgress(event);
                                                    const status = event.status || 'ON_TRACK';
                                                    const barColor = STATUS_CONFIG[status].bar;

                                                    return (
                                                        <div key={event.id} className="h-11 relative w-full border-b border-transparent group/row">
                                                            <div
                                                                className={`absolute rounded-lg shadow-sm cursor-pointer transition-all border overflow-hidden hover:shadow-md ${barColor}`}
                                                                style={getTimelineStyle(event.dateLancement, event.dateExport)}
                                                                onContextMenu={(e) => {
                                                                    e.preventDefault(); e.stopPropagation();
                                                                    setContextMenu({ x: e.pageX, y: e.pageY, eventId: event.id });
                                                                }}
                                                            >
                                                                <div className="h-full bg-black/15 absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                                <span className="absolute inset-0 flex items-center px-2.5 text-[10px] text-white font-bold truncate pointer-events-none drop-shadow-sm">
                                                                    {progress.toFixed(0)}% — {label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {isExpanded && <div className="h-11 border-b border-transparent"></div>}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── CONTEXT MENU ─── */}
            {contextMenu && activeEvent && createPortal(
                <div
                    className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 w-56 z-[9999] py-2 text-[13px] text-slate-700 font-medium animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={(e) => { handleLancer(e as any, activeEvent); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2.5 font-bold border-b border-slate-100"
                    >
                        <Play className="w-4 h-4 text-emerald-600" /> Lancer en Production
                    </button>
                    <button type="button" onClick={() => { setShowAddModal(true); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 mt-1">
                        <Plus className="w-3.5 h-3.5 text-slate-400" /> Ajouter une tâche
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button
                        type="button"
                        onClick={() => { deleteEvent(activeEvent.id); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                </div>,
                document.body
            )}

            {/* ─── ADD TASK MODAL ─── */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-white text-lg">Nouvelle Tâche</h3>
                                <p className="text-indigo-200 text-xs font-medium mt-0.5">Planifier une production</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Modèle *</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                                    <option value="">— Sélectionner un modèle —</option>
                                    {models.filter(m => m.workflowStatus === 'PLANNING' || !m.workflowStatus).map(m => (<option key={m.id} value={m.id}>{m.meta_data.nom_modele}</option>))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chaîne *</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedChaine} onChange={e => setSelectedChaine(e.target.value)}>
                                        {CHAINES.map(c => <option key={c} value={c}>{settings.chainNames?.[c] || c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quantité *</label>
                                    <input type="number" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" value={qteTotal || ''} onChange={e => setQteTotal(parseInt(e.target.value) || 0)} placeholder="0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lancement *</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" value={dateLancement} onChange={e => setDateLancement(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Export *</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" value={dateExport} onChange={e => setDateExport(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Superviseur</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" value={superviseur} onChange={e => setSuperviseur(e.target.value)} placeholder="Nom du superviseur (optionnel)" />
                            </div>
                        </div>

                        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50">
                            <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm">Annuler</button>
                            <button onClick={handleAddEvent} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-600/20 text-sm">
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
