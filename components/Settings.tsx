
import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig, LocationConfig, getAllRecords, getEmployees, getBankBalance } from '../services/storageService';
import { readSheetData, readEmployeesFromSheet, syncRowToSheet } from '../services/googleSheetsService';
import { mergeExternalRecords, mergeExternalEmployees } from '../services/storageService';
import { GoogleConfig } from '../types';
import { Save, Database, CheckCircle, Link, Trash2, HelpCircle, Activity, Lock, MapPin, Building2, DownloadCloud, UploadCloud } from 'lucide-react';

interface Props {
  onConfigSaved: () => void;
}

export const Settings: React.FC<Props> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [locConfig, setLocConfig] = useState<LocationConfig>({ useFixed: false, fixedName: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);

  useEffect(() => {
    setConfig(getGoogleConfig());
    setLocConfig(getLocationConfig());
  }, []);

  const handleSave = () => {
    const cleanUrl = config.scriptUrl.trim();
    if (config.scriptUrl && !cleanUrl.includes('script.google.com')) {
        alert('A URL parece inválida. Ela deve começar com https://script.google.com...');
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

  const handleDisconnect = () => {
      if (confirm("Deseja desconectar a planilha?")) {
          const empty = { scriptUrl: '', enabled: false };
          saveGoogleConfig(empty);
          setConfig(empty);
          onConfigSaved();
      }
  }

  const handleForcePull = async () => {
      if (!config.scriptUrl) return;
      setIsPulling(true);
      try {
          const sheetEmployees = await readEmployeesFromSheet(config.scriptUrl);
          if (sheetEmployees) mergeExternalEmployees(sheetEmployees);

          const sheetRecords = await readSheetData(config.scriptUrl);
          if (sheetRecords) mergeExternalRecords(sheetRecords);

          alert("Sincronização Completa!\n\nOs dados da planilha foram baixados para este computador.");
          onConfigSaved();
      } catch (error) {
          alert("Erro ao baixar dados. Verifique sua conexão.");
          console.error(error);
      } finally {
          setIsPulling(false);
      }
  };

  const handleForcePush = async () => {
      if (!config.scriptUrl) return;
      if (!confirm("Isso vai pegar TODOS os registros deste computador (que estão corretos) e sobrescrever os dados na planilha.\n\nIsso corrige os cálculos errados do passado.\n\nDeseja continuar?")) return;

      setIsPushing(true);
      setPushProgress(0);
      
      try {
          const allRecords = getAllRecords();
          const employees = getEmployees();
          const total = allRecords.length;
          
          if (total === 0) {
              alert("Não há registros locais para enviar.");
              setIsPushing(false);
              return;
          }

          // Process one by one to avoid rate limiting and ensure accuracy
          for (let i = 0; i < total; i++) {
              const record = allRecords[i];
              const emp = employees.find(e => e.id === record.employeeId);
              const empName = emp ? emp.name : 'Desconhecido';
              const balance = getBankBalance(record.employeeId);
              
              await syncRowToSheet(config.scriptUrl, record, empName, balance);
              
              // Update progress bar
              setPushProgress(Math.round(((i + 1) / total) * 100));
              
              // Small delay to be gentle on Google API
              await new Promise(r => setTimeout(r, 800));
          }

          alert("Reparo concluído! A planilha foi atualizada com os cálculos corretos.");
      } catch (error) {
          console.error(error);
          alert("Ocorreu um erro durante o envio. Alguns registros podem não ter sido atualizados.");
      } finally {
          setIsPushing(false);
          setPushProgress(0);
      }
  };

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

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        
        {/* SECTION 1: CLOUD CONNECTION */}
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-700">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Conexão com Nuvem</h2>
                        <p className="text-slate-500 text-sm">Integração Google Planilhas</p>
                    </div>
                </div>
                {config.enabled && (
                    <button onClick={handleDisconnect} className="text-rose-500 hover:bg-rose-50 p-2 rounded">
                        <Trash2 size={20} />
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">URL do App da Web (Apps Script)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Link className="absolute left-3 top-3.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg pl-10 p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm disabled:opacity-50 disabled:bg-slate-100"
                                value={config.scriptUrl}
                                onChange={e => setConfig({...config, scriptUrl: e.target.value})}
                                placeholder="https://script.google.com/macros/s/..."
                                disabled={isPushing || isPulling}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleTestConnection}
                        disabled={!config.scriptUrl || isTesting || isPushing || isPulling}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-50 text-sm"
                    >
                        <Activity size={16} className={isTesting ? 'animate-spin' : ''} />
                        {isTesting ? 'Testando...' : 'Testar Conexão'}
                    </button>
                </div>

                {config.enabled && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase">Sincronização Manual</p>
                        
                        <button 
                            onClick={handleForcePull}
                            disabled={isPulling || isPushing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50 border border-slate-200"
                        >
                            <DownloadCloud size={20} className={isPulling ? 'animate-bounce' : ''} />
                            {isPulling ? 'Baixando Dados...' : 'Baixar Dados da Nuvem (Download)'}
                        </button>

                        <button 
                            onClick={handleForcePush}
                            disabled={isPulling || isPushing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm relative overflow-hidden"
                        >
                            <div className={`absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300`} style={{ width: `${pushProgress}%` }}></div>
                            <div className="relative flex items-center gap-2">
                                <UploadCloud size={20} className={isPushing ? 'animate-bounce' : ''} />
                                {isPushing ? `Enviando... ${pushProgress}%` : 'Reparar Planilha (Upload Forçado)'}
                            </div>
                        </button>
                        <p className="text-[10px] text-center text-slate-400">
                            Use "Reparar Planilha" se os cálculos na planilha estiverem errados mas corretos aqui.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* SECTION 2: LOCATION SETTINGS */}
        <div className="pt-6 border-t border-slate-200">
             <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-3 rounded-full text-amber-700">
                    <MapPin size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Localização</h2>
                    <p className="text-slate-500 text-sm">Configuração do ponto físico</p>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <input 
                        type="checkbox"
                        id="useFixed"
                        checked={locConfig.useFixed}
                        onChange={(e) => setLocConfig({...locConfig, useFixed: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="useFixed" className="font-bold text-slate-700 cursor-pointer select-none">
                        Usar Localização Fixa (Recomendado para PC)
                    </label>
                </div>

                {locConfig.useFixed && (
                    <div className="animate-fade-in ml-8">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome da Loja / Local</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                type="text"
                                value={locConfig.fixedName}
                                onChange={(e) => setLocConfig({...locConfig, fixedName: e.target.value})}
                                placeholder="Ex: Nobel Petrópolis - Loja Principal"
                                className="w-full border border-slate-300 rounded-lg pl-10 p-2 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Isso substitui o GPS impreciso do computador. Todos os pontos registrados neste PC terão este local.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="pt-4">
            <button 
                onClick={handleSave}
                className={`
                    w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg
                    ${status === 'saved' ? 'bg-emerald-500 scale-95' : 'bg-brand-600 hover:bg-brand-700 hover:scale-[1.01]'}
                `}
            >
                {status === 'saved' ? <><CheckCircle size={24} /> Configurações Salvas!</> : <><Save size={24} /> Salvar Tudo</>}
            </button>
        </div>

      </div>
    </div>
  );
};
