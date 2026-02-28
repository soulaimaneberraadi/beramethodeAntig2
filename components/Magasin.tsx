import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Search, Edit2, Save, X } from 'lucide-react';

export interface MagasinItem {
    id: string;
    reference: string;
    designation: string;
    categorie: 'tissu' | 'fil' | 'bouton' | 'fermeture' | 'etiquette' | 'emballage' | 'autre';
    unite: 'm' | 'kg' | 'piece' | 'cone' | 'boite';
    prixUnitaire: number;
    stockActuel: number;
    stockAlerte: number;
}

export default function Magasin() {
    const [items, setItems] = useState<MagasinItem[]>(() => {
        try {
            const saved = localStorage.getItem('beramethode_magasin');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    // Edit & Add State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<MagasinItem>>({});

    useEffect(() => {
        localStorage.setItem('beramethode_magasin', JSON.stringify(items));
    }, [items]);

    const categories = ['tissu', 'fil', 'bouton', 'fermeture', 'etiquette', 'emballage', 'autre'];

    const handleAddClick = () => {
        const newId = Date.now().toString();
        const newItem: MagasinItem = {
            id: newId,
            reference: `REF-${Math.floor(Math.random() * 10000)}`,
            designation: '',
            categorie: 'tissu',
            unite: 'm',
            prixUnitaire: 0,
            stockActuel: 0,
            stockAlerte: 10
        };
        setItems([newItem, ...items]);
        startEditing(newItem);
    };

    const startEditing = (item: MagasinItem) => {
        setEditingId(item.id);
        setEditForm(item);
    };

    const saveEdit = () => {
        if (!editForm.designation?.trim()) {
            alert("La désignation est obligatoire");
            return;
        }
        setItems(items.map(img => img.id === editingId ? { ...(editForm as MagasinItem) } : img));
        setEditingId(null);
    };

    const cancelEdit = () => {
        // If it was a new unsaved item (empty designation), remove it
        const item = items.find(i => i.id === editingId);
        if (item && !item.designation.trim()) {
            setItems(items.filter(i => i.id !== editingId));
        }
        setEditingId(null);
    };

    const deleteItem = (id: string) => {
        if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.reference.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || item.categorie === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Calculate global inventory value
    const totalValue = items.reduce((sum, item) => sum + (item.prixUnitaire * item.stockActuel), 0);
    const outOfStock = items.filter(i => i.stockActuel <= i.stockAlerte).length;

    return (
        <div className="h-full flex flex-col bg-slate-50 relative pb-20 overflow-y-auto">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Package className="w-8 h-8 text-indigo-600" />
                        Magasin & Fournitures
                    </h1>
                    <p className="text-slate-500 mt-1">Gestion du stock des matières premières et liste de prix standard.</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex flex-col items-center justify-center min-w-[120px]">
                        <span className="text-xs font-bold text-indigo-800 uppercase">Valeur Stock</span>
                        <span className="text-xl font-black text-indigo-600">{totalValue.toLocaleString('fr-FR')} DH</span>
                    </div>
                    <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex flex-col items-center justify-center min-w-[120px]">
                        <span className="text-xs font-bold text-red-800 uppercase">Alertes Stock</span>
                        <span className="text-xl font-black text-red-600">{outOfStock}</span>
                    </div>
                </div>
            </div>

            <div className="w-full mx-auto px-8 py-6 space-y-6">
                {/* CONTROLS */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex gap-3 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par ref ou nom..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
                            />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-700 capitalize"
                        >
                            <option value="all">Toutes les catégories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={handleAddClick}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Nouvel Article
                    </button>
                </div>

                {/* DATA TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Réf</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Désignation</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Catégorie</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-center">Unité</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Prix U. (DH)</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Stock</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                                            Aucun article trouvé dans le magasin.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map(item => {
                                        const isEditing = editingId === item.id;
                                        const isDanger = item.stockActuel <= item.stockAlerte;

                                        if (isEditing) {
                                            return (
                                                <tr key={item.id} className="bg-indigo-50/30">
                                                    <td className="px-3 py-2"><input type="text" className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm outline-none font-bold" value={editForm.reference || ''} onChange={e => setEditForm({ ...editForm, reference: e.target.value })} /></td>
                                                    <td className="px-3 py-2"><input type="text" className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm outline-none font-bold" placeholder="Nom de la matière..." value={editForm.designation || ''} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} /></td>
                                                    <td className="px-3 py-2">
                                                        <select className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm outline-none capitalize" value={editForm.categorie || 'tissu'} onChange={e => setEditForm({ ...editForm, categorie: e.target.value as any })}>
                                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <select className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm outline-none text-center" value={editForm.unite || 'm'} onChange={e => setEditForm({ ...editForm, unite: e.target.value as any })}>
                                                            {['m', 'kg', 'piece', 'cone', 'boite'].map(c => <option key={c} value={c} className="text-center">{c}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2"><input type="number" step="0.01" className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm outline-none text-right font-bold text-indigo-700" value={editForm.prixUnitaire || ''} onChange={e => setEditForm({ ...editForm, prixUnitaire: parseFloat(e.target.value) || 0 })} /></td>
                                                    <td className="px-3 py-2"><input type="number" step="0.01" className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-sm outline-none text-right font-bold" value={editForm.stockActuel || ''} onChange={e => setEditForm({ ...editForm, stockActuel: parseFloat(e.target.value) || 0 })} /></td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"><Save className="w-4 h-4" /></button>
                                                            <button onClick={cancelEdit} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"><X className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-5 py-3 text-sm font-bold text-slate-700">{item.reference}</td>
                                                <td className="px-5 py-3 text-sm font-medium text-slate-800">{item.designation}</td>
                                                <td className="px-5 py-3 text-sm">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold capitalize border border-slate-200">{item.categorie}</span>
                                                </td>
                                                <td className="px-5 py-3 text-sm font-bold text-slate-600 text-center">{item.unite}</td>
                                                <td className="px-5 py-3 text-sm font-black text-indigo-700 text-right">{item.prixUnitaire.toFixed(2)}</td>
                                                <td className="px-5 py-3 text-sm text-right">
                                                    <span className={`font-black ${isDanger ? 'text-red-600' : 'text-slate-700'}`}>
                                                        {item.stockActuel}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEditing(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteItem(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
