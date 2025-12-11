
import React, { useState, useEffect } from 'react';
import { ViewMode, Employee, DailyRecord } from './types';
import { TimeClock } from './components/TimeClock';
import { SpreadsheetView } from './components/SpreadsheetView';
import { BankDashboard } from './components/BankDashboard';
import { AIAssistant } from './components/AIAssistant';
import { EmployeeManager } from './components/EmployeeManager';
import { Settings } from './components/Settings';
import { getEmployees, getGoogleConfig, mergeExternalRecords, mergeExternalEmployees, getBankBalance, replaceAllRecords } from './services/storageService';
import { syncRowToSheet, readSheetData, readEmployeesFromSheet, syncEmployeeToSheet } from './services/googleSheetsService';
import { Clock, FileSpreadsheet, LayoutDashboard, Bot, Menu, X, Users, ChevronDown, Settings as SettingsIcon, RefreshCw, Cloud, Building2, Lock } from 'lucide-react';
import { PinModal } from './components/PinModal';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.CLOCK);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Multi-user state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Auth State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingView, setPendingView] = useState<ViewMode | null>(null);

  // Load Employees
  useEffect(() => {
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);
    if (loadedEmployees.length > 0 && !currentEmployeeId) {
      setCurrentEmployeeId(loadedEmployees[0].id);
    }
  }, [refreshKey]); 

  // Auto-Sync Polling
  useEffect(() => {
      const config = getGoogleConfig();
      if (!config.enabled || !config.scriptUrl) return;

      // Initial sync (Soft)
      performSync(config.scriptUrl, true, false);

      const interval = setInterval(() => {
          performSync(config.scriptUrl, true, false); 
      }, 60000); 

      return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const performSync = async (scriptUrl: string, silent: boolean = false, hardSync: boolean = false) => {
      if (!scriptUrl) return;
      if (!silent) setIsSyncing(true);
      try {
          const sheetEmployees = await readEmployeesFromSheet(scriptUrl);
          if(sheetEmployees !== null && sheetEmployees.length > 0) {
              mergeExternalEmployees(sheetEmployees);
          }
          
          const sheetData = await readSheetData(scriptUrl);
          
          if (sheetData === null) {
              if (!silent) console.warn("Sync aborted due to fetch error");
              return;
          }

          if (hardSync) {
              replaceAllRecords(sheetData);
          } else {
              if(sheetData.length > 0) mergeExternalRecords(sheetData);
          }
          
          refreshData();
      } catch (e: any) {
          console.error("Sync failed", e);
      } finally {
          if (!silent) setIsSyncing(false);
      }
  };

  const handleManualSync = () => {
      const config = getGoogleConfig();
      if (config.enabled && config.scriptUrl) {
          // FIX: Changed from true (Hard Sync) to false (Soft Sync)
          // This prevents local data from being wiped if the sheet hasn't received the update yet.
          performSync(config.scriptUrl, false, false);
      } else {
          alert("Configure a URL do Script nas Configurações primeiro.");
      }
  };

  const handleRecordUpdate = async (record?: DailyRecord) => {
      if (!record) {
          const config = getGoogleConfig();
          if (config.enabled && config.scriptUrl) {
              await performSync(config.scriptUrl, false, false);
          } else {
              refreshData();
          }
          return;
      }

      refreshData(); 
      
      const config = getGoogleConfig();
      if (config.enabled && config.scriptUrl && record) {
           try {
               const empName = employees.find(e => e.id === record.employeeId)?.name || 'Desconhecido';
               const currentTotalBalance = getBankBalance(record.employeeId);
               await syncRowToSheet(config.scriptUrl, record, empName, currentTotalBalance);
           } catch (e: any) {
               console.error("Failed to push to sheet", e);
           }
      }
  };

  const handleEmployeeUpdate = async (specificEmployee?: Employee) => {
      const config = getGoogleConfig();
      if (config.enabled && config.scriptUrl) {
          try {
              setIsSyncing(true);
              if (specificEmployee) {
                  await syncEmployeeToSheet(config.scriptUrl, specificEmployee);
                  refreshData();
              } else {
                  const sheetEmployees = await readEmployeesFromSheet(config.scriptUrl);
                  if(sheetEmployees !== null && sheetEmployees.length > 0) {
                      mergeExternalEmployees(sheetEmployees);
                  }
                  refreshData();
                  const localEmployees = getEmployees();
                  for (const emp of localEmployees) {
                      await syncEmployeeToSheet(config.scriptUrl, emp);
                  }
              }
          } finally {
              setIsSyncing(false);
          }
      } else {
          refreshData();
      }
  };

  const handleEmployeeChange = (id: string) => {
    setCurrentEmployeeId(id);
    setIsUserMenuOpen(false);
    setCurrentView(ViewMode.CLOCK);
    refreshData();
  };

  const currentEmployee = employees.find(e => e.id === currentEmployeeId) || employees[0];

  // --- LÓGICA DE SEGURANÇA ---
  const handleNavClick = (mode: ViewMode) => {
    setIsMobileMenuOpen(false);

    const config = getGoogleConfig();
    const isDisconnected = !config.enabled || !config.scriptUrl;
    
    if (mode === ViewMode.SETTINGS && isDisconnected) {
        setCurrentView(mode);
        return;
    }
    
    const restrictedViews = [ViewMode.SHEET, ViewMode.EMPLOYEES, ViewMode.SETTINGS];
    
    if (restrictedViews.includes(mode)) {
        if (currentEmployee?.id === '1') {
            setCurrentView(mode);
            return;
        }

        const pinStr = String(currentEmployee?.pin || '');
        const hasPin = pinStr.length > 0 && pinStr !== '0000';
        
        if (hasPin) {
            setPendingView(mode);
            setIsPinModalOpen(true);
        } else {
            if (mode === ViewMode.SETTINGS || mode === ViewMode.EMPLOYEES) {
                alert(`ACESSO NEGADO.\n\nO usuário "${currentEmployee?.name}" não possui um PIN configurado.\n\nPor favor, acesse com um usuário Gerente ou use o Funcionário Padrão para configurar.`);
            } else {
                setCurrentView(mode);
            }
        }
    } else {
        setCurrentView(mode);
    }
  };

  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    if (pendingView) {
        setCurrentView(pendingView);
        setPendingView(null);
    }
  };

  const NavButton = ({ mode, label, icon: Icon }: { mode: ViewMode, label: string, icon: any }) => {
     const isRestricted = [ViewMode.SHEET, ViewMode.EMPLOYEES, ViewMode.SETTINGS].includes(mode);
     
     return (
        <button
        onClick={() => handleNavClick(mode)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-200 text-left relative group
            ${currentView === mode 
            ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
        `}
        >
        <Icon size={20} />
        <span>{label}</span>
        
        {isRestricted && (
            <Lock size={12} className="ml-auto opacity-40 group-hover:text-brand-600" />
        )}
        </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:bg-white print:block">
      
      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        correctPin={String(currentEmployee?.pin || '')}
      />

      <div className="md:hidden bg-white p-3 border-b border-slate-200 flex justify-between items-center sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex items-center gap-2 font-bold text-brand-600">
          <div className="bg-brand-600 p-1.5 rounded-lg">
            <Building2 className="text-white" size={18} />
          </div>
          <span className="hidden sm:inline text-sm">Nobel Petrópolis</span>
        </div>

        <div className="flex items-center gap-2">
            <button
                onClick={() => {
                    setIsMobileMenuOpen(true);
                    setIsUserMenuOpen(true);
                }}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full pl-1 pr-3 py-1 transition-all"
            >
                <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold border border-brand-200">
                    {currentEmployee?.name?.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-bold text-slate-700 max-w-[100px] truncate">
                    {currentEmployee?.name?.split(' ')[0] || 'Selecionar'}
                </span>
                <ChevronDown size={12} className="text-slate-400" />
            </button>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg ml-1">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      <div className={`
        fixed inset-0 z-30 bg-white md:relative md:flex flex-col w-full md:w-64 border-r border-slate-200 p-4 h-screen
        transition-transform duration-300 ease-in-out print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:flex items-center gap-3 px-4 mb-8 mt-2">
          <div className="bg-brand-600 p-2 rounded-lg">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">Nobel Petrópolis</h1>
            <p className="text-xs text-slate-500">Controle de Ponto</p>
          </div>
        </div>

        <div className="mb-6 px-2 relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full rounded-xl p-3 flex items-center justify-between transition-colors border
                ${isUserMenuOpen ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-100' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}
            `}
          >
            <div className="flex items-center gap-2 overflow-hidden">
               <div className="w-8 h-8 bg-brand-200 rounded-full flex items-center justify-center text-brand-700 font-bold shrink-0">
                  {currentEmployee?.name?.charAt(0) || 'U'}
               </div>
               <div className="text-left overflow-hidden">
                  <p className="text-sm font-bold text-slate-700 truncate">{currentEmployee?.name || 'Usuário'}</p>
                  <p className="text-xs text-slate-500 truncate">{currentEmployee?.role || 'Cargo'}</p>
               </div>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isUserMenuOpen && (
            <div className="absolute left-2 right-2 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-64 overflow-y-auto p-2 animate-fade-in">
               <p className="text-xs font-bold text-slate-400 px-2 py-2 uppercase tracking-wider">Selecionar Funcionário</p>
               {employees.map(emp => (
                 <button
                    key={emp.id}
                    onClick={() => handleEmployeeChange(emp.id)}
                    className={`w-full text-left p-2 rounded-lg text-sm mb-1 flex items-center gap-2 ${currentEmployeeId === emp.id ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}
                 >
                    <div className={`w-2 h-2 rounded-full ${currentEmployeeId === emp.id ? 'bg-brand-500' : 'bg-slate-300'}`} />
                    {emp.name}
                 </button>
               ))}
            </div>
          )}
        </div>

        <nav className="space-y-2 flex-1">
          <NavButton mode={ViewMode.CLOCK} label="Registrar Ponto" icon={Clock} />
          <NavButton mode={ViewMode.DASHBOARD} label="Dashboard" icon={LayoutDashboard} />
          <NavButton mode={ViewMode.SHEET} label="Planilha" icon={FileSpreadsheet} />
          <NavButton mode={ViewMode.AI_ASSISTANT} label="Consultor IA" icon={Bot} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavButton mode={ViewMode.EMPLOYEES} label="Funcionários" icon={Users} />
            <NavButton mode={ViewMode.SETTINGS} label="Configurações" icon={SettingsIcon} />
          </div>
        </nav>

        {getGoogleConfig().enabled && (
            <div className="mb-4 px-2">
                <button 
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className={`w-full flex items-center justify-center gap-2 border p-2 rounded-lg text-xs font-bold transition-colors
                        ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}
                    `}
                >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}
                </button>
                <div className="text-[10px] text-center mt-1 text-slate-400 flex items-center justify-center gap-1">
                    <Cloud size={10} className="text-indigo-500" />
                    <span>Conexão Segura Ativa</span>
                </div>
            </div>
        )}

        <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100 hidden md:block">
          <p className="text-xs text-slate-400 text-center">
            © 2025 Nobel Petrópolis<br/>Sistema de Ponto
          </p>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-60px)] md:h-screen print:p-0 print:h-auto print:overflow-visible">
        <div className="max-w-5xl mx-auto h-full print:max-w-none print:h-auto">
          {currentView === ViewMode.CLOCK && (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
               <TimeClock key={refreshKey} onUpdate={(r) => handleRecordUpdate(r)} employeeId={currentEmployeeId} />
            </div>
          )}

          {currentView === ViewMode.DASHBOARD && (
            <div className="animate-fade-in">
              <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
                  <p className="text-slate-500">Dados de: <span className="font-semibold text-brand-600">{currentEmployee?.name}</span></p>
              </div>
              <BankDashboard key={refreshKey} employeeId={currentEmployeeId} />
            </div>
          )}

          {currentView === ViewMode.SHEET && (
            <div className="h-full flex flex-col animate-fade-in print:block print:h-auto">
              <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Espelho de Ponto</h2>
                    <p className="text-slate-500 text-sm">Funcionário: {currentEmployee?.name}</p>
                </div>
                <div className="flex items-center gap-4">
                     {isSyncing && <span className="text-xs text-indigo-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Atualizando...</span>}
                    <button onClick={() => handleRecordUpdate()} className="text-sm text-brand-600 font-medium hover:underline">
                        Forçar Atualização
                    </button>
                </div>
              </div>
              <div className="flex-1 print:h-auto print:overflow-visible">
                 <SpreadsheetView key={refreshKey} onUpdate={(r) => handleRecordUpdate(r)} employeeId={currentEmployeeId} />
              </div>
            </div>
          )}

          {currentView === ViewMode.AI_ASSISTANT && (
             <div className="h-full flex flex-col justify-center animate-fade-in">
                <AIAssistant employeeId={currentEmployeeId} />
             </div>
          )}

          {currentView === ViewMode.EMPLOYEES && (
              <EmployeeManager 
                key={refreshKey}
                onUpdate={handleEmployeeUpdate} 
                currentEmployeeId={currentEmployeeId} 
                onSelectEmployee={handleEmployeeChange}
              />
          )}

          {currentView === ViewMode.SETTINGS && (
              <div className="h-full flex flex-col justify-center">
                  <Settings onConfigSaved={refreshData} />
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
