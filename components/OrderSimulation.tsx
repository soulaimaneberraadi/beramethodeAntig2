import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Percent, Banknote, Clock, Package, TrendingUp, Info, AlertTriangle, CheckCircle, Truck, RefreshCw, X, ArrowRight } from 'lucide-react';
import { PurchasingData } from '../types';
import { fmt } from '../constants';

interface MagasinStockItem {
    id: string;
    nom: string;
    designation?: string;
    reference?: string;
    prixUnitaire?: number;
    stockActuel?: number;
    unite?: string;
    categorie?: string;
    fournisseur?: string;
    fournisseurNom?: string;
}

interface Substitution {
    materialId: number;
    substituteId: string;
    substituteName: string;
    substituteRef?: string;
    substitutePrice: number;
    substituteUnit: string;
    quantityFromOriginal: number;
    quantityFromSubstitute: number;
    totalNeeded: number;
}

interface OrderSimulationProps {
    t: any;
    currency: string;
    darkMode: boolean;
    orderQty: number;
    setOrderQty: (v: number) => void;
    wasteRate: number;
    setWasteRate: (v: number) => void;
    deductStock: () => void;
    purchasingData: PurchasingData[];
    totalPurchasingMatCost: number;
    laborCost: number;
    textSecondary: string;
    textPrimary: string;
    bgCard: string;
}

const OrderSimulation: React.FC<OrderSimulationProps> = ({
    t, currency, darkMode, orderQty, setOrderQty, wasteRate, setWasteRate,
    deductStock,
    purchasingData, totalPurchasingMatCost, laborCost,
    textSecondary, textPrimary, bgCard
}) => {
    const activeQtyToSimulate = orderQty;
    const totalProjectCost = totalPurchasingMatCost + (laborCost * activeQtyToSimulate);

    // --- Substitute State ---
    const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
    const [showSubstituteModal, setShowSubstituteModal] = useState<number | null>(null); // materialId
    const [magasinData, setMagasinData] = useState<MagasinStockItem[]>([]);

    useEffect(() => {
        try {
            const data = localStorage.getItem('beramethode_magasin');
            if (data) setMagasinData(JSON.parse(data));
        } catch (e) { /* ignore */ }
    }, []);

    // Stock analysis per material
    const stockAnalysis = purchasingData.map(m => {
        const stockDisponible = m.stockActuel ?? 0;
        const needed = m.qtyToBuy;
        const isSufficient = stockDisponible >= needed;
        const shortage = isSufficient ? 0 : needed - stockDisponible;
        const delai = m.delaiLivraison ?? 0;
        return { ...m, stockDisponible, needed, isSufficient, shortage, delai };
    });

    const materialsWithShortage = stockAnalysis.filter(s => !s.isSufficient && s.magasinId);
    const allSufficient = materialsWithShortage.length === 0;

    return (
        <div className={`rounded-xl shadow-lg border overflow-hidden ${darkMode ? 'bg-gray-800 border-indigo-900' : 'bg-white border-indigo-100'}`}>

            {/* Header Section */}
            <div className={`px-6 py-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${darkMode ? 'bg-indigo-950/30 border-indigo-800' : 'bg-gradient-to-r from-indigo-50 to-white border-indigo-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-200 dark:shadow-none">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>{t.needs}</h2>
                        <p className={`text-xs ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>Estimation des coûts globaux pour la production</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className={`flex items-center gap-2 rounded-xl p-1 pr-3 pl-3 shadow-sm border transition-all focus-within:ring-2 focus-within:ring-indigo-400 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-indigo-200'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>{t.waste}</span>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                        <input
                            type="number"
                            min="0"
                            value={wasteRate}
                            onChange={(e) => setWasteRate(Math.max(0, parseFloat(e.target.value) || 0))}
                            className={`w-12 text-center font-bold text-indigo-600 bg-transparent outline-none ${darkMode ? 'text-indigo-400' : ''}`}
                        />
                        <Percent className="w-3 h-3 text-indigo-400" />
                    </div>

                    <div className={`flex items-center gap-2 rounded-xl p-1 pr-3 pl-3 shadow-sm border transition-all focus-within:ring-2 focus-within:ring-indigo-400 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-indigo-200'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Qté Totale</span>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                        <input
                            type="number"
                            min="1"
                            value={orderQty}
                            onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 0))}
                            className={`w-16 text-center font-bold text-indigo-600 bg-transparent outline-none ${darkMode ? 'text-indigo-400' : ''}`}
                        />
                        <ShoppingCart className="w-3 h-3 text-indigo-400" />
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">

                {/* Purchasing Table with Stock Status */}
                <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b ${darkMode ? 'bg-gray-800 text-indigo-400 border-gray-700' : 'bg-slate-50 text-indigo-600 border-slate-200'}`}>
                        Détail des Achats (Matière Première)
                    </div>
                    <table className="w-full text-sm">
                        <thead className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-slate-500'} font-medium border-b ${darkMode ? 'border-gray-700' : 'border-slate-100'}`}>
                            <tr>
                                <th className="px-4 py-3 text-right">{t.matName}</th>
                                <th className="px-4 py-3 text-center">{t.price}</th>
                                <th className="px-4 py-3 text-center">Besoin Unitaire (+{wasteRate}%)</th>
                                <th className="px-4 py-3 text-center font-bold text-indigo-600">{t.qtyToBuy}</th>
                                <th className="px-4 py-3 text-center">Stock Dispo.</th>
                                <th className="px-4 py-3 text-center">Statut</th>
                                <th className="px-4 py-3 text-center font-bold">{t.total}</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-slate-100'}`}>
                            {stockAnalysis.map((m) => (
                                <tr key={m.id} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-indigo-50/30'} transition-colors`}>
                                    <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                                        {m.name}
                                        {m.unit === 'bobine' && <span className="text-[10px] text-slate-400 block font-normal">({m.threadMeters}m / bobine)</span>}
                                        {m.fournisseur && <span className="text-[10px] text-blue-500 block font-normal">{m.fournisseur}</span>}
                                    </td>
                                    <td className={`px-4 py-3 text-center text-xs ${textSecondary}`}>{m.unitPrice} {currency}</td>
                                    <td className={`px-4 py-3 text-center text-xs ${textSecondary}`}>
                                        <span title={`(${m.qty} × ${orderQty}) + ${wasteRate}%`}>{fmt(m.totalWithWaste)} {m.unit}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${darkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {fmt(m.qtyToBuy)} {m.unit}
                                        </span>
                                    </td>
                                    {/* Stock Available */}
                                    <td className="px-4 py-3 text-center">
                                        {m.magasinId ? (
                                            <span className={`text-xs font-bold ${m.stockDisponible > 0 ? (darkMode ? 'text-slate-300' : 'text-slate-700') : 'text-red-500'}`}>
                                                {fmt(m.stockDisponible)} {m.unit}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">N/A</span>
                                        )}
                                    </td>
                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        {m.magasinId ? (
                                            m.isSufficient ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                    <CheckCircle className="w-3 h-3" /> Suffisant
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                                        <AlertTriangle className="w-3 h-3" /> Insuffisant
                                                    </span>
                                                    <span className="text-[10px] font-bold text-red-600">
                                                        Manque: {fmt(m.shortage)} {m.unit}
                                                    </span>
                                                </div>
                                            )
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">—</span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-3 text-center font-bold ${textPrimary}`}>
                                        <div className="flex items-center justify-center gap-1 cursor-help" title={`${m.qtyToBuy} × ${m.unitPrice} = ${fmt(m.lineCost)}`}>
                                            {fmt(m.lineCost)} {currency}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* COMMANDE FOURNISSEUR - Shortage Summary */}
                {materialsWithShortage.length > 0 && (
                    <div className={`rounded-xl border-2 overflow-hidden ${darkMode ? 'border-red-800 bg-red-950/20' : 'border-red-200 bg-red-50/50'}`}>
                        <div className={`px-4 py-3 flex items-center gap-2 border-b ${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-100/80 border-red-200'}`}>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold text-red-700">Commande Fournisseur Requise</span>
                            <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full ml-auto">
                                {materialsWithShortage.length} article{materialsWithShortage.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="p-4 space-y-3">
                            {materialsWithShortage.map(s => {
                                const sub = substitutions.find(sub => sub.materialId === s.id);
                                const remainingShortage = sub ? s.shortage - sub.quantityFromSubstitute : s.shortage;

                                return (
                                    <div key={s.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm ${textPrimary}`}>{s.name}</span>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {s.reference && <span className="text-[10px] font-mono text-slate-400">{s.reference}</span>}
                                                    {s.fournisseur && <span className="text-[10px] text-blue-600 font-bold">{s.fournisseur}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500 block">À commander</span>
                                                    <span className="font-black text-red-600 text-lg">{fmt(Math.max(0, remainingShortage))} {s.unit}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500 block">Coût estimé</span>
                                                    <span className="font-bold text-slate-800 text-sm">{fmt(Math.max(0, remainingShortage) * s.unitPrice)} {currency}</span>
                                                </div>
                                                {s.delai > 0 && (
                                                    <div className="text-right flex items-center gap-1.5 pl-3 border-l border-slate-200">
                                                        <Truck className="w-4 h-4 text-amber-500" />
                                                        <div>
                                                            <span className="text-xs text-slate-500 block">Délai</span>
                                                            <span className="font-bold text-amber-600 text-sm">{s.delai}j</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setShowSubstituteModal(s.id)}
                                                    className="ml-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Substitut
                                                </button>
                                            </div>
                                        </div>

                                        {/* Active substitution display */}
                                        {sub && (
                                            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                                    <div>
                                                        <span className="text-xs font-bold text-amber-800">Substitut: {sub.substituteName}</span>
                                                        {sub.substituteRef && <span className="text-[10px] text-amber-600 ml-2 font-mono">{sub.substituteRef}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-amber-700">{fmt(sub.quantityFromSubstitute)} {sub.substituteUnit}</span>
                                                    <span className="text-xs text-amber-600">({fmt(sub.quantityFromSubstitute * sub.substitutePrice)} {currency})</span>
                                                    {remainingShortage <= 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                            <CheckCircle className="w-3 h-3" /> Couvert
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => setSubstitutions(prev => prev.filter(p => p.materialId !== s.id))}
                                                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div className={`flex justify-between items-center pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                                <span className="text-xs font-bold text-slate-500 uppercase">Total à commander:</span>
                                <span className="font-black text-red-600 text-lg">
                                    {fmt(materialsWithShortage.reduce((acc, s) => {
                                        const sub = substitutions.find(sub => sub.materialId === s.id);
                                        const remaining = sub ? Math.max(0, s.shortage - sub.quantityFromSubstitute) : s.shortage;
                                        return acc + (remaining * s.unitPrice);
                                    }, 0))} {currency}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* SUBSTITUTE MODAL */}
                {showSubstituteModal !== null && (() => {
                    const targetMaterial = stockAnalysis.find(s => s.id === showSubstituteModal);
                    if (!targetMaterial) return null;
                    const sameCategoryItems = magasinData.filter(m =>
                        m.categorie === targetMaterial.categorie &&
                        m.id !== targetMaterial.magasinId &&
                        (m.stockActuel || 0) > 0
                    );
                    return (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-amber-900 text-base flex items-center gap-2">
                                            <RefreshCw className="w-5 h-5 text-amber-600" /> Choisir un Substitut
                                        </h3>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Pour <strong>{targetMaterial.name}</strong> — Manque: <strong>{fmt(targetMaterial.shortage)} {targetMaterial.unit}</strong>
                                        </p>
                                    </div>
                                    <button onClick={() => setShowSubstituteModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4 max-h-80 overflow-y-auto">
                                    {sameCategoryItems.length > 0 ? (
                                        <div className="space-y-2">
                                            {sameCategoryItems.map(m => {
                                                const stock = m.stockActuel || 0;
                                                const price = m.prixUnitaire || 0;
                                                const canCover = stock >= targetMaterial.shortage;
                                                const coverQty = Math.min(stock, targetMaterial.shortage);

                                                return (
                                                    <div
                                                        key={m.id}
                                                        className={`p-3 rounded-xl border cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-all ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-slate-200'}`}
                                                        onClick={() => {
                                                            setSubstitutions(prev => {
                                                                const filtered = prev.filter(p => p.materialId !== targetMaterial.id);
                                                                return [...filtered, {
                                                                    materialId: targetMaterial.id,
                                                                    substituteId: m.id,
                                                                    substituteName: m.nom || m.designation || '',
                                                                    substituteRef: m.reference,
                                                                    substitutePrice: price,
                                                                    substituteUnit: m.unite || 'pc',
                                                                    quantityFromOriginal: targetMaterial.stockDisponible,
                                                                    quantityFromSubstitute: coverQty,
                                                                    totalNeeded: targetMaterial.needed
                                                                }];
                                                            });
                                                            setShowSubstituteModal(null);
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className={`font-bold text-sm ${textPrimary}`}>{m.nom || m.designation}</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] font-mono text-slate-400">{m.reference || 'N/A'}</span>
                                                                    {(m.fournisseur || m.fournisseurNom) && (
                                                                        <span className="text-[10px] text-blue-600 font-bold">{m.fournisseur || m.fournisseurNom}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                    {price.toFixed(2)} {currency}/{m.unite}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                    Stock: {stock} {m.unite}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-500">
                                                                Peut couvrir: <strong>{fmt(coverQty)} {m.unite}</strong> sur {fmt(targetMaterial.shortage)} manquant{canCover ? 's' : ''}
                                                            </span>
                                                            {canCover ? (
                                                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" /> Couverture totale
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" /> Partiel ({fmt(targetMaterial.shortage - coverQty)} restant)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p className="text-sm font-medium">Aucun substitut disponible</p>
                                            <p className="text-xs mt-1">Pas de matière de la même catégorie ({targetMaterial.categorie}) avec du stock disponible</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Stock Status Banner */}
                {purchasingData.some(m => m.magasinId) && allSufficient && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-700">Stock suffisant pour toutes les matières liées au magasin</span>
                    </div>
                )}

                {/* Summary Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Card 1: Total Material */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}>
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <span className={`text-xs font-bold uppercase tracking-wider mb-1 block ${textSecondary}`}>{t.realBudget}</span>
                                <div className="flex items-baseline gap-1">
                                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        {fmt(totalPurchasingMatCost)}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400">{currency}</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Banknote className="w-5 h-5" />
                            </div>
                        </div>
                        <div className={`mt-4 pt-3 border-t text-xs flex justify-between ${darkMode ? 'border-gray-700 text-gray-500' : 'border-slate-100 text-slate-500'}`}>
                            <span>Nombre d'articles: {purchasingData.length}</span>
                            <span title="Formula: Sum(QtyToBuy * Price)">Calculé sur achats réels</span>
                        </div>
                    </div>

                    {/* Card 2: Total Labor */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}>
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <span className={`text-xs font-bold uppercase tracking-wider mb-1 block ${textSecondary}`}>{t.laborCost} (Total)</span>
                                <div className="flex items-baseline gap-1">
                                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {fmt(laborCost * orderQty)}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400">{currency}</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <div className={`mt-4 pt-3 border-t text-xs flex justify-between ${darkMode ? 'border-gray-700 text-gray-500' : 'border-slate-100 text-slate-500'}`}>
                            <span>{orderQty} pcs × {fmt(laborCost)}/pc</span>
                            <span title={`Formula: ${laborCost} * ${orderQty}`}>Coût Main d'œuvre</span>
                        </div>
                    </div>

                    {/* Card 3: Grand Total */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Package className="w-24 h-24 transform rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 mb-1 block">{t.totalBudget}</span>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-black tracking-tight">{fmt(totalProjectCost)}</h3>
                                <span className="text-sm font-medium text-indigo-200">{currency}</span>
                            </div>
                        </div>
                        <div className="relative z-10 mt-4 pt-3 border-t border-indigo-500/30 flex justify-between items-center text-xs text-indigo-100">
                            <span className="font-medium">Coût de revient par pièce:</span>
                            <span className="bg-white/20 px-2 py-1 rounded font-bold">{fmt(totalProjectCost / orderQty)} {currency}</span>
                        </div>
                    </div>

                </div>

                {/* Confirm & Deduct Action */}
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-gray-800">
                    <button
                        onClick={deductStock}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Confirmer Commandes & Déduire Stock
                    </button>
                </div>
            </div>
        </div >
    );
};

export default OrderSimulation;
