import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { analyzeStockWithClaude, StockAnalysisInput } from '../services/claude';

interface AIAnalysisPanelProps {
  materials: StockAnalysisInput['materials'];
  orderQty: number;
  currency: string;
  modelName?: string;
}

function renderAnalysis(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Section headers (##)
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const content = line.replace(/^#{2,3}\s*/, '');
      return <div key={i} className="font-bold text-indigo-700 text-sm mt-4 mb-1 border-b border-indigo-100 pb-1">{content}</div>;
    }
    // Bold **text**
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <div key={i} className="text-sm text-slate-700 mb-0.5 leading-relaxed">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-slate-800">{part}</strong> : part)}
        </div>
      );
    }
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} className="text-sm text-slate-700 mb-0.5 pl-3 leading-relaxed flex gap-1">
          <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
          <span>{line.replace(/^[-•]\s*/, '')}</span>
        </div>
      );
    }
    // Numbered list
    if (/^\d+\./.test(line)) {
      return (
        <div key={i} className="text-sm text-slate-700 mb-1 pl-2 leading-relaxed">
          {line}
        </div>
      );
    }
    // Score / emoji lines
    if (line.includes('🔴') || line.includes('🟡') || line.includes('🟢') || line.includes('⚠') || line.includes('✅')) {
      return <div key={i} className="text-sm font-semibold text-slate-800 my-1">{line}</div>;
    }
    // Empty line
    if (line.trim() === '') return <div key={i} className="h-2" />;
    // Default
    return <div key={i} className="text-sm text-slate-700 mb-0.5 leading-relaxed">{line}</div>;
  });
}

export default function AIAnalysisPanel({ materials, orderQty, currency, modelName }: AIAnalysisPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setIsOpen(true);

    try {
      const result = await analyzeStockWithClaude({ materials, orderQty, currency, modelName });
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border border-indigo-200 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-indigo-100/50 transition-colors"
        onClick={() => setIsOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="font-bold text-indigo-700 text-sm">Analyse AI — Claude Opus 4.6</span>
          {analysis && !loading && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Prêt</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleAnalyze(); }}
            disabled={loading || materials.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyse en cours...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Analyser maintenant</>
            )}
          </button>
          {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-indigo-200 bg-white/80 px-4 py-4">
          {loading && (
            <div className="flex items-center gap-3 text-indigo-600 py-6 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Claude analyse votre stock et vos coûts...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-rose-700 mb-0.5">Erreur</div>
                <div className="text-xs text-rose-600">{error}</div>
                {error.includes('ANTHROPIC_API_KEY') && (
                  <div className="mt-2 text-xs text-rose-500">
                    Ajoutez <code className="bg-rose-100 px-1 rounded">ANTHROPIC_API_KEY=sk-ant-...</code> dans votre fichier <code className="bg-rose-100 px-1 rounded">.env</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Résultat — {materials.length} matières · Commande: {orderQty} pcs
                </div>
                <button onClick={() => setAnalysis(null)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                {renderAnalysis(analysis)}
              </div>
            </div>
          )}

          {!loading && !error && !analysis && (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-200" />
              <p>Cliquez sur <strong>"Analyser maintenant"</strong> pour obtenir des recommandations intelligentes.</p>
              <p className="text-xs mt-1 text-slate-300">Alimenté par Claude Opus 4.6 — Anthropic</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
