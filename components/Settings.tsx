import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig } from '../services/storageService';
import { GoogleConfig } from '../types';
import { Save, Database, CheckCircle, Link, Trash2, HelpCircle, Activity, AlertTriangle, Lock } from 'lucide-react';

interface Props {
  onConfigSaved: () => void;
}

export const Settings: React.FC<Props> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setConfig(getGoogleConfig());
  }, []);

  const handleSave = () => {
    const cleanUrl = config.scriptUrl.trim();
    if (!cleanUrl.includes('script.google.com')) {
        alert('A URL parece inválida. Ela deve começar com https://script.google.com...');
        return;
    }
    
    const newConfig = { scriptUrl: cleanUrl, enabled: true };
    saveGoogleConfig(newConfig);
    setConfig(newConfig);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleDisconnect = () => {
      if (confirm("Deseja desconectar a planilha?")) {
          const empty = { scriptUrl: '', enabled: false };
          saveGoogleConfig(empty);
          setConfig(empty);
          onConfigSaved();
      }
  }

  const handleTestConnection = async () => {
    if (!config.scriptUrl) return;
    setIsTesting(true);
    try {
        const response = await fetch(`${config.scriptUrl}?action=test`);
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('✅ Conexão Bem Sucedida!\n\nO servidor respondeu: ' + data.message);
        } else {
            alert('⚠️ O servidor respondeu, mas com um erro: ' + (data.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error(error);
        alert('❌ Falha na Conexão.\n\nVerifique se:\n1. A URL termina com /exec\n2. Você publicou como "App da Web"\n3. O acesso está definido para "Qualquer pessoa"');
    } finally {
        setIsTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
      
      <div className="flex justify-end mb-4">
         <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-bold px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
         >
            <Lock size={16} />
            Bloquear Acesso
         </button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-700">
                    <Database size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Conexão com Planilha</h2>
                    <p className="text-slate-500">Conecte via Google Apps Script (Simples & Seguro)</p>
                </div>
            </div>
            {config.enabled && (
                <button onClick={handleDisconnect} className="text-rose-500 hover:bg-rose-50 p-2 rounded">
                    <Trash2 size={20} />
                </button>
            )}
        </div>

        <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <h3 className="font-bold text-indigo-800 text-sm flex items-center gap-2 mb-2">
                <HelpCircle size={16} /> Como conectar?
            </h3>
            <ol className="list-decimal list-inside text-xs text-indigo-700 space-y-1">
                <li>Abra sua planilha no Google Sheets.</li>
                <li>Vá em <strong>Extensões &gt; Apps Script</strong>.</li>
                <li>Cole o código fornecido pelo suporte.</li>
                <li>Clique em <strong>Implantar &gt; Nova Implantação</strong>.</li>
                <li>Escolha "App da Web", Acesso: "Qualquer pessoa".</li>
                <li>Copie a URL gerada e cole abaixo.</li>
            </ol>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL do App da Web (Apps Script)</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Link className="absolute left-3 top-3.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg pl-10 p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            value={config.scriptUrl}
                            onChange={e => setConfig({...config, scriptUrl: e.target.value})}
                            placeholder="https://script.google.com/macros/s/..."
                        />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleTestConnection}
                    disabled={!config.scriptUrl || isTesting}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-50"
                >
                    <Activity size={18} className={isTesting ? 'animate-spin' : ''} />
                    {isTesting ? 'Testando...' : 'Testar Conexão'}
                </button>

                <button 
                    onClick={handleSave}
                    disabled={!config.scriptUrl}
                    className={`
                        flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-white transition-all
                        ${status === 'saved' ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'}
                        disabled:bg-slate-300 disabled:cursor-not-allowed
                    `}
                >
                    {status === 'saved' ? <><CheckCircle size={18} /> Salvo</> : <><Save size={18} /> Salvar e Conectar</>}
                </button>
            </div>
        </div>

        {config.enabled && (
            <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5" />
                <div>
                    <p className="font-bold">Conectado!</p>
                    <p>O aplicativo está pronto para sincronizar.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};