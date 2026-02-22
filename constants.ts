
import { Translations } from './types';

export const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return parseFloat(num.toFixed(2)).toString();
};

export const costTranslations: Translations = {
  dr: { // Darija
    modelInfo: "معلومات الموديل & التكلفة",
    modelName: "اسم الموديل",
    sewingTime: "وقت الخياطة (دقيقة)",
    costMinute: "تكلفة الدقيقة",
    cutting: "فصالة",
    packing: "تغليف (Emballage)",
    totalTime: "المجموع",
    materials: "السلعة (Matière Première)",
    matName: "المادة",
    price: "الثمن",
    qtyUnit: "الكمية / الوحدة",
    total: "المجموع",
    addMat: "إضافة مادة",
    needs: "تقدير احتياجات الطلبية",
    waste: "الخسارة (Waste)",
    orderQty: "الكمية المطلوبة",
    qtyToBuy: "للشراء",
    realBudget: "ميزانية السلعة (Real)",
    laborCost: "تكلفة اليد العاملة",
    totalBudget: "الميزانية الإجمالية",
    settings: "إعدادات الهوامش والضريبة",
    margeAtelier: "ربح المصنع %",
    tva: "الضريبة %",
    margeBoutique: "ربح المحل %",
    ticketTitle: "بطاقة التكلفة",
    totalMat: "مجموع السلعة",
    labor: "اليد العاملة",
    costPrice: "سعر التكلفة (P.R)",
    sellHT: "ثمن البيع (HT)",
    sellTTC: "ثمن البيع (TTC)",
    shopPrice: "ثمن المحل",
    print: "طباعة",
    date: "التاريخ",
    totalLine: "المجموع"
  },
  fr: {
    modelInfo: "Infos Modèle & Coûts",
    modelName: "Nom du Modèle",
    sewingTime: "Temps Couture (min)",
    costMinute: "Coût Minute",
    cutting: "Coupe",
    packing: "Emballage",
    totalTime: "Total",
    materials: "Matières Premières",
    matName: "Matière",
    price: "Prix",
    qtyUnit: "Qté / Unité",
    total: "Total",
    addMat: "Ajouter Matière",
    needs: "Estimation des Besoins",
    waste: "Perte (Waste)",
    orderQty: "Qté Commande",
    qtyToBuy: "À Acheter",
    realBudget: "Budget Matière",
    laborCost: "Coût Main d'œuvre",
    totalBudget: "Budget Total",
    settings: "Marges & Taxes",
    margeAtelier: "Marge Atelier %",
    tva: "TVA %",
    margeBoutique: "Marge Boutique %",
    ticketTitle: "Fiche de Revient",
    totalMat: "Total Matière",
    labor: "Main d'œuvre",
    costPrice: "Prix de Revient",
    sellHT: "Prix Vente (HT)",
    sellTTC: "Prix Vente (TTC)",
    shopPrice: "Prix Boutique",
    print: "Imprimer",
    date: "Date",
    totalLine: "Total Ligne"
  }
};