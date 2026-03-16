import React, { useState, useEffect, useRef } from 'react';
import {
    Package, Plus, Trash2, Search, Edit2, Save, X, ArrowDownCircle, ArrowUpCircle,
    AlertTriangle, Phone, Mail, Building2, LinkIcon, Layers, History, Barcode,
    Download, Filter, Activity, TrendingUp, TrendingDown, AlignLeft, Scale, RefreshCw, CheckCircle, MapPin, Sparkles, Power, FileText, Send, Printer, Recycle, ArrowLeft
} from 'lucide-react';
import { ModelData, PlanningEvent, DemandeAppro, MouvementStock } from '../types';

export interface MagasinProps {
    models?: ModelData[];
    planningEvents?: PlanningEvent[];
    demandes?: DemandeAppro[];
    setDemandes?: React.Dispatch<React.SetStateAction<DemandeAppro[]>>;
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface MagasinProduct {
    id: string;
    reference: string;
    designation: string;
    categorie: 'tissu' | 'fil' | 'bouton' | 'fermeture' | 'etiquette' | 'emballage' | 'autre';
    unite: 'm' | 'kg' | 'piece' | 'cone' | 'boite' | 'rouleau';
    photo?: string;
    fournisseurNom?: string;
    fournisseurTel?: string;
    fournisseurEmail?: string;
    chaineExclusive?: string;
    emplacement?: string; // e.g. Rayon A, Étagère 3
    prixUnitaire: number;
    cump?: number; // Coût Unitaire Moyen Pondéré
    stockAlerte: number;
}

export interface LotStock {
    id: string;
    productId: string;
    quantiteRestante: number;
    quantiteInitiale: number;
    prixUnitaire: number;
    dateEntree: string;
    fournisseur?: string;
    numBain?: string; // Dye lot / Batch number
    dateExpiration?: string; // FEFO
    variante?: string; // Couleur/Taille
    etat?: 'disponible' | 'quarantaine';
}

// Removed MouvementStock and DemandeAppro as they are now in types.ts

export interface BonCommandeLigne {
    id: string;
    productId: string;
    productNom: string;
    quantite: number;
    prixUnitaire?: number;
}

export interface BonCommande {
    id: string;
    numero: string;
    fournisseurNom: string;
    dateCreation: string;
    dateLivraisonPrevue?: string;
    lignes: BonCommandeLigne[];
    statut: 'brouillon' | 'envoye' | 'valide' | 'livre';
    total?: number;
    notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATS = ['tissu', 'fil', 'bouton', 'fermeture', 'etiquette', 'emballage', 'autre'] as const;
const UNITS = ['m', 'kg', 'piece', 'cone', 'boite', 'rouleau'] as const;
const CAT_CLR: Record<string, string> = {
    tissu: 'bg-blue-100 text-blue-700', fil: 'bg-purple-100 text-purple-700',
    bouton: 'bg-amber-100 text-amber-700', fermeture: 'bg-slate-100 text-slate-600',
    etiquette: 'bg-green-100 text-green-700', emballage: 'bg-orange-100 text-orange-700',
    autre: 'bg-rose-100 text-rose-700',
};
const inp = "w-full border border-slate-200 bg-white rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all shadow-sm";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function ld<T>(k: string, fb: T): T { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fb; } catch { return fb; } }
function sv(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }

function stockQty(lots: LotStock[], pid: string) { return lots.filter(l => l.productId === pid).reduce((s, l) => s + l.quantiteRestante, 0); }
function deductLots(lots: LotStock[], productId: string, qty: number, method: 'FIFO' | 'LIFO'): LotStock[] {
    let rem = qty;
    const avail = lots.filter(l => l.productId === productId && l.quantiteRestante > 0);
    const sorted = method === 'FIFO'
        ? [...avail].sort((a, b) => a.dateEntree.localeCompare(b.dateEntree))
        : [...avail].sort((a, b) => b.dateEntree.localeCompare(a.dateEntree));
    const updated = lots.map(l => ({ ...l }));
    for (const lot of sorted) {
        if (rem <= 0) break;
        const idx = updated.findIndex(x => x.id === lot.id);
        const take = Math.min(updated[idx].quantiteRestante, rem);
        updated[idx].quantiteRestante -= take;
        rem -= take;
    }
    return updated;
}

const Lbl = ({ t }: { t: string }) => <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">{t}</label>;

const StockBadge = ({ stock, seuil }: { stock: number; seuil: number }) => {
    if (stock === 0) return <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase">Rupture</span>;
    if (stock <= seuil) return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black uppercase">Faible</span>;
    return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">En Stock</span>;
};

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ProductModal({ item, onSave, onClose }: { item?: MagasinProduct; onSave: (p: MagasinProduct) => void; onClose: () => void; }) {
    const [f, setF] = useState<MagasinProduct>(item || {
        id: uid(), reference: `REF-${Math.floor(Math.random() * 9000) + 1000}`, designation: '', categorie: 'tissu', unite: 'm', prixUnitaire: 0, stockAlerte: 10, emplacement: ''
    });
    const fileRef = useRef<HTMLInputElement>(null);
    const set = (k: keyof MagasinProduct, v: unknown) => setF(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">{item ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-emerald-500" />}{item ? 'Modifier Article' : 'Nouvel Article'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    <div className="flex gap-5">
                        <div onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden shrink-0">
                            {f.photo ? <img src={f.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-slate-400">Photo</span>}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const r = new FileReader(); r.onload = ev => set('photo', ev.target?.result as string); r.readAsDataURL(file);
                        }} />
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div><Lbl t="Référence (Code-barres)" /><input className={inp} value={f.reference} onChange={e => set('reference', e.target.value)} /></div>
                            <div><Lbl t="Désignation *" /><input className={inp} placeholder="Ex: Fil Coton Noir..." value={f.designation} onChange={e => set('designation', e.target.value)} autoFocus /></div>
                            <div><Lbl t="Catégorie" /><select className={inp} value={f.categorie} onChange={e => set('categorie', e.target.value)}>{CATS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}</select></div>
                            <div><Lbl t="Unité" /><select className={inp} value={f.unite} onChange={e => set('unite', e.target.value)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div><Lbl t="Prix u. par défaut" /><input className={inp} type="number" min="0" step="0.01" value={f.prixUnitaire || ''} onChange={e => set('prixUnitaire', +e.target.value || 0)} /></div>
                        <div><Lbl t="Seuil de réappro." /><input className={inp} type="number" min="0" value={f.stockAlerte || ''} onChange={e => set('stockAlerte', +e.target.value || 0)} /></div>
                        <div><Lbl t="Emplacement physique" /><input className={inp} placeholder="Rayon A, Étagère 3..." value={f.emplacement || ''} onChange={e => set('emplacement', e.target.value)} /></div>
                    </div>

                    <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><Lbl t="Fournisseur Privilégié" /><input className={inp} placeholder="Entreprise..." value={f.fournisseurNom || ''} onChange={e => set('fournisseurNom', e.target.value)} /></div>
                            <div><Lbl t="Téléphone Frs." /><input className={inp} placeholder="+212..." value={f.fournisseurTel || ''} onChange={e => set('fournisseurTel', e.target.value)} /></div>
                        </div>
                        <div><Lbl t="Exclusivité Chaîne (Optionnel)" /><input className={inp} placeholder="Réservé à: (ex: Chaine 1)" value={f.chaineExclusive || ''} onChange={e => set('chaineExclusive', e.target.value)} /></div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Annuler</button>
                    <button onClick={() => { if (!f.designation.trim()) { alert('Désignation obligatoire'); return; } onSave(f); }} className="px-6 py-2 text-sm font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2"><Save className="w-4 h-4" /> Enregistrer</button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
//  BON DE COMMANDE MODAL
// ══════════════════════════════════════════════════════════════════════════════
function BonCommandeModal({ bc: initial, products, onSave, onClose }: { bc: BonCommande; products: MagasinProduct[]; onSave: (bc: BonCommande) => void; onClose: () => void; }) {
    const [bc, setBc] = useState<BonCommande>({ ...initial });
    const [addPid, setAddPid] = useState('');
    const [addQty, setAddQty] = useState('');

    const calcTotal = (lignes: BonCommandeLigne[]) => lignes.reduce((s, l) => s + (l.quantite * (l.prixUnitaire || 0)), 0);

    const handleAdd = () => {
        if (!addPid || !addQty) return alert('Sélectionner un produit et une quantité');
        const p = products.find(x => x.id === addPid);
        if (!p) return;
        const nl = [...bc.lignes, { id: uid(), productId: p.id, productNom: p.designation, quantite: parseFloat(addQty), prixUnitaire: p.cump || p.prixUnitaire }];
        setBc({ ...bc, lignes: nl, total: calcTotal(nl) });
        setAddPid(''); setAddQty('');
    };

    const rmLine = (id: string) => {
        const nl = bc.lignes.filter(x => x.id !== id);
        setBc({ ...bc, lignes: nl, total: calcTotal(nl) });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <h2 className="font-black text-slate-800 text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> Éditer Bon de Commande - {bc.numero}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 border rounded-2xl shadow-sm">
                        <div><Lbl t="Fournisseur" /><input className={inp} value={bc.fournisseurNom} onChange={e => setBc({ ...bc, fournisseurNom: e.target.value })} /></div>
                        <div><Lbl t="Date Prévue" /><input type="date" className={inp} value={bc.dateLivraisonPrevue || ''} onChange={e => setBc({ ...bc, dateLivraisonPrevue: e.target.value })} /></div>
                        <div><Lbl t="Statut" /><select className={inp} value={bc.statut} onChange={e => setBc({ ...bc, statut: e.target.value as any })}><option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option><option value="valide">Validé/Approuvé</option><option value="livre">Livré totalement</option></select></div>
                    </div>

                    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 bg-slate-50 border-b flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]"><Lbl t="Ajouter un Produit" /><select className={inp} value={addPid} onChange={e => setAddPid(e.target.value)}><option value="">-- Sélectionner --</option>{products.map(p => <option key={p.id} value={p.id}>{p.reference} - {p.designation} (Frs: {p.fournisseurNom || '?'})</option>)}</select></div>
                            <div className="w-32"><Lbl t="Quantité" /><input type="number" className={inp} value={addQty} onChange={e => setAddQty(e.target.value)} /></div>
                            <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 h-[38px] rounded-xl font-bold text-sm hover:bg-indigo-700">Ajouter</button>
                        </div>

                        <div className="p-0 overflow-x-auto max-h-[300px]">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 sticky top-0 border-b"><tr className="text-slate-500"><th className="p-3 font-bold">Produit</th><th className="p-3 font-bold text-right">Qté</th><th className="p-3 font-bold text-right">Prix Unitaire</th><th className="p-3 font-bold text-right">Sous-total</th><th className="p-3 pr-4"></th></tr></thead>
                                <tbody>
                                    {bc.lignes.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold bg-white">Aucun produit dans cette commande.</td></tr> : bc.lignes.map(l => (
                                        <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 bg-white">
                                            <td className="p-3 font-bold text-slate-700">{l.productNom}</td>
                                            <td className="p-3 text-right"><input type="number" className="w-20 border rounded px-2 py-1 text-right text-sm font-bold bg-slate-50" value={l.quantite} onChange={e => { const val = parseFloat(e.target.value) || 0; const nl = bc.lignes.map(x => x.id === l.id ? { ...x, quantite: val } : x); setBc({ ...bc, lignes: nl, total: calcTotal(nl) }); }} /></td>
                                            <td className="p-3 text-right"><input type="number" className="w-24 border rounded px-2 py-1 text-right text-sm font-bold bg-slate-50" value={l.prixUnitaire || 0} onChange={e => { const val = parseFloat(e.target.value) || 0; const nl = bc.lignes.map(x => x.id === l.id ? { ...x, prixUnitaire: val } : x); setBc({ ...bc, lignes: nl, total: calcTotal(nl) }); }} /> DH</td>
                                            <td className="p-3 text-right font-black text-indigo-600">{(l.quantite * (l.prixUnitaire || 0)).toLocaleString()} DH</td>
                                            <td className="p-3 pr-4 text-right"><button onClick={() => rmLine(l.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-slate-100 border-t flex justify-end items-center gap-4">
                            <span className="text-sm font-bold text-slate-500 uppercase">Total Estimé HT</span>
                            <span className="text-2xl font-black text-slate-800">{(bc.total || 0).toLocaleString()} <span className="text-sm">DH</span></span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white shrink-0">
                    <div className="text-xs text-slate-400 font-bold"><Activity className="w-3 h-3 inline mr-1" /> Sauvegarde automatique locale</div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Fermer</button>
                        <button onClick={() => onSave(bc)} className="px-8 py-2.5 text-sm font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Enregistrer BC</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function Magasin({ models = [], planningEvents = [] }: MagasinProps) {
    const [tab, setTab] = useState<'dashboard' | 'db' | 'bureau' | 'demandes' | 'commandes' | 'alertes' | 'inventaire' | 'tracabilite' | 'wms' | 'fournisseurs' | 'valorisation'>('dashboard');
    const [products, setProducts] = useState<MagasinProduct[]>(() => ld('mgp', []));
    const [lots, setLots] = useState<LotStock[]>(() => ld('mgl', []));
    const [mvts, setMvts] = useState<MouvementStock[]>(() => ld('mgm', []));
    const [demandes, setDemandes] = useState<DemandeAppro[]>(() => ld('mgda', []));
    const [commandes, setCommandes] = useState<BonCommande[]>(() => ld('mgbc', []));
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [prodModal, setProdModal] = useState<{ open: boolean; item?: MagasinProduct }>({ open: false });
    const [bcModal, setBcModal] = useState<{ open: boolean; item?: BonCommande }>({ open: false });
    const [aiEnabled, setAiEnabled] = useState(() => ld('mg_ai', false));
    const [invSession, setInvSession] = useState<{ id: string, items: { pid: string, qty: string }[] } | null>(null);
    const [traceQuery, setTraceQuery] = useState('');

    // Bureau State
    const [bMode, setBMode] = useState<'entree' | 'sortie' | 'regularisation' | 'retour_atelier' | 'rebut' | 'reservation' | null>(null);
    const [bPid, setBPid] = useState('');
    const [bQty, setBQty] = useState('');
    const [bPrix, setBPrix] = useState('');
    const [bChaine, setBChaine] = useState('');
    const [bModele, setBModele] = useState('');
    const [bFournisseur, setBFournisseur] = useState('');
    const [bNumBain, setBNumBain] = useState('');
    const [bNotes, setBNotes] = useState('');
    const [bMethod, setBMethod] = useState<'FIFO' | 'LIFO'>('FIFO');
    const [bSuccess, setBSuccess] = useState('');
    const [scannerMode, setScannerMode] = useState(false);

    useEffect(() => { sv('mgp', products); }, [products]);
    useEffect(() => { sv('mgl', lots); }, [lots]);
    useEffect(() => { sv('mgm', mvts); }, [mvts]);
    useEffect(() => { sv('mgda', demandes); }, [demandes]);
    useEffect(() => { sv('mgbc', commandes); }, [commandes]);
    useEffect(() => { sv('mg_ai', aiEnabled); }, [aiEnabled]);

    // Phase 5: Valorisation State
    const [dechets, setDechets] = useState<any[]>(() => ld('mg_dechets', []));
    useEffect(() => { sv('mg_dechets', dechets); }, [dechets]);

    const totalStockValue = products.reduce((sum, p) => {
        const qty = lots.filter(l => l.productId === p.id).reduce((s, l) => s + l.quantiteRestante, 0);
        return sum + (qty * (p.cump || p.prixUnitaire));
    }, 0);

    const alertCount = products.filter(p => {
        const qty = lots.filter(l => l.productId === p.id).reduce((s, l) => s + l.quantiteRestante, 0);
        return qty <= p.stockAlerte;
    }).length;

    // Phase 5: Stock Health
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dormantQty = lots.filter(l => new Date(l.dateEntree) < ninetyDaysAgo && l.quantiteRestante > 0).reduce((s, l) => s + l.quantiteRestante, 0);
    const dormantValue = lots.filter(l => new Date(l.dateEntree) < ninetyDaysAgo && l.quantiteRestante > 0).reduce((sum, l) => {
        const p = products.find(prod => prod.id === l.productId);
        return sum + (l.quantiteRestante * (p?.cump || l.prixUnitaire));
    }, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentArrivalsCount = mvts.filter(m => m.type === 'entree' && new Date(m.date) > sevenDaysAgo).length;

    // Phase 5: Planning Anticipation
    const upcomingEvents = [...planningEvents]
        .filter(e => e.status !== 'DONE')
        .sort((a, b) => new Date(a.dateLancement).getTime() - new Date(b.dateLancement).getTime())
        .slice(0, 3); // Get 3 most imminent

    const saveProduct = (p: MagasinProduct) => { setProducts(prev => prev.find(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]); setProdModal({ open: false }); };
    const deleteProduct = (id: string) => { if (confirm('Supprimer l\'article ?')) { setProducts(prev => prev.filter(p => p.id !== id)); setLots(prev => prev.filter(l => l.productId !== id)); } };

    const bureauProduct = products.find(p => p.id === bPid);
    useEffect(() => {
        if (bureauProduct) {
            setBPrix(bureauProduct.prixUnitaire.toString());
            setBChaine(bureauProduct.chaineExclusive || '');
            setBFournisseur(bureauProduct.fournisseurNom || '');
        }
    }, [bPid]);

    const submitAction = () => {
        const qty = parseFloat(bQty);
        if (!bPid || isNaN(qty) || qty <= 0) return alert('Sélection / Quantité invalide');
        const st = stockQty(lots, bPid);

        if ((bMode === 'sortie' || bMode === 'rebut' || bMode === 'reservation') && qty > st) {
            return alert(`Stock insuffisant (${st.toFixed(2)} ${bureauProduct?.unite})`);
        }

        if (bMode === 'regularisation') {
            const diff = qty - st;
            if (diff === 0) return alert('Le stock scanné est identique au stock actuel');
            const typeMvt = diff > 0 ? 'entree' : 'sortie';
            const m: MouvementStock = {
                id: uid(), productId: bPid, type: 'regularisation', quantite: Math.abs(diff),
                prixUnitaire: bureauProduct!.cump || bureauProduct!.prixUnitaire, date: new Date().toISOString(), notes: `Ajustement inventaire (Théorique: ${st}, Réel: ${qty})`,
                source: diff > 0 ? 'inventaire' : 'chaine', destination: diff > 0 ? 'chaine' : 'inventaire'
            };
            if (diff > 0) setLots(prev => [...prev, { id: uid(), productId: bPid, quantiteInitiale: diff, quantiteRestante: diff, prixUnitaire: bureauProduct!.cump || bureauProduct!.prixUnitaire, dateEntree: m.date }]);
            else setLots(prev => deductLots(prev, bPid, Math.abs(diff), 'FIFO'));
            setMvts(prev => [m, ...prev]);
            setBSuccess(`Inventaire ajusté : Nouveau stock = ${qty} ${bureauProduct?.unite}`);
        } else {
            const isEntree = bMode === 'entree' || bMode === 'retour_atelier';
            const m: MouvementStock = {
                id: uid(), productId: bPid, type: bMode! as any, quantite: qty, // type cast for regularisation/reservation
                prixUnitaire: isEntree ? (parseFloat(bPrix) || 0) : (bureauProduct!.cump || bureauProduct!.prixUnitaire),
                fournisseurId: bMode === 'entree' ? bFournisseur : undefined,
                chaineId: (bMode === 'sortie' || bMode === 'reservation') ? bChaine : undefined,
                modeleRef: bModele, bain: bNumBain,
                date: new Date().toISOString(), notes: bNotes,
                source: bMode === 'entree' ? 'fournisseur' : bMode === 'retour_atelier' ? 'retour_chaine' : 'inventaire',
                destination: bMode === 'sortie' ? 'chaine' : bMode === 'rebut' ? 'rebut' : 'inventaire'
            };

            if (isEntree) {
                if (bMode === 'entree') {
                    const currentCUMP = bureauProduct!.cump || bureauProduct!.prixUnitaire || 0;
                    const entrantPrice = m.prixUnitaire;
                    const newCUMP = st + qty > 0 ? ((st * currentCUMP) + (qty * entrantPrice)) / (st + qty) : entrantPrice;
                    setProducts(prev => prev.map(p => p.id === bPid ? { ...p, cump: newCUMP } : p));
                }
                setLots(prev => [...prev, { id: uid(), productId: bPid, quantiteInitiale: qty, quantiteRestante: qty, prixUnitaire: m.prixUnitaire, dateEntree: m.date, fournisseur: bFournisseur, numBain: bNumBain }]);
            } else {
                setLots(prev => deductLots(prev, bPid, qty, bMethod));
            }

            setMvts(prev => [m, ...prev]);

            const actionNames: Record<string, string> = {
                entree: 'Arrivage', sortie: 'Sortie', retour_atelier: 'Retour Atelier', rebut: 'Mise au rebut', reservation: 'Réservation'
            };
            setBSuccess(`${actionNames[bMode!]} de ${qty} validé !`);
        }
        setBQty(''); setBModele(''); setBNumBain(''); setBNotes('');
        setTimeout(() => setBSuccess(''), 3000);
    };

    const downloadCSV = () => {
        const h = ['Reference', 'Designation', 'Cat', 'Unite', 'Emplacement', 'Stock', 'Seuil', 'Frs'];
        const r = products.map(p => [p.reference, `"${p.designation}"`, p.categorie, p.unite, `"${p.emplacement || ''}"`, stockQty(lots, p.id), p.stockAlerte, `"${p.fournisseurNom || ''}"`].join(','));
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[h.join(','), ...r].join('\n')], { type: 'text/csv' })); a.download = 'Inventaire.csv'; a.click();
    };

    const printBarcode = (ref: string, des: string) => {
        const w = window.open('', '_blank');
        w?.document.write(`<html><head><style>@page{size: auto; margin:0mm;} body{margin:0; padding:10px; font-family:sans-serif; text-align:center;} .bc{font-family:'Libre Barcode 39', monospace; font-size:48px;}</style></head><body><div style="font-size:12px;font-weight:bold;">${des}</div><div class="bc">*${ref}*</div><div style="font-size:10px;">${ref}</div><script>window.print();</script></body></html>`);
        w?.document.close();
    };

    const handleScan = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        if (val.length > 3) {
            const p = products.find(x => x.reference.toLowerCase() === val.toLowerCase());
            if (p) { setBPid(p.id); setScannerMode(false); }
        }
    };

    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        return (!q || p.designation.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || (p.fournisseurNom || '').toLowerCase().includes(q) || (p.emplacement || '').toLowerCase().includes(q))
            && (catFilter === 'all' || p.categorie === catFilter);
    });
    const alertes = products.filter(p => stockQty(lots, p.id) <= p.stockAlerte);

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap justify-between items-center z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Activity className="w-5 h-5" /></div>
                    <div><h1 className="text-xl font-black text-slate-800 flex items-center gap-2">Magasin ERP {aiEnabled && <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />}</h1><p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Stock • Traçabilité • Emplacements</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setAiEnabled(!aiEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black transition-colors ${aiEnabled ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        {aiEnabled ? <Sparkles className="w-4 h-4" /> : <Power className="w-4 h-4" />} IA: {aiEnabled ? 'ON' : 'OFF'}
                    </button>
                    <div className="px-4 py-1.5 border rounded-xl bg-slate-50 text-center flex flex-col items-end"><div className="text-[10px] font-black text-slate-400 uppercase">Valeur</div><div className="font-black text-slate-700 text-sm leading-tight">{lots.reduce((s, l) => s + (l.quantiteRestante * l.prixUnitaire), 0).toLocaleString()} DH</div></div>
                    {alertes.length > 0 && <button onClick={() => setTab('alertes')} className="px-3 py-1.5 border border-red-200 bg-red-50 text-center rounded-xl cursor-pointer hover:bg-red-100 flex flex-col items-end"><div className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 justify-center"><AlertTriangle className="w-3 h-3" /> Urgences</div><div className="font-black text-red-600 text-sm leading-tight">{alertes.length}</div></button>}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white px-6 border-b flex gap-6 shrink-0 z-0 border-slate-200 overflow-x-auto hide-scrollbar">
                {[
                    { i: 'dashboard', l: 'Tableau de Bord', ic: TrendingUp },
                    { i: 'db', l: 'Base Produits', ic: Layers },
                    { i: 'bureau', l: 'Bureau Magasin', ic: History },
                    { i: 'inventaire', l: 'Inventaire Tournant', ic: RefreshCw },
                    { i: 'wms', l: 'Plan WMS', ic: MapPin },
                    { i: 'fournisseurs', l: 'Radar Fournisseurs', ic: Building2 },
                    { i: 'commandes', l: 'Bons de Commande', ic: FileText, b: commandes.filter(c => c.statut === 'brouillon' || c.statut === 'envoye').length },
                    { i: 'demandes', l: 'Demandes Atelier', ic: Package, b: demandes.filter(d => d.etat === 'attente').length },
                    { i: 'alertes', l: 'Alertes & Ruptures', ic: AlertTriangle, b: alertes.length },
                    { i: 'valorisation', l: 'S. Valorisation (Déchets)', ic: Recycle },
                    { i: 'tracabilite', l: 'Traçabilité', ic: LinkIcon }
                ].map(t => (
                    <button key={t.i} onClick={() => setTab(t.i as any)} className={`py-3 text-sm font-bold flex items-center gap-2 relative transition-colors whitespace-nowrap ${tab === t.i ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
                        <t.ic className="w-4 h-4" />{t.l} {!!t.b && <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{t.b}</span>}
                        {tab === t.i && <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-600 rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto w-full max-w-[1400px] mx-auto p-4 md:p-6">

                {/* ══ Dashboard ══ */}
                {tab === 'dashboard' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* TOP STATS */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                    <Package className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-500">Total Références</p>
                                    <p className="text-2xl font-black text-slate-800">{products.length}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-500">Valeur Globale (CUMP)</p>
                                    <p className="text-2xl font-black text-slate-800">{totalStockValue.toLocaleString()} DH</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-500">Alerte Rupture</p>
                                    <p className="text-2xl font-black text-rose-600">{alertCount}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-500">Mouvements (7j)</p>
                                    <p className="text-2xl font-black text-slate-800">{recentArrivalsCount}</p>
                                </div>
                            </div>
                        </div>

                        {/* MIDDLE SECTION: HEALTH & ANTICIPATION */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* STOCK HEALTH */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-1 flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-50 rounded-full zoom-in-50"></div>
                                <Layers className="w-10 h-10 text-slate-300 mb-4" />
                                <h3 className="font-black text-slate-800 text-lg mb-1">Stock Dormant</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">Articles &gt; 90 Jours</p>

                                <div className="text-center w-full">
                                    <p className="text-5xl font-black text-slate-800 mb-2">{dormantQty.toLocaleString()}</p>
                                    <p className="text-sm font-bold text-slate-500">Unités immobiles</p>

                                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center w-full">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Valeur Gelée</span>
                                        <span className="text-lg font-black text-rose-500">{dormantValue.toLocaleString()} DH</span>
                                    </div>
                                </div>
                            </div>

                            {/* PLANNING ANTICIPATION */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><Send className="w-5 h-5 text-indigo-500" /> Anticipation Production</h3>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Préparation des Modèles Imminents</p>
                                    </div>
                                    <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">{upcomingEvents.length} OF Prévus</span>
                                </div>

                                {upcomingEvents.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <Layers className="w-10 h-10 mb-3 opacity-20" />
                                        <p className="font-bold text-sm">Aucune production imminente planifiée.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                                        {upcomingEvents.map(evt => {
                                            const modelInfo = models?.find(m => m.id === evt.modelId);
                                            const modelName = modelInfo?.meta_data.nom_modele || 'Modèle Inconnu';
                                            const photo = modelInfo?.meta_data.photo_url || null;

                                            // Mock needs logic: We assume 1.2m of fabric and 0.5 unit of accessories per item.
                                            // Real implementation would look at `nomenclature` if it existed.
                                            const fabricNeeded = evt.qteTotal * 1.2;
                                            const accNeeded = Math.ceil(evt.qteTotal * 0.5);

                                            // Determine if we have enough mock stock (simulated with random check for UX demonstration)
                                            // In a real scenario, this would check against actual `lots` quantities.
                                            const totalTissuStock = products.filter(p => p.categorie === 'tissu').reduce((acc, p) => acc + stockQty(lots, p.id), 0);
                                            const isTissuSuffisant = totalTissuStock >= fabricNeeded;

                                            return (
                                                <div key={evt.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col relative overflow-hidden">
                                                    {!isTissuSuffisant && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg z-10 animate-pulse">STOCK CRITIQUE</div>}

                                                    <div className="flex gap-3 mb-3 relative z-0">
                                                        <div className="w-12 h-16 bg-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0">
                                                            {photo ? <img src={photo} className="w-full h-full object-cover" alt="" /> : <Package className="w-6 h-6 m-3 text-slate-400" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-bold text-slate-400 mb-1">{new Date(evt.dateLancement).toLocaleDateString('fr-FR')} • {evt.chaineId}</div>
                                                            <h4 className="font-black text-sm text-slate-800 leading-tight truncate" title={modelName}>{modelName}</h4>
                                                            <div className="text-xs font-bold text-indigo-600 mt-1">{evt.qteTotal.toLocaleString()} pcs</div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-3 border-t border-slate-200 space-y-2">
                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Besoins / Fournitures</p>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-600 font-medium">Tissu requis</span>
                                                            <span className={`font-black ${isTissuSuffisant ? 'text-slate-800' : 'text-red-600'}`}>~{fabricNeeded.toLocaleString()} m</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-600 font-medium">Accessoires</span>
                                                            <span className="font-black text-slate-800">~{accNeeded.toLocaleString()} u</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TRANSIT & RECENT ACTIONS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* EN TRANSIT (Commandes) */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><ArrowDownCircle className="w-4 h-4 text-emerald-500" /> Approvisionnements en Transit</h3>
                                    <button onClick={() => setTab('commandes')} className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">Gérer</button>
                                </div>
                                <div className="p-0 flex-1">
                                    {commandes.filter(c => c.statut === 'envoye' || c.statut === 'valide').length === 0 ? (
                                        <p className="p-8 text-center text-sm font-medium text-slate-400">Aucune commande en cours d'acheminement.</p>
                                    ) : (
                                        <ul className="divide-y divide-slate-50">
                                            {commandes.filter(c => c.statut === 'envoye' || c.statut === 'valide').map(c => (
                                                <li key={c.id} className="p-4 hover:bg-slate-50 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <FileText className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <p className="font-black text-slate-800 text-sm">{c.numero}</p>
                                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">{c.statut}</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-500 truncate">Chez {c.fournisseurNom} • {c.lignes.length} articles</p>
                                                        {c.dateLivraisonPrevue && <p className="text-[10px] text-slate-400 mt-1">Livraison prévue : {new Date(c.dateLivraisonPrevue).toLocaleDateString()}</p>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* RECENT MOVEMENTS */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-indigo-500" /> Derniers Mouvements</h3>
                                    <button onClick={() => setTab('tracabilite')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">Voir tout</button>
                                </div>
                                <div className="p-0">
                                    {mvts.length === 0 ? <p className="p-6 text-center text-sm font-medium text-slate-400">Aucun mouvement enregistré.</p> : (
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-slate-50"><tr className="text-slate-500"><th className="p-3 pl-6 font-bold w-32">Date</th><th className="p-3 font-bold w-24">Type</th><th className="p-3 font-bold">Produit</th><th className="p-3 font-bold text-right pr-6 w-32">Quantité</th></tr></thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {mvts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(m => {
                                                    const prod = products.find(p => p.id === m.productId);
                                                    return (
                                                        <tr key={m.id} className="hover:bg-slate-50">
                                                            <td className="p-3 pl-6 text-slate-500 font-mono text-xs">{new Date(m.date).toLocaleString()}</td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${m.type === 'entree' || m.type === 'retour_atelier' ? 'bg-emerald-100 text-emerald-700' : m.type === 'sortie' ? 'bg-indigo-100 text-indigo-700' : m.type === 'rebut' ? 'bg-rose-100 text-rose-700' : m.type === 'regularisation' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{m.type.replace('_', ' ')}</span>
                                                            </td>
                                                            <td className="p-3 font-bold text-slate-700">{prod?.designation || 'Inconnu'}</td>
                                                            <td className={`p-3 pr-6 text-right font-black ${m.type === 'entree' || m.type === 'retour_atelier' ? 'text-emerald-600' : m.type === 'sortie' || m.type === 'rebut' ? 'text-rose-600' : 'text-amber-500'}`}>{m.type === 'sortie' || m.type === 'rebut' ? '-' : '+'}{m.quantite}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ Demandes ══ */}
                {tab === 'demandes' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex gap-4 items-center flex-wrap">
                            <h2 className="text-xl font-black text-slate-800 flex-1">Demandes d'Approvisionnement (Atelier)</h2>
                            <button onClick={() => {
                                const did = uid();
                                setDemandes?.(prev => [{ id: did, modelId: 'OF-' + Math.floor(Math.random() * 900 + 100), chaineId: '', produitDesignation: products[0]?.designation || '', quantiteDemandee: 10, dateDemande: new Date().toISOString(), demandeur: 'Atelier Central', statut: 'attente' }, ...prev]);
                            }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Créer Demande Test</button>
                        </div>

                        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                            {demandes.length === 0 ? (
                                <div className="py-24 text-center">
                                    <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-xl font-black text-slate-400">Aucune demande en attente.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {demandes?.map(d => {
                                        const p = products.find(x => x.designation === d.produitDesignation);
                                        const st = p ? stockQty(lots, p.id) : 0;
                                        return (
                                            <div key={d.id} className="p-4 md:p-6 flex flex-col md:flex-row gap-6 md:items-center hover:bg-slate-50 transition-colors">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${d.statut === 'attente' ? 'bg-amber-50 text-amber-700 border-amber-200' : d.statut === 'preparee' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : d.statut === 'rejetee' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{d.statut}</span>
                                                        <span className="text-xs font-bold text-slate-500 font-mono">Demande du {new Date(d.dateDemande).toLocaleDateString()}</span>
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{d.demandeur}</span>
                                                    </div>
                                                    <h3 className="font-black text-lg text-slate-800">{d.produitDesignation || 'Produit Inconnu'}</h3>
                                                    <div className="text-sm text-slate-500 font-bold mt-1">Pour Ordre de Fab: <span className="text-indigo-600">{d.modelId}</span></div>
                                                    {d.notes && <div className="mt-2 text-xs bg-amber-50 text-amber-800 p-2 rounded-lg italic">"{d.notes}"</div>}
                                                </div>

                                                <div className="flex flex-col md:flex-row items-center gap-6">
                                                    <div className="bg-slate-100 rounded-2xl p-4 flex gap-6 text-center shadow-inner">
                                                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Demandé</div><div className="font-black text-2xl text-slate-800">{d.quantiteDemandee} <span className="text-sm font-medium">{p?.unite}</span></div></div>
                                                        <div className="w-px bg-slate-200" />
                                                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">En Stock</div><div className={`font-black text-2xl ${st >= d.quantiteDemandee ? 'text-emerald-600' : 'text-rose-600'}`}>{st.toFixed(0)} <span className="text-sm font-medium">{p?.unite}</span></div></div>
                                                    </div>

                                                    {d.statut === 'attente' && (
                                                        <div className="flex gap-2 w-full md:w-auto flex-col sm:flex-row">
                                                            <button onClick={() => {
                                                                if (st < d.quantiteDemandee) return alert('Stock insuffisant ! Veuillez approvisionner.');
                                                                setTab('bureau');
                                                                setBMode('sortie');
                                                                if (p) setBPid(p.id);
                                                                setBQty(d.quantiteDemandee.toString());
                                                                setBModele(d.modelId);
                                                                setBNotes(`Sortie générée pour la Demande depuis ${d.demandeur}`);
                                                                setDemandes?.(ds => ds.map(x => x.id === d.id ? { ...x, statut: 'preparee' } : x));
                                                            }} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95">Préparer</button>
                                                            <button onClick={() => setDemandes?.(ds => ds.map(x => x.id === d.id ? { ...x, statut: 'rejetee' } : x))} className="flex-1 md:flex-none px-4 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black text-sm rounded-xl hover:border-rose-200 hover:text-rose-600 transition-all active:scale-95">Refuser</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ Base ══ */}
                {tab === 'db' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap items-center bg-white p-2 rounded-xl border border-slate-200">
                            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input className="w-full pl-9 pr-3 py-2 text-sm outline-none" placeholder="Rechercher (Nom, Réf, Emplacement)..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                            <select className="px-3 py-2 text-sm bg-slate-50 border rounded-lg font-bold text-slate-600" value={catFilter} onChange={e => setCatFilter(e.target.value)}><option value="all">Catégories</option>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            <button onClick={downloadCSV} className="px-3 py-2 border rounded-lg hover:bg-slate-50 flex gap-2 items-center text-sm font-bold text-slate-600"><Download className="w-4 h-4" /> CSV</button>
                            <button onClick={() => setProdModal({ open: true })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-sm hover:bg-indigo-700 flex gap-2 items-center"><Plus className="w-4 h-4" /> Ajouter</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(p => {
                                const st = stockQty(lots, p.id);
                                return (
                                    <div key={p.id} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow relative overflow-hidden">
                                        <div className={`absolute top-0 inset-x-0 h-1 ${st === 0 ? 'bg-red-500' : st <= p.stockAlerte ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0" onClick={() => setProdModal({ open: true, item: p })}>{p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 m-4 text-slate-300" />}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start"><h3 className="font-black text-slate-800 text-lg truncate pr-2">{p.designation}</h3><StockBadge stock={st} seuil={p.stockAlerte} /></div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{p.reference}</div>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    {p.emplacement && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.emplacement}</span>}
                                                    {p.fournisseurNom && <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md"><Building2 className="w-3 h-3 inline mr-1" />{p.fournisseurNom}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bains de teinture visuels */}
                                        {(p.categorie === 'tissu' || p.categorie === 'fil') && (() => {
                                            const activeLots = lots.filter(l => l.productId === p.id && l.quantiteRestante > 0 && l.numBain);
                                            if (activeLots.length === 0) return null;

                                            const baths = activeLots.reduce((acc, l) => {
                                                acc[l.numBain!] = (acc[l.numBain!] || 0) + l.quantiteRestante;
                                                return acc;
                                            }, {} as Record<string, number>);

                                            // Simple hash to generate consistent colors based on the bain string
                                            const colors = ['bg-indigo-100 text-indigo-700 border-indigo-200', 'bg-emerald-100 text-emerald-700 border-emerald-200', 'bg-amber-100 text-amber-700 border-amber-200', 'bg-purple-100 text-purple-700 border-purple-200', 'bg-rose-100 text-rose-700 border-rose-200', 'bg-cyan-100 text-cyan-700 border-cyan-200'];

                                            return (
                                                <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Bains Disponibles</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(baths).sort((a, b) => b[1] - a[1]).map(([bain, q], idx) => {
                                                            const colorClass = colors[bain.length % colors.length];
                                                            return (
                                                                <div key={bain} className={`text-xs font-black px-2 py-1 rounded border ${colorClass} flex items-center justify-between min-w-[100px] shadow-sm`}>
                                                                    <span>#{bain}</span>
                                                                    <span className="opacity-80 ml-2">{q.toFixed(1)} <span className="text-[10px]">{p.unite}</span></span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                                            <div><div className="text-[10px] text-slate-400 font-bold uppercase">Stock Réel</div><div className="font-black text-xl">{st.toFixed(1)} <span className="text-sm font-medium">{p.unite}</span></div></div>
                                            <div className="flex gap-1">
                                                <button onClick={() => printBarcode(p.reference, p.designation)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Barcode className="w-4 h-4" /></button>
                                                <button onClick={() => { setTab('bureau'); setBPid(p.id); setBMode('entree'); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><TrendingDown className="w-4 h-4" /></button>
                                                <button onClick={() => { setTab('bureau'); setBPid(p.id); setBMode('sortie'); }} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><TrendingUp className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ══ Bureau ══ */}
                {tab === 'bureau' && (
                    <div className="space-y-6">
                        {bSuccess && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold flex gap-2"><CheckCircle className="w-5 h-5" />{bSuccess}</div>}

                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Action Form */}
                            <div className="bg-white rounded-2xl border shadow-sm">
                                <div className="grid grid-cols-3 divide-x divide-y border-b text-xs sm:text-sm">
                                    <button onClick={() => setBMode('entree')} className={`col-span-1 p-3 font-black flex flex-col gap-1 items-center justify-center ${bMode === 'entree' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}><ArrowDownCircle className="w-5 h-5" /> Entrée</button>
                                    <button onClick={() => setBMode('sortie')} className={`col-span-1 p-3 font-black flex flex-col gap-1 items-center justify-center ${bMode === 'sortie' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><ArrowUpCircle className="w-5 h-5" /> Sortie</button>
                                    <button onClick={() => setBMode('regularisation')} className={`col-span-1 p-3 font-black flex flex-col gap-1 items-center justify-center border-t md:border-t-0 md:border-l ${bMode === 'regularisation' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}><Scale className="w-5 h-5" /> Inventaire</button>
                                    <button onClick={() => setBMode('retour_atelier')} className={`col-span-1 p-3 font-black flex flex-col gap-1 items-center justify-center border-t border-slate-200 ${bMode === 'retour_atelier' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><RefreshCw className="w-5 h-5" /> Retour</button>
                                    <button onClick={() => setBMode('rebut')} className={`col-span-1 p-3 font-black flex flex-col gap-1 items-center justify-center border-t border-slate-200 ${bMode === 'rebut' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}><Trash2 className="w-5 h-5" /> Déchets</button>
                                    <button onClick={() => setBMode('reservation')} className={`col-span-1 p-3 font-black flex flex-col gap-1 items-center justify-center border-t border-slate-200 ${bMode === 'reservation' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}><Package className="w-5 h-5" /> Réserver</button>
                                </div>
                                <div className="p-6 space-y-5">
                                    {!bMode ? <div className="py-12 text-center text-slate-400 font-bold"><Barcode className="w-16 h-16 mx-auto mb-2 opacity-30" />Sélectionnez un type d'opération</div> : (
                                        <>
                                            <div className="flex gap-2">
                                                <div className="flex-1"><Lbl t="Rechercher produit" /><select className={inp} value={bPid} onChange={e => setBPid(e.target.value)}><option value="">Sélect...</option>{products.map(p => <option key={p.id} value={p.id}>{p.designation} — En stock: {stockQty(lots, p.id).toFixed(1)} {p.unite}</option>)}</select></div>
                                                <button onClick={() => setScannerMode(!scannerMode)} className={`px-4 rounded-xl border-2 font-black transition-colors ${scannerMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-600 hover:border-slate-300'}`}><Barcode className="w-5 h-5" /></button>
                                            </div>
                                            {scannerMode && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl animate-pulse"><input autoFocus placeholder="Flashez le code-barres..." className="w-full bg-transparent text-center font-black outline-none" onChange={handleScan} /></div>}

                                            {bureauProduct && (
                                                <div className="space-y-4">
                                                    {bureauProduct.emplacement && <div className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex gap-2"><MapPin className="w-4 h-4" /> À prendre au : {bureauProduct.emplacement}</div>}

                                                    <div className="flex gap-4">
                                                        <div className="flex-1"><Lbl t={bMode === 'regularisation' ? 'Quantité Réelle Constatée' : `Quantité (${bureauProduct.unite})`} /><input className={inp + ' text-xl font-black'} type="number" value={bQty} onChange={e => setBQty(e.target.value)} autoFocus />
                                                            {bMode !== 'regularisation' && <div className="flex gap-1 mt-1">{[10, 50, 100].map(q => <button key={q} onClick={() => setBQty(q.toString())} className="px-2 py-1 text-xs border rounded hover:bg-slate-50 font-bold">+{q}</button>)}</div>}
                                                        </div>
                                                        {bMode === 'entree' && <div className="w-1/3"><Lbl t="N° Bain/Lot (Teinture)" /><input className={inp} placeholder="TEIN-..." value={bNumBain} onChange={e => setBNumBain(e.target.value)} /></div>}
                                                    </div>

                                                    {(bMode === 'entree' || bMode === 'retour_atelier') && <div className="grid grid-cols-2 gap-3"><div><Lbl t="Prix Unitaire (CUMP)" /><input className={inp} value={bPrix} onChange={e => setBPrix(e.target.value)} /></div>{bMode === 'entree' && <div><Lbl t="Fournisseur" /><input className={inp} value={bFournisseur} onChange={e => setBFournisseur(e.target.value)} /></div>}</div>}

                                                    {(bMode === 'sortie' || bMode === 'reservation' || bMode === 'rebut') && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {bMode !== 'rebut' && <div><Lbl t="Chaîne" /><input className={inp} value={bChaine} onChange={e => setBChaine(e.target.value)} readOnly={!!bureauProduct.chaineExclusive} style={bureauProduct.chaineExclusive ? { background: '#f5f3ff' } : {}} /></div>}
                                                            <div><Lbl t="Ordre de Fab. (OF)" /><input className={inp} value={bModele} onChange={e => setBModele(e.target.value)} /></div>
                                                            <div className="col-span-2 flex border rounded-xl overflow-hidden mt-1 text-sm font-bold">
                                                                <button onClick={() => setBMethod('FIFO')} className={`flex-1 py-1.5 ${bMethod === 'FIFO' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>FIFO (Premier entré)</button>
                                                                <button onClick={() => setBMethod('LIFO')} className={`flex-1 py-1.5 ${bMethod === 'LIFO' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>LIFO (Dernier entré)</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button onClick={submitAction} className={`w-full py-3 rounded-xl font-black text-white text-lg ${(bMode === 'entree' || bMode === 'retour_atelier') ? 'bg-emerald-600 hover:bg-emerald-700' : bMode === 'reservation' ? 'bg-purple-600 hover:bg-purple-700' : (bMode === 'sortie' || bMode === 'rebut') ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}>Valider l'Opération</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Lots & History */}
                            <div className="space-y-6 flex flex-col h-full">
                                {bPid && (
                                    <div className="bg-white rounded-2xl border shadow-sm">
                                        <div className="px-4 py-2 bg-slate-50 border-b font-bold text-sm text-slate-600 flex justify-between"><span className="flex items-center gap-1"><Layers className="w-4 h-4" /> Détail des Lots</span><span>Traçabilité</span></div>
                                        <div className="max-h-[220px] overflow-y-auto divide-y text-sm">
                                            {lots.filter(l => l.productId === bPid && l.quantiteRestante > 0).map((l, i) => (
                                                <div key={l.id} className="p-3 flex justify-between items-center">
                                                    <div><div className="font-bold text-slate-700">{new Date(l.dateEntree).toLocaleDateString()}</div><div className="text-xs text-slate-400">{l.fournisseur || '—'} {l.numBain && <span className="bg-indigo-100 text-indigo-700 px-1 ml-1 rounded">Bain: {l.numBain}</span>}</div></div>
                                                    <div className="text-right font-black text-emerald-600 text-lg">{l.quantiteRestante.toFixed(1)}</div>
                                                </div>
                                            ))}
                                            {lots.filter(l => l.productId === bPid && l.quantiteRestante > 0).length === 0 && <div className="p-4 text-center text-slate-400 font-bold">Aucun lot disponible.</div>}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white rounded-2xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                                    <div className="px-4 py-3 border-b font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-indigo-500" /> Registre des Mouvements</div>
                                    <div className="flex-1 overflow-y-auto divide-y max-h-[300px]">
                                        {mvts.map(m => (
                                            <div key={m.id} className="p-3 flex gap-3 text-sm">
                                                <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0 ${m.type === 'entree' ? 'bg-emerald-100 text-emerald-600' : m.type === 'sortie' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{m.type === 'entree' ? <TrendingDown className="w-3 h-3" /> : m.type === 'sortie' ? <TrendingUp className="w-3 h-3" /> : <Scale className="w-3 h-3" />}</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between font-bold"><span className="truncate pr-2">{products.find(p => p.id === m.productId)?.designation || 'Inconnu'}</span><span className={m.type === 'entree' ? 'text-emerald-600' : m.type === 'sortie' ? 'text-rose-600' : 'text-amber-600'}>{m.type === 'sortie' ? '-' : '+'}{m.quantite}</span></div>
                                                    <div className="text-xs text-slate-500">{m.type === 'entree' ? m.fournisseurId : m.type === 'regularisation' ? m.notes : `Vers ${m.chaineId} (OF: ${m.modeleRef})`}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ Commandes ══ */}
                {tab === 'commandes' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
                            <div><h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> Bons de Commande</h2><p className="text-sm text-slate-500 font-bold">Gérez vos réapprovisionnements fournisseurs</p></div>
                            <button onClick={() => {
                                const newBc: BonCommande = { id: uid(), numero: `BC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, fournisseurNom: 'Nouveau Fournisseur', dateCreation: new Date().toISOString(), lignes: [], statut: 'brouillon' };
                                setCommandes([newBc, ...commandes]);
                            }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-transform active:scale-95"><Plus className="w-5 h-5" /> Nouveau BC</button>
                        </div>

                        {commandes.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300"><FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" /><h3 className="text-lg font-black text-slate-800">Aucun Bon de Commande</h3><p className="text-slate-500 font-bold text-sm">Créez votre premier BC pour réapprovisionner votre stock.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {commandes.map(c => (
                                    <div key={c.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col relative group">
                                        <div className={`h-1.5 w-full ${c.statut === 'brouillon' ? 'bg-slate-300' : c.statut === 'envoye' ? 'bg-amber-400' : c.statut === 'valide' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                        <div className="p-5 flex-1 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-black text-slate-800 text-lg">{c.numero}</div>
                                                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3" /> {c.fournisseurNom}</div>
                                                </div>
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${c.statut === 'brouillon' ? 'bg-slate-100 text-slate-600' : c.statut === 'envoye' ? 'bg-amber-100 text-amber-700' : c.statut === 'valide' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.statut}</span>
                                            </div>

                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                                                <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Date de création</span><span className="text-slate-700">{new Date(c.dateCreation).toLocaleDateString()}</span></div>
                                                <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Total estimé</span><span className="text-slate-800 font-black">{(c.total || 0).toLocaleString()} DH</span></div>
                                                <div className="text-xs font-bold text-slate-500 pt-2 border-t border-slate-200">{c.lignes.length} {c.lignes.length === 1 ? 'article' : 'articles'} dans ce bon</div>
                                            </div>
                                        </div>
                                        <div className="p-3 border-t bg-slate-50 flex gap-2">
                                            <button onClick={() => setBcModal({ open: true, item: c })} className="flex-1 py-2 bg-white border rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 flex justify-center items-center gap-2 transition-colors"><Edit2 className="w-3 h-3" /> Éditer</button>
                                            <button onClick={() => window.print()} className="py-2 px-3 bg-white border rounded-lg text-xs font-black text-slate-400 hover:text-indigo-600 hover:bg-slate-50 flex justify-center items-center transition-colors"><Printer className="w-4 h-4" /></button>
                                            <button className="py-2 px-3 bg-white border rounded-lg text-xs font-black text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex justify-center items-center transition-colors" onClick={() => { if (confirm('Supprimer ce Bon ?')) setCommandes(prev => prev.filter(x => x.id !== c.id)) }}><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══ Inventaire Tournant ══ */}
                {tab === 'inventaire' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 max-w-4xl mx-auto">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><RefreshCw className="w-8 h-8" /></div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Inventaire Tournant</h2>
                            <p className="text-slate-500 font-bold mb-6 max-w-md mx-auto">Vérifiez régulièrement l'exactitude de votre stock sans bloquer l'entrepôt en comptant une petite sélection d'articles.</p>

                            {!invSession && (
                                <button onClick={() => {
                                    if (products.length === 0) return alert('Aucun produit dans la base.');
                                    const shuffled = [...products].sort(() => 0.5 - Math.random());
                                    const selected = shuffled.slice(0, Math.min(5, products.length));
                                    setInvSession({ id: uid(), items: selected.map(p => ({ pid: p.id, qty: '' })) });
                                }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95"><RefreshCw className="w-5 h-5" /> Générer une Session (5 articles)</button>
                            )}
                        </div>

                        {invSession && (
                            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                    <div className="font-bold text-slate-700">Session d'inventaire #{invSession.id.toUpperCase()}</div>
                                    <button onClick={() => { if (confirm('Annuler cette session ?')) setInvSession(null); }} className="text-rose-500 hover:text-rose-600 font-bold text-sm bg-rose-50 px-3 py-1 rounded-lg">Annuler</button>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {invSession.items.map((item, idx) => {
                                        const p = products.find(x => x.id === item.pid);
                                        const st = p ? stockQty(lots, p.id) : 0;
                                        return (
                                            <div key={item.pid} className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center hover:bg-slate-50 transition-colors">
                                                <div className="font-black text-slate-300 text-2xl w-8">{idx + 1}</div>
                                                <div className="flex-1">
                                                    <h3 className="font-black text-lg text-slate-800">{p?.designation || 'Article Inconnu'}</h3>
                                                    <div className="text-xs text-slate-400 font-mono mt-1">{p?.reference} • Emplacement: <span className="text-slate-700 font-bold">{p?.emplacement || 'Non défini'}</span></div>
                                                </div>
                                                <div className="bg-slate-100 rounded-xl p-3 flex gap-4 text-center items-center shadow-inner">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Théorique</div>
                                                        <div className="font-black text-lg text-slate-500">{st.toFixed(1)} <span className="text-xs">{p?.unite}</span></div>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-200" />
                                                    <div>
                                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Comptage Réel</div>
                                                        <input autoFocus={idx === 0} type="number" className="w-24 border-2 border-emerald-200 rounded-lg px-2 py-1 text-center font-black text-emerald-700 bg-emerald-50 focus:outline-none focus:border-emerald-500" placeholder="0" value={item.qty} onChange={e => {
                                                            const n = [...invSession.items];
                                                            n[idx].qty = e.target.value;
                                                            setInvSession({ ...invSession, items: n });
                                                        }} /> <span className="text-xs font-bold text-slate-400">{p?.unite}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="p-4 bg-slate-50 border-t">
                                    <button onClick={() => {
                                        let newMvts = [...mvts];
                                        let newLots = [...lots];
                                        let count = 0;
                                        invSession.items.forEach(item => {
                                            if (item.qty === '') return;
                                            const rq = parseFloat(item.qty);
                                            if (isNaN(rq) || rq < 0) return;
                                            const p = products.find(x => x.id === item.pid);
                                            if (!p) return;
                                            const st = stockQty(newLots, p.id);
                                            const diff = rq - st;
                                            if (diff !== 0) {
                                                const m: MouvementStock = { id: uid(), productId: p.id, productNom: p.designation, type: 'regularisation', quantite: Math.abs(diff), prixUnitaire: p.cump || p.prixUnitaire, date: new Date().toISOString(), notes: `Inventaire Tournant (Théo: ${st}, Réel: ${rq})` };
                                                if (diff > 0) newLots.push({ id: uid(), productId: p.id, quantiteInitiale: diff, quantiteRestante: diff, prixUnitaire: p.cump || p.prixUnitaire, dateEntree: m.date });
                                                else newLots = deductLots(newLots, p.id, Math.abs(diff), 'FIFO');
                                                newMvts.unshift(m);
                                                count++;
                                            }
                                        });
                                        if (count > 0) { setLots(newLots); setMvts(newMvts); alert(`${count} articles mis à jour avec succès !`); }
                                        else alert('Aucun écart constaté. Inventaire validé.');
                                        setInvSession(null);
                                    }} className="w-full py-4 bg-emerald-600 text-white font-black text-lg rounded-2xl hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-transform active:scale-95"><CheckCircle className="w-6 h-6" /> Valider l'inventaire complet</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ Alertes ══ */}
                {tab === 'alertes' && (() => {
                    // Calcul des besoins de production
                    const modelNeeds = models.filter(m => m.ficheData?.materials && m.ficheData.materials.length > 0).map(m => {
                        const targetQty = m.meta_data.quantity || 1;
                        const shortages = m.ficheData!.materials!.map((mat: any) => {
                            const rawNeeded = mat.qty * targetQty;
                            const needed = (mat.unit === 'bobine' || mat.unit === 'pc') ? Math.ceil(rawNeeded * 1.05) : parseFloat((rawNeeded * 1.05).toFixed(2));
                            const inMagasin = products.find(p => p.designation.toLowerCase() === mat.name.toLowerCase() || p.reference === mat.name);
                            const stock = inMagasin ? stockQty(lots, inMagasin.id) : 0;
                            return { ...mat, needed, stock, inMagasin, isSufficient: stock >= needed };
                        }).filter((x: any) => !x.isSufficient);
                        return { model: m, shortages };
                    }).filter(x => x.shortages.length > 0);

                    return (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            {/* Alertes Globales */}
                            <div>
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-500" /> Stocks Critiques (Base)
                                </h3>
                                {alertes.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-emerald-100 p-6 flex items-center gap-4 text-emerald-700">
                                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                                        <div>
                                            <p className="font-black text-lg">Aucune rupture critique.</p>
                                            <p className="text-sm font-bold opacity-80">Tous les produits sont au/dessus de leur seuil d'alerte.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {alertes.map(p => {
                                            const st = stockQty(lots, p.id);
                                            return (
                                                <div key={p.id} className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm relative group hover:shadow-md transition-shadow">
                                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg">URGENCE ACHAT</div>
                                                    <div className="p-4 space-y-3">
                                                        <div className="font-black text-slate-800 text-lg leading-tight mt-2 pr-4">{p.designation}</div>
                                                        <div className="text-xs text-slate-400 font-mono">{p.reference}</div>
                                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="text-[10px] uppercase font-bold text-slate-400">Stock Actuel</div><div className="text-2xl font-black text-red-600">{st.toFixed(1)} <span className="text-sm">{p.unite}</span></div><div className="text-xs text-slate-400 mt-1">Seuil: {p.stockAlerte} {p.unite}</div></div>
                                                        {p.fournisseurNom && <div className="text-xs font-bold text-slate-600 p-2 bg-indigo-50 rounded-lg flex items-center gap-1 border border-indigo-100"><Phone className="w-3 h-3 text-indigo-400" /> {p.fournisseurNom}</div>}
                                                        <button onClick={() => { setTab('bureau'); setBPid(p.id); setBMode('entree'); }} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors">Approvisionner</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Alertes Production (Besoins) */}
                            <div>
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" /> Besoins de Production (OF en cours)
                                </h3>
                                {modelNeeds.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                                        <CheckCircle className="w-12 h-12 text-slate-300 mb-3" />
                                        <p className="font-black text-lg text-slate-500">Stock suffisant pour la production.</p>
                                        <p className="text-sm font-bold mt-1">Aucune rupture détectée pour les modèles en lancement.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {modelNeeds.map((mn, i) => (
                                            <div key={i} className="bg-white rounded-3xl border border-rose-200 shadow-sm overflow-hidden flex flex-col">
                                                <div className="bg-rose-50 border-b border-rose-100 p-4 flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm overflow-hidden shrink-0">
                                                        {mn.model.images?.front || mn.model.image ? (
                                                            <img src={mn.model.images?.front || mn.model.image} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="w-6 h-6 m-3 text-rose-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-slate-800 text-lg leading-tight">{mn.model.meta_data.nom_modele}</h4>
                                                        <p className="text-xs font-bold text-slate-500">Objectif: <span className="text-indigo-600">{mn.model.meta_data.quantity || 0} pcs</span></p>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    {mn.shortages.map((s: any, idx) => {
                                                        // Find a plan B (same category, different product, with enough stock)
                                                        const planB = s.inMagasin ? products.find(p => p.categorie === s.inMagasin.categorie && p.id !== s.inMagasin.id && stockQty(lots, p.id) >= s.needed) : null;

                                                        return (
                                                            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="font-black text-slate-800">{s.name}</div>
                                                                    <div className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded uppercase">Manquant</div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                                                    <div className="bg-white rounded-lg p-2 border border-slate-100">
                                                                        <div className="text-[10px] text-slate-400 font-bold uppercase">Besoin</div>
                                                                        <div className="font-black text-slate-700">{s.needed} {s.unit}</div>
                                                                    </div>
                                                                    <div className="bg-white rounded-lg p-2 border border-slate-100">
                                                                        <div className="text-[10px] text-slate-400 font-bold uppercase">En Magasin</div>
                                                                        <div className="font-black text-rose-600">{s.stock} {s.unit}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Plan B Suggestion */}
                                                                <div className="mt-2 text-xs">
                                                                    {planB ? (
                                                                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl flex gap-2 items-start">
                                                                            <RefreshCw className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                                                                            <div>
                                                                                <span className="font-black block text-emerald-700">Suggestion Plan B :</span>
                                                                                Remplacer par <strong>{planB.designation}</strong> (En stock: {stockQty(lots, planB.id).toFixed(1)} {planB.unite})
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-orange-50 border border-orange-100 text-orange-800 p-2.5 rounded-xl flex gap-2 items-start">
                                                                            <AlertTriangle className="w-4 h-4 shrink-0 text-orange-600 mt-0.5" />
                                                                            <div>
                                                                                <span className="font-black block text-orange-700">Action requise :</span>
                                                                                Aucune alternative (Plan B) trouvée en stock. Achat nécessaire.
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* ══ Valorisation (Waste & Surplus) ══ */}
                {tab === 'valorisation' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex gap-4 items-center flex-wrap">
                            <h2 className="text-xl font-black text-slate-800 flex-1 flex items-center gap-2"><Recycle className="w-6 h-6 text-emerald-500" /> Valorisation : Déchets & Revente</h2>
                            <button onClick={() => alert("Fonctionnalité en cours de développement (Phase 6).")} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Déclarer Nouveau Surplus
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Chutes & Déchets */}
                            <div className="bg-white rounded-3xl border shadow-sm p-6">
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Trash2 className="w-5 h-5 text-rose-500" /> Chutes de Coupe (Tissu)</h3>
                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center mb-6">
                                    <div className="text-4xl font-black text-rose-600 mb-2">345 <span className="text-lg">kg</span></div>
                                    <p className="text-sm font-bold text-rose-800">Volume total de déchets accumulés ce mois.</p>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { date: 'Hier, 16:30', m: 'Tissu Jean Bleu', q: '42 kg', src: 'Atelier Coupe 1' },
                                        { date: '10 Mars, 11:00', m: 'Toile Coton Blanche', q: '15 kg', src: 'Atelier Coupe 2' },
                                        { date: '08 Mars, 09:15', m: 'Tissu Synthétique Noir', q: '28 kg', src: 'Atelier Coupe 1' }
                                    ].map((d, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{d.m}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{d.date} • {d.src}</p>
                                            </div>
                                            <span className="font-black text-rose-600 bg-rose-50 px-2 py-1 rounded">{d.q}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => alert("Opération de recyclage confirmée. Le lot a été déduit du compte de valorisation.")} className="w-full mt-6 py-3 border-2 border-dashed border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors text-sm">
                                    Revendre / Recycler le lot (345 kg)
                                </button>
                            </div>

                            {/* Surplus Fournitures */}
                            <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col">
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><ArrowLeft className="w-5 h-5 text-blue-500" /> Surplus Fournitures (À revendre)</h3>
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center mb-6">
                                    <div className="text-4xl font-black text-blue-600 mb-2">1,250 <span className="text-lg">DH</span></div>
                                    <p className="text-sm font-bold text-blue-800">Valeur estimée du surplus dormant revendable.</p>
                                </div>

                                <div className="flex-1">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {[
                                            { p: 'Boutons Pression Métal', q: 450, u: 'pcs', val: 220 },
                                            { p: 'Fermetures Éclair 15cm', q: 120, u: 'pcs', val: 300 },
                                            { p: 'Étiquettes Cuir Brand', q: 1500, u: 'pcs', val: 750 }
                                        ].map((s, i) => (
                                            <div key={i} className="border border-slate-100 bg-slate-50 p-4 rounded-xl relative group">
                                                <button onClick={() => alert(`Suppression de ${s.p} des surplus.`)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                                <p className="text-xs font-black text-slate-800 leading-tight mb-2 pr-6">{s.p}</p>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-lg font-black text-blue-600">{s.q} <span className="text-[10px] text-blue-400">{s.u}</span></p>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500">{s.val} DH</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ Traçabilité ══ */}
                {tab === 'tracabilite' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 max-w-5xl mx-auto">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4"><LinkIcon className="w-5 h-5 text-indigo-500" /> Traçabilité Ascendante / Descendante</h2>
                            <div className="relative">
                                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold outline-none focus:border-indigo-500 transition-colors" placeholder="Rechercher par Numéro OF, Numéro de Bain, ou Référence Article..." value={traceQuery} onChange={e => setTraceQuery(e.target.value)} />
                            </div>
                            <p className="text-xs text-slate-400 font-bold mt-3 text-center">Tapez par exemple <span className="text-indigo-500">OF-105</span> ou <span className="text-indigo-500">TEIN-889</span> pour voir tous les mouvements liés.</p>
                        </div>

                        {traceQuery.length > 2 ? (
                            <div className="bg-white p-6 rounded-3xl border shadow-sm">
                                <h3 className="text-lg font-black text-slate-700 mb-6">Résultats pour "{traceQuery}"</h3>
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {mvts.filter(m => {
                                        const pName = products.find(p => p.id === m.productId)?.designation || '';
                                        return (m.modeleRef?.toLowerCase().includes(traceQuery.toLowerCase())) ||
                                            (m.bain?.toLowerCase().includes(traceQuery.toLowerCase())) ||
                                            (pName.toLowerCase().includes(traceQuery.toLowerCase())) ||
                                            (m.notes?.toLowerCase().includes(traceQuery.toLowerCase()));
                                    }).map((m, i) => {
                                        const pName = products.find(p => p.id === m.productId)?.designation || 'Inconnu';
                                        return (
                                            <div key={m.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                    {m.type === 'entree' || m.type === 'retour_atelier' ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : m.type === 'sortie' || m.type === 'rebut' || m.type === 'reservation' ? <TrendingUp className="w-4 h-4 text-rose-500" /> : <RefreshCw className="w-4 h-4 text-amber-500" />}
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border shadow-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${m.type === 'entree' || m.type === 'retour_atelier' ? 'bg-emerald-100 text-emerald-700' : m.type === 'sortie' ? 'bg-indigo-100 text-indigo-700' : m.type === 'rebut' ? 'bg-rose-100 text-rose-700' : m.type === 'regularisation' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{m.type.replace('_', ' ')}</span>
                                                        <span className="text-xs font-bold text-slate-400">{new Date(m.date).toLocaleString()}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-base">{pName}</h4>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded">Qté: <span className={m.type === 'entree' || m.type === 'retour_atelier' ? 'text-emerald-600' : m.type === 'sortie' || m.type === 'rebut' || m.type === 'reservation' ? 'text-rose-600' : 'text-amber-500'}>{m.type === 'sortie' || m.type === 'rebut' || m.type === 'reservation' ? '-' : '+'}{m.quantite}</span></span>
                                                        {m.modeleRef && <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">OF: {m.modeleRef}</span>}
                                                        {m.bain && <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-1 rounded">Bain: {m.bain}</span>}
                                                        {m.chaineId && <span className="text-xs font-bold text-slate-500 bg-slate-50 border px-2 py-1 rounded">Chaîne: {m.chaineId}</span>}
                                                        {m.fournisseurId && <span className="text-xs font-bold text-slate-500 bg-slate-50 border px-2 py-1 rounded">Frs: {m.fournisseurId}</span>}
                                                    </div>
                                                    {m.notes && <p className="text-xs text-slate-400 mt-2 italic">"{m.notes}"</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {mvts.filter(m => {
                                        const pName = products.find(p => p.id === m.productId)?.designation || '';
                                        return (m.modeleRef?.toLowerCase().includes(traceQuery.toLowerCase())) ||
                                            (m.bain?.toLowerCase().includes(traceQuery.toLowerCase())) ||
                                            (pName.toLowerCase().includes(traceQuery.toLowerCase())) ||
                                            (m.notes?.toLowerCase().includes(traceQuery.toLowerCase()));
                                    }).length === 0 && (
                                            <div className="text-center py-12 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative z-10 mx-6 md:mx-0">
                                                Aucun mouvement trouvé pour cette recherche.
                                            </div>
                                        )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                                <LinkIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-black text-slate-700">Audit de Traçabilité</h3>
                                <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto">Recherchez un terme pour afficher l'historique de vie complet et garantir la qualité.</p>
                            </div>
                        )}
                    </div>
                )}
                {/* ══ Smart WMS ══ */}
                {tab === 'wms' && (() => {
                    const wmsData = products.reduce((acc, p) => {
                        const rayon = p.emplacement ? p.emplacement.charAt(0).toUpperCase() : '?';
                        const st = stockQty(lots, p.id);
                        if (!acc[rayon]) acc[rayon] = { items: [], totalStock: 0 };
                        acc[rayon].items.push({ product: p, stock: st });
                        acc[rayon].totalStock += st;
                        return acc;
                    }, {} as Record<string, { items: { product: MagasinProduct, stock: number }[], totalStock: number }>);
                    const rayons = Object.keys(wmsData).sort();

                    return (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-500" /> Cartographie WMS 2D</h2>
                                    <p className="text-sm text-slate-500 font-bold mt-1">Vue de l'entrepôt par rayon. Densité basée sur le volume de stock actic.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded bg-slate-100"></div> Vide</div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded bg-indigo-200"></div> Moyen</div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded bg-indigo-500"></div> Dense</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3 bg-slate-100 p-8 rounded-3xl border border-slate-200 shadow-inner grid grid-cols-2 md:grid-cols-3 gap-8 overflow-x-auto relative min-h-[500px]">
                                    {/* Mock portes / Layout */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white px-8 py-2 border-b-2 border-x-2 border-slate-200 rounded-b-xl text-xs font-black text-slate-400 uppercase tracking-widest shadow-sm">Dock Réception</div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white px-8 py-2 border-t-2 border-x-2 border-slate-200 rounded-t-xl text-xs font-black text-slate-400 uppercase tracking-widest shadow-sm">Expédition / Atelier</div>

                                    {rayons.map(r => {
                                        const d = wmsData[r];
                                        const isDense = d.totalStock > 5000;
                                        const isMedium = d.totalStock > 1000;
                                        return (
                                            <div key={r} onClick={() => setSearch(`^${r}`)} className={`cursor-pointer transition-transform hover:scale-105 group relative mt-10 mb-10 bg-white rounded-2xl border-4 ${isDense ? 'border-indigo-500 shadow-lg shadow-indigo-200' : isMedium ? 'border-indigo-300 shadow-md' : 'border-slate-300'} flex flex-col overflow-hidden h-64`}>
                                                <div className={`p-2 text-center text-white font-black text-lg ${isDense ? 'bg-indigo-500' : isMedium ? 'bg-indigo-400' : 'bg-slate-400'}`}>Rayon {r}</div>
                                                <div className="p-4 flex-1 flex flex-col justify-center text-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                                                    <div className="text-3xl font-black text-slate-800">{d.items.length} <span className="text-sm text-slate-500 font-bold block">Réf. Uniques</span></div>
                                                    <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Total</div>
                                                    <div className={`font-black text-xl ${isDense ? 'text-indigo-600' : 'text-slate-600'}`}>{d.totalStock.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="bg-white p-6 rounded-3xl border shadow-sm h-[500px] overflow-y-auto flex flex-col">
                                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Search className="w-4 h-4 text-indigo-500" /> Détails Emplacements</h3>
                                    <input placeholder="Filtrer... (ex: ^A pour Rayon A)" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold mb-4 outline-none focus:border-indigo-500" />
                                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                                        {products.filter(p => search.startsWith('^') ? (p.emplacement || '?').toUpperCase().startsWith(search.substring(1).toUpperCase()) : (p.emplacement?.toLowerCase().includes(search.toLowerCase()) || p.designation.toLowerCase().includes(search.toLowerCase()))).map(p => {
                                            const st = stockQty(lots, p.id);
                                            return (
                                                <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{p.emplacement || 'Non Défini'}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{p.reference}</span>
                                                    </div>
                                                    <div className="font-bold text-slate-800 text-sm mt-1 leading-tight">{p.designation}</div>
                                                    <div className="text-xs font-black text-slate-500 mt-2">Dispo: <span className={st === 0 ? 'text-red-500' : 'text-emerald-600'}>{st} {p.unite}</span></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ══ Radar Fournisseurs ══ */}
                {tab === 'fournisseurs' && (() => {
                    const suppliersList = Array.from(new Set(products.map(p => p.fournisseurNom).filter(Boolean))) as string[];
                    const suppliersData = suppliersList.map(name => {
                        const prods = products.filter(p => p.fournisseurNom === name);
                        const entries = mvts.filter(m => m.fournisseur === name && m.type === 'entree');
                        const totalValue = prods.reduce((sum, p) => sum + (stockQty(lots, p.id) * (p.cump || p.prixUnitaire)), 0);
                        const avgPriceEvolution = prods.reduce((sum, p) => p.cump ? sum + ((p.cump - p.prixUnitaire) / p.prixUnitaire) * 100 : sum, 0) / (prods.length || 1);

                        // Fake scoring based on metrics
                        const delayScore = entries.length > 5 ? 90 : 70;
                        const qualScore = 100 - (mvts.filter(m => m.type === 'rebut' && prods.find(p => p.id === m.productId)).length * 5);
                        const globalScore = Math.round((delayScore + Math.max(0, qualScore) + (avgPriceEvolution < 0 ? 100 : avgPriceEvolution > 10 ? 50 : 80)) / 3);

                        return { name, prods: prods.length, entries: entries.length, value: totalValue, evolution: avgPriceEvolution, score: globalScore };
                    }).sort((a, b) => b.score - a.score);

                    return (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 max-w-7xl mx-auto">
                            <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 className="w-48 h-48" /></div>
                                <h2 className="text-3xl font-black mb-2 flex items-center gap-3"><Building2 className="w-8 h-8 text-indigo-400" /> Radar Fournisseurs (Sourcing)</h2>
                                <p className="text-indigo-100 font-bold max-w-xl">Évaluez la performance de vos fournisseurs, surveillez l'évolution des prix d'achat (CUMP) et optimisez votre sourcing stratégique.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {suppliersData.map(s => (
                                    <div key={s.name} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                                <Building2 className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl text-lg font-black border-2 border-dashed ${s.score >= 85 ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : s.score >= 70 ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-rose-200 text-rose-600 bg-rose-50'}`}>
                                                {s.score}/100
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-1">{s.name}</h3>
                                        <p className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2"><Layers className="w-4 h-4" /> {s.prods} références matérielles</p>

                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Valeur Stock</span>
                                                <span className="font-black text-slate-700">{s.value.toLocaleString()} DH</span>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Évolution Prix</span>
                                                <span className={`font-black flex items-center gap-1 ${s.evolution > 0 ? 'text-rose-500' : s.evolution < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                    {s.evolution > 0 ? '+' : ''}{s.evolution.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Livraisons Récentes</span>
                                                <span className="font-black text-slate-700">{s.entries} transactions</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {suppliersData.length === 0 && (
                                    <div className="col-span-full text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-black text-slate-700">Aucun Fournisseur</h3>
                                        <p className="text-slate-500 font-bold max-w-sm mx-auto mt-2">Associez des fournisseurs à vos produits dans la base pour voir leurs statistiques ici.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

            </div>

            {prodModal.open && <ProductModal item={prodModal.item} onSave={saveProduct} onClose={() => setProdModal({ open: false })} />}
            {bcModal.open && bcModal.item && (
                <BonCommandeModal
                    bc={bcModal.item}
                    products={products}
                    onSave={bc => { setCommandes(prev => prev.find(x => x.id === bc.id) ? prev.map(x => x.id === bc.id ? bc : x) : [bc, ...prev]); setBcModal({ open: false }); }}
                    onClose={() => setBcModal({ open: false })}
                />
            )}
        </div>
    );
}
