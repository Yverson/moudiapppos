/**
 * Page Historique des commandes terminées
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOrdersHistory } from '../hooks/useOrders';
import { Order, OrderFilters, isLocalOrder } from '../services/orders.service';
import OrdersTable from '../components/orders/OrdersTable';
import OrdersStats from '../components/orders/OrdersStats';
import OrdersFilters from '../components/orders/OrdersFilters';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import axios from 'axios';
import { formatAmountForExport } from '../utils/format';
import { useActiveRestaurant } from '../services/restaurant-config';

export default function OrdersHistory() {
  const { id: restaurantId } = useActiveRestaurant();

  const [filters, setFilters] = useState<OrderFilters>({
    status: ['delivered', 'cancelled', 'refunded'],
  });

  const { orders, loading, error, stats, refresh, updateStatus, assignLivreur } = useOrdersHistory(restaurantId, filters);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [livreurs, setLivreurs] = useState<Array<{ id: string; prenom: string; nom: string }>>([]);

  // Charger les livreurs
  const loadLivreurs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/proprietaire/livreurs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setLivreurs(response.data.data);
      }
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    loadLivreurs();
  }, [loadLivreurs]);

  // Pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return orders.slice(startIndex, endIndex);
  }, [orders, currentPage]);

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  // Gérer les changements de filtres
  const handleFilterChange = useCallback((newFilters: OrderFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset à la page 1 lors du changement de filtres
  }, []);

  // Ouvrir les détails d'une commande
  const handleViewDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  }, []);

  // Gérer la mise à jour du statut
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: Order['status']) => {
    const result = await updateStatus(orderId, newStatus);
    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la mise à jour du statut');
    }
    // Rafraîchir les données
    await refresh();
    // Mettre à jour la commande sélectionnée
    const updatedOrder = orders.find(o => o.id === orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  }, [updateStatus, refresh, orders]);

  // Gérer l'assignation du livreur
  const handleAssignLivreur = useCallback(async (orderId: string, livreurId: string) => {
    const livreur = livreurs.find(l => l.id === livreurId);
    const livreurName = livreur ? `${livreur.prenom} ${livreur.nom}` : undefined;
    
    const result = await assignLivreur(orderId, livreurId, livreurName);
    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de l\'assignation du livreur');
    }
    // Rafraîchir les données
    await refresh();
    // Mettre à jour la commande sélectionnée
    const updatedOrder = orders.find(o => o.id === orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  }, [assignLivreur, refresh, livreurs, orders]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (orders.length === 0) {
      alert('Aucune commande à exporter');
      return;
    }

    const headers = ['N° Commande', 'Date', 'Client', 'Total', 'Statut', 'Type', 'Paiement'];
    const rows = orders.map(order => {
      const clientMatch = order.notes?.match(/Client:([^|]+)/i);
      const clientName = clientMatch?.[1]?.trim() || '—';
      const isLocal = isLocalOrder(order);

      return [
        order.order_number || order.id.slice(0, 8),
        new Date(order.created_at).toLocaleString('fr-FR'),
        clientName,
        formatAmountForExport(order.total),
        order.status,
        isLocal ? 'LOCAL' : 'ONLINE',
        order.payment_method || '—',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `commandes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [orders]);

  return (
    <div className="flex h-full bg-[#16191c]">
      {/* Sidebar - Filtres */}
      <div className="w-80 border-r border-slate-700/50 bg-[#1e2327] p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-2xl text-purple-400">history</span>
          <h2 className="text-xl font-bold text-white">Filtres</h2>
        </div>
        <OrdersFilters onFilterChange={handleFilterChange} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none border-b border-slate-700/50 bg-[#1e2327] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-purple-400">receipt_long</span>
              <h1 className="text-2xl font-bold text-white">Historique des Commandes</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                disabled={orders.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Exporter en CSV"
              >
                <span className="material-symbols-outlined">download</span>
                Exporter CSV
              </button>

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

          {/* Statistiques */}
          {stats && <OrdersStats stats={stats} />}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-slate-600 animate-spin">progress_activity</span>
                <p className="text-slate-400 mt-4">Chargement de l'historique...</p>
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
            <>
              <OrdersTable orders={paginatedOrders} onViewDetails={handleViewDetails} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-4">
                  <p className="text-sm text-slate-400">
                    Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, orders.length)} sur {orders.length} commandes
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-[#1e2327] hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="text-sm text-slate-300 px-4">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-[#1e2327] hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Détails */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
        onUpdateStatus={handleUpdateStatus}
        onAssignLivreur={handleAssignLivreur}
        livreurs={livreurs}
      />
    </div>
  );
}
