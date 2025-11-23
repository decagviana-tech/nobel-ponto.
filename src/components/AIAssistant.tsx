import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import { analyzeTimesheet } from '../services/geminiService';
import { getRecords, getBankBalance } from '../services/storageService';

interface Props {
  employeeId: string;
}

export const AIAssistant: React.FC<Props> = ({ employeeId }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    // Use specific employee data
    const records = getRecords(employeeId);
    const balance = getBankBalance(employeeId);
    
    try {
        const result = await analyzeTimesheet(records, balance, query);
        setResponse(result);
    } catch (e) {
        setResponse("Ocorreu um erro ao consultar o assistente.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden flex flex-col animate-fade-in" style={{ minHeight: '500px' }}>
      
      {/* Header */}
      <div className="bg-indigo-600 p-6 text-white flex items-center gap-4">
        <div className="p-3 bg-white/10 rounded-full">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold">RH Inteligente</h2>
          <p className="text-indigo-100 text-sm">Pergunte sobre seu saldo, leis ou analise sua semana.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        {!response && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                <Bot size={48} className="opacity-20" />
                <p>Tente perguntar: "Como foi minha performance essa semana?" ou "Tenho horas devendo?"</p>
            </div>
        )}

        {isLoading && (
            <div className="flex items-center justify-center h-full text-indigo-600 animate-pulse">
                <Loader2 size={32} className="animate-spin mr-2" />
                <span>Analisando seus registros...</span>
            </div>
        )}

        {response && !isLoading && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-line">
                {response}
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
            <input 
                type="text" 
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Digite sua dúvida..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button 
                onClick={handleAnalyze}
                disabled={isLoading || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl px-6 transition-colors flex items-center justify-center"
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};