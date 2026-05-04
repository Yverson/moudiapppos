import { invoke } from '@tauri-apps/api/tauri';

async function invokeOrFallback<T>(
  command: string,
  args: any,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    if (window.__TAURI__) {
      return await invoke(command, args);
    }
  } catch (error) {
    console.warn(`Tauri command ${command} failed, using fallback:`, error);
  }
  return await fallback();
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: string;
  stripe_token?: string;
  last_4_digits?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

class PaymentMethodsService {
  private api = {
    get: async (url: string, config?: any) => {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...config?.headers,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    post: async (url: string, data: any) => {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    put: async (url: string, data: any) => {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    delete: async (url: string) => {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  };

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      return await invokeOrFallback(
        'get_payment_methods',
        { userId },
        async () => {
          const { getDb } = await import('./db-web');
          const db = await getDb();
          // Vérifier que le store existe avant d'accéder
          if (!db.objectStoreNames.contains('payment_methods')) {
            console.warn('[PaymentMethods] Store payment_methods non trouvé, retourne tableau vide');
            return [];
          }
          return await db.getAll('payment_methods');
        }
      );
    } catch (error) {
      console.error('[PaymentMethods] Erreur lors de la récupération:', error);
      return [];
    }
  }

  async syncFromCloud(userId: string): Promise<void> {
    try {
      const response = await this.api.get(`/api/users/${userId}/payment-methods`);
      const cloudPaymentMethods = response.data || [];

      for (const cloudPM of cloudPaymentMethods) {
        const localPM: PaymentMethod = {
          id: cloudPM.id,
          user_id: cloudPM.utilisateurId || userId,
          type: cloudPM.type,
          stripe_token: cloudPM.tokenStripe,
          last_4_digits: cloudPM.derniers4Chiffres,
          brand: cloudPM.marque,
          expiry_month: cloudPM.moisExpiration,
          expiry_year: cloudPM.anneeExpiration,
          is_default: cloudPM.estParDefaut,
          created_at: cloudPM.dateCreation || new Date().toISOString(),
          updated_at: cloudPM.dateModification || new Date().toISOString(),
        };

        await this.upsertLocal(localPM);
      }

      console.log(
        '═══ [PaymentMethods] ═══\n',
        'Action: SYNC_FROM_CLOUD',
        '\nNombre de moyens de paiement synchronisés:', cloudPaymentMethods.length
      );
    } catch (error) {
      console.error('[PaymentMethods] Erreur lors de la synchronisation depuis le cloud:', error);
    }
  }

  private async upsertLocal(paymentMethod: PaymentMethod): Promise<void> {
    await invokeOrFallback(
      'upsert_payment_method',
      { paymentMethod },
      async () => {
        const { getDb } = await import('./db-web');
        const db = await getDb();
        // Vérifier que le store existe avant d'accéder
        if (!db.objectStoreNames.contains('payment_methods')) {
          console.warn('[PaymentMethods] Store payment_methods non trouvé, impossible de sauvegarder');
          return;
        }
        await db.put('payment_methods', paymentMethod);
      }
    );
  }

  async createPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    await this.upsertLocal(paymentMethod);
    return paymentMethod;
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<void> {
    const existing = await invokeOrFallback(
      'get_payment_method_by_id',
      { id },
      async () => {
        const { getDb } = await import('./db-web');
        const db = await getDb();
        // Vérifier que le store existe avant d'accéder
        if (!db.objectStoreNames.contains('payment_methods')) {
          return undefined;
        }
        return await db.get('payment_methods', id);
      }
    );

    if (existing) {
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      await this.upsertLocal(updated);
    }
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await invokeOrFallback(
      'delete_payment_method',
      { id },
      async () => {
        const { getDb } = await import('./db-web');
        const db = await getDb();
        // Vérifier que le store existe avant d'accéder
        if (!db.objectStoreNames.contains('payment_methods')) {
          return;
        }
        await db.delete('payment_methods', id);
      }
    );
  }

  async setDefaultPaymentMethod(userId: string, id: string): Promise<void> {
    // Désactiver tous les autres moyens de paiement par défaut
    const allMethods = await this.getPaymentMethods(userId);
    for (const pm of allMethods) {
      if (pm.id !== id && pm.is_default) {
        await this.updatePaymentMethod(pm.id, { is_default: false });
      }
    }

    // Définir celui-ci comme par défaut
    await this.updatePaymentMethod(id, { is_default: true });
  }
}

export default new PaymentMethodsService();
