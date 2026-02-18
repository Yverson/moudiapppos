import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';

export function useCategories() {
  const { categories, loadingCategories, refreshCategories, isConnected, connectionError } = useDatabase();
  
  return {
    categories,
    loading: loadingCategories,
    refresh: refreshCategories,
    isConnected,
    error: connectionError,
  };
}

export function useMenuItems(categoryId?: string) {
  const { menuItems, loadingMenuItems, refreshMenuItems, isConnected, connectionError } = useDatabase();
  
  const [filteredItems, setFilteredItems] = useState(menuItems);
  
  useEffect(() => {
    if (categoryId) {
      setFilteredItems(menuItems.filter(item => item.category_id === categoryId));
    } else {
      setFilteredItems(menuItems);
    }
  }, [menuItems, categoryId]);
  
  return {
    menuItems: filteredItems,
    allItems: menuItems,
    loading: loadingMenuItems,
    refresh: () => refreshMenuItems(categoryId),
    isConnected,
    error: connectionError,
  };
}

export function useCustomers() {
  const { customers, loadingCustomers, refreshCustomers, isConnected, connectionError } = useDatabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState(customers);
  
  useEffect(() => {
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    );
    setFilteredCustomers(filtered);
  }, [customers, searchTerm]);
  
  return {
    customers: filteredCustomers,
    allCustomers: customers,
    loading: loadingCustomers,
    refresh: refreshCustomers,
    isConnected,
    error: connectionError,
    searchTerm,
    setSearchTerm,
  };
}

export function useOrders(status?: string) {
  const { orders, loadingOrders, refreshOrders, getPendingOrders, isConnected, connectionError } = useDatabase();
  
  const [filteredOrders, setFilteredOrders] = useState(orders);
  
  useEffect(() => {
    let filtered = orders;
    if (status) {
      filtered = orders.filter(order => order.status === status);
    }
    setFilteredOrders(filtered);
  }, [orders, status]);
  
  return {
    orders: filteredOrders,
    allOrders: orders,
    loading: loadingOrders,
    refresh: () => refreshOrders(status),
    getPendingOrders,
    isConnected,
    error: connectionError,
  };
}

export function useDatabaseConnection() {
  const { isConnected, connectionError, refreshAll } = useDatabase();
  
  return {
    isConnected,
    error: connectionError,
    refresh: refreshAll,
  };
}

// Hook pour créer une commande offline
export function useCreateOrder() {
  const { refreshOrders } = useDatabase();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createOrder = async (orderData: {
    restaurantId: string;
    customerId?: string;
    items: any[];
    subtotal: number;
    tax: number;
    total: number;
    discount?: number;
    paymentMethod?: string;
    notes?: string;
  }) => {
    setIsCreating(true);
    setError(null);
    
    try {
      const offlineOrderService = (await import('../services/offline-order.service')).default;
      const order = offlineOrderService.createOrderObject(orderData);
      const savedOrder = await offlineOrderService.createOrderOffline(order);
      
      await refreshOrders();
      return savedOrder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la commande');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };
  
  return {
    createOrder,
    isCreating,
    error,
  };
}

// Hook pour synchroniser les commandes en attente
export function useSyncOrders() {
  const { refreshOrders } = useDatabase();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const syncOrders = async (restaurantId: string, apiUrl: string) => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const offlineOrderService = (await import('../services/offline-order.service')).default;
      const result = await offlineOrderService.syncPendingOrders(restaurantId, apiUrl);
      
      setSyncResult(result);
      await refreshOrders();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la synchronisation');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };
  
  return {
    syncOrders,
    isSyncing,
    syncResult,
    error,
  };
}
