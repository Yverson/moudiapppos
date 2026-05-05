import { tauriInvoke } from './platform';

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
      const baseURL = import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...config?.headers },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    post: async (url: string, data: any) => {
      const baseURL = import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    put: async (url: string, data: any) => {
      const baseURL = import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    delete: async (url: string) => {
      const baseURL = import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${baseURL}${url}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  };

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      return await tauriInvoke<PaymentMethod[]>('get_payment_methods', { userId });
    } catch (error) {
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
    } catch (error) {
      // Ignoré
    }
  }

  private async upsertLocal(paymentMethod: PaymentMethod): Promise<void> {
    await tauriInvoke('upsert_payment_method', { paymentMethod });
  }

  async createPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    await this.upsertLocal(paymentMethod);
    return paymentMethod;
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<void> {
    const existing = await tauriInvoke<PaymentMethod | null>('get_payment_method_by_id', { id });
    if (existing) {
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      await this.upsertLocal(updated);
    }
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await tauriInvoke('delete_payment_method', { id });
  }

  async setDefaultPaymentMethod(userId: string, id: string): Promise<void> {
    const allMethods = await this.getPaymentMethods(userId);
    for (const pm of allMethods) {
      if (pm.id !== id && pm.is_default) {
        await this.updatePaymentMethod(pm.id, { is_default: false });
      }
    }
    await this.updatePaymentMethod(id, { is_default: true });
  }
}

export default new PaymentMethodsService();
