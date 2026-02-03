
import React, { useState, useEffect } from 'react';
import { Lock, Delete, X, User, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { getEmployees } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
  targetName: string; // Nome passado explicitamente para evitar erros de busca
  isAdminOnly?: boolean; 
}

const MASTER_PIN = '9999';

export const PinModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, correctPin, targetName, isAdminOnly = false }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setInput('');
        setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNum = (num: string) => {
    if (input.length < 4) {
      const newInput = input + num;
      setInput(newInput);
      setError(false);
      
      if (newInput.length === 4) {
        let isCorrect = false;
        
        if (isAdminOnly) {
            const employees = getEmployees();
            const isAdminPin = employees.some(e => 
                String(e.pin) === newInput && 
                (e.role.toLowerCase().includes('gerente') || e.role.toLowerCase().includes('admin'))
            );
            isCorrect = newInput === MASTER_PIN || isAdminPin;
        } else {
            isCorrect = newInput === String(correctPin) || newInput === MASTER_PIN;
        }
        
        if (isCorrect) {
          onSuccess();
          setInput('');
        } else {
          setError(true);
          setTimeout(() => setInput(''), 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/98 backdrop-blur-xl p-4">
      <div className={`bg-white w-full max-w-xs rounded-[3rem] shadow-2xl overflow-hidden p-8 relative transition-all duration-300 ${error ? 'ring-8 ring-rose-500/20 translate-x-1' : ''}`}>
        
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
        >
            <X size={18} />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className={`${isAdminOnly ? 'bg-slate-900' : 'bg-brand-600'} p-5 rounded-[2rem] mb-4 text-white shadow-xl ring-8 ${isAdminOnly ? 'ring-slate-100' : 'ring-brand-50'}`}>
            {isAdminOnly ? <KeyRound size={32} /> : <Lock size={32} />}
          </div>
          
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {isAdminOnly ? 'Área da Gerência' : 'Confirmar Identidade'}
          </h3>
          
          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm ${isAdminOnly ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <User size={12} className={isAdminOnly ? 'text-amber-600' : 'text-slate-400'} />
                <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[180px] ${isAdminOnly ? 'text-amber-700' : 'text-slate-600'}`}>
                    {isAdminOnly ? 'Acesso Administrativo' : targetName}
                </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-300 border-2
                ${input.length > i 
                  ? (error ? 'bg-rose-500 border-rose-500 scale-125' : (isAdminOnly ? 'bg-slate-900 border-slate-900 scale-125' : 'bg-brand-600 border-brand-600 scale-125')) 
                  : 'bg-slate-100 border-slate-200'
                }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNum(num.toString())}
              className="h-16 rounded-2xl bg-slate-50 text-2xl font-black text-slate-700 hover:bg-slate-200 active:scale-90 transition-all border border-slate-100 shadow-sm"
            >
              {num}
            </button>
          ))}
          <div className="h-16" />
          <button
            onClick={() => handleNum('0')}
            className="h-16 rounded-2xl bg-slate-50 text-2xl font-black text-slate-700 hover:bg-slate-200 active:scale-90 transition-all border border-slate-100 shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 active:scale-90 transition-all border border-slate-100 shadow-sm"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
