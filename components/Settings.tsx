
import { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig } from '../services/storageService';
import { GoogleConfig, LocationConfig } from '../types';
import { Save, Database, Link, RefreshCw, Info, Table as TableIcon, Trash2, ShieldAlert } from 'lucide-react';

export const Settings = ({ onConfigSaved }: any) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setConfig(getGoogleConfig());
  }, []);

  const handleSave = () => {
    saveGoogleConfig(config);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleClearLocalCache = () => {
      if (confirm("⚠️ ATENÇÃO ANDREA!\n\nIsso apagará todos os funcionários e registros que estão salvos APENAS no seu celular/computador.\n\nUse isso apenas para remover 'funcionários fantasmas' que não existem mais na sua planilha do Google.\n\nO aplicativo irá recarregar e baixar os dados limpos da planilha. Deseja continuar?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-brand-500/10 p-3 rounded-2xl text-brand-600"><Database size={24} /></div>
            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Conexão Google Sheets</h2></div>
        </div>
        <div className="space-y-6">
            <input type="text" className="w-full bg-slate-50 border rounded-2xl p-4 font-mono text-xs text-slate-900 focus:bg-white outline-none" value={config.scriptUrl} onChange={e => setConfig({...config, scriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/..." />
            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl">{status === 'saved' ? 'Configuração Salva!' : 'Salvar Alterações'}</button>
        </div>
      </div>

      <div className="bg-rose-50 p-8 rounded-[2.5rem] shadow-xl border border-rose-100">
        <div className="flex items-center gap-3 mb-4 text-rose-700">
            <ShieldAlert size={24} />
            <h3 className="font-black uppercase tracking-tighter">Limpeza de Dados (Fantasmas)</h3>
        </div>
        <p className="text-xs text-rose-600 mb-6 font-medium">Use este botão se aparecerem funcionários antigos que já foram apagados da planilha.</p>
        <button 
            onClick={handleClearLocalCache}
            className="flex items-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
        >
            <Trash2 size={18} /> Limpar Memória do App
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
        <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><TableIcon size={18} className="text-emerald-500" /> Estrutura da Planilha (A-F)</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">Andrea, sua planilha deve seguir este modelo básico para funcionar bem:</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {['ID', 'Nome', 'Cargo', 'PIN', 'Active', 'Vigência'].map((item, idx) => (
                <div key={idx} className="border p-3 rounded-2xl text-center bg-white shadow-sm">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Col {String.fromCharCode(65+idx)}</p>
                    <p className="text-[10px] font-black truncate">{item}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
