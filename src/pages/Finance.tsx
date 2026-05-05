import { useState, useEffect } from 'react';
import { getCashDrawerSummary, addCashMovement, openCashSession, closeCashSession, type FinanceTransaction, type CashDrawerSummary } from '../services/finance.service';
import { formatAmount, formatAmountForExport } from '../utils/format';
import { useActiveRestaurant } from '../services/restaurant-config';

export default function Finance() {
  const [cashData, setCashData] = useState<CashDrawerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('out');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionReason, setTransactionReason] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('Divers');
  const { id: restaurantId } = useActiveRestaurant();

  useEffect(() => {
    fetchCashDrawer();
  }, [restaurantId]);

  const fetchCashDrawer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCashDrawerSummary(restaurantId);
      setCashData(data);
    } catch (err) {
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async () => {
    try {
      const balance = parseFloat(openingBalance) || 0;
      await openCashSession(restaurantId, balance);
      setShowOpenSessionModal(false);
      setOpeningBalance('0');
      await fetchCashDrawer();
    } catch (err) {
      alert('Erreur lors de l\'ouverture de la session');
    }
  };

  const handleAddTransaction = async () => {
    if (!cashData?.session || !transactionAmount || parseFloat(transactionAmount) <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    try {
      await addCashMovement(
        cashData.session.id,
        transactionType,
        parseFloat(transactionAmount),
        transactionReason || undefined,
        transactionCategory
      );
      
      setShowNewTransactionModal(false);
      setTransactionAmount('');
      setTransactionReason('');
      setTransactionCategory('Divers');
      await fetchCashDrawer();
    } catch (err) {
      alert('Erreur lors de l\'ajout de la transaction');
    }
  };

  const exportCSV = () => {
    if (!cashData) return;

    const headers = ['Date', 'Description', 'Détail', 'Catégorie', 'Type', 'Montant'];
    const rows = cashData.transactions.map(tx => [
      tx.date,
      tx.description,
      tx.detail,
      tx.category,
      tx.type,
      formatAmountForExport(tx.amount),
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

  if (!cashData || !cashData.session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#101922] text-white">
        <div className="text-center max-w-md p-8">
          <div className="mb-6">
            <span className="material-symbols-outlined text-6xl text-slate-600">point_of_sale</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Aucune session de caisse ouverte</h2>
          <p className="text-slate-400 mb-6">Ouvrez une session de caisse pour commencer à suivre vos transactions.</p>
          <button
            onClick={() => setShowOpenSessionModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Ouvrir une session de caisse
          </button>
        </div>
      </div>
    );
  }

  const data = cashData;

  return (
    <div className="flex-1 overflow-y-auto bg-[#101922] text-white">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Flux de caisse</h1>
            <p className="text-slate-400 text-sm md:text-base">Suivre les revenus, les dépenses et la liquidité globale.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 transition-all text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Exporter CSV</span>
            </button>
            <button 
              onClick={() => setShowNewTransactionModal(true)}
              disabled={!cashData.session}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nouvelle Transaction</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="relative overflow-hidden rounded-xl p-6 bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-emerald-500/30 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-emerald-500">trending_up</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total des entrées</p>
              <h3 className="text-2xl lg:text-3xl font-bold tabular-nums">{formatAmount(data.total_cash_in)}</h3>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm font-semibold bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-base">arrow_upward</span>
                <span>12% vs semaine dernière</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-red-500/30 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-red-500">trending_down</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total des sorties</p>
              <h3 className="text-2xl lg:text-3xl font-bold tabular-nums">{formatAmount(data.total_cash_out)}</h3>
              <div className="flex items-center gap-1 mt-2 text-red-400 text-sm font-semibold bg-red-500/10 w-fit px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-base">arrow_upward</span>
                <span>5% vs semaine dernière</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-[#2b8cee] to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <div className="absolute right-0 top-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
            </div>
            <div className="flex flex-col gap-1 relative z-10">
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Solde actuel</p>
              <h3 className="text-2xl lg:text-3xl font-bold tabular-nums">{formatAmount(data.closing_balance)}</h3>
              <div className="flex items-center gap-1 mt-2 text-white text-sm font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Situation saine</span>
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[150px]">Catégorie</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[100px] text-center">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[150px] text-right">Montant</th>
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
                      {tx.type === 'in' ? '+' : '-'}{formatAmount(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showNewTransactionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewTransactionModal(false)}>
            <div className="bg-[#1b2631] rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Nouvelle Transaction</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTransactionType('in')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        transactionType === 'in' ? 'bg-emerald-600 text-white' : 'bg-[#23303d] text-slate-400'
                      }`}
                    >
                      Entrée
                    </button>
                    <button
                      onClick={() => setTransactionType('out')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        transactionType === 'out' ? 'bg-red-600 text-white' : 'bg-[#23303d] text-slate-400'
                      }`}
                    >
                      Sortie
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2" title="Montant de la transaction">Montant</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-[#23303d] border border-[#233648] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                    title="Montant de la transaction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2" title="Catégorie de la transaction">Catégorie</label>
                  <select
                    value={transactionCategory}
                    onChange={(e) => setTransactionCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-[#23303d] border border-[#233648] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    title="Catégorie de la transaction"
                  >
                    <option value="Divers">Divers</option>
                    <option value="Fournitures">Fournitures</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Salaires">Salaires</option>
                    <option value="Loyer">Loyer</option>
                    <option value="Services">Services</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2" title="Raison de la transaction">Raison</label>
                  <textarea
                    value={transactionReason}
                    onChange={(e) => setTransactionReason(e.target.value)}
                    className="w-full px-4 py-2 bg-[#23303d] border border-[#233648] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Description de la transaction..."
                    rows={3}
                    title="Raison de la transaction"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowNewTransactionModal(false)}
                    className="flex-1 px-4 py-2 bg-[#23303d] hover:bg-[#2a3847] rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddTransaction}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showOpenSessionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOpenSessionModal(false)}>
            <div className="bg-[#1b2631] rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Ouvrir une session de caisse</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2" title="Solde d'ouverture">Solde d'ouverture</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-4 py-2 bg-[#23303d] border border-[#233648] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                    title="Solde d'ouverture"
                  />
                  <p className="text-xs text-slate-500 mt-1">Montant en caisse au début de la session</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowOpenSessionModal(false)}
                    className="flex-1 px-4 py-2 bg-[#23303d] hover:bg-[#2a3847] rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleOpenSession}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    Ouvrir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
