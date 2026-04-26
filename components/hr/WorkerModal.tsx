import React, { useState, useEffect } from 'react';
import { X, Save, User } from 'lucide-react';

export interface HRWorker {
    id: string;
    matricule: string;
    full_name: string;
    cin: string | null;
    cnss: string | null;
    phone: string | null;
    date_naissance: string | null;
    adresse: string | null;
    photo: string | null;
    sexe: 'M' | 'F';
    role: string;
    chaine_id: string | null;
    poste: string | null;
    specialite: string | null;
    date_embauche: string;
    type_contrat: string;
    date_fin_contrat: string | null;
    date_renouvellement: string | null;
    is_active: number;
    salaire_base: number;
    taux_horaire: number;
    taux_piece: number;
    prime_assiduite: number;
    prime_transport: number;
    mode_paiement: string;
    contact_urgence_nom: string | null;
    contact_urgence_tel: string | null;
    contact_urgence_lien: string | null;
}

const ROLES = ['OPERATOR', 'SUPERVISOR', 'MECHANIC', 'QUALITY', 'MAINTENANCE', 'LOGISTICS'];
const CONTRATS = ['CDI', 'CDD', 'INTERIM', 'APPRENTISSAGE'];
const PAIEMENTS = ['VIREMENT', 'ESPECES', 'CHEQUE'];

const EMPTY: Omit<HRWorker, 'id'> = {
    matricule: '', full_name: '', cin: '', cnss: '', phone: '', date_naissance: '',
    adresse: '', photo: null, sexe: 'M', role: 'OPERATOR', chaine_id: '', poste: '',
    specialite: '', date_embauche: new Date().toISOString().split('T')[0],
    type_contrat: 'CDI', date_fin_contrat: '', date_renouvellement: '', is_active: 1,
    salaire_base: 0, taux_horaire: 0, taux_piece: 0, prime_assiduite: 0,
    prime_transport: 0, mode_paiement: 'VIREMENT', contact_urgence_nom: '',
    contact_urgence_tel: '', contact_urgence_lien: ''
};

interface Props {
    worker: HRWorker | null;
    onSave: (worker: HRWorker) => void;
    onClose: () => void;
}

export default function WorkerModal({ worker, onSave, onClose }: Props) {
    const [form, setForm] = useState<Omit<HRWorker, 'id'>>(worker ? { ...worker } : { ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [section, setSection] = useState<'identite' | 'contrat' | 'salaire' | 'urgence'>('identite');

    useEffect(() => {
        setForm(worker ? { ...worker } : { ...EMPTY });
        setSection('identite');
        setError('');
    }, [worker]);

    const set = (field: keyof typeof EMPTY, val: string | number) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleSave = async () => {
        if (!form.full_name.trim()) { setError('Le nom complet est obligatoire.'); return; }
        if (!form.matricule.trim()) { setError('Le matricule est obligatoire.'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, id: worker?.id };
            const res = await fetch('/api/hr/workers', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            onSave({ ...payload, id: data.id || worker?.id || '' } as HRWorker);
        } catch {
            setError('Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        { key: 'identite', label: 'Identité' },
        { key: 'contrat', label: 'Contrat' },
        { key: 'salaire', label: 'Salaire' },
        { key: 'urgence', label: 'Urgence' },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 text-lg">
                                {worker ? 'Modifier Ouvrier' : 'Nouvel Ouvrier'}
                            </h2>
                            <p className="text-xs text-slate-400">{worker ? worker.matricule : 'Nouveau matricule'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Section tabs */}
                <div className="flex border-b border-slate-100 shrink-0 px-6">
                    {sections.map(s => (
                        <button
                            key={s.key}
                            onClick={() => setSection(s.key)}
                            className={`px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
                                section === s.key
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {section === 'identite' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nom complet *" value={form.full_name} onChange={v => set('full_name', v)} span />
                            <Field label="Matricule *" value={form.matricule} onChange={v => set('matricule', v)} />
                            <Field label="CIN" value={form.cin || ''} onChange={v => set('cin', v)} />
                            <Field label="CNSS" value={form.cnss || ''} onChange={v => set('cnss', v)} />
                            <Field label="Téléphone" value={form.phone || ''} onChange={v => set('phone', v)} />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Sexe</label>
                                <select value={form.sexe} onChange={e => set('sexe', e.target.value)} className={selectCls}>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                            <Field label="Date de naissance" type="date" value={form.date_naissance || ''} onChange={v => set('date_naissance', v)} />
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Adresse</label>
                                <input value={form.adresse || ''} onChange={e => set('adresse', e.target.value)} className={inputCls} placeholder="Adresse complète" />
                            </div>
                        </div>
                    )}

                    {section === 'contrat' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Rôle</label>
                                <select value={form.role} onChange={e => set('role', e.target.value)} className={selectCls}>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <Field label="Chaîne ID" value={form.chaine_id || ''} onChange={v => set('chaine_id', v)} />
                            <Field label="Poste" value={form.poste || ''} onChange={v => set('poste', v)} />
                            <Field label="Spécialité" value={form.specialite || ''} onChange={v => set('specialite', v)} />
                            <Field label="Date d'embauche" type="date" value={form.date_embauche} onChange={v => set('date_embauche', v)} />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Type Contrat</label>
                                <select value={form.type_contrat} onChange={e => set('type_contrat', e.target.value)} className={selectCls}>
                                    {CONTRATS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <Field label="Date fin contrat" type="date" value={form.date_fin_contrat || ''} onChange={v => set('date_fin_contrat', v)} />
                            <Field label="Date renouvellement" type="date" value={form.date_renouvellement || ''} onChange={v => set('date_renouvellement', v)} />
                            <div className="col-span-2 flex items-center gap-3">
                                <input type="checkbox" id="is_active" checked={form.is_active === 1}
                                    onChange={e => set('is_active', e.target.checked ? 1 : 0)}
                                    className="w-4 h-4 accent-orange-500" />
                                <label htmlFor="is_active" className="text-sm font-semibold text-slate-700">Ouvrier actif</label>
                            </div>
                        </div>
                    )}

                    {section === 'salaire' && (
                        <div className="grid grid-cols-2 gap-4">
                            <NumField label="Salaire de base (MAD)" value={form.salaire_base} onChange={v => set('salaire_base', v)} />
                            <NumField label="Taux horaire (MAD/h)" value={form.taux_horaire} onChange={v => set('taux_horaire', v)} />
                            <NumField label="Taux à la pièce (MAD/pièce)" value={form.taux_piece} onChange={v => set('taux_piece', v)} />
                            <NumField label="Prime d'assiduité (MAD)" value={form.prime_assiduite} onChange={v => set('prime_assiduite', v)} />
                            <NumField label="Prime de transport (MAD)" value={form.prime_transport} onChange={v => set('prime_transport', v)} />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Mode de paiement</label>
                                <select value={form.mode_paiement} onChange={e => set('mode_paiement', e.target.value)} className={selectCls}>
                                    {PAIEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {section === 'urgence' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nom contact urgence" value={form.contact_urgence_nom || ''} onChange={v => set('contact_urgence_nom', v)} span />
                            <Field label="Téléphone urgence" value={form.contact_urgence_tel || ''} onChange={v => set('contact_urgence_tel', v)} />
                            <Field label="Lien (ex: Époux/se, Parent)" value={form.contact_urgence_lien || ''} onChange={v => set('contact_urgence_lien', v)} />
                        </div>
                    )}

                    {error && (
                        <p className="mt-4 text-sm font-semibold text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-lg shadow-md shadow-orange-500/30 transition-all disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-all placeholder:text-slate-300';
const selectCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none focus:border-orange-400 transition-all';

function Field({ label, value, onChange, type = 'text', span }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; span?: boolean;
}) {
    return (
        <div className={span ? 'col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
        </div>
    );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
            <input type="number" min="0" step="0.01" value={value || ''} onChange={e => onChange(parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0.00" />
        </div>
    );
}
