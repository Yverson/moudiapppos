import { tauriInvoke } from './platform';

// Types matching Rust structs
export interface Order {
  id: string;
  restaurant_id: string;
  order_number?: string;
  customer_id?: string;
  status: string; // 'pending_local', 'confirmed', 'cancelled', etc.
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  items: string; // JSON array
  payment_status: string; // 'pending', 'paid', 'refunded'
  payment_method?: string;
  notes?: string;
  session_id?: string; // ID de la session de caisse (X/Z), équivalent à Commandes.SessionId cloud
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: string; // 'pending', 'synced', 'error'
  sync_error?: string;
  source?: string; // 'local' ou 'online'
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_name?: string;
  notes?: string;
  created_at: string;
}

export interface SyncQueue {
  id: string;
  action: string; // 'CREATE_ORDER', 'UPDATE_ORDER', etc.
  entity_type: string; // 'order', 'customer', etc.
  entity_id: string;
  data: string; // JSON payload
  retries: number;
  max_retries: number;
  last_attempt?: string;
  status: string; // 'pending', 'processing', 'synced', 'error', 'failed'
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  synced: number;
  errors: number;
  error_details: string[];
}

class OfflineOrderService {
  // Order operations
  async createOrderOffline(order: Order): Promise<Order> {
    return await tauriInvoke<Order>('create_order_offline', { order });
  }

  async updateOrderOffline(order: Order): Promise<Order> {
    return await tauriInvoke<Order>('update_order_offline', { order });
  }

  async getOrders(restaurantId: string, status?: string): Promise<Order[]> {
    return await tauriInvoke<Order[]>('get_orders', { restaurantId, status });
  }

  async getPendingOrders(restaurantId: string): Promise<Order[]> {
    return await tauriInvoke<Order[]>('get_pending_orders', { restaurantId });
  }

  // Sync queue operations
  async addToSyncQueue(queueItem: SyncQueue): Promise<SyncQueue> {
    return await tauriInvoke<SyncQueue>('add_to_sync_queue', { queueItem });
  }

  async getPendingSyncItems(): Promise<SyncQueue[]> {
    return await tauriInvoke<SyncQueue[]>('get_pending_sync_items', {});
  }

  async syncPendingOrders(restaurantId: string, apiUrl: string): Promise<SyncResult> {
    console.log('OFFLINE_ORDER_SYNC', { restaurantId, apiUrl }, 'Appel de syncPendingOrders');
    return await tauriInvoke<SyncResult>('sync_pending_orders', { restaurantId, apiUrl });
  }

  // Helper methods
  async createOrderObject(orderData: {
    restaurantId: string;
    customerId?: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    discount?: number;
    paymentMethod?: string;
    notes?: string;
  }): Promise<Order> {
    const now = new Date().toISOString();
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Récupérer la session ouverte pour ce restaurant
    let sessionId: string | undefined;
    try {
      const { getOpenLocalSession } = await import('./local-session.service');
      const openSession = await getOpenLocalSession(orderData.restaurantId);
      if (openSession) {
        sessionId = openSession.id;
      }
    } catch (err) {
      console.warn('[OfflineOrderService] Impossible de récupérer la session ouverte:', err);
    }

    return {
      id: orderId,
      restaurant_id: orderData.restaurantId,
      order_number: undefined, // Will be assigned by API
      customer_id: orderData.customerId,
      status: 'pending_local',
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      discount: orderData.discount,
      items: JSON.stringify(orderData.items),
      payment_status: 'pending',
      payment_method: orderData.paymentMethod,
      notes: orderData.notes,
      session_id: sessionId, // Assigner à la session ouverte automatiquement
      created_at: now,
      updated_at: now,
      synced_at: undefined,
      sync_status: 'pending',
      sync_error: undefined,
      source: 'local',
    };
  }

  createSyncQueueItem(action: string, entityType: string, entityId: string, data: any): SyncQueue {
    const now = new Date().toISOString();
    const queueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: queueId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      data: JSON.stringify(data),
      retries: 0,
      max_retries: 5,
      last_attempt: undefined,
      status: 'pending',
      error_message: undefined,
      created_at: now,
      updated_at: now,
    };
  }

  // Parse order items from JSON string
  parseOrderItems(itemsJson: string): OrderItem[] {
    try {
      return JSON.parse(itemsJson);
    } catch {
      return [];
    }
  }

  // Check if order is synced
  isOrderSynced(order: Order): boolean {
    return order.sync_status === 'synced';
  }

  // Check if order has sync errors
  hasSyncErrors(order: Order): boolean {
    return order.sync_status === 'error' && !!order.sync_error;
  }

  // Get sync status display text
  getSyncStatusText(order: Order): string {
    switch (order.sync_status) {
      case 'pending':
        return 'En attente de synchronisation';
      case 'synced':
        return `Synchronisé le ${new Date(order.synced_at || '').toLocaleString('fr-FR')}`;
      case 'error':
        return `Erreur: ${order.sync_error || 'Erreur inconnue'}`;
      default:
        return 'Statut inconnu';
    }
  }

  // Get order status display text
  getOrderStatusText(order: Order): string {
    switch (order.status) {
      case 'pending_local':
        return 'En attente (local)';
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmé';
      case 'preparing':
        return 'En préparation';
      case 'ready':
        return 'Prêt';
      case 'picked_up':
        return 'Récupéré';
      case 'delivered':
        return 'Livré';
      case 'cancelled':
        return 'Annulé';
      default:
        return order.status;
    }
  }

  // Calculate order statistics
  getOrderStats(orders: Order[]): {
    total: number;
    pending: number;
    synced: number;
    errors: number;
    totalRevenue: number;
  } {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.sync_status === 'pending').length,
      synced: orders.filter(o => o.sync_status === 'synced').length,
      errors: orders.filter(o => o.sync_status === 'error').length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    };
    return stats;
  }
}

export default new OfflineOrderService();
