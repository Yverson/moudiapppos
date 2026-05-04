/**
 * Hook pour gérer les commandes avec auto-refresh pour les commandes online
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ordersService, { Order, OrderFilters, OrderStats } from '../services/orders.service';
import { useOnlineStatus } from './useOnlineStatus';

export interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  stats: OrderStats | null;
  refresh: () => Promise<void>;
  updateStatus: (orderId: string, newStatus: Order['status']) => Promise<{ success: boolean; error?: string }>;
  assignLivreur: (orderId: string, livreurId: string, livreurName?: string) => Promise<{ success: boolean; error?: string }>;
}

export function useOrders(
  restaurantId: string,
  filters?: OrderFilters,
  autoRefresh: boolean = false,
  refreshInterval: number = 30000 // 30 secondes par défaut
): UseOrdersReturn {
  const { isOnline } = useOnlineStatus();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);

  // Stabiliser les filtres pour éviter les re-renders inutiles
  const stableFilters = useMemo(() => JSON.stringify(filters), [filters]);
  const isInitialMount = useRef(true);

  /**
   * Charger les commandes
   */
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const parsedFilters = stableFilters ? JSON.parse(stableFilters) : undefined;
      
      // Convertir les dates en objets Date si elles existent (JSON.parse les transforme en strings)
      if (parsedFilters) {
        if (parsedFilters.dateFrom) {
          parsedFilters.dateFrom = new Date(parsedFilters.dateFrom);
        }
        if (parsedFilters.dateTo) {
          parsedFilters.dateTo = new Date(parsedFilters.dateTo);
        }
      }
      
      const fetchedOrders = await ordersService.getAllOrders(restaurantId, parsedFilters);
      setOrders(fetchedOrders);
      console.log("fetchedOrders", fetchedOrders);

      // Calculer les statistiques
      const calculatedStats = ordersService.calculateStats(fetchedOrders);
      setStats(calculatedStats);

      if (!isInitialMount.current) {
        console.log(
          '═══ [ORDERS LOADED] ═══\n',
          'Count:', fetchedOrders.length,
          '\nFilters:', parsedFilters
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des commandes';
      setError(errorMessage);
      console.error('Erreur chargement commandes:', err);
    } finally {
      setLoading(false);
      isInitialMount.current = false;
    }
  }, [restaurantId, stableFilters]);

  /**
   * Rafraîchir manuellement
   */
  const refresh = useCallback(async () => {
    await loadOrders();
  }, [loadOrders]);

  /**
   * Mettre à jour le statut d'une commande
   */
  const updateStatus = useCallback(async (
    orderId: string,
    newStatus: Order['status']
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await ordersService.updateOrderStatus(orderId, newStatus, restaurantId);
    
    if (result.success) {
      // Rafraîchir la liste après mise à jour
      await loadOrders();
    }
    
    return result;
  }, [restaurantId, loadOrders]);

  /**
   * Assigner un livreur à une commande
   */
  const assignLivreur = useCallback(async (
    orderId: string,
    livreurId: string,
    livreurName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await ordersService.assignLivreur(orderId, livreurId, restaurantId, livreurName);
    
    if (result.success) {
      // Rafraîchir la liste après assignation
      await loadOrders();
    }
    
    return result;
  }, [restaurantId, loadOrders]);

  /**
   * Chargement initial
   */
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /**
   * Auto-refresh pour les commandes online si activé et connecté
   */
  useEffect(() => {
    if (!autoRefresh || !isOnline) return;

    const interval = setInterval(() => {
      console.log(
        '═══ [AUTO-REFRESH] ═══\n',
        'Interval:', refreshInterval,
        '\nOnline:', isOnline
      );
      loadOrders();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isOnline, refreshInterval, loadOrders]);

  return {
    orders,
    loading,
    error,
    stats,
    refresh,
    updateStatus,
    assignLivreur,
  };
}

/**
 * Hook spécialisé pour les commandes actives (Kanban)
 */
export function useActiveOrders(restaurantId: string) {
  return useOrders(
    restaurantId,
    {
      status: ['pending_local', 'pending_delivery', 'preparing', 'ready', 'delivering'],
    },
    true, // Auto-refresh activé
    30000 // 30 secondes
  );
}

/**
 * Hook spécialisé pour l'historique des commandes
 */
export function useOrdersHistory(restaurantId: string, filters?: OrderFilters) {
  return useOrders(
    restaurantId,
    {
      ...filters,
      status: filters?.status || ['delivered', 'cancelled', 'refunded'],
    },
    false // Pas d'auto-refresh pour l'historique
  );
}
