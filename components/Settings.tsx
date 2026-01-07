
import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig, LocationConfig } from '../services/storageService';
import { GoogleConfig } from '../types';
import { Save, Database, Link, RefreshCw, Copy, CheckCircle2, Bookmark, ShieldCheck, ExternalLink } from 'lucide-react';

interface Props {
  onConfigSaved: () => void;
}

export const Settings: React.FC<Props> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [locConfig, setLocConfig] = useState<LocationConfig>({ useFixed: false, fixedName: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setConfig(getGoogleConfig());
    setLocConfig(getLocationConfig());
  }, []);

  const handleSave = () => {
    const cleanUrl = config.scriptUrl.trim();
    if (config.scriptUrl && !cleanUrl.includes('script.google.com')) {
        alert('A URL parece inválida. Deve começar com script.google.com');
        return;
    }
    saveLocationConfig(locConfig);
    const newConfig = { scriptUrl: cleanUrl, enabled: !!cleanUrl };
    saveGoogleConfig(newConfig);
    setConfig(newConfig);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleTestConnection = async () => {
    if (!config.scriptUrl) return;
    setIsTesting(true);
    try {
        const response = await fetch(`${config.scriptUrl}?action=test`);
        const data = await response.json();
        if (data.status === 'success') {
            alert('✅ Conexão Ativa com a Nuvem!');
        }
    } catch (error) {
        alert('❌ Falha na Conexão. Verifique a URL ou as permissões do script.');
    } finally { setIsTesting(false); }
  };

  const generatePermanentLink = () => {
      const baseUrl = window.location.origin + window.location.pathname;
      const encodedUrl = encodeURIComponent(config.scriptUrl);
      return `${baseUrl}?setup=${encodedUrl}`;
  };

  const handleCopyLink = () => {
      const link = generatePermanentLink();
      navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10 space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="bg-brand-500/10 p-3 rounded-2xl text-brand-600"><Database size={24} /></div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Conexão com Nuvem</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronização Nobel</p>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">URL do Web App Google</label>
                <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner" 
                    value={config.scriptUrl} 
                    onChange={e => setConfig({...config, scriptUrl: e.target.value})} 
                    placeholder="https://script.google.com/macros/s/..." 
                />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleTestConnection} disabled={isTesting} className="bg-white text-slate-700 py-3 rounded-2xl font-bold text-sm border-2 border-slate-100 hover:border-brand-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                    {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Link size={16} />} Testar Conexão
                </button>
                <button onClick={handleSave} className="bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl">
                    {status === 'saved' ? 'Configuração Salva!' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
      </div>

      {config.scriptUrl && (
          <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Bookmark size={200} />
              </div>
              
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-xl"><ShieldCheck size={24} /></div>
                      <h3 className="text-lg font-black uppercase tracking-tighter">Acesso Permanente</h3>
                  </div>
                  
                  <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                      Para evitar ter que conectar a planilha todos os dias no computador da loja, use este link especial e salve-o nos <b>Favoritos</b> do navegador.
                  </p>
                  
                  <div className="flex flex-col md:flex-row gap-3">
                      <button 
                        onClick={handleCopyLink}
                        className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-lg'}`}
                      >
                          {copySuccess ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                          {copySuccess ? 'Link Copiado!' : 'Copiar Link de Acesso'}
                      </button>
                      <button 
                        onClick={() => window.open(generatePermanentLink(), '_blank')}
                        className="bg-indigo-800 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg border border-white/10 transition-all"
                        title="Abrir Link em Nova Aba"
                      >
                          <ExternalLink size={20} />
                      </button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Seu Link Seguro:</p>
                      <p className="text-[10px] font-mono opacity-60 truncate">{generatePermanentLink()}</p>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-brand-500" /> Sincronização Inteligente
          </h3>
          <ul className="space-y-3">
              {[
                  "O aplicativo tenta atualizar os dados a cada 30 segundos automaticamente.",
                  "Ao bater o ponto, os dados são enviados imediatamente para sua Planilha Google.",
                  "As configurações são salvas no navegador, mas o link acima as restaura em qualquer PC."
              ].map((txt, i) => (
                  <li key={i} className="flex gap-3 items-start text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                      {txt}
                  </li>
              ))}
          </ul>
      </div>
    </div>
  );
};
