import axios, { AxiosInstance } from "axios";
import sqliteService from "./sqlite.service";
import { Category, MenuItem, Customer } from "./sqlite.service";
import { getActiveRestaurantId, getActiveRestaurantName, setActiveRestaurant } from "./restaurant-config";

export interface SyncResult {
  success: boolean;
  message: string;
  details: {
    categories: { synced: number; errors: string[] };
    menuItems: { synced: number; errors: string[] };
    customers: { synced: number; errors: string[] };
    livreurs: { synced: number; errors: string[] };
    orders: { synced: number; errors: string[] };
  };
  timestamp: string;
}

export interface SyncOptions {
  categories?: boolean;
  menuItems?: boolean;
  customers?: boolean;
  livreurs?: boolean;
  orders?: boolean;
  overwrite?: boolean; // If true, will overwrite local data with API data
}

class SyncService {
  private api: AxiosInstance;
  private baseURL: string;
  private restaurantId: string | null = null;
  private restaurantName: string | null = null;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    // Load restaurant configuration from the runtime selection first.
    this.restaurantId = getActiveRestaurantId();
    this.restaurantName = getActiveRestaurantName();

    // Load auth token from environment variables or localStorage
    this.authToken = import.meta.env.VITE_AUTH_TOKEN || null;

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });

    // Add auth header if token exists
    this.api.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("authToken");
          this.authToken = null;
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Set the restaurant ID for API calls
   */
  setRestaurantId(id: string) {
    this.restaurantId = id;
  }

  /**
   * Get the restaurant ID
   * Priority: localStorage runtime selection > Environment variable
   */
  getRestaurantId(): string | null {
    this.restaurantId = getActiveRestaurantId();
    return this.restaurantId;
  }

  /**
   * Get the restaurant name
   */
  getRestaurantName(): string | null {
    return (
      this.restaurantName ||
      getActiveRestaurantName()
    );
  }

  /**
   * Set the restaurant name
   */
  setRestaurantName(name: string) {
    this.restaurantName = name;
    const restaurantId = this.getRestaurantId();
    if (restaurantId) {
      setActiveRestaurant({ id: restaurantId, name });
    }
  }

  /**
   * Get the auth token
   * Priority: Environment variable > localStorage > null
   */
  getAuthToken(): string | null {
    if (this.authToken) {
      return this.authToken;
    }
    // Fallback to localStorage for runtime set tokens
    const stored = localStorage.getItem("authToken");
    if (stored) {
      return stored;
    }
    return null;
  }

  /**
   * Set the auth token
   * Useful for setting token after login
   */
  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem("authToken", token);
  }

  /**
   * Clear the auth token
   * Useful for logout
   */
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem("authToken");
  }

  async syncAll(options: SyncOptions = {}, apiUrl?: string): Promise<SyncResult> {
    if (apiUrl) {
      this.baseURL = apiUrl;
      this.api.defaults.baseURL = apiUrl;
      try {
        const { setSessionApiBaseUrl } = await import('./local-session.service');
        setSessionApiBaseUrl(apiUrl);
      } catch (e) {
        // Ignorer si la fonction n'est pas encore ajoutée
      }
    }
    const result: SyncResult = {
      success: true,
      message: "Synchronisation réussie",
      details: {
        categories: { synced: 0, errors: [] },
        menuItems: { synced: 0, errors: [] },
        customers: { synced: 0, errors: [] },
        livreurs: { synced: 0, errors: [] },
        sessions: { synced: 0, errors: [] },
        orders: { synced: 0, errors: [] },
      },
      timestamp: new Date().toISOString(),
    };

    // Validate restaurant ID
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      result.success = false;
      result.message =
        "Restaurant ID non configuré. Impossible de synchroniser.";
      return result;
    }

    try {
      // Récupérer les dates de dernière synchronisation depuis le cloud
      const syncStatus = await sqliteService.getSyncStatus();

      // Sync Categories
      if (options.categories !== false) {
        try {
          // Utiliser la date de dernière sync depuis le cloud
          const lastSync = syncStatus.categories || null;
          const apiCategories = await this.fetchCategoriesFromAPI(restaurantId, lastSync);
          const convertedCategories = apiCategories.map((cat) =>
            this.convertCategoryFromAPI(cat),
          );

          if (options.overwrite) {
            // Clear local categories first
            await sqliteService.syncCategories(convertedCategories);
          } else {
            // Merge with existing
            await sqliteService.syncCategories(convertedCategories);
          }

          result.details.categories.synced = convertedCategories.length;
          
          // Mettre à jour le statut de synchronisation
          await sqliteService.setSyncStatus('categories', new Date().toISOString());
        } catch (error) {
          result.details.categories.errors.push(
            error instanceof Error ? error.message : "Erreur inconnue",
          );
          result.success = false;
        }
      }

      // Sync Menu Items
      if (options.menuItems !== false) {
        try {
          const lastSync = syncStatus.menu_items || null;
          const apiMenuItems = await this.fetchMenuItemsFromAPI(restaurantId, lastSync);
          const convertedItems = apiMenuItems.map((item) =>
            this.convertMenuItemFromAPI(item),
          );

          if (options.overwrite) {
            // Clear local items first
            await sqliteService.syncMenuItems(convertedItems);
          } else {
            // Merge with existing
            await sqliteService.syncMenuItems(convertedItems);
          }

          result.details.menuItems.synced = convertedItems.length;
          
          // Mettre à jour le statut de synchronisation
          await sqliteService.setSyncStatus('menu_items', new Date().toISOString());
        } catch (error) {
          result.details.menuItems.errors.push(
            error instanceof Error ? error.message : "Erreur inconnue",
          );
          result.success = false;
        }
      }

      // Sync Customers
      if (options.customers !== false) {
        try {
          const lastSync = syncStatus.customers || null;
          const apiCustomers = await this.fetchCustomersFromAPI(restaurantId, lastSync);
          const convertedCustomers = apiCustomers.map((customer) =>
            this.convertCustomerFromAPI(customer),
          );

          if (options.overwrite) {
            // Clear local customers first
            await sqliteService.syncCustomers(convertedCustomers);
          } else {
            // Merge with existing
            await sqliteService.syncCustomers(convertedCustomers);
          }

          result.details.customers.synced = convertedCustomers.length;
          
          // Mettre à jour le statut de synchronisation
          await sqliteService.setSyncStatus('customers', new Date().toISOString());
        } catch (error) {
          result.details.customers.errors.push(
            error instanceof Error ? error.message : "Erreur inconnue",
          );
          result.success = false;
        }
      }

      // Sync Livreurs
      if (options.livreurs !== false) {
        try {
          const lastSync = syncStatus.livreurs || null;
          const apiLivreurs = await this.fetchLivreursFromAPI(restaurantId, lastSync);

          // Sync to SQLite via Tauri
          for (const livreur of apiLivreurs) {
            const convertedLivreur = this.convertLivreurFromAPI(livreur, restaurantId);

            try {
              const result = await sqliteService.upsertLivreur(convertedLivreur);
            } catch (syncError) {
              throw syncError;
            }
          }

          result.details.livreurs.synced = apiLivreurs.length;

          // Mettre à jour le statut de synchronisation
          await sqliteService.setSyncStatus('livreurs', new Date().toISOString());
        } catch (error) {
          result.details.livreurs.errors.push(
            error instanceof Error ? error.message : "Erreur inconnue",
          );
          result.success = false;
        }
      }

      // Sync Sessions (IMPORTANT: Sync sessions BEFORE orders to avoid FK conflicts)
      try {
        const { syncPendingSessions, setSessionApiBaseUrl } = await import('./local-session.service');
        
        if (apiUrl) {
          setSessionApiBaseUrl(apiUrl);
        }

        const sessionResult = await syncPendingSessions();

        result.details.sessions = {
          synced: sessionResult.synced,
          errors: sessionResult.errors > 0 ? [`${sessionResult.errors} sessions en erreur`] : []
        };
      } catch (error) {
        result.details.sessions.errors.push(error instanceof Error ? error.message : "Erreur inconnue");
      }

      // Sync Orders (Push local orders to cloud)
      if (options.orders !== false) {
        try {
          const syncResult = await this.syncOrders(restaurantId);
          result.details.orders.synced = syncResult.synced;
          result.details.orders.errors = syncResult.errors;

          if (syncResult.errors.length > 0) {
            result.success = false;
          }
        } catch (error) {
          result.details.orders.errors.push(
            error instanceof Error ? error.message : "Erreur inconnue",
          );
          result.success = false;
        }
      }

      if (!result.success) {
        result.message = "Synchronisation terminée avec des erreurs";
      }
    } catch (error) {
      result.success = false;
      result.message =
        error instanceof Error
          ? error.message
          : "Erreur de synchronisation générale";
    }

    return result;
  }

  async getSyncStatus() {
    return await sqliteService.getSyncStatus();
  }

  /**
   * Fetch categories from MOUDI API
   * Endpoint: GET /api/restaurants/{id}/categories
   */
  private async fetchCategoriesFromAPI(restaurantId: string, lastSync: string | null = null): Promise<any[]> {
    try {
      const params = lastSync ? { lastSync } : {};
      const response = await this.api.get(
        `/api/restaurants/${restaurantId}/categories`,
        { params }
      );
      return response.data?.data || response.data || [];
    } catch (error) {
      throw new Error(
        "Impossible de synchroniser les catégories. " +
          "Vérifiez votre connexion et votre authentification.",
      );
    }
  }

  /**
   * Fetch menu items from MOUDI API
   * Endpoint: GET /api/restaurants/{id}/menu
   */
  private async fetchMenuItemsFromAPI(restaurantId: string, lastSync: string | null = null): Promise<any[]> {
    try {
      // First, get the restaurant details which includes the menu
      const response = await this.api.get(`/api/restaurants/${restaurantId}`);

      const restaurantData = response.data?.data || response.data;

      // Extract menu items from categories
      const menuItems: any[] = [];

      if (
        restaurantData.categoriesMenu &&
        Array.isArray(restaurantData.categoriesMenu)
      ) {
        restaurantData.categoriesMenu.forEach((category: any) => {
          if (category.plats && Array.isArray(category.plats)) {
            category.plats.forEach((plat: any) => {
              menuItems.push({
                ...plat,
                category_id: category.id,
                category_name: category.nom,
              });
            });
          }
        });
      }

      return menuItems;
    } catch (error) {
      throw new Error(
        "Impossible de synchroniser le menu. " +
          "Vérifiez votre connexion et votre authentification.",
      );
    }
  }

  /**
   * Fetch customers from MOUDI API
   * Endpoint: GET /api/restaurants/{id}/clients
   */
  private async fetchCustomersFromAPI(restaurantId: string, lastSync: string | null = null): Promise<any[]> {
    try {
      const params = lastSync ? { lastSync } : {};
      const response = await this.api.get(
        `/api/restaurants/${restaurantId}/clients`,
        { params }
      );
      return response.data?.data || response.data || [];
    } catch (error) {
      throw new Error(
        "Impossible de synchroniser les clients. " +
          "Vérifiez votre connexion et votre authentification.",
      );
    }
  }

  /**
   * Convert API category format to SQLite format
   */
  private convertCategoryFromAPI(apiCategory: any): Category {
    return {
      id: apiCategory.id || `cat-${Date.now()}`,
      name: apiCategory.nom || apiCategory.name || "Sans nom",
      description: apiCategory.description || "",
      color: apiCategory.color || "#FF6B6B",
      icon: apiCategory.icon || "restaurant",
      order: apiCategory.ordreTri || apiCategory.order || 1,
      active: apiCategory.actif !== false && apiCategory.active !== false,
      created_at:
        apiCategory.created_at ||
        apiCategory.dateCreation ||
        new Date().toISOString(),
      updated_at:
        apiCategory.updated_at ||
        apiCategory.dateModification ||
        new Date().toISOString(),
    };
  }

  /**
   * Convert API menu item format to SQLite format
   */
  private convertMenuItemFromAPI(apiItem: any): MenuItem {
    // Parse allergens if they come as an array or string
    let allergens: string[] = [];
    if (typeof apiItem.allergenes === "string") {
      allergens = JSON.parse(apiItem.allergenes);
    } else if (Array.isArray(apiItem.allergenes)) {
      allergens = apiItem.allergenes;
    } else if (typeof apiItem.allergens === "string") {
      allergens = JSON.parse(apiItem.allergens);
    } else if (Array.isArray(apiItem.allergens)) {
      allergens = apiItem.allergens;
    }

    // Parse variants / variations
    let variants: any[] = [];
    if (apiItem.variations && Array.isArray(apiItem.variations)) {
      // Convert variations to variants format
      variants = apiItem.variations.map((variation: any) => ({
        name: variation.nom || variation.name || "Standard",
        price:
          variation.price ||
          variation.prix ||
          apiItem.prix ||
          apiItem.price ||
          0,
        default: variation.default !== false,
      }));
    } else if (apiItem.variants && Array.isArray(apiItem.variants)) {
      variants = apiItem.variants;
    } else {
      // Create a default variant
      variants = [
        {
          name: "Standard",
          price: apiItem.prix || apiItem.price || 0,
          default: true,
        },
      ];
    }

    return {
      id: apiItem.id || `item-${Date.now()}`,
      category_id: apiItem.category_id || apiItem.categoryId || "uncategorized",
      name: apiItem.nom || apiItem.name || "Sans nom",
      description: apiItem.description || "",
      price: parseFloat(apiItem.prix || apiItem.price || "0"),
      cost_price: parseFloat(apiItem.prixCout || apiItem.cost_price || "0"),
      image_url: apiItem.imageUrl || apiItem.image_url,
      available: apiItem.estDisponible !== false && apiItem.available !== false,
      allergens: JSON.stringify(allergens),
      preparation_time:
        apiItem.tempsPreparation || apiItem.preparation_time || 10,
      order: apiItem.order || 1,
      variants: JSON.stringify(variants),
      created_at:
        apiItem.created_at || apiItem.dateCreation || new Date().toISOString(),
      updated_at:
        apiItem.updated_at ||
        apiItem.dateModification ||
        new Date().toISOString(),
    };
  }

  /**
   * Convert API customer format to SQLite format
   */
  private convertCustomerFromAPI(apiCustomer: any): Customer {
    return {
      id: apiCustomer.id || `cust-${Date.now()}`,
      name: apiCustomer.name || apiCustomer.firstName || "Sans nom",
      email: apiCustomer.email || "",
      phone: apiCustomer.phone || apiCustomer.telephone || "",
      address: apiCustomer.address
        ? JSON.stringify(apiCustomer.address)
        : undefined,
      customer_type: (apiCustomer.type ||
        apiCustomer.customer_type ||
        "regular") as "regular" | "vip" | "corporate",
      loyalty_points: apiCustomer.loyalty_points || 0,
      total_orders: apiCustomer.total_orders || 0,
      total_spent: apiCustomer.total_spent || 0,
      preferences: apiCustomer.preferences
        ? JSON.stringify(apiCustomer.preferences)
        : undefined,
      notes: apiCustomer.notes || "",
      created_at: apiCustomer.created_at || new Date().toISOString(),
      updated_at: apiCustomer.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Fetch livreurs from MOUDI API
   * Endpoint: GET /api/restaurants/{id}/livreurs
   */
  private async fetchLivreursFromAPI(restaurantId: string, lastSync: string | null = null): Promise<any[]> {
    try {
      const params = lastSync ? { lastSync } : {};
      const response = await this.api.get(
        `/api/restaurants/${restaurantId}/livreurs`,
        { params }
      );
      return response.data?.data || response.data || [];
    } catch (error) {
      throw new Error(
        "Impossible de synchroniser les livreurs. " +
          "Vérifiez votre connexion et votre authentification.",
      );
    }
  }

  /**
   * Convert API livreur format to SQLite format
   */
  private convertLivreurFromAPI(apiLivreur: any, restaurantId: string): any {
    // Convertir statut en active (actif = true, autres = false)
    const statut = (apiLivreur.statut || apiLivreur.Statut || '').toLowerCase();
    const isActive = statut === 'actif' || statut === 'active' || statut === 'actif(e)' || apiLivreur.actif === true || apiLivreur.active === true;
    
    return {
      id: apiLivreur.id || apiLivreur.Id || `livreur-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      restaurant_id: restaurantId,
      nom: apiLivreur.nom || apiLivreur.Nom || apiLivreur.name || apiLivreur.Name || "Sans nom",
      prenom: apiLivreur.prenom || apiLivreur.Prenom || apiLivreur.firstName || apiLivreur.FirstName || "",
      telephone: apiLivreur.telephone || apiLivreur.Telephone || apiLivreur.phone || apiLivreur.Phone || undefined,
      email: apiLivreur.email || apiLivreur.Email || undefined,
      active: isActive,
      created_at: apiLivreur.dateInscription || apiLivreur.DateInscription || apiLivreur.created_at || apiLivreur.CreatedAt || new Date().toISOString(),
      updated_at: apiLivreur.dateModification || apiLivreur.DateModification || apiLivreur.updated_at || apiLivreur.UpdatedAt || new Date().toISOString(),
    };
  }

  /**
   * Synchroniser les commandes locales vers le cloud
   */
  private async syncOrders(restaurantId: string): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      // Importer le service offline-order
      const offlineOrderService = (await import('./offline-order.service')).default;

      // Récupérer les commandes en attente de synchronisation
      const allOrders = await offlineOrderService.getOrders(restaurantId);
      const pendingOrders = allOrders.filter(order =>
        order.sync_status !== 'synced' && !order.synced_at
      );

      if (pendingOrders.length === 0) {
        return result;
      }

      // Transformer les commandes au format backend
      const ordersToSync = pendingOrders.map(order => {
        const items = JSON.parse(order.items || '[]');
        const orderAny = order as any;

        return {
          Id: order.id,
          NumeroCommande: order.order_number,
          RestaurantId: restaurantId,
          UtilisateurId: order.customer_id,
          LivreurId: orderAny.livreur_id,
          SessionId: orderAny.session_id,
          Statut: this.mapLocalStatusToBackend(order.status),
          StatutPaiement: order.payment_status,
          SousTotal: order.subtotal,
          Taxes: order.tax,
          Total: order.total,
          RemisePromo: order.discount,
          MethodePaiement: order.payment_method || 'cash',
          InstructionsSpeciales: order.notes,
          DateCreation: order.created_at,
          DateModification: order.updated_at,
          Items: items.map((item: any) => ({
            PlatId: item.menu_item_id || item.id,
            NomPlat: item.name,
            Quantite: item.quantity,
            PrixUnitaire: item.price || item.unit_price,
            PrixTotal: item.total_price || (item.price * item.quantity),
            InstructionsSpeciales: item.notes
          }))
        };
      });

      // Récupérer les sessions liées à ces commandes pour les inclure dans le payload
      const sessionIdsInOrders = [...new Set(ordersToSync.map(o => o.SessionId).filter(id => id))] as string[];
      let sessionsToSync: any[] = [];

      if (sessionIdsInOrders.length > 0) {
        try {
          const { getLocalSessionById } = await import('./local-session.service');

          for (const sid of sessionIdsInOrders) {
            const session = await getLocalSessionById(sid);
            if (session) {
              sessionsToSync.push({
                Id: session.id,
                Type: session.type,
                DateOuverture: session.date_ouverture,
                DateFermeture: session.date_fermeture,
                EstOuverte: session.est_ouverte,
                CaTotal: session.ca_total,
                NombreCommandes: session.nombre_commandes,
                Notes: session.notes
              });
            }
          }
        } catch (sessionErr) {
          // Ignorer les erreurs de session
        }
      }

      // Envoyer vers l'API
      const sendOrders = async () => {
        return await this.api.post(
          `/api/restaurants/${restaurantId}/orders/sync`,
          {
            Orders: ordersToSync,
            Sessions: sessionsToSync
          }
        );
      };

      let response = await sendOrders();

      // Logique de récupération automatique (Auto-healing)
      const responseData = response.data || {};
      const results = responseData.Results || responseData.results || [];
      const globalMessage = responseData.Message || responseData.message || "";

      const isFKError = globalMessage.includes("FK_Commandes_Sessions") ||
                        globalMessage.includes("Sessions") ||
                        results.some((r: any) => (r.Message || r.message || "").includes("Sessions"));

      if (isFKError) {
        const sessionIds = [...new Set(ordersToSync.map(o => o.SessionId).filter(id => id))] as string[];

        if (sessionIds.length > 0) {
          try {
            const { syncSessionById } = await import('./local-session.service');
            let sessionsRecovered = 0;

            for (const sid of sessionIds) {
              const success = await syncSessionById(sid);
              if (success) sessionsRecovered++;
            }

            if (sessionsRecovered > 0) {
              response = await sendOrders();
            }
          } catch (recoveryErr) {
            // Ignorer les erreurs de recovery
          }
        }
      }

      const finalResponseData = response.data || {};
      if (finalResponseData.Success || finalResponseData.success) {
        const syncResponse = finalResponseData;

        for (const orderResult of syncResponse.Results || syncResponse.results || []) {
          const orderId = orderResult.OrderId || orderResult.orderId;

          if (orderResult.Success || orderResult.success) {
            const order = pendingOrders.find(o => o.id === orderId);
            if (order) {
              try {
                await offlineOrderService.updateOrderOffline({
                  ...order,
                  sync_status: 'synced',
                  synced_at: new Date().toISOString(),
                  sync_error: undefined
                });
                result.synced++;
              } catch (updateError) {
                result.errors.push(`Erreur mise à jour ${orderId}: ${updateError}`);
              }
            }
          } else {
            const errorMsg = orderResult.ErrorMessage || orderResult.errorMessage || 'Erreur inconnue';
            result.errors.push(errorMsg);
          }
        }
      } else {
        const syncResponse = response.data;
        const results = syncResponse.Results || syncResponse.results || [];

        for (const orderResult of results) {
          const orderId = orderResult.OrderId || orderResult.orderId;
          const errorMsg = orderResult.ErrorMessage || orderResult.errorMessage || 'Erreur inconnue';
          const status = orderResult.Status || orderResult.status || '';

          if (status === 'updated' || status === 'created' || (orderResult.Success || orderResult.success)) {
            const order = pendingOrders.find(o => o.id === orderId);
            if (order) {
              try {
                await offlineOrderService.updateOrderOffline({
                  ...order,
                  sync_status: 'synced',
                  synced_at: new Date().toISOString(),
                  sync_error: undefined
                });
                result.synced++;
              } catch (updateError) {
                result.errors.push(`${orderId}: Erreur mise à jour locale`);
              }
            }
          } else {
            result.errors.push(`${orderId}: ${errorMsg}`);
          }
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
    }

    return result;
  }

  /**
   * Mapper les statuts locaux vers les statuts backend
   */
  private mapLocalStatusToBackend(status: string): string {
    const map: Record<string, string> = {
      'pending_local': 'pending',
      'pending_delivery': 'paid',
      'preparing': 'preparing',
      'ready': 'ready',
      'delivering': 'delivering',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };
    return map[status] || status;
  }

  // Method to check if local data needs sync
  async needsSync(): Promise<{ needs: boolean; reason: string }> {
    try {
      const syncStatus = await this.getSyncStatus();
      const now = new Date();

      // Check if any table has never been synced
      for (const [table, lastSync] of Object.entries(syncStatus)) {
        if (!lastSync) {
          return { needs: true, reason: `${table} n'a jamais été synchronisé` };
        }

        const lastSyncDate = new Date(lastSync);
        const hoursSinceSync =
          (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

        // If more than 24 hours since last sync
        if (hoursSinceSync > 24) {
          return {
            needs: true,
            reason: `${table} n'a pas été synchronisé depuis ${Math.floor(hoursSinceSync)} heures`,
          };
        }
      }

      return { needs: false, reason: "Toutes les données sont à jour" };
    } catch (error) {
      return {
        needs: true,
        reason: "Impossible de vérifier le statut de synchronisation",
      };
    }
  }

  // Method to get local data count
  async getLocalDataCount(): Promise<{
    categories: number;
    menuItems: number;
    customers: number;
    livreurs: number;
  }> {
    try {
      const restaurantId = this.getRestaurantId();
      if (!restaurantId) {
        return { categories: 0, menuItems: 0, customers: 0, livreurs: 0 };
      }
      const [categories, menuItems, customers, livreurs] = await Promise.all([
        sqliteService.getCategories(),
        sqliteService.getMenuItems(),
        sqliteService.getCustomers(),
        sqliteService.getLivreurs(restaurantId),
      ]);

      return {
        categories: categories.length,
        menuItems: menuItems.length,
        customers: customers.length,
        livreurs: livreurs.length,
      };
    } catch (error) {
      return { categories: 0, menuItems: 0, customers: 0, livreurs: 0 };
    }
  }
}

export default new SyncService();
