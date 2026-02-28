import React, { useState } from 'react';
import { ModelData, OrdreCoupe, Faisceau } from '../types';
import { Scissors, FileText, CheckCircle2, Clock, Search, Layers, ChevronRight, AlertCircle, Maximize, Printer, PackageSearch, Plus, Trash2, Barcode, FolderOpen, Send, CheckCircle, XCircle, Truck, PlayCircle, Save, Palette } from 'lucide-react';

const BADGE_COLORS = [
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
];
interface LaCoupeProps {
    models: ModelData[];
    setModels: React.Dispatch<React.SetStateAction<ModelData[]>>;
    onOpenInAtelier?: (model: ModelData) => void;
    currentModelId?: string | null;
    setFicheData?: React.Dispatch<React.SetStateAction<any>>;
}

export default function LaCoupe({ models, setModels, onOpenInAtelier, currentModelId, setFicheData }: LaCoupeProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);

    // Default Ordre de Coupe State
    const [ordre, setOrdre] = useState<OrdreCoupe>({
        refModele: '',
        longueurMatelas: 0,
        consommation: 0,
        nbrFeuilles: 0,
        nbrMatelas: 0,
        qteTotale: 0,
        status: 'EN_PREPARATION',
        faisceaux: []
    });

    // Determine which models show up in La Coupe: 
    // Either they explicitly have workflowStatus = 'COUPE' (sent from library)
    // Or they are drafts created here (isPublishedToLibrary = false)
    // Or they have no workflowStatus yet (legacy)
    const coupeModels = (models || []).filter(m =>
        m && (m.workflowStatus === 'COUPE' || m.isPublishedToLibrary === false || !m.workflowStatus)
    );

    const filteredModels = coupeModels.filter(m =>
        m && (m.meta_data?.nom_modele || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    const openModel = (model: ModelData) => {
        setSelectedModel(model);
        if (model.ordreCoupe) {
            setOrdre({
                ...model.ordreCoupe,
                qteTotale: model.ordreCoupe.qteTotale || model.meta_data?.quantity || 0,
                faisceaux: model.ordreCoupe.faisceaux || []
            });
        } else {
            setOrdre({
                refModele: model.meta_data?.nom_modele || 'Sans Nom',
                longueurMatelas: 0,
                consommation: 0,
                nbrFeuilles: 0,
                nbrMatelas: 0,
                qteTotale: model.meta_data?.quantity || 0,
                status: 'EN_PREPARATION',
                faisceaux: []
            });
        }
    };

    // Creates a new dummy model specifically for La Coupe
    const handleNewModel = () => {
        const dummyId = `DRAFT_${Date.now()}`;
        const newModel: ModelData = {
            id: dummyId,
            filename: `Draft_Coupe_${dummyId}.json`,
            workflowStatus: 'COUPE',
            isPublishedToLibrary: false, // EXCLUSIVE TO COUPE UNTIL PUBLISHED
            meta_data: {
                nom_modele: `Nouveau Modèle ${Math.floor(Math.random() * 1000)}`,
                date_creation: new Date().toISOString(),
                total_temps: 0,
                effectif: 1
            },
            gamme_operatoire: [],
            ordreCoupe: {
                refModele: `REF-${Math.floor(Math.random() * 10000)}`,
                longueurMatelas: 0,
                consommation: 0,
                nbrFeuilles: 0,
                nbrMatelas: 0,
                qteTotale: 0,
                status: 'EN_PREPARATION',
                faisceaux: []
            }
        };

        setModels(prev => [newModel, ...prev]);
        openModel(newModel);
    };

    const handleSaveCoupe = (publish: boolean = false, transferTo: string | null = null) => {
        if (!selectedModel) return;

        let finalStatus = ordre.status;
        let finalWorkflow = selectedModel.workflowStatus;
        let isPublished = selectedModel.isPublishedToLibrary;

        // If publishing, ensure it is visible in library
        if (publish) {
            isPublished = true;
        }

        // Handle specific transfers
        if (transferTo === 'METHODES') {
            finalWorkflow = 'METHODES';
        } else if (transferTo === 'PLANNING') {
            finalWorkflow = 'PLANNING';
        } else if (transferTo === 'SUIVI') {
            finalWorkflow = 'SUIVI';
        }

        setModels(prev => prev.map(m => {
            if (m.id === selectedModel.id) {
                return {
                    ...m,
                    workflowStatus: finalWorkflow,
                    isPublishedToLibrary: isPublished,
                    ordreCoupe: { ...ordre, status: finalStatus },
                    meta_data: {
                        ...(m.meta_data || {
                            nom_modele: '',
                            date_creation: new Date().toISOString(),
                            total_temps: 0,
                            effectif: 1
                        }),
                        nom_modele: ordre.refModele || m.meta_data?.nom_modele || 'Sans Nom'
                    }
                };
            }
            return m;
        }));

        if (transferTo) {
            setSelectedModel(null);
            alert(`Succès! Transféré vers ${transferTo}`);
        } else {
            alert("Sauvegarde effectuée !");
        }
    };

    // --- MATRIX LOGIC FOR BUNDLES ---
    const sizes = selectedModel?.ficheData?.sizes || selectedModel?.meta_data?.sizes || [];
    const colors = selectedModel?.ficheData?.colors || selectedModel?.meta_data?.colors || [];
    const gridQuantities = selectedModel?.ficheData?.gridQuantities || {};

    const matrixStats = React.useMemo(() => {
        const rowTotals: Record<string, number> = {};
        const colTotals: Record<number, number> = {};
        let grandTotal = 0;

        colors.forEach(c => { rowTotals[c.id || (typeof c === 'string' ? c : c.name)] = 0; });
        sizes.forEach((_, i) => { colTotals[i] = 0; });

        Object.entries(gridQuantities).forEach(([key, val]) => {
            const [cId, sIdxStr] = key.split('_');
            const sIdx = parseInt(sIdxStr);
            const qty = Number(val) || 0;

            if (rowTotals[cId] !== undefined) rowTotals[cId] += qty;
            if (colTotals[sIdx] !== undefined) colTotals[sIdx] += qty;
            grandTotal += qty;
        });

        return { rowTotals, colTotals, grandTotal };
    }, [gridQuantities, sizes, colors]);

    // Keep qteTotale heavily synced with matrix grand total
    React.useEffect(() => {
        if (selectedModel && matrixStats.grandTotal !== ordre.qteTotale) {
            setOrdre(prev => ({ ...prev, qteTotale: matrixStats.grandTotal }));
        }
    }, [matrixStats.grandTotal, selectedModel]);

    const updateQuantity = (colorId: string, sizeIndex: number, value: string) => {
        if (!selectedModel) return;

        // Ensure ficheData object exists
        const currentFiche = selectedModel.ficheData || {
            reference: '', article: '', category: '',
            sizes: selectedModel.meta_data.sizes || [],
            colors: selectedModel.meta_data.colors || [],
            quantity: selectedModel.meta_data.quantity || 0,
            date: selectedModel.meta_data.date_lancement || '',
            client: '', status: '', imageFront: null, imageBack: null,
            gridQuantities: {},
            designation: '', color: '', chaine: '', targetEfficiency: 85,
            unitCost: 0, clientPrice: 0, observations: '', costMinute: 0.85
        };

        const key = `${colorId}_${sizeIndex}`;
        const newQuantities = {
            ...currentFiche.gridQuantities,
            [key]: parseInt(value) || 0
        };

        const updatedFiche = { ...currentFiche, gridQuantities: newQuantities, quantity: matrixStats.grandTotal };

        // Save immediately to global models state
        setModels(prev => prev.map(m => {
            if (m.id === selectedModel.id) {
                return { ...m, ficheData: updatedFiche };
            }
            return m;
        }));

        // Update local selected model to reflect
        setSelectedModel({ ...selectedModel, ficheData: updatedFiche });

        // If the edited model is currently open in the Atelier, sync it live!
        if (currentModelId === selectedModel.id && setFicheData) {
            setFicheData(updatedFiche);
        }
    };

    const colorInputRef = React.useRef<HTMLInputElement>(null);

    const handleAddSize = () => {
        if (!selectedModel) return;
        const newSize = prompt("Entrez la nouvelle taille (ex: 3XL, 42, etc.) :");
        if (newSize && newSize.trim() !== '') {
            const currentFiche = selectedModel.ficheData || {
                reference: '', article: '', category: '',
                sizes: selectedModel.meta_data.sizes || [],
                colors: selectedModel.meta_data.colors || [],
                quantity: selectedModel.meta_data.quantity || 0,
                date: selectedModel.meta_data.date_lancement || '',
                client: '', status: '', imageFront: null, imageBack: null,
                gridQuantities: {}, designation: '', color: '', chaine: '', targetEfficiency: 85,
                unitCost: 0, clientPrice: 0, observations: '', costMinute: 0.85
            };
            const updatedSizes = [...currentFiche.sizes, newSize.trim().toUpperCase()];
            const updatedFiche = { ...currentFiche, sizes: updatedSizes };

            setModels(prev => prev.map(m => m.id === selectedModel.id ? { ...m, ficheData: updatedFiche } : m));
            setSelectedModel({ ...selectedModel, ficheData: updatedFiche });
            if (currentModelId === selectedModel.id && setFicheData) setFicheData(updatedFiche);
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedModel) return;
        const hex = e.target.value;
        const colorName = prompt(`Couleur sélectionnée. Entrez son nom (ex: Rouge, Noir) :`, "Nouvelle Couleur");
        if (colorName && colorName.trim() !== '') {
            const currentFiche = selectedModel.ficheData || {
                reference: '', article: '', category: '',
                sizes: selectedModel.meta_data.sizes || [],
                colors: selectedModel.meta_data.colors || [],
                quantity: selectedModel.meta_data.quantity || 0,
                date: selectedModel.meta_data.date_lancement || '',
                client: '', status: '', imageFront: null, imageBack: null,
                gridQuantities: {}, designation: '', color: '', chaine: '', targetEfficiency: 85,
                unitCost: 0, clientPrice: 0, observations: '', costMinute: 0.85
            };
            const newColor = { id: hex, name: colorName.trim() };
            const updatedColors = [...currentFiche.colors, newColor];
            const updatedFiche = { ...currentFiche, colors: updatedColors };

            setModels(prev => prev.map(m => m.id === selectedModel.id ? { ...m, ficheData: updatedFiche } : m));
            setSelectedModel({ ...selectedModel, ficheData: updatedFiche });
            if (currentModelId === selectedModel.id && setFicheData) setFicheData(updatedFiche);
        }
    };

    const handleGenerateBarcodes = () => {
        alert("Impression des étiquettes code-barres générée depuis la matrice...");
    };

    // UI Helpers calculate
    const consoTheorique = (ordre.longueurMatelas || 0) * (ordre.nbrFeuilles || 0) * (ordre.nbrMatelas || 0);
    const consoReelle = (ordre.consommation || 0) * (ordre.qteTotale || 0);
    const waste = consoTheorique > 0 ? ((consoTheorique - consoReelle) / consoTheorique * 100).toFixed(1) : 0;

    // Status config mapping for visual styles
    const STATUS_MAP = {
        'EN_PREPARATION': { label: 'En Préparation', color: 'text-slate-700 border-slate-300', icon: Clock },
        'EN_COURS': { label: 'En Cours de Coupe', color: 'text-blue-700 border-blue-400', icon: PlayCircle },
        'SOUS_TRAITANCE': { label: 'Extériorisé', color: 'text-purple-700 border-purple-400', icon: Truck },
        'VALIDE': { label: 'OK / Validé', color: 'text-emerald-700 border-emerald-400', icon: CheckCircle },
        'REJETE': { label: 'NO OK / Rejeté', color: 'text-red-700 border-red-400', icon: XCircle },
    };

    // Add a helper for text coloring without background (for the dropdown)
    const getTextColor = (statusKey: string) => {
        switch (statusKey) {
            case 'EN_PREPARATION': return 'text-slate-700 font-bold';
            case 'EN_COURS': return 'text-blue-700 font-bold';
            case 'SOUS_TRAITANCE': return 'text-purple-700 font-bold';
            case 'VALIDE': return 'text-emerald-700 font-bold';
            case 'REJETE': return 'text-red-700 font-bold';
            default: return 'text-slate-700 font-bold';
        }
    }

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] relative">
            {/* HEADER - Premium Gradient & Glassmorphism */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-6 shrink-0 z-10 sticky top-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                        <Scissors className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            La Coupe <span className="text-xl text-slate-400 font-medium">| Ordre de Fabrication</span>
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium text-sm">Créez des ordres, générez les faisceaux, suivez l'état, ou transférez vers les Méthodes.</p>
                    </div>
                </div>
                <div className="flex gap-3 text-sm flex-wrap justify-end">
                    {/* ONLY SHOW ACTION BUTTONS IF A MODEL IS SELECTED */}
                    {selectedModel && (
                        <>
                            <button
                                onClick={() => onOpenInAtelier && onOpenInAtelier(selectedModel)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 font-bold rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                            >
                                <Layers className="w-4 h-4" />
                                <span className="hidden sm:inline">Méthodes</span>
                            </button>
                            {ordre.status === 'VALIDE' && (
                                <button
                                    onClick={() => handleSaveCoupe(false, 'PLANNING')}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    Envoi vers Planning
                                </button>
                            )}
                            <button
                                onClick={() => handleSaveCoupe(false)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 border border-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
                            >
                                <Save className="w-4 h-4" />
                                <span className="hidden sm:inline">Sauvegarder</span>
                            </button>
                            {selectedModel.isPublishedToLibrary === false && (
                                <button
                                    onClick={() => handleSaveCoupe(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all border border-rose-600"
                                >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">Publier</span>
                                </button>
                            )}
                        </>
                    )}

                    {!selectedModel && (
                        <button onClick={handleNewModel} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30">
                            <Plus className="w-4 h-4" />
                            Nouvel Ordre (Draft)
                        </button>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Rapport</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* LEFT LIST: Models to cut */}
                <div className="w-[380px] shrink-0 border-r border-slate-200 bg-white/50 flex flex-col h-full backdrop-blur-sm">
                    <div className="p-5 border-b border-slate-200/50">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Rechercher un modèle..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-2xl outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 shadow-sm transition-all placeholder:font-medium placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">Liste de Coupe ({filteredModels.length})</h3>
                        {filteredModels.map(model => {
                            const isSelected = selectedModel?.id === model.id;
                            const st = model.ordreCoupe?.status || 'EN_PREPARATION';
                            const conf = STATUS_MAP[st as keyof typeof STATUS_MAP] || STATUS_MAP['EN_PREPARATION'];
                            const Icon = conf.icon;

                            return (
                                <div
                                    key={model.id}
                                    onClick={() => openModel(model)}
                                    className={`group flex items-center gap-4 p-3 pr-4 rounded-2xl cursor-pointer transition-all duration-300 ${isSelected
                                        ? 'bg-rose-500 shadow-lg shadow-rose-500/25 border-transparent translate-x-2'
                                        : 'bg-white border border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-md hover:-translate-y-0.5'}`}
                                >
                                    <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                        {model.image || model.images?.front ? (
                                            <img src={model.image || model.images?.front} alt="Model" className="w-full h-full object-cover" />
                                        ) : (
                                            <FileText className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold truncate text-base ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                            {model.meta_data.nom_modele} {model.meta_data.reference ? <span className="text-[10px] text-slate-400 font-normal">| {model.meta_data.reference}</span> : ''}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            {model.isPublishedToLibrary === false && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-amber-600 bg-amber-100">Draft</span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${isSelected ? 'bg-white/20 border-white/20 text-white' : conf.color}`}>
                                                {/* <Icon className="w-3 h-3" /> */} {conf.label}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'text-white translate-x-1' : 'text-slate-300 group-hover:text-rose-400'}`} />
                                </div>
                            );
                        })}

                        {filteredModels.length === 0 && (
                            <div className="text-center py-12 px-6">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Scissors className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-bold">Aucun ordre de coupe.</p>
                                <p className="text-slate-400 text-sm mt-2">Créez-en un nouveau ou importez-en depuis la bibliothèque.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {selectedModel ? (
                        <div className="w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">

                            {/* MAIN ORDER CARD */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">

                                {/* Form Top Section - Dark Modern Block */}
                                <div className="bg-slate-900 border-b border-white/10 p-8 sm:p-10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

                                    <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                                        <div className="flex gap-6 items-center">
                                            <div className="w-24 h-24 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
                                                {(selectedModel.image || selectedModel.images?.front) ? (
                                                    <img src={selectedModel.image || selectedModel.images?.front} alt="Model" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <div className="w-full h-full bg-white/5 rounded-xl flex items-center justify-center">
                                                        <Scissors className="w-10 h-10 text-white/50" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Ordre de Fabrication</span>
                                                    <span className="text-slate-400 font-medium text-sm">Ref: {ordre.refModele || 'N/A'}</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={ordre.refModele}
                                                    onChange={e => setOrdre({ ...ordre, refModele: e.target.value })}
                                                    className="bg-transparent text-4xl font-black text-white tracking-tight border-b-2 border-transparent hover:border-white/20 focus:border-rose-500 outline-none w-full xl:w-96 transition-colors"
                                                    placeholder="Nom de la référence..."
                                                />
                                                <p className="text-slate-400 mt-2 font-medium">Saisissez les paramètres de matelassage pour valider le lancement.</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[200px] text-center flex flex-col justify-center items-center">
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Quantité Totale Ciblée</p>
                                            <div className="flex items-end gap-2 text-white">
                                                <input
                                                    type="number"
                                                    value={ordre.qteTotale || ''}
                                                    readOnly
                                                    className="w-24 bg-white/5 border border-white/10 rounded-lg text-center font-black text-3xl text-white outline-none py-1 cursor-not-allowed opacity-80"
                                                    placeholder="0"
                                                />
                                                <span className="text-rose-400 font-bold mb-1">Pièces</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="p-8 sm:p-10 bg-white">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <Layers className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="font-black text-slate-800 text-xl">Paramètres du Matelas</h3>
                                        <div className="flex-1 h-px bg-slate-100 ml-4"></div>

                                        {/* STATUT DROPDOWN */}
                                        <div className="w-64">
                                            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">État de l'Ordre</label>
                                            <select
                                                value={ordre.status}
                                                onChange={(e) => setOrdre({ ...ordre, status: e.target.value as any })}
                                                className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-colors ${getTextColor(ordre.status)}`}
                                            >
                                                {Object.entries(STATUS_MAP).map(([key, config]) => (
                                                    <option key={key} value={key} className="text-slate-800 font-bold">
                                                        {config.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                        {/* Longueur */}
                                        <div className="group">
                                            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide group-focus-within:text-indigo-500 transition-colors">Longueur du Matelas</label>
                                            <div className="relative">
                                                <input
                                                    type="number" step="0.01"
                                                    value={ordre.longueurMatelas || ''}
                                                    onChange={e => setOrdre({ ...ordre, longueurMatelas: Number(e.target.value) })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-5 pr-12 py-3.5 font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-md text-xs">Mètres</span>
                                            </div>
                                        </div>

                                        {/* Consommation */}
                                        <div className="group">
                                            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide group-focus-within:text-indigo-500 transition-colors">Consommation / Pièce</label>
                                            <div className="relative">
                                                <input
                                                    type="number" step="0.01"
                                                    value={ordre.consommation || ''}
                                                    onChange={e => setOrdre({ ...ordre, consommation: Number(e.target.value) })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-5 pr-12 py-3.5 font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-md text-xs">Mètres</span>
                                            </div>
                                        </div>

                                        {/* Feuilles & Matelas */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide group-focus-within:text-blue-500 transition-colors">Nbre Feuilles</label>
                                                <input
                                                    type="number"
                                                    value={ordre.nbrFeuilles || ''}
                                                    onChange={e => setOrdre({ ...ordre, nbrFeuilles: Number(e.target.value) })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="group">
                                                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide group-focus-within:text-blue-500 transition-colors">Nbre Matelas</label>
                                                <input
                                                    type="number"
                                                    value={ordre.nbrMatelas || ''}
                                                    onChange={e => setOrdre({ ...ordre, nbrMatelas: Number(e.target.value) })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Intelligence Panel: Estimations & Alerts */}
                                    {Number(waste) > 0 && (
                                        <div className="mt-8 p-5 bg-orange-50 rounded-2xl border border-orange-200 flex gap-4">
                                            <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-orange-800">Analyse de Déchet (Chute)</h4>
                                                <p className="text-orange-700/80 text-sm mt-1 font-medium">L'écart entre le tissu théoriquement déroulé ({consoTheorique.toFixed(2)}m) et la consommation réelle par pièce ({consoReelle.toFixed(2)}m) génère un taux de chute de <strong>{waste}%</strong>.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* MATRIX CARD - SYNCED WITH FICHE TECHNIQUE */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-6">
                                <div className="p-8 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                            <Palette className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-2xl tracking-tight">Matrice des Tailles / Couleurs</h3>
                                            <p className="text-slate-500 font-medium mt-1">Générez et visualisez vos faisceaux à partir de cette grille synchronisée.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-center">
                                        <input
                                            type="color"
                                            ref={colorInputRef}
                                            onChange={handleColorChange}
                                            className="sr-only" // hidden 
                                        />
                                        <button
                                            onClick={() => colorInputRef.current?.click()}
                                            className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Coloris
                                        </button>
                                        <button
                                            onClick={handleAddSize}
                                            className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Taille
                                        </button>
                                        <button
                                            onClick={handleGenerateBarcodes}
                                            disabled={matrixStats.grandTotal === 0}
                                            className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                                        >
                                            <Barcode className="w-4 h-4" />
                                            Imprimer Tickets
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 sm:p-8 overflow-x-auto bg-slate-50">
                                    <table className="w-full text-sm border-collapse rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider">
                                                <th className="py-4 px-4 text-right font-black border-l border-slate-200 min-w-[140px]">Couleur \\ Taille</th>
                                                {sizes.length === 0 && (
                                                    <th className="py-4 px-4 text-center font-normal italic text-slate-400 border-l border-slate-200">
                                                        Aucune taille
                                                    </th>
                                                )}
                                                {sizes.map((s, i) => (
                                                    <th key={i} className="py-4 px-3 text-center font-black border-l border-slate-200 text-emerald-700 min-w-[90px]">
                                                        {s}
                                                    </th>
                                                ))}
                                                <th className="py-4 px-4 text-center font-black bg-slate-200 text-slate-800 w-24">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {colors.length === 0 && (
                                                <tr>
                                                    <td colSpan={sizes.length + 2} className="py-8 text-center text-slate-400 font-medium">
                                                        Aucune couleur définie. Veuillez les renseigner dans la Fiche Technique.
                                                    </td>
                                                </tr>
                                            )}
                                            {colors.map((c, cIdx) => {
                                                const cId = c.id || (typeof c === 'string' ? c : c.name);
                                                const cName = c.name || (typeof c === 'string' ? c : c.id);
                                                const cHex = c.id && c.id.startsWith('#') ? c.id : null;
                                                const palette = BADGE_COLORS[cIdx % BADGE_COLORS.length];

                                                return (
                                                    <tr key={cId} className="hover:bg-emerald-50/20 group transition-colors">
                                                        <td className="py-3 px-4 border-l border-slate-200 font-bold text-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={`w-3 h-3 rounded-full shadow-sm ${cHex ? '' : palette.dot}`}
                                                                    style={cHex ? { backgroundColor: cHex } : undefined}
                                                                />
                                                                <span className="truncate max-w-[120px]">{cName}</span>
                                                            </div>
                                                        </td>
                                                        {sizes.length === 0 && (
                                                            <td className="py-3 px-4 border-l border-slate-100 bg-slate-50/50 text-center text-slate-400 text-xl font-light">-</td>
                                                        )}
                                                        {sizes.map((s, sIdx) => {
                                                            const key = `${cId}_${sIdx}`;
                                                            // eslint-disable-next-line
                                                            const val = gridQuantities[key] || '';
                                                            return (
                                                                <td key={sIdx} className="p-0 border-l border-slate-100 bg-white hover:bg-emerald-50/50 transition-colors relative">
                                                                    <input
                                                                        type="number" min="0"
                                                                        className="w-full h-full text-center py-4 bg-transparent outline-none focus:bg-emerald-50 focus:text-emerald-700 font-bold text-base placeholder:text-slate-200 transition-colors"
                                                                        placeholder="0"
                                                                        value={val}
                                                                        onChange={(e) => updateQuantity(cId, sIdx, e.target.value)}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="py-3 px-4 text-center border-l border-slate-200 bg-slate-50 font-black text-slate-800 text-lg group-hover:bg-slate-100 transition-colors">
                                                            {matrixStats.rowTotals[cId] || 0}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="border-t border-slate-200 bg-slate-50">
                                            <tr>
                                                <td className="py-4 px-4 text-left font-black text-slate-600 border-l border-slate-200">
                                                    GÉNÉRAL
                                                </td>
                                                {sizes.length === 0 && (
                                                    <td className="py-3 px-4 text-center text-slate-400 border-l border-slate-200">-</td>
                                                )}
                                                {sizes.map((_, sIdx) => {
                                                    const colTotal = matrixStats.colTotals[sIdx] || 0;
                                                    return (
                                                        <td key={sIdx} className="py-3 px-3 text-center border-l border-slate-200 font-black text-slate-700">
                                                            {colTotal}
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3 px-4 text-center bg-emerald-600 text-white shadow-inner font-black text-xl">
                                                    {matrixStats.grandTotal}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 flex justify-end shadow-sm">
                                {/* If we want a shortcut to publish & validate in one click */}
                                {!selectedModel.isPublishedToLibrary && (
                                    <button
                                        onClick={() => handleSaveCoupe(true)}
                                        className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                    >
                                        <Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                        Valider & Publier Officiellement
                                    </button>
                                )}
                            </div>

                            {/* Empty space at the bottom for scroll comfort */}
                            <div className="h-10"></div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-32 h-32 bg-slate-200/50 rounded-full flex items-center justify-center mb-6 relative">
                                <Maximize className="absolute inset-0 w-full h-full text-slate-100 animate-spin-slow" style={{ animationDuration: '20s' }} />
                                <Scissors className="w-12 h-12 text-slate-400 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-700 tracking-tight">Sélectionnez un Ordre</h2>
                            <p className="text-slate-500 font-medium mt-3 max-w-md">Sélectionnez un modèle dans la liste de gauche ou créez-en un nouveau pour commencer le paramétrage.</p>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
