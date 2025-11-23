
import React, { useState, useEffect } from 'react';
import { Lock, Delete, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const PinModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, correctPin }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  // Reset input when opening
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
      
      // Auto submit on 4th digit
      if (newInput.length === 4) {
        // FORCE STRING COMPARISON
        if (newInput === String(correctPin)) {
          onSuccess();
          setInput('');
        } else {
          setError(true);
          setTimeout(() => setInput(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
    setError(false);
  };

  return (
    // Z-Index 100 garante que fica na frente do Menu Lateral (que costuma ser z-30 ou z-40)
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden p-6 relative">
        
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
        >
            <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="bg-brand-100 p-3 rounded-full mb-3 text-brand-600">
            <Lock size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Acesso Restrito</h3>
          <p className="text-xs text-slate-500 text-center px-4 mt-1">
            Esta área é protegida. Digite o PIN do funcionário selecionado.
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 border border-slate-200
                ${input.length > i 
                  ? (error ? 'bg-rose-500 border-rose-500 scale-110' : 'bg-brand-600 border-brand-600 scale-110') 
                  : 'bg-slate-50'
                }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-rose-500 text-xs font-bold mb-4 animate-pulse">
            Senha Incorreta. Tente novamente.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNum(num.toString())}
              className="h-14 rounded-xl bg-slate-50 text-xl font-bold text-slate-700 hover:bg-slate-100 active:bg-brand-50 active:text-brand-600 transition-colors shadow-sm border border-slate-100"
            >
              {num}
            </button>
          ))}
          <div className="h-14" /> {/* Spacer */}
          <button
            onClick={() => handleNum('0')}
            className="h-14 rounded-xl bg-slate-50 text-xl font-bold text-slate-700 hover:bg-slate-100 active:bg-brand-50 active:text-brand-600 transition-colors shadow-sm border border-slate-100"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-rose-500 transition-colors shadow-sm border border-slate-100"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
