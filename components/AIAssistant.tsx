
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
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResponse(null);

    const records = getRecords(employeeId);
    const balance = getBankBalance(employeeId);

    const result = await analyzeTimesheet(records, balance, query);
    setResponse(result);
    setLoading(false);
  };

  const handleSuggestionClick = (text: string) => {
      setQuery(text);
      // Opcional: enviar automaticamente ao clicar
      // handleAsk(); 
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-full mb-4">
          <Bot size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Consultor de RH Inteligente</h2>
        <p className="text-slate-500">Tire dúvidas sobre seu ponto, banco de horas e direitos.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          {!response && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
              <Sparkles size={48} />
              <p className="text-sm">Pergunte coisas como:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => handleSuggestionClick("Estou devendo horas?")} className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1 rounded-full text-xs transition-colors">
                    Estou devendo horas?
                </button>
                <button onClick={() => handleSuggestionClick("Como foi minha semana?")} className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1 rounded-full text-xs transition-colors">
                    Como foi minha semana?
                </button>
                <button onClick={() => handleSuggestionClick("O que diz a lei sobre atrasos?")} className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1 rounded-full text-xs transition-colors">
                    O que diz a lei sobre atrasos?
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full text-indigo-600">
              <Loader2 size={32} className="animate-spin" />
              <span className="ml-3 font-medium">Analisando seu cartão de ponto...</span>
            </div>
          )}

          {response && (
            <div className="bg-indigo-50 rounded-xl p-6 text-slate-700 leading-relaxed whitespace-pre-line border border-indigo-100">
              <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                <Sparkles size={14} /> Resposta da IA
              </div>
              {response}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua dúvida aqui..."
              className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !query.trim()}
              className={`p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${query.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'}
              `}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
