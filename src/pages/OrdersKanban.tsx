/**
 * Page Kanban pour la gestion des commandes actives
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useActiveOrders } from '../hooks/useOrders';
import { Order, OrderStatus, isLocalOrder } from '../services/orders.service';
import KanbanColumn from '../components/orders/KanbanColumn';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import livreurService, { Livreur } from '../services/livreur.service';
import { useActiveRestaurant } from '../services/restaurant-config';

const KANBAN_COLUMNS: Array<{
  id: OrderStatus;
  title: string;
  icon: string;
  color: string;
}> = [
  { id: 'pending_local', title: 'En Attente', icon: 'pending', color: 'slate' },
  { id: 'pending_delivery', title: 'Payées', icon: 'payments', color: 'blue' },
  { id: 'preparing', title: 'En Préparation', icon: 'restaurant', color: 'orange' },
  { id: 'ready', title: 'Prêtes', icon: 'check_circle', color: 'green' },
  { id: 'delivering', title: 'En Livraison', icon: 'delivery_dining', color: 'purple' },
];

export default function OrdersKanban() {
  const { id: restaurantId } = useActiveRestaurant();

  const { orders, loading, error, refresh, updateStatus, assignLivreur } = useActiveOrders(restaurantId);
  const { isOnline } = useOnlineStatus();

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les livreurs depuis l'API
  useEffect(() => {
    const loadLivreurs = async () => {
      try {
        // Récupérer depuis l'API backend
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app'}/api/proprietaire/restaurants/${restaurantId}/livreurs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Mapper les livreurs backend vers le format local
            const mappedLivreurs = result.data.map((l: any) => ({
              id: l.id || l.Id,
              nom: l.nom || l.Nom,
              prenom: l.prenom || l.Prenom,
              telephone: l.telephone || l.Telephone,
              email: l.email || l.Email,
              active: l.actif !== false // Par défaut actif
            }));
            setLivreurs(mappedLivreurs.filter((l: any) => l.active));
          }
        } else {
          // Fallback sur les livreurs locaux si l'API échoue
          const data = await livreurService.getLivreurs(restaurantId, false);
          setLivreurs(data.filter(l => l.active));
        }
      } catch (err) {
        // Fallback sur les livreurs locaux
        try {
          const data = await livreurService.getLivreurs(restaurantId, false);
          setLivreurs(data.filter(l => l.active));
        } catch (localErr) {
          // Ignoré
        }
      }
    };
    loadLivreurs();
  }, [restaurantId]);

  // Configurer les sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filtrer les commandes
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(o => {
        const isLocal = isLocalOrder(o);
        return filterType === 'local' ? isLocal : !isLocal;
      });
    }

    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(term) ||
        o.notes?.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [orders, filterType, searchTerm]);

  // Grouper les commandes par statut
  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = {
      pending_local: [],
      pending_delivery: [],
      preparing: [],
      ready: [],
      delivering: [],
      delivered: [],
      cancelled: [],
      refunded: [],
    };

    filteredOrders.forEach(order => {
      if (grouped[order.status]) {
        grouped[order.status].push(order);
      }
    });

    return grouped;
  }, [filteredOrders]);

  // Gérer le début du drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const order = orders.find(o => o.id === event.active.id);
    setActiveOrder(order || null);
  }, [orders]);

  // Gérer la fin du drag
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over || active.id === over.id) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;

    // Mettre à jour le statut
    const result = await updateStatus(orderId, newStatus);
    
    if (!result.success) {
      alert(`Erreur: ${result.error}`);
    }
  }, [updateStatus]);

  // Ouvrir les détails d'une commande
  const handleViewDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  }, []);

  // Mettre à jour le statut depuis le modal
  const handleUpdateStatusFromModal = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const result = await updateStatus(orderId, newStatus);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [updateStatus]);

  // Assigner un livreur depuis le modal
  const handleAssignLivreurFromModal = useCallback(async (orderId: string, livreurId: string) => {

    // Trouver le nom du livreur
    const livreur = livreurs.find(l => l.id === livreurId);
    const livreurName = livreur ? `${livreur.prenom} ${livreur.nom}` : undefined;

    const result = await assignLivreur(orderId, livreurId, livreurName);

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de l\'assignation du livreur');
    }
    
    // Rafraîchir les commandes après assignation
    await refresh();
    
    // Mettre à jour l'ordre sélectionné pour rafraîchir le modal
    const updatedOrder = orders.find(o => o.id === orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  }, [assignLivreur, refresh, livreurs, orders]);

  return (
    <div className="flex flex-col h-full bg-[#16191c]">
      {/* Header */}
      <div className="flex-none border-b border-slate-700/50 bg-[#1e2327] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-blue-400">view_kanban</span>
            <h1 className="text-2xl font-bold text-white">Commandes Actives</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Statut Online/Offline */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isOnline ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>

            {/* Bouton Refresh */}
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Rafraîchir"
            >
              <span className="material-symbols-outlined">refresh</span>
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-4">
          {/* Filtre par type */}
          <div className="flex items-center gap-2 bg-[#111a22] rounded-lg p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Toutes ({orders.length})
            </button>
            <button
              onClick={() => setFilterType('local')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                filterType === 'local' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Local ({orders.filter(isLocalOrder).length})
            </button>
            <button
              onClick={() => setFilterType('online')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                filterType === 'online' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              En ligne ({orders.filter(o => !isLocalOrder(o)).length})
            </button>
          </div>

          {/* Recherche */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              title="Rechercher une commande"
              placeholder="Rechercher par numéro, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#111a22] text-white rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        {loading && !orders.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-slate-600 animate-spin">progress_activity</span>
              <p className="text-slate-400 mt-4">Chargement des commandes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-red-400">error</span>
              <p className="text-red-400 mt-4">{error}</p>
              <button
                onClick={refresh}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
              {KANBAN_COLUMNS.map(column => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  icon={column.icon}
                  color={column.color}
                  orders={ordersByStatus[column.id] || []}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>

            <DragOverlay>
              {activeOrder ? (
                <OrderCard order={activeOrder} onViewDetails={() => {}} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modal Détails */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
        onUpdateStatus={handleUpdateStatusFromModal}
        onAssignLivreur={handleAssignLivreurFromModal}
        livreurs={livreurs}
      />
    </div>
  );
}
