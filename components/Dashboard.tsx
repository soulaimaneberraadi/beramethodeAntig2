import React, { useMemo } from 'react';
import { 
  Timer, 
  Factory, 
  Calculator, 
  Activity, 
  Clock, 
  Printer,
  TrendingUp
} from 'lucide-react';
import { Operation } from '../types';

interface DashboardProps {
  operations: Operation[];
  efficiency: number;
  setEfficiency: React.Dispatch<React.SetStateAction<number>>;
  workHours: number;
  setWorkHours: (hours: number) => void;
}

export default function Dashboard({ 
  operations,
  efficiency,
  setEfficiency,
  workHours,
  setWorkHours
}: DashboardProps) {

  // --- CALCULATIONS ---
  const stats = useMemo(() => {
    // Summing up calculating time from operations
    const totalTime = operations.reduce((acc, op) => acc + (op.time || 0), 0);
    
    // Prod per Hour = (60 / TotalTime) * Efficiency
    // If totalTime is 0, prod is 0
    const prodPerHour = totalTime > 0 ? (60 / totalTime) * (efficiency / 100) : 0;
    const prodPerDay = prodPerHour * workHours;
    
    return {
      totalTime: totalTime.toFixed(2),
      prodPerHour: Math.floor(prodPerHour),
      prodPerDay: Math.floor(prodPerDay),
      totalOperations: operations.length
    };
  }, [operations, efficiency, workHours]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Tableau de Bord</h1>
           <p className="text-slate-500 text-sm mt-1">Analyse de production et résultats calculés</p>
        </div>

        {/* Global Settings Control Panel */}
        <div className="flex flex-wrap gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col px-2">
             <label className="text-[10px] font-bold text-slate-400 uppercase">Rendement (%)</label>
             <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               <input 
                 type="number" 
                 min="1" max="100"
                 value={efficiency}
                 onChange={(e) => setEfficiency(Number(e.target.value))}
                 className="w-16 font-bold text-slate-700 bg-transparent outline-none border-b border-transparent focus:border-emerald-500 text-lg"
               />
             </div>
          </div>
          <div className="w-px bg-slate-100 mx-1"></div>
          <div className="flex flex-col px-2">
             <label className="text-[10px] font-bold text-slate-400 uppercase">Heures / Jour</label>
             <div className="flex items-center gap-2">
               <Clock className="w-4 h-4 text-emerald-500" />
               <input 
                 type="number" 
                 min="1" max="24"
                 value={workHours}
                 onChange={(e) => setWorkHours(Number(e.target.value))}
                 className="w-16 font-bold text-slate-700 bg-transparent outline-none border-b border-transparent focus:border-emerald-500 text-lg"
               />
             </div>
          </div>
          <div className="w-px bg-slate-100 mx-1"></div>
          <button className="flex items-center gap-2 px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Imprimer rapport">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PRIMARY STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Time Card */}
        <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 flex flex-col justify-between relative overflow-hidden group min-h-[160px]">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <Timer className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Temps Unitaire Total</p>
            <h3 className="text-4xl font-bold flex items-baseline gap-2">
              {stats.totalTime} <span className="text-lg font-medium text-slate-400">min</span>
            </h3>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
             <span>Basé sur {stats.totalOperations} opérations</span>
          </div>
        </div>

        {/* Prod / Hour */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group min-h-[160px]">
          <div>
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Factory className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                    {efficiency}% Efficience
                </div>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Production Horaire</p>
            <h3 className="text-4xl font-bold text-slate-800 flex items-baseline gap-2">
              {stats.prodPerHour} <span className="text-lg font-medium text-slate-400">pcs/h</span>
            </h3>
          </div>
        </div>

        {/* Prod / Day */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group min-h-[160px]">
          <div>
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                    {workHours} Heures
                </div>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Production Journalière</p>
            <h3 className="text-4xl font-bold text-slate-800 flex items-baseline gap-2">
              {stats.prodPerDay} <span className="text-lg font-medium text-slate-400">pcs/j</span>
            </h3>
          </div>
        </div>
      </div>

      {/* DETAILED BREAKDOWN (Placeholder for future charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-64 flex flex-col items-center justify-center text-center">
           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
             <Activity className="w-6 h-6 text-slate-300" />
           </div>
           <h3 className="text-slate-800 font-bold">Analyse Détaillée</h3>
           <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">Les graphiques de répartition du temps par machine apparaîtront ici.</p>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-64 flex flex-col items-center justify-center text-center">
           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
             <Calculator className="w-6 h-6 text-slate-300" />
           </div>
           <h3 className="text-slate-800 font-bold">Estimation de Coût</h3>
           <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">Le calcul du coût minute sera disponible dans la prochaine version.</p>
        </div>
      </div>

    </div>
  );
}