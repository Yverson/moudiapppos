import axios, { AxiosInstance } from "axios";
import sqliteService from "./sqlite.service";
import { Category, MenuItem, Customer } from "./sqlite.service";

export interface SyncResult {
  success: boolean;
  message: string;
  details: {
    categories: { synced: number; errors: string[] };
    menuItems: { synced: number; errors: string[] };
    customers: { synced: number; errors: string[] };
  };
  timestamp: string;
}

export interface SyncOptions {
  categories?: boolean;
  menuItems?: boolean;
  customers?: boolean;
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

    // Load restaurant configuration from environment variables
    this.restaurantId = import.meta.env.VITE_RESTAURANT_ID || null;
    this.restaurantName = import.meta.env.VITE_RESTAURANT_NAME || null;

    // Load auth token from environment variables or localStorage
    this.authToken = import.meta.env.VITE_AUTH_TOKEN || null;

    // Log loaded configuration
    if (this.restaurantId) {
      console.log(
        `[SyncService] Restaurant configuré: ${this.restaurantName || this.restaurantId}`,
      );
    }

    if (this.authToken) {
      console.log('[SyncService] Token d\'authentification chargé depuis les variables d\'environnement');
    }

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
          console.warn('[SyncService] Token expiré, veuillez vous reconnecter');
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
   * Priority: Direct set > localStorage > Environment variable
   */
  getRestaurantId(): string | null {
    if (!this.restaurantId) {
      // Try to get from localStorage if not set
      const stored = localStorage.getItem("restaurantId");
      if (stored) {
        this.restaurantId = stored;
      }
    }
    return this.restaurantId;
  }

  /**
   * Get the restaurant name
   */
  getRestaurantName(): string | null {
    return (
      this.restaurantName ||
      localStorage.getItem("restaurantName") ||
      import.meta.env.VITE_RESTAURANT_NAME ||
      null
    );
  }

  /**
   * Set the restaurant name
   */
  setRestaurantName(name: string) {
    this.restaurantName = name;
    localStorage.setItem("restaurantName", name);
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
    console.log('[SyncService] Token d\'authentification défini et sauvegardé');
  }

  /**
   * Clear the auth token
   * Useful for logout
   */
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem("authToken");
    console.log('[SyncService] Token d\'authentification supprimé');
  }

  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      message: "Synchronisation réussie",
      details: {
        categories: { synced: 0, errors: [] },
        menuItems: { synced: 0, errors: [] },
        customers: { synced: 0, errors: [] },
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
      // Sync Categories
      if (options.categories !== false) {
        try {
          const apiCategories = await this.fetchCategoriesFromAPI(restaurantId);
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
          const apiMenuItems = await this.fetchMenuItemsFromAPI(restaurantId);
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
          const apiCustomers = await this.fetchCustomersFromAPI(restaurantId);
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
        } catch (error) {
          result.details.customers.errors.push(
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
  private async fetchCategoriesFromAPI(restaurantId: string): Promise<any[]> {
    try {
      const response = await this.api.get(
        `/api/restaurants/${restaurantId}/categories`,
      );
      return response.data?.data || response.data || [];
    } catch (error) {
      console.warn("Impossible de récupérer les catégories de l'API:", error);
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
  private async fetchMenuItemsFromAPI(restaurantId: string): Promise<any[]> {
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
      console.warn("Impossible de récupérer le menu de l'API:", error);
      throw new Error(
        "Impossible de synchroniser le menu. " +
          "Vérifiez votre connexion et votre authentification.",
      );
    }
  }

  /**
   * Fetch customers from MOUDI API
   * Endpoint: GET /api/restaurants/{id}/customers
   */
  private async fetchCustomersFromAPI(restaurantId: string): Promise<any[]> {
    try {
      const response = await this.api.get(
        `/api/restaurants/${restaurantId}/customers`,
      );
      return response.data?.data || response.data || [];
    } catch (error) {
      console.warn("Impossible de récupérer les clients de l'API:", error);
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
  }> {
    try {
      const [categories, menuItems, customers] = await Promise.all([
        sqliteService.getCategories(),
        sqliteService.getMenuItems(),
        sqliteService.getCustomers(),
      ]);

      return {
        categories: categories.length,
        menuItems: menuItems.length,
        customers: customers.length,
      };
    } catch (error) {
      return { categories: 0, menuItems: 0, customers: 0 };
    }
  }
}

export default new SyncService();
