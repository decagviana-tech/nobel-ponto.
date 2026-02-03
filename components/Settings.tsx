
import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig } from '../services/storageService';
import { GoogleConfig, LocationConfig } from '../types';
import { Save, Database, Link, RefreshCw, Copy, CheckCircle2, Bookmark, ShieldCheck, ExternalLink, Info, Table as TableIcon, HelpCircle } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="bg-brand-500/10 p-3 rounded-2xl text-brand-600"><Database size={24} /></div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Conexão com Google Sheets</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronização Nobel Petrópolis</p>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">URL do Web App (Script do Google)</label>
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

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <TableIcon size={18} className="text-emerald-500" /> Mapa de Colunas da Planilha
            </h3>
            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                <HelpCircle size={12} /> Total: 15 Colunas
            </div>
        </div>
        
        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
            Andrea, para que todos os computadores da Nobel funcionem em harmonia, sua planilha precisa ter 15 colunas na Linha 1:
        </p>
        
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
                { col: 'A', title: 'Data' },
                { col: 'B', title: 'ID' },
                { col: 'C', title: 'Nome' },
                { col: 'D', title: 'Entrada' },
                { col: 'E', title: 'Alm. I' },
                { col: 'F', title: 'Alm. V' },
                { col: 'G', title: 'Lan. I' },
                { col: 'H', title: 'Lan. V' },
                { col: 'I', title: 'Saída' },
                { col: 'J', title: 'Total Dia' },
                { col: 'K', title: 'Saldo Dia' },
                { col: 'L', title: 'Banco Total' },
                { col: 'M', title: 'Jornada' },
                { col: 'N', title: 'Dia Curto' },
                { col: 'O', title: 'Início Banco', highlight: 'bg-emerald-600 text-white border-emerald-700' }
            ].map((item, idx) => (
                <div key={idx} className={`border p-3 rounded-2xl text-center shadow-sm ${item.highlight || 'bg-white border-slate-100'}`}>
                    <p className={`text-[9px] font-black uppercase mb-1 ${item.highlight ? 'text-white/50' : 'text-slate-300'}`}>Coluna {item.col}</p>
                    <p className="text-[10px] font-black truncate">{item.title}</p>
                </div>
            ))}
        </div>

        <div className="mt-8 space-y-3">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                    <p className="font-bold mb-1">Dica para Multi-Acesso:</p>
                    <p>Ao salvar a data de início (ex: 2026-02-01) na **Coluna O** da planilha, o aplicativo em qualquer outro computador saberá exatamente de onde começar a somar as horas ao clicar em sincronizar.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
