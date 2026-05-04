import { useState, useEffect, useCallback } from 'react';
import apiService, { Order } from '../services/api.service';

export interface UseOrderStatusReturn {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export function useOrderStatus(
  restaurantId: string,
  pollIntervalMs = 5000
): UseOrderStatusReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getOrders(restaurantId);
      setOrders(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Impossible de charger les commandes'));
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const refetch = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Setup polling
    const interval = setInterval(fetchOrders, pollIntervalMs);

    // Cleanup
    return () => clearInterval(interval);
  }, [fetchOrders, pollIntervalMs]);

  return {
    orders,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
