import React from 'react';
import { AppSettings, Material } from '../types';
import { fmt } from '../constants';
import { Scissors, Package, Tag, ArrowDown, ChevronDown, Calendar, Box } from 'lucide-react';

interface TicketViewProps {
  t: any;
  currency: string;
  darkMode: boolean;
  productName: string;
  displayDate: string;
  totalMaterials: number;
  totalTime: number;
  laborCost: number;
  costPrice: number;
  settings: AppSettings;
  productImage: string | null;
  textPrimary: string;
  textSecondary: string;
  materials: Material[];
  cutTime: number;
  packTime: number;
  sellPriceHT: number;
  sellPriceTTC: number;
  boutiquePrice: number;
  launchDate?: string;
}

const TicketView: React.FC<TicketViewProps> = ({
  t, currency, darkMode, productName, displayDate, totalMaterials,
  totalTime, laborCost, costPrice, settings, productImage,
  textPrimary, textSecondary, materials, cutTime, packTime,
  sellPriceHT, sellPriceTTC, boutiquePrice, launchDate
}) => {
  const baseTime = totalTime - cutTime - packTime;
  
  // Convert launch date to DD/MM/YYYY format if present
  const formattedDate = launchDate ? new Date(launchDate).toLocaleDateString('fr-FR') : displayDate;

  return (
    <div className="print-container bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      
      {/* Header - Dark Blue Box */}
      <div className="bg-slate-900 p-6 flex justify-between items-start">
        <div className="text-white">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">FICHE DE REVIENT</h3>
            <h1 className="text-2xl font-black text-white leading-tight mb-1">{productName || 'Article Sans Nom'}</h1>
            <p className="text-[10px] text-slate-500 font-mono">: #{Math.floor(Math.random()*1000) + 600}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-center min-w-[80px]">
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">DATE</span>
            <span className="block text-sm font-bold text-white">{formattedDate}</span>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-white">
        
        {/* SECTION 1: MATERIALS */}
        <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Box className="w-3.5 h-3.5" /> PRIX MATIÈRE PREMIÈRE
            </h3>
            
            <div className="space-y-3">
                {materials.map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-xs group">
                        <span className="font-bold text-slate-700">{m.name}</span>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {fmt(m.qty)} {m.unit} × {m.unitPrice}
                            </span>
                            <span className="font-mono font-bold text-slate-800 w-16 text-right">{fmt(m.qty * m.unitPrice)}</span>
                        </div>
                    </div>
                ))}
                {materials.length === 0 && <div className="text-xs text-slate-300 italic">Aucune matière première définie</div>}
            </div>
            
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex justify-between items-end">
                <span className="text-[11px] font-bold text-slate-500">Total Matière</span>
                <span className="text-xl font-black text-slate-800">{fmt(totalMaterials)} <span className="text-xs font-bold text-slate-400">DH</span></span>
            </div>
        </div>

        {/* SECTION 2: LABOR */}
        <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2 border-b border-blue-50 pb-2">
                <Scissors className="w-3.5 h-3.5" /> PRIX FAÇON (LABOR)
            </h3>
            
            <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Couture</span>
                    <span className="font-mono font-bold text-slate-700">{fmt(baseTime)} min</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Coupe ({settings.cutRate}%)</span>
                    <span className="font-mono font-bold text-slate-700">{fmt(cutTime)} min</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Emballage ({settings.packRate}%)</span>
                    <span className="font-mono font-bold text-slate-700">{fmt(packTime)} min</span>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-blue-100 flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-500">Coût Main d'œuvre</span>
                    <span className="text-[9px] text-slate-400">{fmt(totalTime)} min × {settings.costMinute} DH</span>
                </div>
                <span className="text-xl font-black text-blue-600">{fmt(laborCost)} <span className="text-xs font-bold text-blue-300">DH</span></span>
            </div>
        </div>

        {/* SECTION 3: COST SUMMARY */}
        <div className="bg-slate-900 rounded-xl p-4 text-white relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coût de revient par pièce:</span>
                    <div className="text-3xl font-black tracking-tight">{fmt(costPrice)} <span className="text-sm font-medium text-slate-500">DH</span></div>
                </div>
                <div className="text-right">
                     <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Prix Boutique (TTC)</span>
                     <div className="text-xl font-bold">{fmt(boutiquePrice)} DH</div>
                </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        {/* Product Image Footer */}
        {productImage && (
            <div className="mt-4 border-t border-slate-100 pt-4 flex justify-center">
                <img src={productImage} alt="Product" className="h-32 object-contain rounded opacity-90 grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
        )}

      </div>
    </div>
  );
};

export default TicketView;