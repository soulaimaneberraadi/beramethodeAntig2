
import React, { useState } from 'react';
import { Shirt, Clock, Coins, Scissors, Package, CheckSquare, ImageIcon, X, Upload, Trash2, Camera, Check, Calendar, Plus, Loader2 } from 'lucide-react';
import { AppSettings } from '../types';
import { fmt } from '../constants';
import { compressImage } from '../utils';

interface ModelInfoProps {
  t: any;
  currency: string;
  darkMode: boolean;
  productName: string;
  setProductName: (v: string) => void;
  launchDate: string;
  setLaunchDate: (v: string) => void;
  baseTime: number;
  setBaseTime: (v: number) => void;
  totalTime: number;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  tempSettings: AppSettings;
  setTempSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  productImage: string | null;
  setProductImage: (v: string | null) => void;
  toggleCostMinute: () => void;
  handleInstantSettingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTempSettingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  bgCard: string;
  bgCardHeader: string;
}

const ModelInfo: React.FC<ModelInfoProps> = ({
  t, currency, darkMode, productName, setProductName, launchDate, setLaunchDate,
  baseTime, setBaseTime, totalTime, settings, 
  tempSettings, productImage, setProductImage,
  toggleCostMinute, handleInstantSettingChange, handleTempSettingChange,
  inputBg, textPrimary, textSecondary, bgCard, bgCardHeader
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const compressed = await compressImage(file);
        setProductImage(compressed);
      } catch (err) {
        console.error("Compression error", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden ${bgCard}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-2 ${bgCardHeader}`}>
        <Shirt className={`w-5 h-5 ${textSecondary}`} />
        <h2 className={`font-bold ${textPrimary} text-base`}>{t.modelInfo}</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN (Inputs) */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Row 1: Nom du Modèle */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-bold uppercase tracking-wide ${textSecondary} ml-1`}>{t.modelName}</label>
                    <input 
                        type="text" 
                        value={productName} 
                        onChange={(e) => setProductName(e.target.value)} 
                        className={`w-full rounded-xl px-4 py-3 outline-none border-2 transition-all focus:border-blue-500 font-medium ${inputBg}`} 
                        placeholder="Ex: Chemise Homme Classique"
                    />
                </div>

                {/* Row 2: Temps / Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    {/* Temps Couture */}
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-bold uppercase tracking-wide ${textSecondary} ml-1`}>{t.sewingTime}</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={baseTime} 
                                onChange={(e) => setBaseTime(Math.max(0, parseFloat(e.target.value) || 0))} 
                                className={`w-full rounded-xl px-4 pl-10 py-3 outline-none border-2 transition-all focus:border-blue-500 font-black text-lg ${inputBg}`} 
                            />
                            <Clock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    {/* Date de Lancement */}
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-bold uppercase tracking-wide ${textSecondary} ml-1`}>Date de Lancement</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={launchDate} 
                                onChange={(e) => setLaunchDate(e.target.value)} 
                                className={`w-full rounded-xl px-4 pl-10 py-3 outline-none border-2 transition-all focus:border-blue-500 font-bold text-slate-700 ${inputBg}`} 
                            />
                            <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                        </div>
                    </div>
                </div>

                {/* Row 3: Rates & Total (Merged Cost Minute Here) */}
                <div className={`p-4 rounded-xl border-2 flex flex-wrap items-center justify-between gap-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Scissors className={`w-4 h-4 ${textSecondary}`} />
                            <span className={`text-xs font-bold ${textSecondary}`}>Coupe (%):</span>
                            <input 
                                type="number" 
                                min="0" 
                                name="cutRate" 
                                value={settings.cutRate} 
                                onChange={handleInstantSettingChange} 
                                className="w-14 h-8 rounded-lg border-2 border-slate-200 text-center font-bold text-slate-700 outline-none focus:border-blue-500 transition-all bg-white text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Package className={`w-4 h-4 ${textSecondary}`} />
                            <span className={`text-xs font-bold ${textSecondary}`}>Emballage (%):</span>
                            <input 
                                type="number" 
                                min="0" 
                                name="packRate" 
                                value={settings.packRate} 
                                onChange={handleInstantSettingChange} 
                                className="w-14 h-8 rounded-lg border-2 border-slate-200 text-center font-bold text-slate-700 outline-none focus:border-blue-500 transition-all bg-white text-sm"
                            />
                        </div>
                    </div>

                    {/* BLUE BOX: Total & Cost Minute */}
                    <div className="flex items-center gap-4 bg-blue-100 px-4 py-2 rounded-lg text-blue-700 shadow-sm border border-blue-200">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Total Temps</span>
                            <span className="text-xl font-black leading-none">{fmt(totalTime)} min</span>
                        </div>
                        
                        <div className="w-px h-8 bg-blue-300/50"></div>

                        <div className="flex flex-col items-start">
                             <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Coût Min. ({currency})</span>
                             <div className="flex items-center gap-2">
                                 <input 
                                    type="number" 
                                    name="costMinute"
                                    min="0" 
                                    step="0.01" 
                                    value={tempSettings.costMinute} 
                                    onChange={handleTempSettingChange}
                                    className={`w-16 h-7 text-center rounded border-2 outline-none font-bold text-sm transition-all ${
                                        settings.useCostMinute 
                                        ? 'bg-white border-blue-300 text-blue-700 focus:border-blue-500' 
                                        : 'bg-blue-50 border-blue-200 text-blue-400'
                                    }`}
                                 />
                                 <button 
                                    onClick={toggleCostMinute} 
                                    className={`w-7 h-7 rounded flex items-center justify-center transition-all shadow-sm active:scale-95 border-2 ${
                                        settings.useCostMinute
                                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-white border-blue-300 text-blue-300 hover:border-blue-400'
                                    }`}
                                    title={settings.useCostMinute ? "Désactiver Calcul" : "Activer Calcul"}
                                >
                                    <CheckSquare className="w-4 h-4" />
                                </button>
                             </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN (Image) */}
            <div className="lg:col-span-4 h-full">
                <div className={`w-full h-full min-h-[280px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
                    darkMode 
                    ? 'border-gray-600 bg-gray-800 hover:border-blue-500' 
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'
                }`}>
                    
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" />
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center text-blue-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-xs font-bold">Compression...</span>
                        </div>
                    ) : productImage ? (
                        <>
                            <img src={productImage} alt="Product" className="w-full h-full object-contain p-2 z-10" />
                            <div className="absolute inset-0 bg-black/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProductImage(null); }}
                                    className="bg-white text-red-500 p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500 shadow-sm border border-blue-100">
                                <Camera className="w-8 h-8" />
                            </div>
                            <h3 className={`font-bold text-sm ${textPrimary} mb-1`}>Click to Upload</h3>
                            <p className={`text-xs ${textSecondary}`}>JPG, PNG</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ModelInfo;
