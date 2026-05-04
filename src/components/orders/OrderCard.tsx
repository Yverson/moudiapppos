/**
 * Carte de commande pour affichage dans le Kanban
 */

import { Order, isLocalOrder } from '../../services/orders.service';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatAmount } from '../../utils/format';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  isDragging?: boolean;
}

export default function OrderCard({ order, onViewDetails, isDragging = false }: OrderCardProps) {
  const isLocal = isLocalOrder(order);
  const isFailed = order.sync_error?.includes('FAILED');

  // Parser les items pour afficher le nombre
  let itemCount = 0;
  try {
    const items = JSON.parse(order.items);
    itemCount = Array.isArray(items) ? items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
  } catch {
    itemCount = 0;
  }

  // Extraire les infos des notes (Table, Client, Livreur)
  const tableMatch = order.notes?.match(/Table:(\d+)/i);
  const clientMatch = order.notes?.match(/Client:([^|]+)/i);
  const livreurMatch = order.notes?.match(/Livreur:([^|]+)/i);

  const tableNumber = tableMatch?.[1];
  const clientName = clientMatch?.[1]?.trim();
  const livreurName = livreurMatch?.[1]?.trim();

  // Temps écoulé depuis création
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { 
    addSuffix: true,
    locale: fr 
  });

  return (
    <div
      onClick={() => onViewDetails(order)}
      className={`group relative bg-[#1e2327] border-2 rounded-xl p-4 cursor-pointer transition-all hover:border-blue-500/50 hover:shadow-lg ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      } ${
        isFailed ? 'border-red-500/30' : isLocal ? 'border-yellow-500/30' : 'border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">
              #{order.order_number || order.id.slice(0, 8)}
            </span>
            {tableNumber && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded border border-blue-500/30">
                Table {tableNumber}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">{timeAgo}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 items-end">
          {isFailed && (
            <span
              title={order.sync_error}
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-500/20 text-red-400 border border-red-500/30"
            >
              FAILED
            </span>
          )}
          {isLocal && (
            <span
              title="Commande locale, sera synchronisée"
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
            >
              LOCAL
            </span>
          )}
          {!isLocal && (
            <span
              title="Commande synchronisée avec le cloud"
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 text-blue-400 border border-blue-500/30"
            >
              ONLINE
            </span>
          )}
        </div>
      </div>

      {/* Client Info */}
      {clientName && (
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
          <span className="text-sm text-slate-300 truncate">{clientName}</span>
        </div>
      )}

      {/* Livreur Info */}
      {livreurName && (
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-slate-400 text-sm">delivery_dining</span>
          <span className="text-sm text-slate-300 truncate">{livreurName}</span>
        </div>
      )}

      {/* Items Count */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-slate-400 text-sm">shopping_bag</span>
        <span className="text-sm text-slate-300">
          {itemCount} article{itemCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-sm">payments</span>
          <span className="text-emerald-400 font-bold text-lg">{formatAmount(order.total)}</span>
        </div>

        {order.payment_status === 'paid' && (
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded border border-emerald-500/30">
            PAYÉ
          </span>
        )}
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
    </div>
  );
}
