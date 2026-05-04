/**
 * Service de synchronisation bidirectionnelle offline/online (SQLite uniquement).
 */

import axios, { AxiosInstance } from 'axios';
import { tauriInvoke } from './platform';
import { getActiveRestaurantId } from './restaurant-config';

export type EntityType = 'category' | 'menu_item' | 'customer' | 'livreur' | 'staff' | 'cash_movement' | 'payment_method' | 'cash_session';
export type MutationAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueue {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  data: string;
  retries: number;
  max_retries: number;
  last_attempt?: string;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingMutation {
  action: MutationAction;
  entityType: EntityType;
  entityId: string;
  data: any;
}

export interface FlushResult {
  synced: number;
  errors: number;
  errorDetails: string[];
}

export interface PendingTableInfo {
  entityType: EntityType;
  count: number;
  label: string;
}

class BidirectionalSyncService {
  private api: AxiosInstance;
  private baseURL: string;
  private restaurantId: string | null = null;
  private _isOnline: boolean = navigator.onLine;
  private _pendingCount: number = 0;
  private _pendingTables: PendingTableInfo[] = [];
  private listeners: Array<(isOnline: boolean, pendingCount: number, pendingTables: PendingTableInfo[]) => void> = [];
  private flushInProgress: boolean = false;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    this.refreshPendingCount();
  }

  // ─── Connectivité ────────────────────────────────────────────────────────

  get isOnline(): boolean {
    return this._isOnline;
  }

  get pendingCount(): number {
    return this._pendingCount;
  }

  get pendingTables(): PendingTableInfo[] {
    return this._pendingTables;
  }

  private handleOnline = async () => {
    this._isOnline = true;
    this.notifyListeners();
    await this.flushQueue();
  };

  private handleOffline = () => {
    this._isOnline = false;
    this.notifyListeners();
  };

  subscribe(listener: (isOnline: boolean, pendingCount: number, pendingTables: PendingTableInfo[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this._isOnline, this._pendingCount, this._pendingTables);
    }
  }

  // ─── Restaurant ID ───────────────────────────────────────────────────────

  getRestaurantId(): string | null {
    this.restaurantId = getActiveRestaurantId();
    return this.restaurantId;
  }

  setRestaurantId(id: string) {
    this.restaurantId = id;
  }

  // ─── Push d'une mutation ─────────────────────────────────────────────────

  async pushMutation(mutation: PendingMutation): Promise<void> {
    if (this._isOnline) {
      try {
        await this.executeMutation(mutation);
        return;
      } catch (err) {
        console.warn('[BidirectionalSync] Échec push API — mise en queue:', err);
      }
    }

    await this.enqueue(mutation);
    await this.refreshPendingCount();
    this.notifyListeners();
  }

  // ─── Exécution d'une mutation vers l'API ────────────────────────────────

  private async executeMutation(mutation: PendingMutation): Promise<void> {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID non configuré');
    }

    const { action, entityType, entityId, data } = mutation;

    switch (entityType) {
      case 'category':
        await this.executeCategoryMutation(action, entityId, data, restaurantId);
        break;
      case 'menu_item':
        await this.executeMenuItemMutation(action, entityId, data, restaurantId);
        break;
      case 'customer':
        await this.executeCustomerMutation(action, entityId, data, restaurantId);
        break;
      case 'livreur':
        await this.executeLivreurMutation(action, entityId, data, restaurantId);
        break;
      case 'cash_movement':
        await this.executeCashMovementMutation(action, entityId, data, restaurantId);
        break;
      case 'staff':
        await this.executeStaffMutation(action, entityId, data, restaurantId);
        break;
      case 'payment_method':
        await this.executePaymentMethodMutation(action, entityId, data, restaurantId);
        break;
      case 'cash_session':
        break;
    }
  }

  private async executeCategoryMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    switch (action) {
      case 'CREATE':
        await this.api.post(`/api/restaurants/${restaurantId}/categories`, {
          Id: data.id || entityId,
          Nom: data.name || data.Nom || data.nom,
          Description: data.description || data.Description,
        });
        break;
      case 'UPDATE':
        await this.api.put(`/api/restaurants/${restaurantId}/categories/${entityId}`, {
          Name: data.name || data.Name,
          Nom: data.name || data.nom,
          Description: data.description || data.Description,
          Order: data.order || data.Order,
          Active: data.active,
        });
        break;
      case 'DELETE':
        await this.api.delete(`/api/restaurants/${restaurantId}/categories/${entityId}`);
        break;
    }
  }

  private async executeMenuItemMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    const platPayload = {
      Id: data.id || entityId,
      Nom: data.name || data.nom,
      Description: data.description || data.Description,
      Prix: data.price || data.prix,
      ImageUrl: data.image_url || data.ImageUrl,
      EstDisponible: data.available,
      TempsPreparation: data.preparation_time || data.TempsPreparation,
      Allergenes: data.allergens || data.Allergenes,
      Tags: data.tags || data.Tags,
      OptionsDietetiques: data.dietary_options || data.OptionsDietetiques,
    };
    switch (action) {
      case 'CREATE':
        const categoryId = data.category_id || data.CategoryId;
        await this.api.post(`/api/categories/${categoryId}/dishes`, platPayload);
        break;
      case 'UPDATE':
        await this.api.put(`/api/restaurants/${restaurantId}/plats/${entityId}`, platPayload);
        break;
      case 'DELETE':
        await this.api.delete(`/api/restaurants/${restaurantId}/plats/${entityId}`);
        break;
    }
  }

  private async executeCustomerMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    const clientPayload = {
      Id: data.id || data.Id || entityId,
      Email: data.email || data.Email,
      Name: data.name || data.Name,
      Nom: data.name?.split(' ').slice(1).join(' ') || data.nom,
      Prenom: data.name?.split(' ')[0] || data.prenom,
      Phone: data.phone || data.Phone,
      Telephone: data.phone || data.telephone,
    };
    switch (action) {
      case 'CREATE':
        await this.api.post(`/api/restaurants/${restaurantId}/clients`, clientPayload);
        break;
      case 'UPDATE':
        await this.api.put(`/api/restaurants/${restaurantId}/clients/${entityId}`, clientPayload);
        break;
      case 'DELETE':
        await this.api.delete(`/api/restaurants/${restaurantId}/clients/${entityId}`);
        break;
    }
  }

  private async executeLivreurMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    const livreurPayload = {
      Id: data.id || data.Id || entityId,
      Email: data.email || data.Email,
      Nom: data.nom || data.Nom || data.name,
      Prenom: data.prenom || data.Prenom,
      Telephone: data.telephone || data.Telephone,
      VehiculeType: data.vehicule_type || data.VehiculeType || 'scooter',
      Active: data.active,
    };
    switch (action) {
      case 'CREATE':
        await this.api.post(`/api/restaurants/${restaurantId}/livreurs`, livreurPayload);
        break;
      case 'UPDATE':
        await this.api.put(`/api/restaurants/${restaurantId}/livreurs/${entityId}`, livreurPayload);
        break;
      case 'DELETE':
        await this.api.delete(`/api/restaurants/${restaurantId}/livreurs/${entityId}`);
        break;
    }
  }

  private async executeCashMovementMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    const movementPayload = {
      Id: data.id || data.Id || entityId,
      CashSessionId: data.cash_session_id || data.CashSessionId,
      Type: data.type || data.Type,
      Amount: data.amount || data.Amount,
      Reason: data.reason || data.Reason,
      Category: data.category || data.Category,
    };
    switch (action) {
      case 'CREATE':
        await this.api.post(`/api/restaurants/${restaurantId}/cash-movements`, movementPayload);
        break;
      case 'UPDATE':
        await this.api.put(`/api/restaurants/${restaurantId}/cash-movements/${entityId}`, movementPayload);
        break;
      case 'DELETE':
        await this.api.delete(`/api/restaurants/${restaurantId}/cash-movements/${entityId}`);
        break;
    }
  }

  private async executeStaffMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    const staffPayload = {
      Id: data.id || data.Id || entityId,
      RestaurantId: data.RestaurantId || restaurantId,
      Prenom: data.Prenom,
      Nom: data.Nom,
      Email: data.Email,
      Username: data.Username,
      Role: data.Role,
      Permissions: data.Permissions,
      EstActif: data.EstActif,
    };
    switch (action) {
      case 'CREATE':
        await this.api.post(`/api/restaurants/${restaurantId}/staff`, staffPayload);
        break;
      case 'UPDATE':
        await this.api.put(`/api/restaurants/${restaurantId}/staff/${entityId}`, staffPayload);
        break;
      case 'DELETE':
        await this.api.delete(`/api/restaurants/${restaurantId}/staff/${entityId}`);
        break;
    }
  }

  private async executePaymentMethodMutation(action: MutationAction, entityId: string, data: any, restaurantId: string): Promise<void> {
    const userId = data.user_id || data.userId || data.UtilisateurId;
    const paymentMethodPayload = {
      Id: data.id || entityId,
      Type: data.type || data.Type,
      TokenStripe: data.stripe_token || data.TokenStripe,
      Derniers4Chiffres: data.last_4_digits || data.Derniers4Chiffres,
      Marque: data.brand || data.Marque,
      MoisExpiration: data.expiry_month || data.MoisExpiration,
      AnneeExpiration: data.expiry_year || data.AnneeExpiration,
      EstParDefaut: data.is_default || data.EstParDefaut,
    };
    switch (action) {
      case 'CREATE':
        await this.api.post(`/api/users/${userId}/payment-methods`, paymentMethodPayload);
        break;
      case 'UPDATE':
        await this.api.put(`/api/users/${userId}/payment-methods/${entityId}`, paymentMethodPayload);
        break;
      case 'DELETE':
        await this.api.delete(`/api/users/${userId}/payment-methods/${entityId}`);
        break;
    }
  }

  // ─── File d'attente ──────────────────────────────────────────────────────

  private async enqueue(mutation: PendingMutation): Promise<void> {
    const now = new Date().toISOString();
    const queueItem: SyncQueue = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action: mutation.action,
      entity_type: mutation.entityType,
      entity_id: mutation.entityId,
      data: JSON.stringify(mutation.data),
      retries: 0,
      max_retries: 5,
      last_attempt: undefined,
      status: 'pending',
      error_message: undefined,
      created_at: now,
      updated_at: now,
    };

    await tauriInvoke('add_to_sync_queue', { queueItem });
  }

  private async refreshPendingCount(): Promise<void> {
    try {
      const items = await tauriInvoke<SyncQueue[]>('get_pending_sync_items', {});
      this._pendingCount = items.length;

      const tableMap = new Map<EntityType, number>();
      items.forEach(item => {
        const type = item.entity_type as EntityType;
        tableMap.set(type, (tableMap.get(type) || 0) + 1);
      });

      const labelMap: Record<EntityType, string> = {
        category: 'Catégories',
        menu_item: 'Plats',
        customer: 'Clients',
        livreur: 'Livreurs',
        staff: 'Personnel',
        cash_movement: 'Mouvements de caisse',
        payment_method: 'Moyens de paiement',
        cash_session: 'Sessions de caisse',
      };

      this._pendingTables = Array.from(tableMap.entries()).map(([entityType, count]) => ({
        entityType,
        count,
        label: labelMap[entityType] || entityType,
      }));
    } catch {
      this._pendingCount = 0;
      this._pendingTables = [];
    }
  }

  // ─── Flush de la queue ───────────────────────────────────────────────────

  async flushQueue(): Promise<FlushResult> {
    if (this.flushInProgress) {
      return { synced: 0, errors: 0, errorDetails: [] };
    }

    this.flushInProgress = true;
    const result: FlushResult = { synced: 0, errors: 0, errorDetails: [] };

    try {
      const pendingItems = await tauriInvoke<SyncQueue[]>('get_pending_sync_items', {});

      for (const item of pendingItems) {
        try {
          const data = JSON.parse(item.data);
          await this.executeMutation({
            action: item.action as MutationAction,
            entityType: item.entity_type as EntityType,
            entityId: item.entity_id,
            data,
          });

          await tauriInvoke('update_sync_queue_item_status', { itemId: item.id, status: 'synced', errorMessage: null });
          result.synced++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Erreur inconnue';
          result.errors++;
          result.errorDetails.push(`${item.entity_type}/${item.entity_id}: ${errMsg}`);
          await tauriInvoke('update_sync_queue_item_status', { itemId: item.id, status: 'error', errorMessage: errMsg });
        }
      }

      await this.refreshPendingCount();
      this.notifyListeners();
    } finally {
      this.flushInProgress = false;
    }

    return result;
  }

  // ─── Debug ───────────────────────────────────────────────────────────────

  async debugQueue(): Promise<void> {
    const items = await tauriInvoke<SyncQueue[]>('get_pending_sync_items', {});
    console.log('═══ [BidirectionalSync] Queue Debug ═══');
    console.log('Pending items:', items.length);
    console.table(items);
  }

  async clearQueue(): Promise<void> {
    try {
      await tauriInvoke('clear_all_sync_queue', {});
      await this.refreshPendingCount();
      this.notifyListeners();
      console.log('═══ [BidirectionalSync] Queue vidée avec succès');
    } catch (error) {
      console.error('Erreur lors du vidage de la queue:', error);
    }
  }
}

export default new BidirectionalSyncService();
