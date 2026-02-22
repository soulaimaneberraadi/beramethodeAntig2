import React from 'react';
import { Package, Plus, Trash2, Info, ShoppingBag } from 'lucide-react';
import { Material } from '../types';
import { fmt } from '../constants';

interface MaterialsListProps {
  t: any;
  currency: string;
  darkMode: boolean;
  materials: Material[];
  addMaterial: () => void;
  updateMaterial: (id: number, field: string, value: string | number) => void;
  deleteMaterial: (id: number) => void;
  bgCard: string;
  bgCardHeader: string;
  textPrimary: string;
  textSecondary: string;
  tableHeader: string;
  tableRowHover: string;
  totalMaterials: number;
}

const MaterialsList: React.FC<MaterialsListProps> = ({
  t, currency, darkMode, materials, addMaterial, updateMaterial, deleteMaterial,
  bgCard, bgCardHeader, textPrimary, textSecondary, tableHeader, tableRowHover,
  totalMaterials
}) => {
  const optionStyle = darkMode ? { backgroundColor: '#1f2937', color: 'white' } : {};
  const inputStyle = `w-full rounded-md px-2 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 text-white border-gray-600 focus:bg-gray-600' : 'bg-white border-slate-300 text-slate-900 focus:bg-white'} border`;

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden ${bgCard}`}>
      <div className={`px-4 py-4 border-b flex justify-between items-center ${bgCardHeader}`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-bold ${textPrimary}`}>{t.materials}</h2>
            <p className={`text-xs ${textSecondary}`}>Liste des composants et consommation</p>
          </div>
        </div>
        <button onClick={addMaterial} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm active:scale-95">
          <Plus className="w-4 h-4" /> {t.addMat}
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-slate-50 text-slate-500'} uppercase text-xs tracking-wider border-b ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
            <tr>
              <th className="px-4 py-3 font-semibold">{t.matName}</th>
              <th className="px-4 py-3 font-semibold w-32">{t.price} ({currency})</th>
              <th className="px-4 py-3 font-semibold w-48 text-center">{t.qtyUnit}</th>
              <th className="px-4 py-3 font-semibold w-32 text-right">{t.total}</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-slate-100'}`}>
            {materials.map((item) => (
              <tr key={item.id} className={`group ${tableRowHover} transition-colors`}>
                <td className="p-3 align-middle">
                  <input 
                    type="text" 
                    value={item.name} 
                    onChange={(e) => updateMaterial(item.id, 'name', e.target.value)} 
                    className={`${inputStyle} font-medium`} 
                    placeholder="Nom matière..." 
                  />
                </td>
                <td className="p-3 align-middle">
                  <input 
                    type="number" 
                    min="0" 
                    value={item.unitPrice} 
                    onChange={(e) => updateMaterial(item.id, 'unitPrice', e.target.value)} 
                    className={`${inputStyle} text-center`} 
                  />
                </td>
                <td className="p-3 align-middle">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="flex items-center gap-2 w-full">
                      {item.unit === 'bobine' ? (
                        <div className={`flex-1 rounded-md px-2 py-1.5 text-center text-sm font-mono border ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                          {fmt(item.qty)}
                        </div>
                      ) : (
                        <input 
                          type="number" 
                          min="0" 
                          step="0.001" 
                          value={item.qty} 
                          onChange={(e) => updateMaterial(item.id, 'qty', e.target.value)} 
                          className={`${inputStyle} text-center flex-1`} 
                        />
                      )}
                      <select 
                        value={item.unit} 
                        onChange={(e) => updateMaterial(item.id, 'unit', e.target.value)} 
                        className={`w-20 rounded-md px-2 py-1.5 text-sm outline-none border transition-all focus:ring-2 focus:ring-blue-500 cursor-pointer ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-slate-300 text-slate-700'}`}
                      >
                        <option value="m" style={optionStyle}>m</option>
                        <option value="pc" style={optionStyle}>pc</option>
                        <option value="kg" style={optionStyle}>kg</option>
                        <option value="g" style={optionStyle}>g</option>
                        <option value="bobine" style={optionStyle}>bobine</option>
                        <option value="cm" style={optionStyle}>cm</option>
                      </select>
                    </div>
                    {item.unit === 'bobine' && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border w-full animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                        <span className="text-[10px] text-blue-500 font-bold w-12">Fil (m):</span>
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="Métrage" 
                          value={item.threadMeters || ''} 
                          onChange={(e) => updateMaterial(item.id, 'threadMeters', e.target.value)} 
                          className={`w-full text-xs border rounded px-1 outline-none text-center h-6 ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-blue-200 text-slate-700'}`} 
                        />
                        <span className="text-slate-400 text-xs">/</span>
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="Capacité" 
                          value={item.threadCapacity || ''} 
                          onChange={(e) => updateMaterial(item.id, 'threadCapacity', e.target.value)} 
                          className={`w-full text-xs border rounded px-1 outline-none text-center h-6 ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-blue-200 text-slate-700'}`} 
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 align-middle text-right">
                   <div 
                     className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-md cursor-help ${darkMode ? 'bg-gray-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'}`}
                     title={`${item.unitPrice} ${currency} × ${fmt(item.qty)} ${item.unit} = ${fmt(item.unitPrice * item.qty)} ${currency}`}
                   >
                      {fmt(item.unitPrice * item.qty)} <span className="text-[10px] opacity-70">{currency}</span>
                      <Info className="w-3 h-3 opacity-50" />
                   </div>
                </td>
                <td className="p-3 align-middle text-center">
                  <button onClick={() => deleteMaterial(item.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
                <tr>
                    <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <ShoppingBag className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Aucune matière première</p>
                            <p className="text-xs mb-3">Commencez par ajouter les composants du modèle</p>
                            <button onClick={addMaterial} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                + Ajouter une matière
                            </button>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
          <tfoot className={`font-bold border-t ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <tr>
              <td colSpan={3} className="px-4 py-3 text-end uppercase text-xs tracking-wider opacity-80">
                {t.totalMat || "Total Matière"}:
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`inline-block px-3 py-1 rounded-md ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                  {fmt(totalMaterials)} <span className="text-[10px] opacity-70">{currency}</span>
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MaterialsList;