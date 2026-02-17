import { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  orderNumber: string;
}

export default function PaymentModal({ isOpen, onClose, total, orderNumber }: PaymentModalProps) {
  const [amount, setAmount] = useState('60.00');
  const [selectedMethod, setSelectedMethod] = useState('cash');

  if (!isOpen) return null;

  const tendered = parseFloat(amount) || 0;
  const change = tendered - total;

  const handleNumberClick = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    setAmount(prev => prev === '0' ? num : prev + num);
  };

  const handleBackspace = () => {
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl h-[85vh] bg-[#151f2a] rounded-xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
          <div className="h-16 border-b border-slate-700/50 flex items-center justify-between px-8 bg-[#111a22]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">receipt_long</span>
              <h1 className="text-lg font-semibold text-slate-200">Payment: Order #{orderNumber}</h1>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            <div className="col-span-3 bg-[#111a22] border-r border-slate-700/50 flex flex-col p-6">
              <div className="mb-8">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Due</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">${total.toFixed(2)}</h2>
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200 font-medium">${(total / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400">Tax (10%)</span>
                  <span className="text-slate-200 font-medium">${(total * 0.1).toFixed(2)}</span>
                </div>
              </div>
              <button className="mt-auto w-full py-4 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-xl">call_split</span>
                Split Bill
              </button>
            </div>

            <div className="col-span-4 bg-[#151f2a] border-r border-slate-700/50 p-6 flex flex-col">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-6">Select Method</p>
              <div className="grid grid-cols-1 gap-4 flex-1 content-start">
                <button
                  onClick={() => setSelectedMethod('cash')}
                  className={`group relative flex items-center p-5 rounded-xl border-2 transition-all ${
                    selectedMethod === 'cash'
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-700 bg-[#233342] hover:border-slate-500'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-4 transition-colors ${
                    selectedMethod === 'cash'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white text-lg font-bold">Cash</p>
                    <p className={selectedMethod === 'cash' ? 'text-primary text-sm font-medium' : 'text-slate-400 text-sm'}>
                      {selectedMethod === 'cash' ? 'Processing...' : 'Physical currency'}
                    </p>
                  </div>
                  {selectedMethod === 'cash' && (
                    <div className="absolute right-5 w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(43,140,238,0.5)]"></div>
                  )}
                </button>

                <button
                  onClick={() => setSelectedMethod('card')}
                  className={`flex items-center p-5 rounded-xl border transition-all ${
                    selectedMethod === 'card'
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-700 bg-[#233342] hover:border-slate-500'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-4 ${
                    selectedMethod === 'card' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">credit_card</span>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-200 text-lg font-bold">Credit Card</p>
                    <p className="text-slate-400 text-sm">Visa, MC, Amex</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedMethod('mobile')}
                  className={`flex items-center p-5 rounded-xl border transition-all ${
                    selectedMethod === 'mobile'
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-700 bg-[#233342] hover:border-slate-500'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-4 ${
                    selectedMethod === 'mobile' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">smartphone</span>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-200 text-lg font-bold">Mobile Pay</p>
                    <p className="text-slate-400 text-sm">Apple Pay, Google Pay</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="col-span-5 bg-[#111a22] p-6 flex flex-col">
              <div className="bg-black/40 rounded-xl p-4 mb-4 border border-slate-700/50 flex flex-col items-end">
                <span className="text-slate-400 text-sm mb-1">Enter Amount</span>
                <span className="text-4xl font-mono text-white tracking-wider flex items-center">
                  <span className="text-slate-500 mr-2">$</span>
                  {amount}
                  <span className="w-0.5 h-8 bg-primary animate-pulse ml-1"></span>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-6">
                <button onClick={() => setAmount(total.toFixed(2))} className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all">Exact</button>
                <button onClick={() => setAmount('60')} className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all">$60</button>
                <button onClick={() => setAmount('70')} className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all">$70</button>
                <button onClick={() => setAmount('100')} className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all">$100</button>
              </div>

              <div className="grid grid-cols-3 gap-3 flex-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    className="bg-[#233342] hover:bg-slate-600 rounded-xl text-2xl font-semibold text-white transition-colors shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-3xl">backspace</span>
                </button>
              </div>
            </div>
          </div>

          <div className="h-24 bg-[#0d141c] border-t border-slate-700/50 grid grid-cols-12 items-center px-8 gap-8">
            <div className="col-span-3 flex flex-col">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Tendered Amount</span>
              <span className="text-2xl font-bold text-white">${tendered.toFixed(2)}</span>
            </div>
            <div className="col-span-4 flex flex-col border-l border-slate-800 pl-8">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Change Due</span>
              <span className="text-3xl font-bold text-success drop-shadow-[0_0_8px_rgba(74,222,128,0.25)]">
                ${change > 0 ? change.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="col-span-5 flex justify-end gap-3">
              <button className="h-14 px-6 rounded-lg border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800 transition-colors">
                Print Receipt Only
              </button>
              <button className="h-14 px-8 rounded-lg bg-primary hover:bg-blue-600 text-white text-lg font-bold shadow-[0_4px_20px_-4px_rgba(43,140,238,0.5)] transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                Finalize
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
