/**
 * Carte de commande avec drag & drop
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '../../services/orders.service';
import OrderCard from './OrderCard';

interface SortableOrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
}

export default function SortableOrderCard({ order, onViewDetails }: SortableOrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCard order={order} onViewDetails={onViewDetails} isDragging={isDragging} />
    </div>
  );
}
