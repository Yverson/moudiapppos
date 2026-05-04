/**
 * Composant de statistiques pour les commandes
 */

import { OrderStats } from '../../services/orders.service';
import { formatAmount } from '../../utils/format';

interface OrdersStatsProps {
  stats: OrderStats;
}

export default function OrdersStats({ stats }: OrdersStatsProps) {
  const localPercentage = stats.total > 0 ? (stats.byType.local.count / stats.total) * 100 : 0;
  const onlinePercentage = stats.total > 0 ? (stats.byType.online.count / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Commandes */}
      <div className="bg-[#1e2327] border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm font-medium">Total Commandes</span>
          <span className="material-symbols-outlined text-blue-400">shopping_bag</span>
        </div>
        <p className="text-3xl font-bold text-white">{stats.total}</p>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="text-slate-400">Local: {stats.byType.local.count}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-slate-400">En ligne: {stats.byType.online.count}</span>
          </div>
        </div>
      </div>

      {/* Chiffre d'Affaires */}
      <div className="bg-[#1e2327] border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm font-medium">Chiffre d'Affaires</span>
          <span className="material-symbols-outlined text-emerald-400">payments</span>
        </div>
        <p className="text-3xl font-bold text-emerald-400">{formatAmount(stats.totalRevenue)}</p>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-400">Local: {formatAmount(stats.byType.local.revenue)}</span>
            <span className="text-slate-500">{localPercentage.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400">En ligne: {formatAmount(stats.byType.online.revenue)}</span>
            <span className="text-slate-500">{onlinePercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Panier Moyen */}
      <div className="bg-[#1e2327] border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm font-medium">Panier Moyen</span>
          <span className="material-symbols-outlined text-purple-400">calculate</span>
        </div>
        <p className="text-3xl font-bold text-white">{formatAmount(stats.averageOrder)}</p>
        <div className="mt-3 text-xs text-slate-400">
          Par commande
        </div>
      </div>

      {/* Répartition par Statut */}
      <div className="bg-[#1e2327] border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm font-medium">Par Statut</span>
          <span className="material-symbols-outlined text-orange-400">pie_chart</span>
        </div>
        <div className="space-y-2 mt-3">
          {stats.byStatus.delivered > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Livrées</span>
              <span className="text-emerald-400 font-semibold">{stats.byStatus.delivered}</span>
            </div>
          )}
          {stats.byStatus.cancelled > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Annulées</span>
              <span className="text-red-400 font-semibold">{stats.byStatus.cancelled}</span>
            </div>
          )}
          {stats.byStatus.refunded > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Remboursées</span>
              <span className="text-orange-400 font-semibold">{stats.byStatus.refunded}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
