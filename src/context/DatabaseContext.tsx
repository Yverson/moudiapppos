import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import sqliteService from '../services/sqlite.service';
import offlineOrderService, { Order } from '../services/offline-order.service';
import { Category, MenuItem, Customer } from '../services/sqlite.service';
import syncService from '../services/sync.service';

interface DatabaseContextType {
  // Categories
  categories: Category[];
  loadingCategories: boolean;
  refreshCategories: () => Promise<void>;
  
  // Menu Items
  menuItems: MenuItem[];
  loadingMenuItems: boolean;
  refreshMenuItems: (categoryId?: string) => Promise<void>;
  
  // Customers
  customers: Customer[];
  loadingCustomers: boolean;
  refreshCustomers: () => Promise<void>;
  
  // Orders
  orders: Order[];
  loadingOrders: boolean;
  refreshOrders: (status?: string) => Promise<void>;
  getPendingOrders: () => Promise<Order[]>;
  
  // Connection status
  isConnected: boolean;
  connectionError: string | null;
  
  // General refresh
  refreshAll: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

interface DatabaseProviderProps {
  children: ReactNode;
  restaurantId: string;
}

export function DatabaseProvider({ children, restaurantId }: DatabaseProviderProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setLoadingCategories(true);
      const cats = await sqliteService.getCategories();
      setCategories(cats);
      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Erreur de connexion à la base de données');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Categories methods
  const refreshCategories = async () => {
    setLoadingCategories(true);
    try {
      const cats = await sqliteService.getCategories();
      setCategories(cats);
      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Erreur lors du chargement des catégories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Menu items methods
  const refreshMenuItems = async (categoryId?: string) => {
    setLoadingMenuItems(true);
    try {
      const items = await sqliteService.getMenuItems(categoryId);
      setMenuItems(items);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Erreur lors du chargement des articles');
    } finally {
      setLoadingMenuItems(false);
    }
  };

  // Customers methods
  const refreshCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const custs = await sqliteService.getCustomers();
      setCustomers(custs);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Erreur lors du chargement des clients');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Orders methods
  const refreshOrders = async (status?: string) => {
    setLoadingOrders(true);
    try {
      const ords = await offlineOrderService.getOrders(restaurantId, status);
      setOrders(ords);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Erreur lors du chargement des commandes');
    } finally {
      setLoadingOrders(false);
    }
  };

  const getPendingOrders = async (): Promise<Order[]> => {
    try {
      return await offlineOrderService.getPendingOrders(restaurantId);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Erreur lors du chargement des commandes en attente');
      return [];
    }
  };

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      refreshCategories(),
      refreshMenuItems(),
      refreshCustomers(),
      refreshOrders(),
    ]);
  };

  // Load initial data
  useEffect(() => {
    if (isConnected) {
      refreshAll();
    }
  }, [isConnected, restaurantId]);

  // Auto-sync on startup (fill local SQLite if empty)
  useEffect(() => {
    const autoSyncEnabled = String(import.meta.env.VITE_AUTO_SYNC_ON_STARTUP || 'false') === 'true';

    const run = async () => {
      if (!isConnected) return;

      try {
        const count = await syncService.getLocalDataCount();
        const isEmpty = count.categories === 0 || count.menuItems === 0;

        if (!autoSyncEnabled && !isEmpty) return;

        syncService.setRestaurantId(restaurantId);
        await syncService.syncAll({
          categories: true,
          menuItems: true,
          customers: false,
          overwrite: false,
        });

        await refreshAll();
      } catch (error) {
        setConnectionError(
          error instanceof Error
            ? error.message
            : 'Erreur lors de la synchronisation automatique',
        );
      }
    };

    run();
  }, [isConnected, restaurantId]);

  const value: DatabaseContextType = {
    // Categories
    categories,
    loadingCategories,
    refreshCategories,
    
    // Menu Items
    menuItems,
    loadingMenuItems,
    refreshMenuItems,
    
    // Customers
    customers,
    loadingCustomers,
    refreshCustomers,
    
    // Orders
    orders,
    loadingOrders,
    refreshOrders,
    getPendingOrders,
    
    // Connection
    isConnected,
    connectionError,
    
    // General
    refreshAll,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
