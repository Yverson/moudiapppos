/**
 * Tableau des commandes pour l'historique
 */

import { Order, isLocalOrder } from '../../services/orders.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatAmount } from '../../utils/format';

interface OrdersTableProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
}

export default function OrdersTable({ orders, onViewDetails }: OrdersTableProps) {
  const getStatusBadge = (status: Order['status']) => {
    const badges: Record<string, { label: string; color: string }> = {
      delivered: { label: 'Livré', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      cancelled: { label: 'Annulé', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      refunded: { label: 'Remboursé', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    };

    const badge = badges[status] || { label: status, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (order: Order) => {
    const isLocal = isLocalOrder(order);
    
    return isLocal ? (
      <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        LOCAL
      </span>
    ) : (
      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
        ONLINE
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#1e2327] border-b border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
              N° Commande
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
              Client
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              Paiement
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {orders.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                Aucune commande trouvée
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const clientMatch = order.notes?.match(/Client:([^|]+)/i);
              const clientName = clientMatch?.[1]?.trim() || '—';

              return (
                <tr
                  key={order.id}
                  className="hover:bg-[#1e2327] transition-colors cursor-pointer"
                  onClick={() => onViewDetails(order)}
                >
                  <td className="px-4 py-3 text-white font-semibold">
                    #{order.order_number || order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm truncate max-w-[200px]">
                    {clientName}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                    {formatAmount(order.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getTypeBadge(order)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300 text-sm">
                    {order.payment_method || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(order);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Voir détails"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
