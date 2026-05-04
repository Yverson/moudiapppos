import { useState, useEffect } from 'react';
import statsService from '../services/stats.service';
import type { StatsData } from '../services/stats.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function Stats() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [localStats, setLocalStats] = useState<StatsData | null>(null);
  const [onlineStats, setOnlineStats] = useState<StatsData | null>(null);
  const [combinedStats, setCombinedStats] = useState<StatsData | null>(null);
  const [viewMode, setViewMode] = useState<'combined' | 'local' | 'online'>('combined');
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await statsService.getCombinedStats(period);
      setLocalStats(result.local);
      setOnlineStats(result.online);
      setCombinedStats(result.combined);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentStats = viewMode === 'local' ? localStats : viewMode === 'online' ? onlineStats : combinedStats;

  if (loading || !currentStats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-dark">
        <div className="text-white text-lg">Chargement des statistiques...</div>
      </div>
    );
  }

  const { overview, salesByPeriod, topProducts, hourlySales, paymentMethods } = currentStats;
  const salesData = [salesByPeriod.today, salesByPeriod.week, salesByPeriod.month];

  const exportToCSV = () => {
    const csv = [
      ['Période', 'Revenus', 'Commandes', 'Panier Moyen'],
      ...salesData.map(s => [s.period, s.revenue, s.orders, s.avgOrder]),
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-dark text-white">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Statistiques & Rapports</h1>
            <p className="text-slate-400 text-sm md:text-base">Suivez les performances et analysez les tendances</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="px-4 h-10 rounded-lg border border-[#233648] bg-surface-dark text-slate-300 text-sm font-semibold hover:bg-surface-hover transition-all"
              title="Sélectionner la période"
            >
              <option value="day">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
            <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-[#233648] bg-surface-dark">
              <button
                onClick={() => setViewMode('combined')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === 'combined' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Combiné
              </button>
              <button
                onClick={() => setViewMode('local')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === 'local' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Local
              </button>
              {onlineStats && (
                <button
                  onClick={() => setViewMode('online')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    viewMode === 'online' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  En ligne
                </button>
              )}
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Exporter</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="relative overflow-hidden rounded-xl p-6 bg-surface-dark border border-[#233648] shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Revenus Totaux</p>
                <h3 className="text-3xl font-bold text-white tabular-nums mt-2">
                  {overview.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </h3>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
                <span className="material-symbols-outlined text-2xl text-emerald-400">trending_up</span>
              </div>
            </div>
            {overview.revenueChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                overview.revenueChange > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                <span className="material-symbols-outlined text-base">
                  {overview.revenueChange > 0 ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span>{Math.abs(overview.revenueChange)}% vs période précédente</span>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-surface-dark border border-[#233648] shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Commandes Totales</p>
                <h3 className="text-3xl font-bold text-white tabular-nums mt-2">
                  {overview.totalOrders.toLocaleString()}
                </h3>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10">
                <span className="material-symbols-outlined text-2xl text-blue-400">receipt_long</span>
              </div>
            </div>
            {overview.ordersChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                overview.ordersChange > 0 ? 'text-blue-400' : 'text-red-400'
              }`}>
                <span className="material-symbols-outlined text-base">
                  {overview.ordersChange > 0 ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span>{Math.abs(overview.ordersChange)}% vs période précédente</span>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-surface-dark border border-[#233648] shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Panier Moyen</p>
                <h3 className="text-3xl font-bold text-white tabular-nums mt-2">
                  {overview.avgOrderValue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </h3>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
                <span className="material-symbols-outlined text-2xl text-amber-400">payments</span>
              </div>
            </div>
            {overview.avgOrderChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                overview.avgOrderChange > 0 ? 'text-amber-400' : 'text-red-400'
              }`}>
                <span className="material-symbols-outlined text-base">
                  {overview.avgOrderChange > 0 ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span>{Math.abs(overview.avgOrderChange)}% vs période précédente</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Performance des Ventes</h3>
              <p className="text-slate-400 text-sm mt-1">Répartition des revenus par période</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {salesData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                    <div>
                      <p className="text-white font-semibold">{item.period}</p>
                      <p className="text-slate-400 text-sm">{item.orders} commandes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {item.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </p>
                      <p className="text-emerald-400 text-sm font-semibold">{item.growth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Top Produits</h3>
              <p className="text-slate-400 text-sm mt-1">Meilleures ventes de la période</p>
            </div>
            <div className="p-6">
              {topProducts.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{product.name}</p>
                          <p className="text-slate-400 text-sm">{product.sold} vendus</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">
                          {product.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`material-symbols-outlined text-sm ${
                            product.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {product.trend === 'up' ? 'trending_up' : 'trending_down'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">Aucune donnée disponible</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#233648]">
            <h3 className="text-white text-lg font-bold">Distribution des Ventes par Heure</h3>
            <p className="text-slate-400 text-sm mt-1">Analyse des heures de pointe</p>
          </div>
          <div className="p-6">
            {hourlySales.length > 0 ? (
              <div className="h-64 flex items-end justify-between gap-2">
                {hourlySales.map((hourData, idx) => {
                  const maxRevenue = Math.max(...hourlySales.map(h => h.revenue));
                  const height = maxRevenue > 0 ? (hourData.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-blue-400 rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                        title={`${hourData.hour}h: ${hourData.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })} (${hourData.orders} commandes)`}
                      ></div>
                      <span className="text-xs text-slate-400">{hourData.hour}h</span>
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {hourData.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {paymentMethods.length > 0 && (
          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Méthodes de Paiement</h3>
              <p className="text-slate-400 text-sm mt-1">Répartition par type de paiement</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {paymentMethods.map((method, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                    <div>
                      <p className="text-white font-semibold">{method.method}</p>
                      <p className="text-slate-400 text-sm">{method.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        {method.total.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </p>
                      <p className="text-blue-400 text-sm font-semibold">{method.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
