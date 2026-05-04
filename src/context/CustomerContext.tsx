import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import customerService, { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../services/customer.service';
import syncService from '../services/sync.service';

export interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  createCustomer: (data: CreateCustomerRequest) => Promise<Customer>;
  updateCustomer: (id: string, data: UpdateCustomerRequest) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  searchCustomers: (query: string) => Promise<Customer[]>;
  getCustomer: (id: string) => Promise<Customer | null>;
  addLoyaltyPoints: (id: string, points: number) => Promise<Customer>;
  recordOrder: (id: string, amount: number) => Promise<Customer>;
  getTopCustomers: (limit?: number) => Promise<Customer[]>;
  getVipCustomers: () => Promise<Customer[]>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-sync au chargement
  React.useEffect(() => {
    const autoSync = async () => {
      try {
        await syncService.syncAll({ categories: false, menuItems: false, customers: true, livreurs: false });
        const data = await customerService.getCustomers();
        setCustomers(data);
      } catch (err) {
        console.warn('[CustomerContext] Auto-sync échouée:', err);
      }
    };
    autoSync();
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCustomer = useCallback(async (data: CreateCustomerRequest): Promise<Customer> => {
    try {
      setError(null);
      const newCustomer = await customerService.createCustomer(data);
      setCustomers(prev => [...prev, newCustomer]);
      return newCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible de créer le client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, data: UpdateCustomerRequest): Promise<Customer> => {
    try {
      setError(null);
      const updatedCustomer = await customerService.updateCustomer(id, data);
      setCustomers(prev => prev.map(customer => customer.id === id ? updatedCustomer : customer));
      return updatedCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible de mettre à jour le client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await customerService.deleteCustomer(id);
      setCustomers(prev => prev.filter(customer => customer.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible de supprimer le client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const searchCustomers = useCallback(async (query: string): Promise<Customer[]> => {
    try {
      setError(null);
      return await customerService.searchCustomers(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de rechercher les clients');
      return [];
    }
  }, []);

  const getCustomer = useCallback(async (id: string): Promise<Customer | null> => {
    try {
      setError(null);
      return await customerService.getCustomer(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de récupérer le client');
      return null;
    }
  }, []);

  const addLoyaltyPoints = useCallback(async (id: string, points: number): Promise<Customer> => {
    try {
      setError(null);
      const updatedCustomer = await customerService.addLoyaltyPoints(id, points);
      setCustomers(prev => prev.map(customer => customer.id === id ? updatedCustomer : customer));
      return updatedCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible d’ajouter les points de fidélité';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const recordOrder = useCallback(async (id: string, amount: number): Promise<Customer> => {
    try {
      setError(null);
      const updatedCustomer = await customerService.recordOrder(id, amount);
      setCustomers(prev => prev.map(customer => customer.id === id ? updatedCustomer : customer));
      return updatedCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible d’enregistrer la commande';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getTopCustomers = useCallback(async (limit: number = 10): Promise<Customer[]> => {
    try {
      setError(null);
      return await customerService.getTopCustomers(limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les meilleurs clients');
      return [];
    }
  }, []);

  const getVipCustomers = useCallback(async (): Promise<Customer[]> => {
    try {
      setError(null);
      return await customerService.getVipCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les clients VIP');
      return [];
    }
  }, []);

  // Load customers on mount
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const value: CustomerContextType = {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    getCustomer,
    addLoyaltyPoints,
    recordOrder,
    getTopCustomers,
    getVipCustomers,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerContextType {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within CustomerProvider');
  }
  return context;
}
