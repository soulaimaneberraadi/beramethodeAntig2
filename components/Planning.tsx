import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ModelData, PlanningEvent, SuiviData, AppSettings } from '../types';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Filter, Layers, Plus, Save, ChevronLeft, ChevronRight, Play, Trash2, FileJson, Factory, AlertCircle, CalendarDays, Clock, MoreHorizontal, ChevronDown, ChevronRight as ChevronRightIcon, Settings, Download, LayoutDashboard, Search, List, KanbanSquare, AlignLeft, Users, MinusSquare, PlusSquare, ArrowDownUp } from 'lucide-react';
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

export default function Planning({ models, planningEvents, setPlanningEvents, setModels, setSuivis, setCurrentView, settings }: PlanningProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWidgets, setShowWidgets] = useState(false);

    // GanttPRO States
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'gantt'>('gantt');
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<'default' | 'date'>('default');

    // Derived Data for Widgets
    const statusCounts = useMemo(() => {
        const counts = { ON_TRACK: 0, AT_RISK: 0, OFF_TRACK: 0, DONE: 0 };
        planningEvents.forEach(e => {
            counts[e.status || 'ON_TRACK']++;
        });
        return [
            { name: 'On track', value: counts.ON_TRACK, color: '#10b981' }, // emerald-500
            { name: 'At risk', value: counts.AT_RISK, color: '#f59e0b' },   // amber-500
            { name: 'Off track', value: counts.OFF_TRACK, color: '#f43f5e' }, // rose-500
            { name: 'Done', value: counts.DONE, color: '#3b82f6' }          // blue-500
        ].filter(i => i.value > 0);
    }, [planningEvents]);

    const totalPieces = planningEvents.reduce((acc, curr) => acc + curr.qteTotal, 0);
    const piecesDone = planningEvents.filter(e => e.status === 'DONE').reduce((acc, curr) => acc + curr.qteTotal, 0);

    // New Event Form State
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedChaine, setSelectedChaine] = useState('CHAINE 1');
    const [dateLancement, setDateLancement] = useState(new Date().toISOString().split('T')[0]);
    const [dateExport, setDateExport] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [qteTotal, setQteTotal] = useState(0);
    const [superviseur, setSuperviseur] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eventId: string } | null>(null);

    // Resizable Pane State
    const [leftPaneWidth, setLeftPaneWidth] = useState(450); // initial width in pixels
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Expand/Collapse State for Summary Tasks (Chaines)
    const CHAINES = useMemo(() => Array.from({ length: settings.chainsCount }, (_, i) => `CHAINE ${i + 1}`), [settings.chainsCount]);
    const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>(
        CHAINES.reduce((acc, chain) => ({ ...acc, [chain]: true }), {})
    );

    // Current Time Line Marker
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

    // Close context menu on global click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    // Resize handlers
    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            // Calculate new width, constrained between min (300) and max (800)
            const newWidth = Math.max(300, Math.min(e.clientX - containerRect.left, containerRect.width - 400));
            setLeftPaneWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);


    // Helpers for timeline
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    // Generate dates for current, previous, and next month to allow some scrolling context
    // For simplicity, we'll render current month + next month
    const timelineDates = useMemo(() => {
        const dates = [];
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); // Start 1 month before
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);   // End 2 months ahead

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push({
                date: new Date(d),
                dayNumber: d.getDate(),
                dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }), // S, M, T, W, T, F, S
                month: d.getMonth(),
                year: d.getFullYear(),
                isWeekend: d.getDay() === 0 || d.getDay() === 6
            });
        }
        return dates;
    }, [currentDate]);

    // Group dates by month for the top header row
    const monthsInTimeline = useMemo(() => {
        const months: { name: string, year: number, colspan: number, startDate: Date }[] = [];
        if (timelineDates.length === 0) return months;

        let currentMonth = timelineDates[0].month;
        let currentYear = timelineDates[0].year;
        let count = 0;
        let startD = timelineDates[0].date;

        timelineDates.forEach(td => {
            if (td.month !== currentMonth) {
                months.push({
                    name: startD.toLocaleDateString('en-US', { month: 'long' }),
                    year: currentYear,
                    colspan: count,
                    startDate: startD
                });
                currentMonth = td.month;
                currentYear = td.year;
                count = 1;
                startD = td.date;
            } else {
                count++;
            }
        });
        // push last month
        months.push({
            name: startD.toLocaleDateString('en-US', { month: 'long' }),
            year: currentYear,
            colspan: count,
            startDate: startD
        });

        return months;
    }, [timelineDates]);

    const [zoomLevel, setZoomLevel] = useState(35); // default px per day
    const DAY_COLUMN_WIDTH = zoomLevel;

    // Scroll timeline to today on mount
    const timelineRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (timelineRef.current) {
            const todayIndex = timelineDates.findIndex(d => d.date.toDateString() === currentTime.toDateString());
            if (todayIndex !== -1) {
                // Scroll to today, minus an offset to center it a bit
                timelineRef.current.scrollLeft = Math.max(0, (todayIndex * DAY_COLUMN_WIDTH) - 200);
            }
        }
    }, [timelineDates, currentTime]);

    const toggleChain = (chain: string) => {
        setExpandedChains(prev => ({ ...prev, [chain]: !prev[chain] }));
    };

    const expandAll = () => setExpandedChains(CHAINES.reduce((acc, c) => ({ ...acc, [c]: true }), {}));
    const collapseAll = () => setExpandedChains(CHAINES.reduce((acc, c) => ({ ...acc, [c]: false }), {}));


    // Handlers
    const handleAddEvent = () => {
        if (!selectedModel || !dateLancement || !dateExport || qteTotal <= 0) {
            alert("Veuillez remplir tous les champs obligatoires (Modèle, Lancement, Export, Qté).");
            return;
        }

        const newEvent: PlanningEvent = {
            id: Date.now().toString(),
            modelId: selectedModel,
            chaineId: selectedChaine,
            dateLancement,
            dateExport,
            qteTotal,
            superviseur
        };

        setPlanningEvents(prev => [...prev, newEvent]);
        setShowAddModal(false);

        setSelectedModel('');
        setDateExport('');
        setQteTotal(0);
        setSuperviseur('');
    };

    const deleteEvent = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm('Êtes-vous sûr de vouloir supprimer cette planification ?')) {
            setPlanningEvents(prev => prev.filter(ev => ev.id !== id));
        }
    };

    const handleLancer = (e: React.MouseEvent, event: PlanningEvent) => {
        e.stopPropagation();
        if (!setModels || !setSuivis || !setCurrentView) {
            alert("Erreur de liaison technique. Impossible de lancer.");
            return;
        }

        setModels(prev => prev.map(m => {
            if (m.id === event.modelId) return { ...m, workflowStatus: 'SUIVI' };
            return m;
        }));

        const newSuivi: SuiviData = {
            id: `suivi_${Date.now()}`,
            planningId: event.id,
            date: new Date().toISOString().split('T')[0],
            entrer: 0,
            sorties: { h0830: 0, h0930: 0, h1030: 0, h1130: 0, h1430: 0, h1530: 0, h1630: 0, h1730: 0, h1830: 0, h1930: 0 },
            totalHeure: 0,
            pJournaliere: 0,
            enCour: 0,
            resteEntrer: event.qteTotal,
            resteSortie: event.qteTotal,
            machinistes: 0,
            tracage: 0,
            preparation: 0,
            finition: 0,
            controle: 0,
            totalWorkers: 0
        };

        setSuivis(prev => [...prev.filter(s => s.planningId !== event.id), newSuivi]);
        setCurrentView('suivi');
    };

    const activeEvent = planningEvents.find(e => e.id === contextMenu?.eventId);

    // Apply Filter and Sort
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

    // Helpers to find bounds of a summary task (Chain)
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

    // Style helper for timeline positioning
    const getTimelineStyle = (startDateStr: string, endDateStr: string, isSummary: boolean = false) => {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        const firstTimelineDate = timelineDates[0].date;
        firstTimelineDate.setHours(0, 0, 0, 0);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Days from start of timeline
        const diffStartMs = start.getTime() - firstTimelineDate.getTime();
        const startOffsetDays = diffStartMs / (1000 * 60 * 60 * 24);

        // Duration
        const diffDurationMs = end.getTime() - start.getTime();
        const durationDays = Math.max(1, Math.ceil(diffDurationMs / (1000 * 60 * 60 * 24)));

        const left = startOffsetDays * DAY_COLUMN_WIDTH;
        const width = durationDays * DAY_COLUMN_WIDTH;

        return {
            left: `${Math.max(0, left)}px`,
            width: `${Math.max(DAY_COLUMN_WIDTH, width)}px`,
            // Slight vertical adjustments. Summary is higher/thinner, task is standard.
            top: isSummary ? '40%' : '50%',
            transform: isSummary ? 'translateY(-50%)' : 'translateY(-50%)',
            height: isSummary ? '8px' : '22px'
        };
    };

    return (
        <div className="h-full flex flex-col bg-white relative font-sans text-slate-800 overflow-hidden" ref={containerRef}>

            {/* SECONDARY TOOLBAR - GanttPRO style */}
            <div className="flex flex-col border-b border-slate-200">
                {/* Top Nav Row */}
                <div className="flex items-center justify-between px-6 py-3 bg-white">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-indigo-900">
                            <KanbanSquare className="w-6 h-6 text-emerald-500" />
                            <h1 className="text-xl font-bold tracking-tight">BERAMETHODE Gantt</h1>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-slate-500 bg-slate-100/50 p-1 rounded-lg border border-slate-200/50">
                            <span onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'hover:bg-slate-200/50 hover:text-slate-700'}`}><List className="w-4 h-4" /> List</span>
                            <span onClick={() => setViewMode('board')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'board' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'hover:bg-slate-200/50 hover:text-slate-700'}`}><LayoutDashboard className="w-4 h-4" /> Board</span>
                            <span onClick={() => setViewMode('gantt')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'gantt' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'hover:bg-slate-200/50 hover:text-slate-700'}`}><AlignLeft className="w-4 h-4" /> Gantt chart</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowWidgets(!showWidgets)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${showWidgets ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <LayoutDashboard className="w-4 h-4" /> Widgets
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-bold shadow-sm transition-colors transform hover:scale-105">
                            <Plus className="w-4 h-4" /> Create new task
                        </button>
                    </div>
                </div>

                {/* Sub-toolbar Row */}
                <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-slate-100 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-3">
                        <div className="w-px h-4 bg-slate-200 ml-2"></div>
                        <button onClick={expandAll} className="flex items-center gap-1 hover:bg-slate-100 px-2 py-1 rounded transition-colors"><ChevronDown className="w-3.5 h-3.5" /> Expand all</button>
                        <button onClick={collapseAll} className="flex items-center gap-1 hover:bg-slate-100 px-2 py-1 rounded transition-colors"><ChevronRightIcon className="w-3.5 h-3.5" /> Collapse all</button>
                        <button onClick={() => setSortMode(prev => prev === 'default' ? 'date' : 'default')} className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${sortMode === 'date' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-100'}`}><ArrowDownUp className="w-3.5 h-3.5" /> Cascade sorting</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowFilter(!showFilter)} className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${showFilter ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-100'}`}><Filter className="w-3.5 h-3.5" /> Filter</button>

                        {/* Zoom slider (Only relevant for Gantt) */}
                        {viewMode === 'gantt' && (
                            <div className="flex items-center gap-2 mx-2 bg-slate-50 py-1 px-3 rounded-full border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Zoom</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    <input
                                        type="range"
                                        min="15"
                                        max="80"
                                        value={zoomLevel}
                                        onChange={(e) => setZoomLevel(Number(e.target.value))}
                                        className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        title="Ajuster l'échelle du temps"
                                    />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                </div>
                            </div>
                        )}
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button onClick={() => window.print()} className="flex items-center gap-1 hover:bg-indigo-50 hover:text-indigo-600 px-2 py-1 rounded transition-colors font-semibold"><Download className="w-3.5 h-3.5" /> Export PDF</button>
                    </div>
                </div>
            </div>

            {/* WIDGETS PANEL */}
            {showWidgets && (
                <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 shadow-inner z-10 transition-all">
                    {/* Widget 1: Task Status */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-48">
                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Task Status Distribution</h3>
                        <div className="flex-1 w-full relative">
                            {planningEvents.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-sm text-slate-400">No tasks</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} stroke="none">
                                            {statusCounts.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                    {/* Widget 2: Production Volume */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-4 h-48">
                        <h3 className="text-xs font-bold uppercase text-slate-500">Volume (Pieces)</h3>
                        <div>
                            <p className="text-3xl font-black text-slate-800">{totalPieces.toLocaleString()}</p>
                            <p className="text-xs font-medium text-slate-400">Total Planned Pieces</p>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-medium mb-1">
                                <span className="text-blue-600">Done: {piecesDone.toLocaleString()}</span>
                                <span className="text-slate-500">{totalPieces ? Math.round((piecesDone / totalPieces) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${totalPieces ? (piecesDone / totalPieces) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                    {/* Widget 3: Summary */}
                    <div className="bg-indigo-600 p-4 rounded-xl shadow-sm text-white flex flex-col justify-between h-48 relative overflow-hidden">
                        <div className="z-10 relative">
                            <h3 className="text-indigo-200 font-bold text-xs uppercase mb-1">Schedule Variance</h3>
                            <p className="text-3xl font-black">
                                {statusCounts.find(s => s.name === 'Off track')?.value || 0} <span className="text-lg font-medium opacity-80">delayed</span>
                            </p>
                        </div>
                        <div className="z-10 relative mt-auto">
                            <p className="text-sm font-medium text-indigo-100">
                                Keep an eye on the <span className="text-white font-bold">{statusCounts.find(s => s.name === 'At risk')?.value || 0}</span> tasks currently at risk to maintain overall timeline.
                            </p>
                        </div>
                        <CalendarDays className="absolute -bottom-6 -right-6 w-36 h-36 text-indigo-500/30 -z-0" />
                    </div>
                </div>
            )}

            {/* FILTER BAR OVERLAY */}
            {showFilter && (
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2 max-w-md w-full relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                            type="text"
                            placeholder="Search tasks, chains, models..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600">&times;</button>
                        )}
                    </div>
                </div>
            )}

            {/* SPLIT VIEW CONTAINER OR KANBAN OR LIST */}
            {viewMode === 'board' ? (
                // BOARD KANBAN VIEW
                <div className="flex-1 bg-slate-50 overflow-x-auto p-6 flex gap-6 items-start h-full pb-10">
                    {['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'DONE'].map(statusGroup => {
                        const groupEvents = processedEvents.filter(e => (e.status || 'ON_TRACK') === statusGroup);
                        const groupTitle = statusGroup === 'ON_TRACK' ? 'On Track' : statusGroup === 'AT_RISK' ? 'At Risk' : statusGroup === 'OFF_TRACK' ? 'Off Track' : 'Done';
                        const headerColor = statusGroup === 'ON_TRACK' ? 'border-emerald-400 bg-emerald-50' : statusGroup === 'AT_RISK' ? 'border-amber-400 bg-amber-50' : statusGroup === 'OFF_TRACK' ? 'border-rose-400 bg-rose-50' : 'border-blue-400 bg-blue-50';
                        const dotColor = statusGroup === 'ON_TRACK' ? 'bg-emerald-500' : statusGroup === 'AT_RISK' ? 'bg-amber-500' : statusGroup === 'OFF_TRACK' ? 'bg-rose-500' : 'bg-blue-500';

                        return (
                            <div key={statusGroup} className="w-80 flex-shrink-0 flex flex-col max-h-full">
                                <div className={`px-4 py-3 rounded-t-xl border-t-4 border-x border-slate-200 ${headerColor} flex items-center justify-between`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
                                        <h3 className="font-bold text-slate-700">{groupTitle}</h3>
                                    </div>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">{groupEvents.length}</span>
                                </div>
                                <div className="bg-slate-100/50 border-x border-b border-slate-200 rounded-b-xl p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar shadow-inner">
                                    {groupEvents.map(event => {
                                        const model = models.find(m => m.id === event.modelId);
                                        return (
                                            <div key={event.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-grab">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{event.chaineId}</span>
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={(e) => {
                                                        e.preventDefault();
                                                        setContextMenu({ x: e.pageX, y: e.pageY, eventId: event.id });
                                                    }} />
                                                </div>
                                                <h4 className="font-semibold text-slate-800 text-sm mb-1 leading-snug">{model?.meta_data.nom_modele || 'Unknown task'}</h4>
                                                <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                                                    <span className="flex items-center gap-1 font-medium"><CalendarIcon className="w-3.5 h-3.5" /> {new Date(event.dateLancement).toLocaleDateString('en-GB')}</span>
                                                    <span className="font-bold text-slate-700">{event.qteTotal} pcs</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {groupEvents.length === 0 && (
                                        <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm font-medium">No tasks</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden relative">

                    {/* LEFT PANE: TABLE VIEW */}
                    <div style={{ width: viewMode === 'list' ? '100%' : leftPaneWidth }} className="flex-shrink-0 flex flex-col bg-white border-r border-slate-300 relative z-20 transition-all duration-300">

                        {/* Table Header */}
                        <div className="flex items-center bg-white border-b border-slate-200 h-14 text-xs font-semibold text-slate-500 select-none">
                            <div className="w-12 border-r border-slate-100 flex items-center justify-center shrink-0">#</div>
                            <div className="flex-1 px-4 flex items-center border-r border-slate-100 h-full truncate relative">
                                Task name
                                {viewMode === 'gantt' && <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200/50 cursor-col-resize hover:bg-emerald-400 transition-colors"></div>}
                            </div>
                            <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0">Assigned</div>
                            <div className="w-20 border-r border-slate-100 flex items-center justify-center shrink-0">Status</div>
                            <div className="w-10 flex items-center justify-center shrink-0"><Plus className="w-4 h-4 text-slate-400 cursor-pointer hover:text-emerald-500" /></div>
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
                                        {/* Summary Row (Chain) */}
                                        <div className="flex items-stretch border-b border-slate-100 hover:bg-blue-50/30 transition-colors group h-10">
                                            <div className="w-12 border-r border-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0 bg-slate-50/50">{summaryNumber}</div>
                                            <div className="flex-1 px-3 flex items-center border-r border-slate-100 overflow-hidden relative">
                                                {/* Hierarchy spacer */}
                                                <div className="flex items-center gap-1.5 w-full">
                                                    <button onClick={() => toggleChain(chaine)} className={`p-0.5 rounded-sm hover:bg-slate-200 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasEvents && 'opacity-0 pointer-events-none'}`}>
                                                        <ChevronRightIcon className="w-4 h-4" />
                                                    </button>
                                                    <MinusSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="text-sm font-semibold text-slate-800 truncate select-none leading-none mt-0.5">{chaine}</span>
                                                </div>
                                            </div>
                                            <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0 text-xs"></div>
                                            <div className="w-20 border-r border-slate-100 flex items-center justify-center shrink-0 text-xs"></div>
                                            <div className="w-10 flex items-center justify-center shrink-0 text-slate-300 group-hover:text-slate-500"><MoreHorizontal className="w-4 h-4 cursor-pointer" /></div>
                                        </div>

                                        {/* Child Rows (Tasks/Orders) */}
                                        {isExpanded && chainEvents.map((event, evIdx) => {
                                            const model = models.find(m => m.id === event.modelId);
                                            const modelName = model ? model.meta_data.nom_modele : 'Unknown Task';

                                            return (
                                                <div key={event.id} className="flex items-stretch border-b border-slate-100 hover:bg-blue-50/50 transition-colors group h-10 bg-white">
                                                    <div className="w-12 border-r border-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0 font-medium">{summaryNumber}.{evIdx + 1}</div>
                                                    <div className="flex-1 px-3 flex items-center border-r border-slate-100 overflow-hidden pl-9">
                                                        <span className="text-[13px] text-slate-700 truncate select-none">{modelName} {event.qteTotal}pcs</span>
                                                    </div>
                                                    <div className="w-24 border-r border-slate-100 flex items-center justify-center shrink-0">
                                                        <div className="flex -space-x-1 overflow-hidden">
                                                            {event.superviseur ? (
                                                                <div className="inline-block h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 ring-2 ring-white flex justify-center items-center text-[8px] font-bold uppercase truncate" title={event.superviseur}>
                                                                    {event.superviseur.substring(0, 2)}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Unassig...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-20 border-r border-slate-100 flex items-center justify-center shrink-0 relative px-1">
                                                        <select
                                                            className={`w-full text-[10px] font-bold outline-none rounded py-1 cursor-pointer appearance-none text-center shadow-sm border border-transparent hover:border-slate-300 transition-colors
                                                            ${event.status === 'DONE' ? 'bg-blue-50 text-blue-700' :
                                                                    event.status === 'AT_RISK' ? 'bg-amber-50 text-amber-700' :
                                                                        event.status === 'OFF_TRACK' ? 'bg-rose-50 text-rose-700' :
                                                                            'bg-emerald-50 text-emerald-700'
                                                                }`}
                                                            value={event.status || 'ON_TRACK'}
                                                            onChange={(e) => {
                                                                const newStatus = e.target.value as any;
                                                                setPlanningEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, status: newStatus } : ev));
                                                            }}
                                                        >
                                                            <option value="ON_TRACK">On track</option>
                                                            <option value="AT_RISK">At risk</option>
                                                            <option value="OFF_TRACK">Off track</option>
                                                            <option value="DONE">Done</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-10 flex items-center justify-center shrink-0 text-slate-300 group-hover:text-slate-500">
                                                        <MoreHorizontal
                                                            className="w-4 h-4 cursor-pointer hover:text-emerald-500 transition-colors"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setContextMenu({ x: e.pageX, y: e.pageY, eventId: event.id });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* Add task placeholder link */}
                                        {isExpanded && (
                                            <div className="flex items-stretch border-b border-slate-100 h-10 group cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedChaine(chaine); setShowAddModal(true); }}>
                                                <div className="w-12 border-r border-slate-100 flex items-center justify-center shrink-0"></div>
                                                <div className="flex-1 px-3 flex items-center border-r border-slate-100 overflow-hidden pl-9">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-500/80 group-hover:text-blue-600">
                                                        <Plus className="w-3.5 h-3.5" /> <span className="hover:underline">Add a task</span> <span className="text-slate-300 mx-1">|</span> <span className="hover:underline">Add a milestone</span>
                                                    </div>
                                                </div>
                                                <div className="w-24 border-r border-slate-100"></div>
                                                <div className="w-20 border-r border-slate-100"></div>
                                                <div className="w-10"></div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* DRAG SPLITTER */}
                    {viewMode === 'gantt' && (
                        <div
                            className="w-1 bg-slate-200 cursor-col-resize hover:bg-emerald-400 active:bg-emerald-500 z-30 transition-colors relative flex items-center justify-center group"
                            onMouseDown={startResizing}
                        >
                            <div className="h-8 w-1 bg-slate-400 rounded-full group-hover:bg-white absolute pointer-events-none"></div>
                        </div>
                    )}

                    {/* RIGHT PANE: TIMELINE VIEW */}
                    {viewMode === 'gantt' && (
                        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-white flex flex-col relative" ref={timelineRef}>

                            {/* Timeline Header (Months & Days) */}
                            <div className="flex flex-col bg-white border-b border-slate-200 sticky top-0 z-20 min-w-max">
                                {/* Months Row */}
                                <div className="flex h-7 border-b border-slate-100">
                                    {monthsInTimeline.map((month, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-center text-xs font-semibold text-slate-800 border-r border-slate-100 relative"
                                            style={{ width: `${month.colspan * DAY_COLUMN_WIDTH}px` }}
                                        >
                                            <span className="sticky sticky-text-center left-4">{month.name} {month.year}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Days Row */}
                                <div className="flex h-7">
                                    {timelineDates.map((day, idx) => {
                                        const isToday = day.date.toDateString() === currentTime.toDateString();
                                        return (
                                            <div
                                                key={idx}
                                                className={`flex flex-col items-center justify-center border-r border-slate-100 shrink-0 ${day.isWeekend ? 'bg-slate-50/80 text-blue-400' : 'text-slate-500 bg-white'}`}
                                                style={{ width: `${DAY_COLUMN_WIDTH}px` }}
                                            >
                                                <span className={`text-[10px] leading-none mb-0.5 ${isToday ? 'text-white' : ''}`}>{day.dayNumber}</span>
                                                <span className={`text-[9px] font-medium leading-none ${isToday ? 'text-white' : ''}`}>{day.dayName}</span>
                                                {isToday && (
                                                    <div className="absolute top-0 bottom-0 left-0 right-0 bg-rose-400 -z-10"></div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Timeline Grid & Bars Overlay */}
                            <div className="flex-1 overflow-y-auto min-w-max relative custom-scrollbar-timeline bg-white">
                                {/* Background Grid Lines rendering */}
                                <div className="absolute inset-0 flex pointer-events-none z-0 h-full">
                                    {timelineDates.map((day, idx) => {
                                        const isToday = day.date.toDateString() === currentTime.toDateString();
                                        return (
                                            <div
                                                key={idx}
                                                className={`border-r border-slate-100 shrink-0 h-full ${day.isWeekend ? 'bg-slate-50/80' : 'bg-transparent'}`}
                                                style={{ width: `${DAY_COLUMN_WIDTH}px` }}
                                            >
                                                {isToday && (
                                                    <div className="h-full w-full relative">
                                                        {/* Today transparent overlay rect */}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Today Marker Line (Full height) */}
                                {(() => {
                                    const todayIndex = timelineDates.findIndex(d => d.date.toDateString() === currentTime.toDateString());
                                    if (todayIndex !== -1) {
                                        return (
                                            <div
                                                className="absolute top-0 bottom-0 w-px bg-rose-400 z-10 pointer-events-none"
                                                style={{ left: `${todayIndex * DAY_COLUMN_WIDTH + Math.floor(DAY_COLUMN_WIDTH / 2)}px` }}
                                            >
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                                    Today
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                })()}

                                {/* Render Rows to match left table heights exactly */}
                                <div className="flex flex-col relative z-20">
                                    {activeChaines.map((chaine) => {
                                        const isExpanded = expandedChains[chaine];
                                        const chainEvents = processedEvents.filter(e => e.chaineId === chaine);
                                        const bounds = getSummaryBounds(chaine);

                                        return (
                                            <React.Fragment key={chaine}>
                                                {/* Summary Row Space */}
                                                <div className="h-10 relative w-full border-b border-transparent">
                                                    {bounds && (
                                                        // GanttPRO renders summary tasks as a bracket-like thin bar
                                                        <div
                                                            className="absolute bg-slate-800/20 rounded-sm"
                                                            style={{
                                                                ...getTimelineStyle(bounds.start.toISOString(), bounds.end.toISOString(), true),
                                                                borderLeft: '4px solid #1e293b',
                                                                borderRight: '4px solid #1e293b',
                                                                borderTop: '3px solid #1e293b',
                                                            }}
                                                        >
                                                            {/* Summary Label next to bar */}
                                                            <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-600 whitespace-nowrap">
                                                                {chaine} <span className="text-slate-400 font-normal ml-1">| {bounds.start.toLocaleDateString('en-GB')} - {bounds.end.toLocaleDateString('en-GB')}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Child Rows Space & Bars */}
                                                {isExpanded && chainEvents.map((event) => {
                                                    const model = models.find(m => m.id === event.modelId);
                                                    const label = model?.meta_data.nom_modele || 'Task';

                                                    return (
                                                        <div key={event.id} className="h-10 relative w-full border-b border-transparent group/row hover:bg-slate-50/10">
                                                            {/* Task Bar - GanttPRO Flat Style */}
                                                            {(() => {
                                                                let progress = 0;
                                                                if (event.status === 'DONE') progress = 100;
                                                                else {
                                                                    const start = new Date(event.dateLancement).getTime();
                                                                    const end = new Date(event.dateExport).getTime();
                                                                    const now = currentTime.getTime();
                                                                    if (now > start && end > start) {
                                                                        progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                                                                    } else if (now > end) {
                                                                        progress = 100;
                                                                    }
                                                                }

                                                                const barColor = event.status === 'DONE' ? 'bg-blue-400 border-blue-500 hover:bg-blue-500' :
                                                                    event.status === 'AT_RISK' ? 'bg-amber-400 border-amber-500 hover:bg-amber-500' :
                                                                        event.status === 'OFF_TRACK' ? 'bg-rose-400 border-rose-500 hover:bg-rose-500' :
                                                                            'bg-emerald-400 border-emerald-500 hover:bg-emerald-500';

                                                                return (
                                                                    <div
                                                                        className={`absolute rounded shadow-sm cursor-pointer transition-colors border overflow-hidden ${barColor}`}
                                                                        style={getTimelineStyle(event.dateLancement, event.dateExport)}
                                                                        onClick={(e) => {
                                                                            // Default click interaction (removed context menu default here to match requirements)
                                                                        }}
                                                                        onContextMenu={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setContextMenu({ x: e.pageX, y: e.pageY, eventId: event.id });
                                                                        }}
                                                                    >
                                                                        {/* Progress Fill */}
                                                                        <div className="h-full bg-black/20 absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-1000" style={{ width: `${progress}%` }}></div>

                                                                        {/* Internal Text / Title */}
                                                                        <span className="absolute inset-0 flex items-center px-2 text-[11px] text-white font-medium truncate pointer-events-none drop-shadow-sm">
                                                                            {progress.toFixed(0)}% - {label}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )
                                                })}

                                                {/* Add task placeholder spacer */}
                                                {isExpanded && <div className="h-10 border-b border-transparent"></div>}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTEXT MENU PORTAL */}
            {contextMenu && activeEvent && createPortal(
                <div
                    className="fixed bg-white rounded shadow-xl border border-slate-200 w-56 z-[9999] py-1 text-[13px] text-slate-700 font-medium"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            handleLancer(e as any, activeEvent);
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 font-bold border-b border-emerald-100"
                    >
                        <Play className="w-4 h-4 text-emerald-600" /> Launch Production
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2 mt-1">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg> Task Settings
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2" onClick={() => { setShowAddModal(true); setContextMenu(null); }}>
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> Add a subtask
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2" onClick={() => { setShowAddModal(true); setContextMenu(null); }}>
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add a task
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 12 12 22 2 12 12 2" /></svg> Add a milestone
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> Outdent
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 12 12 22 2 12 12 2" /></svg> Convert to milestone
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Copy
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-400 cursor-not-allowed">
                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg> Paste <span className="text-[10px] ml-1">(Copy needed first)</span>
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> Copy settings
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> Select
                    </button>
                    <button type="button" className="w-full text-left px-4 py-1.5 hover:bg-slate-50 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 bg-emerald-400 rounded-sm"></div> Choose a custom task color
                        </div>
                        <svg className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            deleteEvent(activeEvent.id);
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                    >
                        <svg className="w-3.5 h-3.5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> Delete
                    </button>
                </div>,
                document.body
            )}

            {/* ADD MODAL - Keeping it clean but simplified */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/30 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200">
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800 text-lg">Create task</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-light">&times;</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Task Model *</label>
                                <select
                                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    value={selectedModel}
                                    onChange={e => setSelectedModel(e.target.value)}
                                >
                                    <option value="">-- Select template --</option>
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>{m.meta_data.nom_modele}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Project/Chain *</label>
                                    <select
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        value={selectedChaine}
                                        onChange={e => setSelectedChaine(e.target.value)}
                                    >
                                        {CHAINES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        value={qteTotal || ''}
                                        onChange={e => setQteTotal(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Start date *</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        value={dateLancement}
                                        onChange={e => setDateLancement(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">End date *</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        value={dateExport}
                                        onChange={e => setDateExport(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded text-slate-600 font-medium hover:bg-slate-200 transition-colors text-sm">Cancel</button>
                            <button onClick={handleAddEvent} className="px-6 py-2 bg-emerald-500 text-white rounded font-medium hover:bg-emerald-600 transition-colors shadow-sm text-sm">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
