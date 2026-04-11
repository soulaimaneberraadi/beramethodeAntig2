import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Plus, Trash2, Info, Building2, Search, Tag, Filter, X, Save, Edit2 } from 'lucide-react';
import { Material } from '../types';
import { fmt } from '../constants';

interface MaterialsListProps {
    t: any;
    currency: string;
    darkMode: boolean;
    materials: Material[];
    addMaterial: () => void;
    updateMaterial: (id: number, field: string, value: string | number | any) => void;
    deleteMaterial: (id: number) => void;
    bgCard: string;
    bgCardHeader: string;
    textPrimary: string;
    textSecondary: string;
    tableHeader: string;
    tableRowHover: string;
    totalMaterials: number;
}

interface MagasinItem {
    id: string;
    nom: string;
    designation?: string;
    reference?: string;
    prixUnitaire?: number;
    stockActuel?: number;
    stockAlerte?: number;
    unite?: string;
    categorie?: string;
    fournisseur?: string;
    fournisseurNom?: string;
    fournisseurTel?: string;
    delaiLivraison?: number;
    photo?: string;
    emplacement?: string;
}

const MaterialsList: React.FC<MaterialsListProps> = ({
    t, currency, darkMode, materials, addMaterial, updateMaterial, deleteMaterial,
    bgCard, bgCardHeader, textPrimary, textSecondary, tableHeader, tableRowHover,
    totalMaterials
}) => {
    const optionStyle = darkMode ? { backgroundColor: '#1f2937', color: 'white' } : {};
    const inputStyle = `w-full rounded-md px-2 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 text-white border-gray-600 focus:bg-gray-600' : 'bg-white border-slate-300 text-slate-900 focus:bg-white'} border`;

    const [magasinData, setMagasinData] = useState<MagasinItem[]>([]);
    const [focusedRow, setFocusedRow] = useState<number | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const CATEGORY_LABELS: Record<string, string> = {
        'all': 'Tout',
        'tissu': 'Tissu',
        'fil': 'Fil',
        'bouton': 'Bouton',
        'fermeture': 'Fermeture',
        'etiquette': 'Étiquette',
        'emballage': 'Emballage',
        'autre': 'Autre'
    };

    const CATEGORY_COLORS: Record<string, string> = {
        'tissu': 'bg-blue-100 text-blue-700 border-blue-200',
        'fil': 'bg-purple-100 text-purple-700 border-purple-200',
        'bouton': 'bg-amber-100 text-amber-700 border-amber-200',
        'fermeture': 'bg-rose-100 text-rose-700 border-rose-200',
        'etiquette': 'bg-teal-100 text-teal-700 border-teal-200',
        'emballage': 'bg-orange-100 text-orange-700 border-orange-200',
        'autre': 'bg-slate-100 text-slate-700 border-slate-200'
    };

    const availableCategories = useMemo(() => {
        const cats = new Set(magasinData.map(m => m.categorie || 'autre'));
        return ['all', ...Array.from(cats)];
    }, [magasinData]);

    // --- QUICK ADD TO MAGASIN STATE ---
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [quickAddForm, setQuickAddForm] = useState<Partial<MagasinItem>>({
        unite: 'm', categorie: 'tissu', reference: `REF-${Math.floor(Math.random() * 9000) + 1000}`
    });
    const [quickAddTargetRow, setQuickAddTargetRow] = useState<number | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const CATS = ['tissu', 'fil', 'bouton', 'fermeture', 'etiquette', 'emballage', 'autre'] as const;
    const UNITS = ['m', 'kg', 'piece', 'cone', 'boite', 'rouleau'] as const;

    const handleQuickAdd = () => {
        if (!quickAddForm.nom) return;
        const newItem: MagasinItem = {
            id: Date.now().toString(),
            nom: quickAddForm.nom,
            designation: quickAddForm.nom,
            reference: quickAddForm.reference || `REF-${Math.floor(Math.random() * 10000)}`,
            prixUnitaire: Number(quickAddForm.prixUnitaire) || 0,
            stockActuel: Number(quickAddForm.stockActuel) || 0,
            stockAlerte: Number(quickAddForm.stockAlerte) || 10,
            unite: quickAddForm.unite || 'm',
            categorie: quickAddForm.categorie as any,
            fournisseurNom: quickAddForm.fournisseurNom || '',
            fournisseurTel: quickAddForm.fournisseurTel || '',
            photo: quickAddForm.photo || '',
            emplacement: quickAddForm.emplacement || '',
            delaiLivraison: Number(quickAddForm.delaiLivraison) || 0,
        };

        // Save to magasin (auto-sync to Base Produit)
        const updatedMagasin = [newItem, ...magasinData];
        setMagasinData(updatedMagasin);
        localStorage.setItem('beramethode_magasin', JSON.stringify(updatedMagasin));

        // Also sync to beramethode_products for Base Produit compatibility
        try {
            const existing = JSON.parse(localStorage.getItem('beramethode_products') || '[]');
            const productEntry = {
                id: newItem.id, reference: newItem.reference, designation: newItem.nom,
                categorie: newItem.categorie, unite: newItem.unite, prixUnitaire: newItem.prixUnitaire,
                stockAlerte: newItem.stockAlerte, photo: newItem.photo, emplacement: newItem.emplacement,
                fournisseurNom: newItem.fournisseurNom, fournisseurTel: newItem.fournisseurTel,
            };
            localStorage.setItem('beramethode_products', JSON.stringify([productEntry, ...existing]));
        } catch (e) { /* ignore */ }

        // Update current row in Cost Calculator
        if (quickAddTargetRow !== null) {
            updateMaterial(quickAddTargetRow, 'IMPORT_MAGASIN', { ...newItem, prix: newItem.prixUnitaire, fournisseur: newItem.fournisseurNom });
        }

        // Close and reset
        setShowQuickAddModal(false);
        setQuickAddForm({ unite: 'm', categorie: 'tissu', reference: `REF-${Math.floor(Math.random() * 9000) + 1000}` });
        setQuickAddTargetRow(null);
    };

    useEffect(() => {
        try {
            const data = localStorage.getItem('beramethode_magasin');
            if (data) {
                setMagasinData(JSON.parse(data));
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    return (
        <>
            {/* QUICK ADD MODAL — Matches Base Produit (Magasin.tsx ProductModal) design */}
            {showQuickAddModal && (
                <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-500" /> Nouvel Article
                            </h2>
                            <button onClick={() => setShowQuickAddModal(false)} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {/* Photo + Basic info */}
                            <div className="flex gap-5">
                                <div
                                    onClick={() => photoInputRef.current?.click()}
                                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 transition-colors"
                                >
                                    {quickAddForm.photo
                                        ? <img src={quickAddForm.photo} className="w-full h-full object-cover" alt="" />
                                        : <span className="text-xs font-bold text-slate-400">Photo</span>
                                    }
                                </div>
                                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const r = new FileReader();
                                    r.onload = ev => setQuickAddForm(prev => ({ ...prev, photo: ev.target?.result as string }));
                                    r.readAsDataURL(file);
                                }} />
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Référence (Code-barres)</label>
                                        <input className={inputStyle} value={quickAddForm.reference || ''} onChange={e => setQuickAddForm({ ...quickAddForm, reference: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Désignation *</label>
                                        <input className={`${inputStyle} font-bold`} placeholder="Ex: Fil Coton Noir..." value={quickAddForm.nom || ''} onChange={e => setQuickAddForm({ ...quickAddForm, nom: e.target.value })} autoFocus />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Catégorie</label>
                                        <select className={inputStyle} value={quickAddForm.categorie || 'tissu'} onChange={e => setQuickAddForm({ ...quickAddForm, categorie: e.target.value })}>
                                            {CATS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Unité</label>
                                        <select className={inputStyle} value={quickAddForm.unite || 'm'} onChange={e => setQuickAddForm({ ...quickAddForm, unite: e.target.value })}>
                                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing & Stock */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Prix u. ({currency})</label>
                                    <input className={`${inputStyle} text-indigo-700 font-black`} type="number" min="0" step="0.01" value={quickAddForm.prixUnitaire || ''} onChange={e => setQuickAddForm({ ...quickAddForm, prixUnitaire: Math.max(0, Number(e.target.value)) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Stock Initial</label>
                                    <input className={inputStyle} type="number" min="0" value={quickAddForm.stockActuel || ''} onChange={e => setQuickAddForm({ ...quickAddForm, stockActuel: Math.max(0, Number(e.target.value)) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Seuil de réappro.</label>
                                    <input className={inputStyle} type="number" min="0" value={quickAddForm.stockAlerte || ''} onChange={e => setQuickAddForm({ ...quickAddForm, stockAlerte: Math.max(0, Number(e.target.value)) })} />
                                </div>
                            </div>

                            {/* Supplier Section */}
                            <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fournisseur Privilégié</label>
                                        <input className={inputStyle} placeholder="Entreprise..." value={quickAddForm.fournisseurNom || ''} onChange={e => setQuickAddForm({ ...quickAddForm, fournisseurNom: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Téléphone Frs.</label>
                                        <input className={inputStyle} placeholder="+212..." value={quickAddForm.fournisseurTel || ''} onChange={e => setQuickAddForm({ ...quickAddForm, fournisseurTel: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Emplacement physique</label>
                                        <input className={inputStyle} placeholder="Rayon A, Étagère 3..." value={quickAddForm.emplacement || ''} onChange={e => setQuickAddForm({ ...quickAddForm, emplacement: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Délai livraison (jours)</label>
                                        <input className={inputStyle} type="number" min="0" placeholder="Ex: 7" value={quickAddForm.delaiLivraison || ''} onChange={e => setQuickAddForm({ ...quickAddForm, delaiLivraison: Math.max(0, Number(e.target.value)) })} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setShowQuickAddModal(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Annuler</button>
                            <button onClick={handleQuickAdd} className="px-6 py-2 text-sm font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-md">
                                <Save className="w-4 h-4" /> Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`rounded-xl shadow-sm border overflow-visible ${bgCard}`}>
                <div className={`px-4 py-4 border-b flex justify-between items-center ${bgCardHeader}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className={`font-bold ${textPrimary}`}>{t.materials}</h2>
                            <p className={`text-xs ${textSecondary}`}>Ajoutez vos matières ou sélectionnez depuis le magasin</p>
                        </div>
                    </div>
                    <button onClick={addMaterial} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm active:scale-95">
                        <Plus className="w-4 h-4" /> {t.addMat}
                    </button>
                </div>

                <div className="overflow-visible">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-slate-50 text-slate-500'} uppercase text-[10px] tracking-wider border-b ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                            <tr>
                                <th className="px-4 py-3 font-bold w-1/3">{t.matName}</th>
                                <th className="px-4 py-3 font-bold w-32">{t.price} ({currency})</th>
                                <th className="px-4 py-3 font-bold w-48 text-center">{t.qtyUnit}</th>
                                <th className="px-4 py-3 font-bold w-32 text-right">{t.total}</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-slate-100'}`}>
                            {materials.map((item) => {
                                const filteredMagasin = focusedRow === item.id
                                    ? magasinData.filter(m => {
                                        const searchName = (m.nom || m.designation || '').toLowerCase();
                                        const searchRef = (m.reference || '').toLowerCase();
                                        const searchCat = (m.categorie || '').toLowerCase();
                                        const query = (item.name || '').toLowerCase();
                                        const matchesText = searchName.includes(query) || searchRef.includes(query) || searchCat.includes(query);
                                        const matchesCategory = categoryFilter === 'all' || m.categorie === categoryFilter;
                                        return matchesText && matchesCategory;
                                    })
                                    : [];

                                return (
                                    <tr key={item.id} className={`group ${tableRowHover} transition-colors`}>
                                        <td className="p-3 align-middle relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => updateMaterial(item.id, 'name', e.target.value)}
                                                    onFocus={() => setFocusedRow(item.id)}
                                                    onBlur={() => setTimeout(() => setFocusedRow(null), 250)}
                                                    className={`${inputStyle} font-medium pr-8`}
                                                    placeholder="Rechercher matière..."
                                                />
                                                <Search className="w-3 h-3 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                                            </div>

                                            {/* SELECTED MATERIAL INFO CARD */}
                                            {item.magasinId && (item.fournisseur || item.reference || item.categorie) && focusedRow !== item.id && (
                                                <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-top-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {item.reference && (
                                                            <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                {item.reference}
                                                            </span>
                                                        )}
                                                        {item.categorie && (
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[item.categorie] || CATEGORY_COLORS['autre']}`}>
                                                                <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                                                                {CATEGORY_LABELS[item.categorie] || item.categorie}
                                                            </span>
                                                        )}
                                                        {item.fournisseur && (
                                                            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                                                <Building2 className="w-3 h-3" /> {item.fournisseur}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.stockActuel !== undefined && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                (item.stockActuel || 0) === 0 ? 'bg-red-100 text-red-700' :
                                                                (item.stockActuel || 0) <= (item.stockAlerte || 0) ? 'bg-amber-100 text-amber-700' :
                                                                'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                Stock: {item.stockActuel} {item.unit}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {item.fournisseur && !item.magasinId && (
                                                <div className="text-[10px] text-blue-600 mt-1.5 flex items-center gap-1 font-bold animate-in fade-in slide-in-from-top-1">
                                                    <Building2 className="w-3 h-3" /> {item.fournisseur}
                                                </div>
                                            )}

                                            {/* ADVANCED AUTOCOMPLETE DROPDOWN */}
                                            {focusedRow === item.id && (filteredMagasin.length > 0 || (item.name && filteredMagasin.length === 0) || categoryFilter !== 'all') && (
                                                <div className="absolute z-[100] left-3 right-3 top-[44px] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-hidden animate-in fade-in slide-in-from-top-1 flex flex-col">
                                                    {/* CATEGORY FILTER TABS */}
                                                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100 bg-slate-50/80 flex-wrap">
                                                        <Filter className="w-3 h-3 text-slate-400 mr-0.5" />
                                                        {availableCategories.map(cat => (
                                                            <button
                                                                key={cat}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setCategoryFilter(cat);
                                                                }}
                                                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                                                    categoryFilter === cat
                                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                        : cat === 'all'
                                                                            ? 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                                            : `${CATEGORY_COLORS[cat] || 'bg-slate-100 text-slate-600 border-slate-200'} hover:opacity-80`
                                                                }`}
                                                            >
                                                                {CATEGORY_LABELS[cat] || cat}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* RESULTS LIST */}
                                                    <div className="overflow-y-auto max-h-60">
                                                    {filteredMagasin.length > 0 ? (
                                                        filteredMagasin.map(m => {
                                                            const stock = m.stockActuel || 0;
                                                            const alerte = m.stockAlerte || 0;
                                                            const price = m.prixUnitaire || (m as any).prix || 0;
                                                            const isDanger = stock <= alerte;
                                                            const isZero = stock === 0;
                                                            const catColor = CATEGORY_COLORS[m.categorie || 'autre'] || CATEGORY_COLORS['autre'];

                                                            return (
                                                                <div
                                                                    key={m.id}
                                                                    className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-indigo-50/50 flex flex-col transition ${isZero ? 'opacity-60' : ''}`}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        updateMaterial(item.id, 'IMPORT_MAGASIN', { ...m, prix: price });
                                                                        setFocusedRow(null);
                                                                        setCategoryFilter('all');
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex flex-col">
                                                                            <span className={`font-bold text-sm ${isZero ? 'text-red-600 line-through' : 'text-slate-800'}`}>{m.nom || m.designation}</span>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] text-slate-400 font-mono">{m.reference || 'Aucune Réf'}</span>
                                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${catColor}`}>
                                                                                    {CATEGORY_LABELS[m.categorie || 'autre'] || m.categorie}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{price.toFixed(2)} {currency} / {m.unite || 'pc'}</span>
                                                                            <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${isZero ? 'bg-red-100 text-red-700' : isDanger ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                                Stock: {stock} {m.unite}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {m.fournisseur && (
                                                                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1.5">
                                                                            <Building2 className="w-3 h-3" /> {m.fournisseur}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="p-4">
                                                            <div className="text-xs text-slate-500 text-center italic mb-3">
                                                                Aucune matière trouvée {item.name ? `pour "${item.name}"` : ''} {categoryFilter !== 'all' ? `dans la catégorie "${CATEGORY_LABELS[categoryFilter]}"` : ''}
                                                            </div>
                                                            {item.name && item.name.length > 1 && (
                                                                <button
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setQuickAddTargetRow(item.id);
                                                                        setQuickAddForm({ ...quickAddForm, nom: item.name });
                                                                        setShowQuickAddModal(true);
                                                                        setFocusedRow(null);
                                                                        setCategoryFilter('all');
                                                                    }}
                                                                    className="w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    <Plus className="w-3 h-3" /> Ajouter "{item.name}" au Magasin
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 align-middle">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.unitPrice}
                                                onChange={(e) => updateMaterial(item.id, 'unitPrice', e.target.value)}
                                                className={`${inputStyle} text-center font-mono`}
                                            />
                                        </td>
                                        <td className="p-3 align-middle">
                                            <div className="flex flex-col gap-2 items-center">
                                                <div className="flex items-center gap-2 w-full">
                                                    {item.unit === 'bobine' ? (
                                                        <div className={`flex-1 rounded-md px-2 py-1.5 text-center text-sm font-mono border ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-600 shadow-inner'}`}>
                                                            {fmt(item.qty)}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.001"
                                                            value={item.qty}
                                                            onChange={(e) => updateMaterial(item.id, 'qty', e.target.value)}
                                                            className={`${inputStyle} text-center flex-1 font-mono`}
                                                        />
                                                    )}
                                                    <select
                                                        value={item.unit}
                                                        onChange={(e) => updateMaterial(item.id, 'unit', e.target.value)}
                                                        className={`w-20 rounded-md px-2 py-1.5 text-sm outline-none border transition-all focus:ring-2 focus:ring-blue-500 cursor-pointer ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-slate-50 border-slate-300 text-slate-700 font-bold'}`}
                                                    >
                                                        <option value="m" style={optionStyle}>m</option>
                                                        <option value="pc" style={optionStyle}>pc</option>
                                                        <option value="kg" style={optionStyle}>kg</option>
                                                        <option value="g" style={optionStyle}>g</option>
                                                        <option value="bobine" style={optionStyle}>bobine</option>
                                                        <option value="cm" style={optionStyle}>cm</option>
                                                        <option value="cone" style={optionStyle}>cône</option>
                                                        <option value="l" style={optionStyle}>L</option>
                                                    </select>
                                                </div>
                                                {item.unit === 'bobine' && (
                                                    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded border shadow-sm w-full animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                                                        <span className="text-[10px] text-blue-600 font-bold w-12">Fil (m):</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="Métrage"
                                                            value={item.threadMeters || ''}
                                                            onChange={(e) => updateMaterial(item.id, 'threadMeters', e.target.value)}
                                                            className={`w-full text-xs font-mono border rounded px-1 outline-none text-center h-6 ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-blue-200 text-slate-700'}`}
                                                        />
                                                        <span className="text-slate-400 text-xs font-bold">/</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="Cap\u00e1cité"
                                                            value={item.threadCapacity || ''}
                                                            onChange={(e) => updateMaterial(item.id, 'threadCapacity', e.target.value)}
                                                            className={`w-full text-xs font-mono border rounded px-1 outline-none text-center h-6 ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-blue-200 text-slate-700'}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 align-middle text-right">
                                            <div
                                                className={`inline-flex items-center justify-end gap-1.5 font-black px-3 py-1.5 rounded-lg border cursor-help shadow-sm ${darkMode ? 'bg-gray-800 text-emerald-400 border-gray-700' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
                                                title={`${item.unitPrice} ${currency} × ${fmt(item.qty)} ${item.unit} = ${fmt(item.unitPrice * item.qty)} ${currency}`}
                                            >
                                                {fmt(item.unitPrice * item.qty)} <span className="text-[10px] opacity-70 font-semibold">{currency}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 align-middle text-center">
                                            <button onClick={() => deleteMaterial(item.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {materials.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 text-sm font-medium">
                                        <div className="flex flex-col items-center gap-3">
                                            <Package className="w-12 h-12 opacity-20" />
                                            Aucune matière ajoutée pour ce modèle.<br />Cliquez sur <span className="text-indigo-600 font-bold">Ajouter Matière</span> ou recherchez dans le magasin.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className={`font-bold border-t ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                            <tr>
                                <td colSpan={3} className="px-4 py-4 text-end uppercase text-xs tracking-wider text-slate-500">
                                    {t.totalMat || "Total Matière"}:
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <span className={`inline-flex items-center justify-end px-3 py-1.5 rounded-lg border shadow-sm ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-emerald-600 text-white border-emerald-700'}`}>
                                        {fmt(totalMaterials)} <span className="text-[10px] opacity-80 ml-1 font-semibold">{currency}</span>
                                    </span>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </>
    );
};

export default MaterialsList;
