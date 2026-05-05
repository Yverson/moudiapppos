/**
 * Service unifié pour la gestion des commandes (local + online)
 * Gère la distinction entre commandes locales (sync push uniquement) et commandes online (API directe)
 */

import axios from 'axios';
import { tauriInvoke } from './platform';
import offlineOrderService from './offline-order.service';

export interface Order {
  id: string;
  restaurant_id: string;
  order_number?: string;
  customer_id?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  items: string; // JSON array
  payment_status: PaymentStatus;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: SyncStatus;
  sync_error?: string;
  source?: string; // 'local' ou 'online'
  livreur_id?: string;
  livreur_name?: string;
}

export type OrderStatus = 
  | 'pending_local'      // Commande créée, non payée
  | 'pending_delivery'   // Commande payée, en attente de préparation
  | 'preparing'          // En cours de préparation
  | 'ready'              // Prêt pour livraison/service
  | 'delivering'         // En cours de livraison
  | 'delivered'          // Livré/servi
  | 'cancelled'          // Annulé
  | 'refunded';          // Remboursé

export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type SyncStatus = 'pending' | 'synced' | 'error';

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  type?: 'local' | 'online' | 'all';
  dateFrom?: Date;
  dateTo?: Date;
  livreurId?: string;
  searchTerm?: string;
}

export interface OrderStats {
  total: number;
  totalRevenue: number;
  averageOrder: number;
  byStatus: Record<OrderStatus, number>;
  byType: {
    local: { count: number; revenue: number };
    online: { count: number; revenue: number };
  };
}

export function isLocalOrder(order: Pick<Order, 'source' | 'sync_status'>): boolean {
  return order.source === 'local' || order.sync_status === 'pending' || order.sync_status === 'error';
}

class OrdersService {
  private baseURL: string;
  private api: ReturnType<typeof axios.create>;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    // Intercepteur pour ajouter le token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Mapper les statuts AppPOS vers les statuts Backend
   */
  private mapLocalStatusToBackend(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      'pending_local': 'pending',
      'pending_delivery': 'paid', // Utiliser 'paid' pour les commandes payées
      'preparing': 'preparing',
      'ready': 'ready',
      'delivering': 'delivering',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };
    return map[status] || status;
  }

  /**
   * Mapper les statuts Backend vers les statuts AppPOS
   */
  private mapBackendStatusToLocal(status: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      'pending': 'pending_local',
      'paid': 'pending_delivery', // Commandes payées en attente de livraison
      'confirmed': 'pending_delivery',
      'preparing': 'preparing',
      'ready': 'ready',
      'delivering': 'delivering',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };
    return (map[status.toLowerCase()] || 'pending_local') as OrderStatus;
  }

  /**
   * Récupérer toutes les commandes (local + online)
   */
  async getAllOrders(restaurantId: string, filters?: OrderFilters): Promise<Order[]> {
    const [localOrders, onlineOrders] = await Promise.all([
      this.getLocalOrders(restaurantId, filters),
      this.getOnlineOrders(restaurantId, filters).catch(() => []), // Ignore les erreurs online
    ]);

    // Fusionner et dédupliquer (priorité aux commandes online si synced)
    const ordersMap = new Map<string, Order>();
    
    // Ajouter les commandes locales
    localOrders.forEach(order => ordersMap.set(order.id, order));
    
    // Remplacer par les versions online seulement si elles sont au moins aussi recentes.
    onlineOrders.forEach(order => {
      if (order.sync_status === 'synced') {
        const existing = ordersMap.get(order.id);
        const existingTime = existing ? new Date(existing.updated_at).getTime() : 0;
        const onlineTime = new Date(order.updated_at).getTime();
        if (!existing || onlineTime >= existingTime) {
          ordersMap.set(order.id, order);
        }
      }
    });

    let orders = Array.from(ordersMap.values());

    // Appliquer les filtres
    if (filters) {
      orders = this.applyFilters(orders, filters);
    }

    // Trier par date de création (plus récent en premier)
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return orders;
  }

  /**
   * Récupérer les commandes depuis l'API (online uniquement)
   */
  async getOnlineOrders(restaurantId: string, filters?: OrderFilters): Promise<Order[]> {
    try {
      const params: any = {};
      
      // Mapper les statuts AppPOS vers les statuts Backend
      if (filters?.status) {
        const backendStatuses = Array.isArray(filters.status)
          ? filters.status.map(s => this.mapLocalStatusToBackend(s))
          : [this.mapLocalStatusToBackend(filters.status)];
        params.status = backendStatuses.join(',');
      }
      
      if (filters?.dateFrom) {
        params.dateFrom = filters.dateFrom.toISOString();
      }
      
      if (filters?.dateTo) {
        params.dateTo = filters.dateTo.toISOString();
      }

      const response = await this.api.get(`/api/proprietaire/restaurants/${restaurantId}/orders`, { params });
      
      if (response.data.success) {
        return (response.data.data || []).map((order: any) => this.mapApiOrderToLocal(order));
      }
      
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer les commandes locales depuis IndexedDB/SQLite
   */
  async getLocalOrders(restaurantId: string, _filters?: OrderFilters): Promise<Order[]> {
    try {
      return await tauriInvoke<Order[]>('get_orders', { restaurantId, status: undefined });
    } catch (error) {
      return [];
    }
  }

  /**
   * Mettre à jour le statut d'une commande
   * - Commandes online: API directe, marque failed si pas d'internet
   * - Commandes locales: Mise à jour locale + sync push
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    restaurantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Récupérer les commandes locales pour vérifier si c'est une commande locale
      const localOrders = await this.getLocalOrders(restaurantId);
      const localOrder = localOrders.find(o => o.id === orderId);

      if (localOrder) {
        // Commande trouvée localement
        const isLocal = true;
        
        if (isLocal) {
          // Commande locale: mise à jour locale + sync push
          return await this.updateLocalOrderStatus(localOrder, newStatus);
        }
      }
      
      // Si pas trouvée localement ou si c'est une commande online, utiliser l'API
      return await this.updateOnlineOrderStatus(orderId, newStatus, restaurantId);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Mettre à jour une commande locale
   */
  private async updateLocalOrderStatus(order: Order, newStatus: OrderStatus): Promise<{ success: boolean; error?: string }> {
    try {
      const updated: Order = {
        ...order,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Si la commande passe à 'delivered' et n'est pas encore payée, la marquer comme payée
      if (newStatus === 'delivered' && order.payment_status !== 'paid') {
        updated.payment_status = 'paid';
      }

      await tauriInvoke('update_order_offline', { order: updated });

      // Ajouter à la queue de sync si pas déjà en erreur
      if (order.sync_status !== 'error') {
        await offlineOrderService.addToSyncQueue({
          id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          action: 'UPDATE_ORDER',
          entity_type: 'order',
          entity_id: order.id,
          data: JSON.stringify(updated),
          retries: 0,
          max_retries: 5,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Mettre à jour une commande online via API
   */
  private async updateOnlineOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    restaurantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Vérifier la connexion
      if (!navigator.onLine) {
        return { success: false, error: 'FAILED: Pas de connexion internet' };
      }

      // Mapper le statut AppPOS vers le statut Backend
      const backendStatus = this.mapLocalStatusToBackend(newStatus);

      // Utiliser l'endpoint existant : PATCH /api/proprietaire/orders/{id}/status
      const response = await this.api.patch(
        `/api/proprietaire/orders/${orderId}/status`,
        { Status: backendStatus }
      );

      if (response.data.success) {
        // Si la commande passe à 'delivered', s'assurer qu'elle est marquée comme payée côté backend
        if (newStatus === 'delivered') {
        }
        return { success: true };
      }

      return { success: false, error: response.data.message || 'Erreur API' };
    } catch (error) {

      if (axios.isAxiosError(error)) {
        if (!error.response) {
          return { success: false, error: 'FAILED: Impossible de contacter le serveur' };
        }
        return { success: false, error: error.response.data?.message || error.message };
      }

      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Assigner un livreur à une commande
   */
  async assignLivreur(orderId: string, livreurId: string, restaurantId: string, livreurName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const localOrders = await this.getLocalOrders(restaurantId);
      const order = localOrders.find(o => o.id === orderId);

      if (!order) {
        return { success: false, error: 'Commande non trouvée' };
      }

      const isLocal = true;

      if (isLocal) {
        // Mise à jour locale - Mettre à jour les notes avec le nom du livreur
        let updatedNotes = order.notes || '';
        
        // Retirer l'ancien livreur des notes s'il existe
        updatedNotes = updatedNotes.replace(/\|?Livreur:[^|]+/g, '');
        
        // Ajouter le nouveau livreur si un nom est fourni
        if (livreurName) {
          updatedNotes = `${updatedNotes}|Livreur:${livreurName}`.replace(/^\|/, '');
        }

        const updated: Order = {
          ...order,
          livreur_id: livreurId,
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        };

        await tauriInvoke(
          'update_order_offline',
          { order: updated }
        );

        return { success: true };
      } else {
        // API online - Utiliser l'endpoint PATCH /api/proprietaire/orders/{id}/livreur
        if (!navigator.onLine) {
          return { success: false, error: 'FAILED: Pas de connexion internet' };
        }

        const response = await this.api.patch(
          `/api/proprietaire/orders/${orderId}/livreur`,
          { LivreurId: livreurId }
        );

        return { success: response.data.success };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Calculer les statistiques des commandes
   */
  calculateStats(orders: Order[]): OrderStats {
    const stats: OrderStats = {
      total: orders.length,
      totalRevenue: 0,
      averageOrder: 0,
      byStatus: {} as Record<OrderStatus, number>,
      byType: {
        local: { count: 0, revenue: 0 },
        online: { count: 0, revenue: 0 },
      },
    };

    orders.forEach(order => {
      stats.totalRevenue += order.total;

      // Par statut
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;

      // Par type
      const isLocal = isLocalOrder(order);
      if (isLocal) {
        stats.byType.local.count++;
        stats.byType.local.revenue += order.total;
      } else {
        stats.byType.online.count++;
        stats.byType.online.revenue += order.total;
      }
    });

    stats.averageOrder = stats.total > 0 ? stats.totalRevenue / stats.total : 0;

    return stats;
  }

  /**
   * Appliquer les filtres aux commandes
   */
  private applyFilters(orders: Order[], filters: OrderFilters): Order[] {
    let filtered = [...orders];

    // Filtre par statut
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter(o => statuses.includes(o.status));
    }

    // Filtre par type (local/online)
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(o => {
        const isLocal = isLocalOrder(o);
        return filters.type === 'local' ? isLocal : !isLocal;
      });
    }

    // Filtre par date
    if (filters.dateFrom) {
      const fromTime = filters.dateFrom.getTime();
      filtered = filtered.filter(o => new Date(o.created_at).getTime() >= fromTime);
    }

    if (filters.dateTo) {
      const toTime = filters.dateTo.getTime();
      filtered = filtered.filter(o => new Date(o.created_at).getTime() <= toTime);
    }

    // Filtre par livreur
    if (filters.livreurId) {
      filtered = filtered.filter(o => o.livreur_id === filters.livreurId);
    }

    // Recherche textuelle
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(term) ||
        o.notes?.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  /**
   * Mapper une commande API vers le format local
   */
  private mapApiOrderToLocal(apiOrder: any): Order {
    // Construire les notes avec les informations du client et du livreur
    let notes = apiOrder.instructionsSpeciales || apiOrder.InstructionsSpeciales || '';
    
    // Ajouter les infos du client si disponibles
    if (apiOrder.client || apiOrder.Client) {
      const client = apiOrder.client || apiOrder.Client;
      const clientName = `${client.prenom || client.Prenom || ''} ${client.nom || client.Nom || ''}`.trim();
      if (clientName) {
        notes = `Client:${clientName}|${notes}`;
      }
    }
    
    // Ajouter les infos du livreur si disponibles
    if (apiOrder.livreur || apiOrder.Livreur) {
      const livreur = apiOrder.livreur || apiOrder.Livreur;
      const livreurName = livreur.name || livreur.Name || '';
      if (livreurName) {
        notes = `${notes}|Livreur:${livreurName}`;
      }
    }

    // Normaliser les articles pour avoir des propriétés cohérentes
    const rawItems = apiOrder.articlesCommande || apiOrder.ArticlesCommande || apiOrder.items || [];
    const normalizedItems = rawItems.map((item: any) => ({
      name: item.nomPlat || item.NomPlat || item.name || '',
      quantity: item.quantite || item.Quantite || item.quantity || 1,
      price: item.prixUnitaire || item.PrixUnitaire || item.price || 0,
      note: item.instructionsSpeciales || item.InstructionsSpeciales || item.note || ''
    }));

    return {
      id: apiOrder.id || apiOrder.Id,
      restaurant_id: apiOrder.restaurantId || apiOrder.RestaurantId,
      order_number: apiOrder.numeroCommande || apiOrder.NumeroCommande,
      customer_id: apiOrder.utilisateurId || apiOrder.UtilisateurId,
      status: this.mapBackendStatusToLocal(apiOrder.statut || apiOrder.Statut || 'pending'),
      subtotal: apiOrder.sousTotal || apiOrder.SousTotal || 0,
      tax: apiOrder.taxes || apiOrder.Taxes || 0,
      total: apiOrder.total || apiOrder.Total || 0,
      discount: apiOrder.remisePromo || apiOrder.RemisePromo,
      items: JSON.stringify(normalizedItems),
      payment_status: this.mapApiPaymentStatus(apiOrder.statutPaiement || apiOrder.StatutPaiement || 'pending'),
      payment_method: apiOrder.methodePaiement || apiOrder.MethodePaiement || apiOrder.paymentMethod?.type || apiOrder.PaymentMethod?.Type,
      notes: notes,
      created_at: apiOrder.dateCreation || apiOrder.DateCreation,
      updated_at: apiOrder.dateModification || apiOrder.DateModification || apiOrder.dateCreation || apiOrder.DateCreation,
      synced_at: new Date().toISOString(),
      sync_status: 'synced',
      source: apiOrder.source != 'local' ? 'online' : 'local',
      livreur_id: apiOrder.livreurId || apiOrder.LivreurId,
    };
  }

  /**
   * Mapper le statut de paiement API vers le statut local
   */
  private mapApiPaymentStatus(apiStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': 'pending',
      'paid': 'paid',
      'refunded': 'refunded',
    };

    return statusMap[apiStatus.toLowerCase()] || 'pending';
  }
}

export default new OrdersService();
