export interface StockAnalysisInput {
  materials: Array<{
    name: string;
    categorie?: string;
    unitPrice: number;
    qty: number;
    unit: string;
    stockActuel?: number;
    fournisseur?: string;
    delaiLivraison?: number;
  }>;
  stockData?: Record<string, number>;
  orderQty: number;
  currency: string;
  modelName?: string;
}

export async function analyzeStockWithClaude(input: StockAnalysisInput): Promise<string> {
  const response = await fetch('/api/ai/analyze-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || `Erreur ${response.status}`);
  }

  const data = await response.json();
  return data.analysis as string;
}
