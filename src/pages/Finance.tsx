import { useState, useEffect } from 'react';
import apiService from '../services/api.service';

interface Transaction {
  date: string;
  description: string;
  detail: string;
  category: string;
  type: 'in' | 'out';
  amount: number;
}

interface CashDrawerData {
  opening_balance: number;
  closing_balance: number;
  total_cash_in: number;
  total_cash_out: number;
  transactions: Transaction[];
}

export default function Finance() {
  const [cashData, setCashData] = useState<CashDrawerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restaurantId = localStorage.getItem('restaurantId') || 'demo-restaurant';

  useEffect(() => {
    fetchCashDrawer();
  }, []);

  const fetchCashDrawer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getCashDrawer(restaurantId);
      setCashData(data);
    } catch (err) {
      console.error('Failed to fetch cash drawer:', err);
      setError('Impossible de charger les données');
      setCashData({
        opening_balance: 0,
        closing_balance: 8250,
        total_cash_in: 12450,
        total_cash_out: 4200,
        transactions: demoTransactions,
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!cashData) return;

    const headers = ['Date', 'Description', 'Detail', 'Category', 'Type', 'Amount'];
    const rows = cashData.transactions.map(tx => [
      tx.date,
      tx.description,
      tx.detail,
      tx.category,
      tx.type,
      tx.amount.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `finance-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const demoTransactions: Transaction[] = [
    { date: 'Oct 24, 2023', description: 'Lunch Service Sales', detail: 'Shift #2481 • 12:00 PM - 3:00 PM', category: 'Sales', type: 'in' as const, amount: 850.00 },
    { date: 'Oct 24, 2023', description: 'Sysco Delivery', detail: 'Invoice #INV-9920', category: 'Supplies', type: 'out' as const, amount: 200.00 },
    { date: 'Oct 24, 2023', description: 'HVAC Repair', detail: 'Emergency Maintenance - Cooler B', category: 'Maintenance', type: 'out' as const, amount: 450.00 },
    { date: 'Oct 23, 2023', description: 'Dinner Service Sales', detail: 'Shift #2480 • 5:00 PM - 11:00 PM', category: 'Sales', type: 'in' as const, amount: 2150.00 },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#101922] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const data = cashData || {
    opening_balance: 0,
    closing_balance: 8250,
    total_cash_in: 12450,
    total_cash_out: 4200,
    transactions: demoTransactions,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#101922] text-white">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Cash Flow</h1>
            <p className="text-slate-400 text-sm md:text-base">Track daily income, expenses, and overall liquidity.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 transition-all text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Export CSV</span>
            </button>
            <button className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>New Transaction</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="relative overflow-hidden rounded-xl p-6 bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-emerald-500/30 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-emerald-500">trending_up</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Cash In</p>
              <h3 className="text-2xl lg:text-3xl font-bold tabular-nums">${data.total_cash_in.toFixed(2)}</h3>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm font-semibold bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-base">arrow_upward</span>
                <span>12% vs last week</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-red-500/30 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-red-500">trending_down</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Cash Out</p>
              <h3 className="text-2xl lg:text-3xl font-bold tabular-nums">${data.total_cash_out.toFixed(2)}</h3>
              <div className="flex items-center gap-1 mt-2 text-red-400 text-sm font-semibold bg-red-500/10 w-fit px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-base">arrow_upward</span>
                <span>5% vs last week</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-[#2b8cee] to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <div className="absolute right-0 top-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
            </div>
            <div className="flex flex-col gap-1 relative z-10">
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Current Balance</p>
              <h3 className="text-2xl lg:text-3xl font-bold tabular-nums">${data.closing_balance.toFixed(2)}</h3>
              <div className="flex items-center gap-1 mt-2 text-white text-sm font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Healthy Status</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-[#233648] bg-[#1b2631] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#23303d] border-b border-[#233648]">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[140px]">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[150px]">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[100px] text-center">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[150px] text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#233648]">
                {data.transactions.map((tx, idx) => (
                  <tr key={idx} className="group hover:bg-[#23303d] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">{tx.date}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium">{tx.description}</div>
                      <div className="text-xs text-slate-500">{tx.detail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center size-6 rounded-full ${
                        tx.type === 'in' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {tx.type === 'in' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold tabular-nums ${
                      tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'in' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
