
import React, { useState, useEffect } from 'react';
import { Material, AppSettings, PurchasingData, PdfSettings } from '../types';
import { costTranslations } from '../constants';
import ModelInfo from './ModelInfo';
import MaterialsList from './MaterialsList';
import OrderSimulation from './OrderSimulation';
import SettingsPanel from './SettingsPanel';
import TicketView from './TicketView';
import A4DocumentView from './A4DocumentView';
import PdfSettingsModal from './PdfSettingsModal';

interface CostCalculatorProps {
  initialArticleName: string;
  initialTotalTime: number;
  initialImage: string | null;
  initialDate: string;
  initialCostMinute: number;
}

export default function CostCalculator({
  initialArticleName,
  initialTotalTime,
  initialImage,
  initialDate,
  initialCostMinute
}: CostCalculatorProps) {
  
  // --- STATE ---
  const [productName, setProductName] = useState(initialArticleName || '');
  const [baseTime, setBaseTime] = useState(initialTotalTime || 0); // Temps Gamme (already majored if coming from props)
  const [launchDate, setLaunchDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [productImage, setProductImage] = useState<string | null>(initialImage);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
      costMinute: initialCostMinute || 0.85,
      useCostMinute: true,
      cutRate: 5,
      packRate: 5,
      marginAtelier: 20,
      tva: 20,
      marginBoutique: 100
  });
  
  // Temp settings for instant feedback inputs
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);

  // Simulation
  const [orderQty, setOrderQty] = useState(100);
  const [wasteRate, setWasteRate] = useState(3); // 3% waste default

  // Document Info
  const [companyName, setCompanyName] = useState('BERAMETHODE');
  const [companyAddress, setCompanyAddress] = useState('Casablanca, Maroc');
  const [companyLegal, setCompanyLegal] = useState('RC: 123456 | IF: 789012 | ICE: 000123456789000');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [docRef, setDocRef] = useState(`DEV-${new Date().getFullYear()}-001`);
  const [docNotes, setDocNotes] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState<'calcul' | 'ticket' | 'a4'>('calcul');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Pdf Settings
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({ orientation: 'portrait', colorMode: 'color', scale: 1 });

  // Sync props when they change
  useEffect(() => {
      setProductName(initialArticleName);
      if (initialTotalTime > 0) setBaseTime(Math.round(initialTotalTime * 100) / 100);
      if (initialImage) setProductImage(initialImage);
      if (initialDate) setLaunchDate(initialDate);
      if (initialCostMinute > 0) {
          setSettings(s => ({ ...s, costMinute: initialCostMinute }));
          setTempSettings(s => ({ ...s, costMinute: initialCostMinute }));
      }
  }, [initialArticleName, initialTotalTime, initialImage, initialDate, initialCostMinute]);

  // --- CALCULATIONS ---
  const currency = "DH";
  const t = costTranslations['fr'];

  const cutTime = Math.round(baseTime * (settings.cutRate / 100) * 100) / 100;
  const packTime = Math.round(baseTime * (settings.packRate / 100) * 100) / 100;
  const totalTime = baseTime + cutTime + packTime;
  
  const laborCost = settings.useCostMinute ? (totalTime * settings.costMinute) : 0;
  
  const totalMaterialsCost = materials.reduce((sum, m) => sum + (m.unitPrice * m.qty), 0);
  
  const costPrice = totalMaterialsCost + laborCost;
  
  const sellPriceHT = costPrice * (1 + settings.marginAtelier / 100);
  const sellPriceTTC = sellPriceHT * (1 + settings.tva / 100);
  const boutiquePrice = sellPriceTTC * (1 + settings.marginBoutique / 100);

  // Purchasing Data (Simulation)
  const purchasingData: PurchasingData[] = materials.map(m => {
      const needPerUnit = m.qty * (1 + wasteRate / 100);
      const totalNeed = needPerUnit * orderQty;
      
      let qtyToBuy = totalNeed;
      if (m.unit === 'bobine' && m.threadCapacity && m.threadMeters) {
          // Bobine logic if needed
          qtyToBuy = Math.ceil(totalNeed);
      } else {
          qtyToBuy = Math.ceil(totalNeed * 100) / 100;
      }

      return {
          ...m,
          totalRaw: m.qty * orderQty,
          totalWithWaste: totalNeed,
          qtyToBuy,
          lineCost: qtyToBuy * m.unitPrice
      };
  });

  const totalPurchasingMatCost = purchasingData.reduce((acc, curr) => acc + curr.lineCost, 0);

  // --- HANDLERS ---
  const addMaterial = () => {
      setMaterials([...materials, { id: Date.now(), name: '', unitPrice: 0, qty: 0, unit: 'm', threadMeters: 0, threadCapacity: 0 }]);
  };

  const updateMaterial = (id: number, field: string, value: any) => {
      setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteMaterial = (id: number) => {
      setMaterials(materials.filter(m => m.id !== id));
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const num = parseFloat(value) || 0;
      setSettings(prev => ({ ...prev, [name]: num }));
      setTempSettings(prev => ({ ...prev, [name]: num }));
  };

  const handleTempSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const num = parseFloat(value);
      setTempSettings(prev => ({ ...prev, [name]: isNaN(num) ? '' : num }));
      if (!isNaN(num)) {
          setSettings(prev => ({ ...prev, [name]: num }));
      }
  };

  const toggleCostMinute = () => {
      setSettings(prev => ({ ...prev, useCostMinute: !prev.useCostMinute }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => setCompanyLogo(ev.target?.result as string);
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  // PDF Generation Logic (Stub using print for now)
  const generatePDF = async (action: 'save' | 'preview') => {
      setIsGeneratingPdf(true);
      // Ensure we are in A4 view
      if (activeTab !== 'a4') setActiveTab('a4');
      
      setTimeout(() => {
          window.print(); // Simple fallback
          setIsGeneratingPdf(false);
          setShowPdfModal(false);
      }, 500);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* TAB NAVIGATION */}
        <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                <button onClick={() => setActiveTab('calcul')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calcul' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Calculateur</button>
                <button onClick={() => setActiveTab('ticket')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ticket' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ticket Revient</button>
                <button onClick={() => setActiveTab('a4')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'a4' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Document A4</button>
            </div>
        </div>

        {activeTab === 'calcul' && (
            <div className="space-y-6 max-w-6xl mx-auto">
                <ModelInfo 
                    t={t} currency={currency} darkMode={false}
                    productName={productName} setProductName={setProductName}
                    launchDate={launchDate} setLaunchDate={setLaunchDate}
                    baseTime={baseTime} setBaseTime={setBaseTime}
                    totalTime={totalTime}
                    settings={settings} setSettings={setSettings}
                    tempSettings={tempSettings} setTempSettings={setTempSettings}
                    productImage={productImage} setProductImage={setProductImage}
                    toggleCostMinute={toggleCostMinute}
                    handleInstantSettingChange={handleSettingChange}
                    handleTempSettingChange={handleTempSettingChange}
                    inputBg="bg-white" textPrimary="text-slate-800" textSecondary="text-slate-500" bgCard="bg-white" bgCardHeader="bg-slate-50"
                />
                
                <MaterialsList 
                    t={t} currency={currency} darkMode={false}
                    materials={materials}
                    addMaterial={addMaterial}
                    updateMaterial={updateMaterial}
                    deleteMaterial={deleteMaterial}
                    totalMaterials={totalMaterialsCost}
                    bgCard="bg-white" bgCardHeader="bg-slate-50" textPrimary="text-slate-800" textSecondary="text-slate-500" tableHeader="" tableRowHover="hover:bg-slate-50"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <OrderSimulation 
                        t={t} currency={currency} darkMode={false}
                        orderQty={orderQty} setOrderQty={setOrderQty}
                        wasteRate={wasteRate} setWasteRate={setWasteRate}
                        purchasingData={purchasingData}
                        totalPurchasingMatCost={totalPurchasingMatCost}
                        laborCost={laborCost}
                        textSecondary="text-slate-500" textPrimary="text-slate-800" bgCard="bg-white"
                    />
                    <SettingsPanel 
                        t={t} darkMode={false}
                        settings={settings}
                        handleChange={handleSettingChange}
                        bgCard="bg-white" bgCardHeader="bg-slate-50" textPrimary="text-slate-800" textSecondary="text-slate-500" inputBg="bg-white"
                    />
                </div>
            </div>
        )}

        {activeTab === 'ticket' && (
            <div className="max-w-md mx-auto">
                <TicketView 
                    t={t} currency={currency} darkMode={false}
                    productName={productName} displayDate={new Date(launchDate).toLocaleDateString()}
                    totalMaterials={totalMaterialsCost}
                    totalTime={totalTime}
                    laborCost={laborCost}
                    costPrice={costPrice}
                    settings={settings}
                    productImage={productImage}
                    materials={materials}
                    cutTime={cutTime}
                    packTime={packTime}
                    sellPriceHT={sellPriceHT}
                    sellPriceTTC={sellPriceTTC}
                    boutiquePrice={boutiquePrice}
                    launchDate={launchDate}
                    textPrimary="text-slate-800" textSecondary="text-slate-500"
                />
            </div>
        )}

        {activeTab === 'a4' && (
            <div className="max-w-[21cm] mx-auto relative">
                <button 
                    onClick={() => setShowPdfModal(true)}
                    className="absolute -right-16 top-0 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all z-20 print:hidden"
                    title="Imprimer / PDF"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                </button>
                
                <A4DocumentView 
                    t={t} currency={currency} darkMode={false}
                    productName={productName}
                    displayDate={launchDate} setDisplayDate={setLaunchDate}
                    docRef={docRef} setDocRef={setDocRef}
                    companyName={companyName} setCompanyName={setCompanyName}
                    companyAddress={companyAddress} setCompanyAddress={setCompanyAddress}
                    companyLegal={companyLegal} setCompanyLegal={setCompanyLegal}
                    companyLogo={companyLogo} handleLogoUpload={handleLogoUpload}
                    baseTime={baseTime} totalTime={totalTime} settings={settings}
                    productImage={productImage} materials={materials}
                    laborCost={laborCost} costPrice={costPrice}
                    sellPriceHT={sellPriceHT} sellPriceTTC={sellPriceTTC} boutiquePrice={boutiquePrice}
                    orderQty={orderQty} wasteRate={wasteRate} purchasingData={purchasingData}
                    totalPurchasingMatCost={totalPurchasingMatCost}
                    docNotes={docNotes} setDocNotes={setDocNotes}
                />
            </div>
        )}

        <PdfSettingsModal 
            t={{ pdfSettings: 'Paramètres PDF', orientation: 'Orientation', portrait: 'Portrait', landscape: 'Paysage', colorMode: 'Couleur', color: 'Couleur', grayscale: 'N&B', zoom: 'Zoom', download: 'Télécharger' }}
            darkMode={false}
            showPdfModal={showPdfModal}
            setShowPdfModal={setShowPdfModal}
            isGeneratingPdf={isGeneratingPdf}
            isLibLoaded={true} // Mock
            pdfSettings={pdfSettings}
            setPdfSettings={setPdfSettings}
            generatePDF={generatePDF}
        >
            {/* Preview of A4 view */}
            <div className="transform scale-50 origin-top-left w-[200%]">
                 <A4DocumentView 
                    t={t} currency={currency} darkMode={false}
                    productName={productName}
                    displayDate={launchDate} setDisplayDate={()=>{}}
                    docRef={docRef} setDocRef={()=>{}}
                    companyName={companyName} setCompanyName={()=>{}}
                    companyAddress={companyAddress} setCompanyAddress={()=>{}}
                    companyLegal={companyLegal} setCompanyLegal={()=>{}}
                    companyLogo={companyLogo} handleLogoUpload={()=>{}}
                    baseTime={baseTime} totalTime={totalTime} settings={settings}
                    productImage={productImage} materials={materials}
                    laborCost={laborCost} costPrice={costPrice}
                    sellPriceHT={sellPriceHT} sellPriceTTC={sellPriceTTC} boutiquePrice={boutiquePrice}
                    orderQty={orderQty} wasteRate={wasteRate} purchasingData={purchasingData}
                    totalPurchasingMatCost={totalPurchasingMatCost}
                    docNotes={docNotes} setDocNotes={()=>{}}
                />
            </div>
        </PdfSettingsModal>
    </div>
  );
}
