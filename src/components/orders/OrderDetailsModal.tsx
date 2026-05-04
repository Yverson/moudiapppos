/**
 * Modal pour afficher les détails d'une commande
 */

import { useState } from 'react';
import { Order, isLocalOrder } from '../../services/orders.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatAmount } from '../../utils/format';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, newStatus: Order['status']) => Promise<void>;
  onAssignLivreur?: (orderId: string, livreurId: string) => Promise<void>;
  livreurs?: Array<{ id: string; prenom: string; nom: string }>;
}

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onAssignLivreur,
  livreurs = [],
}: OrderDetailsModalProps) {
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const isLocal = isLocalOrder(order);
  const isFailed = order.sync_error?.includes('FAILED');

  // Parser les items
  let items: any[] = [];
  try {
    items = JSON.parse(order.items);
  } catch {
    items = [];
  }

  // Extraire les infos des notes
  const tableMatch = order.notes?.match(/Table:(\d+)/i);
  const clientMatch = order.notes?.match(/Client:([^|]+)/i);
  const livreurMatch = order.notes?.match(/Livreur:([^|]+)/i);

  const tableNumber = tableMatch?.[1];
  const clientName = clientMatch?.[1]?.trim();
  const livreurName = livreurMatch?.[1]?.trim();

  const handleUpdateStatus = async (newStatus: Order['status']) => {
    if (!onUpdateStatus) return;
    
    setUpdating(true);
    try {
      console.log('Mise à jour statut:', { orderId: order.id, currentStatus: order.status, newStatus, isLocal });
      await onUpdateStatus(order.id, newStatus);
      console.log('Statut mis à jour avec succès');
      onClose();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert(`Erreur lors de la mise à jour du statut: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignLivreur = async (livreurId: string) => {
    if (!onAssignLivreur) return;
    if (!livreurId) return; // Ne rien faire si "-- Aucun --" est sélectionné
    
    setUpdating(true);
    try {
      console.log('Assignation livreur:', { orderId: order.id, livreurId });
      await onAssignLivreur(order.id, livreurId);
      console.log('Livreur assigné avec succès');
      // Ne pas fermer le modal - laisser l'utilisateur voir le changement
    } catch (error) {
      console.error('Erreur assignation livreur:', error);
      alert(`Erreur lors de l'assignation du livreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setUpdating(false);
    }
  };

  // Définir l'ordre de progression des statuts
  const statusOrder: Record<Order['status'], number> = {
    'pending_local': 0,
    'pending_delivery': 1,
    'preparing': 2,
    'ready': 3,
    'delivering': 4,
    'delivered': 5,
    'cancelled': 99,
    'refunded': 99,
  };

  const allStatusActions: Array<{ status: Order['status']; label: string; color: string }> = [
    { status: 'preparing', label: 'Marquer en préparation', color: 'orange' },
    { status: 'ready', label: 'Marquer prêt', color: 'green' },
    { status: 'delivering', label: 'Marquer en livraison', color: 'purple' },
    { status: 'delivered', label: 'Marquer livré', color: 'emerald' },
    { status: 'cancelled', label: 'Annuler', color: 'red' },
  ];

  // Filtrer pour ne montrer que les statuts suivants (pas en arrière)
  const currentStatusOrder = statusOrder[order.status] || 0;
  const statusActions = allStatusActions.filter(action => {
    const actionOrder = statusOrder[action.status] || 0;
    // Montrer seulement les statuts suivants + annuler
    return actionOrder > currentStatusOrder || action.status === 'cancelled';
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#151f2a] rounded-xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-[#111a22]">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400">receipt_long</span>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Commande #{order.order_number || order.id.slice(0, 8)}
                </h2>
                <p className="text-sm text-slate-400">
                  {format(new Date(order.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isFailed && (
                <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                  FAILED
                </span>
              )}
              {isLocal ? (
                <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  LOCAL
                </span>
              ) : (
                <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ONLINE
                </span>
              )}
              <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-slate-500/20 text-slate-300 border border-slate-500/30">
                {order.status === 'pending_local' && 'EN ATTENTE'}
                {order.status === 'pending_delivery' && 'PAYÉ'}
                {order.status === 'preparing' && 'EN PRÉPARATION'}
                {order.status === 'ready' && 'PRÊT'}
                {order.status === 'delivering' && 'EN LIVRAISON'}
                {order.status === 'delivered' && 'LIVRÉ'}
                {order.status === 'cancelled' && 'ANNULÉ'}
                {order.status === 'refunded' && 'REMBOURSÉ'}
              </span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Informations */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Informations</h3>
                
                {tableNumber && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">table_restaurant</span>
                    <div>
                      <p className="text-xs text-slate-400">Table</p>
                      <p className="text-white font-semibold">{tableNumber}</p>
                    </div>
                  </div>
                )}

                {clientName && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">person</span>
                    <div>
                      <p className="text-xs text-slate-400">Client</p>
                      <p className="text-white font-semibold">{clientName}</p>
                    </div>
                  </div>
                )}

                {livreurName && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">delivery_dining</span>
                    <div>
                      <p className="text-xs text-slate-400">Livreur</p>
                      <p className="text-white font-semibold">{livreurName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">payments</span>
                  <div>
                    <p className="text-xs text-slate-400">Paiement</p>
                    <p className="text-white font-semibold">
                      {order.payment_method || 'Non défini'} - {order.payment_status === 'paid' ? 'Payé' : 'En attente'}
                    </p>
                  </div>
                </div>

                {/* Assigner Livreur */}
                {livreurs.length > 0 && onAssignLivreur && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Assigner un livreur
                    </label>
                    <select
                      title="Sélectionner un livreur"
                      value={order.livreur_id || ''}
                      onChange={(e) => handleAssignLivreur(e.target.value)}
                      disabled={updating}
                      className="w-full bg-[#233342] text-white rounded-lg px-3 py-2 border border-slate-700 focus:border-blue-500 outline-none"
                    >
                      <option value="">-- Aucun --</option>
                      {livreurs.map((livreur) => (
                        <option key={livreur.id} value={livreur.id}>
                          {livreur.prenom} {livreur.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Articles */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Articles</h3>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-[#1e2327] rounded-lg border border-slate-700/50">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.name}</p>
                        {item.note && <p className="text-xs text-slate-400">{item.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">x{item.quantity}</p>
                        <p className="text-sm text-slate-400">{formatAmount(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totaux */}
                <div className="mt-4 p-4 bg-[#1e2327] rounded-lg border border-slate-700/50 space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Sous-total</span>
                    <span>{formatAmount(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Taxes</span>
                    <span>{formatAmount(order.tax)}</span>
                  </div>
                  {order.discount && order.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Remise</span>
                      <span>-{formatAmount(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-700/50">
                    <span>Total</span>
                    <span>{formatAmount(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Actions */}
          {onUpdateStatus && (
            <div className="p-6 border-t border-slate-700/50 bg-[#111a22]">
              <div className="flex flex-wrap gap-2">
                {statusActions
                  .filter(action => action.status !== order.status)
                  .map(action => (
                    <button
                      key={action.status}
                      onClick={() => handleUpdateStatus(action.status)}
                      disabled={updating}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                        action.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                        action.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                        action.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                        action.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                        'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {updating ? 'Mise à jour...' : action.label}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
