import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import paymentMethodsService, { PaymentMethod } from '../services/payment-methods.service';
import bidirectionalSync from '../services/bidirectional-sync.service';

interface PaymentMethodContextType {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  refreshPaymentMethods: () => Promise<void>;
  createPaymentMethod: (data: Partial<PaymentMethod>) => Promise<PaymentMethod>;
  updatePaymentMethod: (id: string, data: Partial<PaymentMethod>) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  syncFromCloud: () => Promise<void>;
}

const PaymentMethodContext = createContext<PaymentMethodContextType | undefined>(undefined);

export const usePaymentMethods = () => {
  const context = useContext(PaymentMethodContext);
  if (!context) {
    throw new Error('usePaymentMethods must be used within PaymentMethodProvider');
  }
  return context;
};

interface PaymentMethodProviderProps {
  children: ReactNode;
  userId: string;
}

export const PaymentMethodProvider: React.FC<PaymentMethodProviderProps> = ({ children, userId }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const methods = await paymentMethodsService.getPaymentMethods(userId);
      setPaymentMethods(methods);
    } catch (err) {
      setError('Erreur lors du chargement des moyens de paiement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createPaymentMethod = useCallback(async (data: Partial<PaymentMethod>) => {
    try {
      setError(null);
      const newPaymentMethod: PaymentMethod = {
        id: `pm-${Date.now()}`,
        user_id: userId,
        type: data.type || 'card',
        stripe_token: data.stripe_token,
        last_4_digits: data.last_4_digits,
        brand: data.brand,
        expiry_month: data.expiry_month,
        expiry_year: data.expiry_year,
        is_default: data.is_default || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      };

      // Sauvegarder en local
      const savedMethod = await paymentMethodsService.createPaymentMethod(newPaymentMethod);

      // Synchroniser vers le cloud (ou mettre en queue si hors ligne)
      await bidirectionalSync.pushMutation({
        action: 'CREATE',
        entityType: 'payment_method',
        entityId: newPaymentMethod.id,
        data: newPaymentMethod
      });

      await refreshPaymentMethods();
      return savedMethod;
    } catch (err) {
      setError('Erreur lors de la création du moyen de paiement');
      throw err;
    }
  }, [userId, refreshPaymentMethods]);

  const updatePaymentMethod = useCallback(async (id: string, data: Partial<PaymentMethod>) => {
    try {
      setError(null);
      
      // Mettre à jour en local
      await paymentMethodsService.updatePaymentMethod(id, data);

      // Synchroniser vers le cloud (ou mettre en queue si hors ligne)
      await bidirectionalSync.pushMutation({
        action: 'UPDATE',
        entityType: 'payment_method',
        entityId: id,
        data: {
          user_id: userId,
          ...data
        }
      });

      await refreshPaymentMethods();
    } catch (err) {
      setError('Erreur lors de la mise à jour du moyen de paiement');
      throw err;
    }
  }, [userId, refreshPaymentMethods]);

  const deletePaymentMethod = useCallback(async (id: string) => {
    try {
      setError(null);
      
      // Supprimer en local
      await paymentMethodsService.deletePaymentMethod(id);

      // Synchroniser vers le cloud (ou mettre en queue si hors ligne)
      await bidirectionalSync.pushMutation({
        action: 'DELETE',
        entityType: 'payment_method',
        entityId: id,
        data: {
          user_id: userId
        }
      });

      await refreshPaymentMethods();
    } catch (err) {
      setError('Erreur lors de la suppression du moyen de paiement');
      throw err;
    }
  }, [userId, refreshPaymentMethods]);

  const setDefaultPaymentMethod = useCallback(async (id: string) => {
    try {
      setError(null);
      
      // Mettre à jour en local
      await paymentMethodsService.setDefaultPaymentMethod(userId, id);

      // Synchroniser vers le cloud
      await bidirectionalSync.pushMutation({
        action: 'UPDATE',
        entityType: 'payment_method',
        entityId: id,
        data: {
          user_id: userId,
          is_default: true
        }
      });

      await refreshPaymentMethods();
    } catch (err) {
      setError('Erreur lors de la définition du moyen de paiement par défaut');
      throw err;
    }
  }, [userId, refreshPaymentMethods]);

  const syncFromCloud = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await paymentMethodsService.syncFromCloud(userId);
      await refreshPaymentMethods();
    } catch (err) {
      setError('Erreur lors de la synchronisation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, refreshPaymentMethods]);

  useEffect(() => {
    refreshPaymentMethods();
  }, [refreshPaymentMethods]);

  const value: PaymentMethodContextType = {
    paymentMethods,
    loading,
    error,
    refreshPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    syncFromCloud,
  };

  return (
    <PaymentMethodContext.Provider value={value}>
      {children}
    </PaymentMethodContext.Provider>
  );
};
