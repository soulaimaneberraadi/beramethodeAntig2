import React, { forwardRef } from 'react';
import { Building2, Upload, MapPin, FileText } from 'lucide-react';
import { Material, PurchasingData, AppSettings } from '../types';
import { fmt } from '../constants';

interface A4DocumentViewProps {
  t: any;
  currency: string;
  darkMode: boolean;
  productName: string;
  displayDate: string;
  setDisplayDate: (v: string) => void;
  docRef: string;
  setDocRef: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  companyAddress: string;
  setCompanyAddress: (v: string) => void;
  companyLegal: string;
  setCompanyLegal: (v: string) => void;
  companyLogo: string | null;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  baseTime: number;
  totalTime: number;
  settings: AppSettings;
  productImage: string | null;
  materials: Material[];
  laborCost: number;
  costPrice: number;
  sellPriceHT: number;
  sellPriceTTC: number;
  boutiquePrice: number;
  orderQty: number;
  wasteRate: number;
  purchasingData: PurchasingData[];
  totalPurchasingMatCost: number;
  docNotes: string;
  setDocNotes: (v: string) => void;
  isRTL?: boolean;
}

const A4DocumentView = forwardRef<HTMLDivElement, A4DocumentViewProps>(({
  t, currency, darkMode, productName, displayDate, setDisplayDate, docRef, setDocRef,
  companyName, setCompanyName, companyAddress, setCompanyAddress, companyLegal, setCompanyLegal,
  companyLogo, handleLogoUpload, baseTime, totalTime, settings, productImage,
  materials, laborCost, costPrice, sellPriceHT, sellPriceTTC, boutiquePrice,
  orderQty, wasteRate, purchasingData, totalPurchasingMatCost, docNotes, setDocNotes, isRTL
}, ref) => {
  const a4Bg = darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-slate-800';
  const a4Border = darkMode ? 'border-gray-500' : 'border-slate-300';
  const a4HeaderBorder = darkMode ? 'border-gray-400' : 'border-slate-800';
  const a4InputText = darkMode ? 'text-gray-100 placeholder:text-gray-500' : 'text-slate-900 placeholder:text-slate-300';
  const a4SubText = darkMode ? 'text-gray-400' : 'text-slate-600';
  const a4ProductBox = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50/50 border-slate-200';
  const a4InfoBox = darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-slate-800';
  const a4TableHead = darkMode ? 'bg-gray-700 text-white' : 'bg-slate-800 text-white';
  const a4TableRowOdd = darkMode ? 'bg-gray-750' : 'bg-slate-50'; 
  const a4TableBorder = darkMode ? 'border-gray-500' : 'border-slate-300';
  const a4SummaryBg = darkMode ? 'bg-gray-700 text-white' : 'bg-slate-800 text-white';
  const a4SummaryBody = darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-slate-300';

  return (
    <div ref={ref} className={`print-container print:w-full print:absolute print:top-0 print:left-0 print:m-0 p-8 min-h-[800px] shadow-sm print:shadow-none print:bg-white print:text-black ${a4Bg}`} style={{ fontFamily: "'Cairo', serif" }}>
      
      <div className={`flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-8 ${a4HeaderBorder} print:border-black relative`}>
        <div className="absolute -top-8 -left-8 -right-8 h-4 bg-slate-800 print:bg-black"></div>

        <div className="w-2/3 flex items-start gap-4">
            <div className={`w-24 h-24 border-2 rounded-lg flex items-center justify-center relative group overflow-hidden shrink-0 ${a4Border} ${darkMode ? 'bg-gray-700' : 'bg-slate-50'} print:bg-white print:border-slate-200`}>
               {companyLogo ? (
                 <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
               ) : (
                 <Building2 className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-slate-300'}`} />
               )}
               <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition text-[9px] font-bold z-10">
                 <Upload className="w-4 h-4 mb-1" />
                 {t.uploadLogo}
                 <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
               </label>
            </div>
            
            <div className="pt-1 space-y-1">
              <input 
                type="text" 
                placeholder={t.companyName}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`font-bold text-2xl uppercase w-full outline-none bg-transparent mb-1 hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-slate-300 rounded px-1 transition ${a4InputText} print:text-black`}
              />
              <div className={`flex items-start gap-2 text-sm ${a4SubText} print:text-gray-600`}>
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <textarea 
                  placeholder={t.companyAddress}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className={`w-full outline-none bg-transparent resize-none h-10 leading-relaxed hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-slate-300 rounded px-1 transition ${a4InputText} print:text-black`}
                />
              </div>
              <div className={`flex items-center gap-2 text-xs ${a4SubText} print:text-gray-500 italic`}>
                 <FileText className="w-3 h-3 shrink-0" />
                 <input 
                   type="text" 
                   placeholder={t.companyLegal}
                   value={companyLegal}
                   onChange={(e) => setCompanyLegal(e.target.value)}
                   className={`w-full outline-none bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-slate-300 rounded px-1 transition ${a4InputText} print:text-black`}
                 />
              </div>
            </div>
        </div>

        <div className="w-1/3 text-right pt-2">
          <h1 className={`text-xl font-bold uppercase tracking-widest border-b-2 inline-block mb-3 pb-1 ${darkMode ? 'text-gray-100 border-gray-100' : 'text-slate-800 border-slate-800'} print:text-black print:border-black`}>{t.docTitle}</h1>
          <div className="space-y-1 text-sm">
            <div className={`flex justify-between items-center p-1.5 rounded border ${a4InfoBox} print:bg-white print:border-slate-200 print:text-black`}>
               <span className="font-bold">{t.date}:</span>
               <input 
                 type="text" 
                 value={displayDate}
                 onChange={(e) => setDisplayDate(e.target.value)}
                 className={`font-mono font-medium bg-transparent outline-none text-right w-24 ${darkMode ? 'text-gray-200' : 'text-slate-800'} print:text-black`}
               />
            </div>
            <div className={`flex justify-between items-center p-1.5 rounded border ${a4InfoBox} print:bg-white print:border-slate-200 print:text-black`}>
               <span className="font-bold">{t.ref}:</span>
               <input 
                 type="text" 
                 value={docRef}
                 onChange={(e) => setDocRef(e.target.value)}
                 className={`font-mono font-medium bg-transparent outline-none text-right w-24 ${darkMode ? 'text-gray-200' : 'text-slate-800'} print:text-black`}
               />
            </div>
          </div>
        </div>
      </div>

      <div className={`flex gap-8 mb-8 p-4 rounded-lg border ${a4ProductBox} print:bg-slate-50 print:border-slate-100`}>
        <div className="flex-1">
          <span className={`text-xs font-bold uppercase tracking-wider mb-1 block ${darkMode ? 'text-gray-400' : 'text-slate-400'} print:text-slate-500`}>Modèle</span>
          <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'} print:text-black`}>{productName}</h2>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className={`p-3 rounded border ${a4InfoBox} print:bg-white print:border-slate-200 print:text-black`}>
              <span className={`block text-xs mb-1 font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'} print:text-slate-500`}>{t.sewingTime}</span>
              <span className="block text-lg font-bold">{fmt(baseTime)} min</span>
            </div>
            <div className={`p-3 rounded border ${a4InfoBox} print:bg-white print:border-slate-200 print:text-black`}>
              <span className={`block text-xs mb-1 font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'} print:text-slate-500`}>{t.totalTime}</span>
              <span className="block text-lg font-bold text-blue-600">{fmt(totalTime)} min</span>
            </div>
            <div className={`p-3 rounded border ${a4InfoBox} print:bg-white print:border-slate-200 print:text-black`}>
              <span className={`block text-xs mb-1 font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'} print:text-slate-500`}>{t.costMinute}</span>
              <span className="block text-lg font-bold">{fmt(settings.costMinute)} {currency}</span>
            </div>
          </div>
        </div>
        {productImage && (
          <div className="w-40 h-40 border-2 border-white shadow-sm bg-white p-1 shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
            {/* Added style explicitly to ensure clean rendering in html2pdf */}
            <img 
                src={productImage} 
                alt="Product" 
                className="w-full h-full object-contain" 
                style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        )}
      </div>

      <div className="mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className={`${a4TableHead} print:bg-slate-800 print:text-white`}>
              <th className={`px-4 py-3 text-left w-5/12 font-bold uppercase text-xs tracking-wider border-r rounded-tl-lg ${darkMode ? 'border-gray-600' : 'border-slate-700'}`}>{t.matName}</th>
              <th className={`px-4 py-3 text-center font-bold uppercase text-xs tracking-wider border-r ${darkMode ? 'border-gray-600' : 'border-slate-700'}`}>{t.price}</th>
              <th className={`px-4 py-3 text-center font-bold uppercase text-xs tracking-wider border-r ${darkMode ? 'border-gray-600' : 'border-slate-700'}`}>{t.qtyUnit}</th>
              <th className="px-4 py-3 text-right font-bold uppercase text-xs tracking-wider rounded-tr-lg">{t.total}</th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'text-gray-300' : 'text-slate-700'} print:text-black`}>
            {materials.map((m, i) => (
              <tr key={m.id} className={`${i % 2 === 0 ? a4Bg : a4TableRowOdd} print:${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className={`px-4 py-3 border-b font-medium ${a4TableBorder} print:border-slate-200`}>{m.name}</td>
                <td className={`px-4 py-3 border-b text-center ${a4TableBorder} print:border-slate-200 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>{m.unitPrice}</td>
                <td className={`px-4 py-3 border-b text-center font-mono text-xs ${a4TableBorder} print:border-slate-200`}>{fmt(m.qty)} {m.unit}</td>
                <td className={`px-4 py-3 border-b text-right font-bold ${a4TableBorder} print:border-slate-200`}>{fmt(m.qty * m.unitPrice)}</td>
              </tr>
            ))}
            <tr className={`${darkMode ? 'bg-blue-900/40' : 'bg-blue-50/50'} print:bg-blue-50`}>
              <td className={`px-4 py-3 border-b font-bold ${a4TableBorder} print:border-slate-200 ${darkMode ? 'text-white' : 'text-slate-800'} print:text-black`} colSpan={3}>
                {t.labor} <span className={`font-normal text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-slate-500'} print:text-slate-500`}>({fmt(totalTime)} min × {settings.costMinute} {currency})</span>
              </td>
              <td className={`px-4 py-3 border-b text-right font-bold ${a4TableBorder} print:border-slate-200 ${darkMode ? 'text-white' : 'text-slate-800'} print:text-black`}>{fmt(laborCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-12">
        <div className="w-5/12">
          <div className={`p-4 rounded-t-lg flex justify-between items-center ${a4SummaryBg} print:bg-slate-800 print:text-white`}>
            <span className="font-bold uppercase text-sm tracking-wide">{t.costPrice}</span>
            <span className="text-2xl font-bold">{fmt(costPrice)} <span className="text-sm font-normal opacity-70">{currency}</span></span>
          </div>
          <div className={`border border-t-0 rounded-b-lg p-4 space-y-2 text-sm ${a4SummaryBody} print:bg-white print:border-slate-200 print:text-black`}>
            <div className={`flex justify-between items-center ${darkMode ? 'text-gray-300' : 'text-slate-600'} print:text-slate-600`}>
              <span>{t.sellHT} <span className={`text-xs px-1 rounded ml-1 ${darkMode ? 'bg-gray-700' : 'bg-slate-100'} print:bg-slate-100`}>+{settings.marginAtelier}%</span></span>
              <span className="font-medium">{fmt(sellPriceHT)}</span>
            </div>
            <div className={`flex justify-between items-center font-bold border-t border-dashed pt-2 ${darkMode ? 'border-gray-600 text-white' : 'border-slate-200 text-slate-800'} print:border-slate-200 print:text-black`}>
              <span>{t.sellTTC} <span className={`text-xs px-1 rounded ml-1 font-normal ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'} print:bg-green-100 print:text-green-700`}>+{settings.tva}%</span></span>
              <span className={`text-lg ${darkMode ? 'text-green-400' : 'text-green-700'} print:text-green-700`}>{fmt(sellPriceTTC)}</span>
            </div>
            <div className={`flex justify-between items-center text-xs pt-2 mt-2 ${darkMode ? 'text-gray-500' : 'text-slate-400'} print:text-slate-400`}>
              <span>{t.shopPrice}</span>
              <span>{fmt(boutiquePrice)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 page-break-inside-avoid">
         <h3 className={`text-md font-bold uppercase tracking-wider mb-3 border-l-4 pl-3 ${darkMode ? 'border-indigo-500 text-white' : 'border-indigo-800 text-slate-800'} print:border-black print:text-black`}>
            {t.orderNeedsTitle}
         </h3>
         
         <div className={`flex gap-6 mb-4 p-3 rounded border ${a4InfoBox} print:bg-slate-50 print:border-slate-200 print:text-black`}>
            <div className="flex items-center gap-2"><span className="font-bold text-xs uppercase">{t.orderQty}:</span> <span>{orderQty}</span></div>
            <div className="flex items-center gap-2"><span className="font-bold text-xs uppercase">{t.waste}:</span> <span>{wasteRate}%</span></div>
         </div>

         <table className="w-full text-sm border-collapse">
           <thead>
             <tr className={`${a4TableHead} print:bg-slate-800 print:text-white`}>
               <th className={`px-4 py-2 text-left w-5/12 font-bold uppercase text-xs border-r ${darkMode ? 'border-gray-600' : 'border-slate-700'}`}>{t.matName}</th>
               <th className={`px-4 py-2 text-center font-bold uppercase text-xs border-r ${darkMode ? 'border-gray-600' : 'border-slate-700'}`}>{t.price}</th>
               <th className={`px-4 py-2 text-center font-bold uppercase text-xs border-r ${darkMode ? 'border-gray-600' : 'border-slate-700'}`}>{t.qtyToBuy}</th>
               <th className="px-4 py-2 text-right font-bold uppercase text-xs">{t.totalLine}</th>
             </tr>
           </thead>
           <tbody className={`${darkMode ? 'text-gray-300' : 'text-slate-700'} print:text-black`}>
             {purchasingData.map((m, i) => (
               <tr key={m.id} className={`${i % 2 === 0 ? a4Bg : a4TableRowOdd} print:${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                 <td className={`px-4 py-2 border-b font-medium ${a4TableBorder} print:border-slate-200`}>{m.name}</td>
                 <td className={`px-4 py-2 border-b text-center ${a4TableBorder} print:border-slate-200`}>{m.unitPrice}</td>
                 <td className={`px-4 py-2 border-b text-center font-bold ${a4TableBorder} print:border-slate-200`}>{fmt(m.qtyToBuy)} {m.unit}</td>
                 <td className={`px-4 py-2 border-b text-right font-bold ${a4TableBorder} print:border-slate-200`}>{fmt(m.lineCost)}</td>
               </tr>
             ))}
             <tr className={`${darkMode ? 'bg-indigo-900/40' : 'bg-indigo-50'} print:bg-indigo-50`}>
                <td colSpan={3} className={`px-4 py-2 border-b font-bold text-right ${a4TableBorder} print:border-slate-200`}>{t.realBudget}:</td>
                <td className={`px-4 py-2 border-b text-right font-bold text-lg ${darkMode ? 'text-indigo-300' : 'text-indigo-800'} print:text-indigo-800`}>{fmt(totalPurchasingMatCost)} {currency}</td>
             </tr>
           </tbody>
         </table>
      </div>

      <div className={`mt-auto pt-6 border-t-2 ${darkMode ? 'border-gray-600' : 'border-slate-100'} print:border-slate-100`}>
        <h4 className={`text-xs font-bold uppercase mb-2 ${darkMode ? 'text-gray-500' : 'text-slate-400'} print:text-slate-400`}>Notes & Remarques</h4>
        <div className={`flex items-start gap-2 p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-600'} print:bg-slate-50 print:border-slate-200 print:text-slate-600`}>
          <FileText className={`w-4 h-4 mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'} print:text-slate-400`} />
          <textarea 
            placeholder={t.notes}
            value={docNotes}
            onChange={(e) => setDocNotes(e.target.value)}
            className="w-full bg-transparent outline-none resize-none h-16 text-sm placeholder:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
});

export default A4DocumentView;