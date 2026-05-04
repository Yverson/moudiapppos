/**
 * Colonne du Kanban pour afficher les commandes par statut
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Order, OrderStatus } from '../../services/orders.service';
import SortableOrderCard from './SortableOrderCard';


interface KanbanColumnProps {
  id: OrderStatus;
  title: string;
  icon: string;
  color: string;
  orders: Order[];
  onViewDetails: (order: Order) => void;
}

export default function KanbanColumn({
  id,
  title,
  icon,
  color,
  orders,
  onViewDetails,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const colorClasses: Record<string, string> = {
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  };

  return (
    <div className="flex flex-col h-full min-w-[320px] max-w-[320px]">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 rounded-t-xl border-2 ${colorClasses[color]}`}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">{icon}</span>
          <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
        </div>
        <span className="px-2 py-1 bg-black/20 rounded-lg text-xs font-bold">
          {orders.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 bg-[#16191c] border-2 border-t-0 rounded-b-xl overflow-y-auto transition-colors ${
          isOver ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700/50'
        }`}
      >
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">{icon}</span>
                <p className="text-sm">Aucune commande</p>
              </div>
            ) : (
              orders.map(order => (
                <SortableOrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={onViewDetails}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
