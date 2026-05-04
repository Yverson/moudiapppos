import { tauriInvoke } from './platform';

// Types matching Rust structs
export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  image_url?: string;
  available: boolean;
  allergens: string; // JSON string
  preparation_time: number;
  order: number;
  variants: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string; // JSON string
  customer_type: 'regular' | 'vip' | 'corporate';
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  preferences?: string; // JSON string
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Livreur {
  id: string;
  restaurant_id: string;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncStatus {
  [tableName: string]: string | null;
}

class SQLiteService {
  // Categories
  async getCategories(): Promise<Category[]> {
    return await tauriInvoke<Category[]>('get_categories', {});
  }

  async syncCategories(categories: Category[]): Promise<Category[]> {
    return await tauriInvoke<Category[]>('sync_categories', { categories });
  }

  // Menu Items
  async getMenuItems(categoryId?: string): Promise<MenuItem[]> {
    return await tauriInvoke<MenuItem[]>('get_menu_items', { categoryId });
  }

  async syncMenuItems(items: MenuItem[]): Promise<MenuItem[]> {
    return await tauriInvoke<MenuItem[]>('sync_menu_items', { items });
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await tauriInvoke<Customer[]>('get_customers', {});
  }

  async syncCustomers(customers: Customer[]): Promise<Customer[]> {
    return await tauriInvoke<Customer[]>('sync_customers', { customers });
  }

  // Livreurs
  async getLivreurs(restaurantId: string): Promise<Livreur[]> {
    return await tauriInvoke<Livreur[]>('get_livreurs', { restaurantId, activeOnly: false });
  }

  async syncLivreur(livreur: Livreur): Promise<Livreur> {
    return await tauriInvoke<Livreur>('create_livreur', { livreur });
  }

  async upsertLivreur(livreur: Livreur): Promise<Livreur> {
    return await tauriInvoke<Livreur>('upsert_livreur', { livreur });
  }

  // Sync Status
  async getSyncStatus(): Promise<SyncStatus> {
    return await tauriInvoke<SyncStatus>('get_sync_status', {});
  }

  async setSyncStatus(tableName: string, timestamp: string): Promise<void> {
    return await tauriInvoke<void>('set_sync_status', { tableName, lastSync: timestamp });
  }

  async getLastLocalModificationDate(tableName: string): Promise<string | null> {
    return await tauriInvoke<string | null>('get_last_local_modification', { tableName });
  }

  // Helper methods to convert between API and SQLite formats
  convertCategoryFromAPI(apiCategory: any): Category {
    return {
      id: apiCategory.id,
      name: apiCategory.name,
      description: apiCategory.description || '',
      color: apiCategory.color || '#FF6B6B',
      icon: apiCategory.icon || 'restaurant',
      order: apiCategory.order || 1,
      active: apiCategory.active !== false,
      created_at: apiCategory.created_at || new Date().toISOString(),
      updated_at: apiCategory.updated_at || new Date().toISOString(),
    };
  }

  convertMenuItemFromAPI(apiItem: any): MenuItem {
    return {
      id: apiItem.id,
      category_id: apiItem.category_id,
      name: apiItem.name,
      description: apiItem.description || '',
      price: apiItem.price || 0,
      cost_price: apiItem.cost_price || 0,
      image_url: apiItem.image_url,
      available: apiItem.available !== false,
      allergens: JSON.stringify(apiItem.allergens || []),
      preparation_time: apiItem.preparation_time || 10,
      order: apiItem.order || 1,
      variants: JSON.stringify(apiItem.variants || [{ name: 'Standard', price: apiItem.price || 0, default: true }]),
      created_at: apiItem.created_at || new Date().toISOString(),
      updated_at: apiItem.updated_at || new Date().toISOString(),
    };
  }

  convertCustomerFromAPI(apiCustomer: any): Customer {
    return {
      id: apiCustomer.id,
      name: apiCustomer.name,
      email: apiCustomer.email,
      phone: apiCustomer.phone,
      address: apiCustomer.address ? JSON.stringify(apiCustomer.address) : undefined,
      customer_type: apiCustomer.type || apiCustomer.customer_type || 'regular',
      loyalty_points: apiCustomer.loyalty_points || 0,
      total_orders: apiCustomer.total_orders || 0,
      total_spent: apiCustomer.total_spent || 0,
      preferences: apiCustomer.preferences ? JSON.stringify(apiCustomer.preferences) : undefined,
      notes: apiCustomer.notes,
      created_at: apiCustomer.created_at || new Date().toISOString(),
      updated_at: apiCustomer.updated_at || new Date().toISOString(),
    };
  }

  // Helper methods to parse JSON fields
  parseAllergens(allergensJson: string): string[] {
    try {
      return JSON.parse(allergensJson);
    } catch {
      return [];
    }
  }

  parseVariants(variantsJson: string): any[] {
    try {
      return JSON.parse(variantsJson);
    } catch {
      return [];
    }
  }

  parseAddress(addressJson?: string): any {
    try {
      return addressJson ? JSON.parse(addressJson) : undefined;
    } catch {
      return undefined;
    }
  }

  parsePreferences(preferencesJson?: string): any {
    try {
      return preferencesJson ? JSON.parse(preferencesJson) : { dietary: [], allergies: [], favorite_items: [] };
    } catch {
      return { dietary: [], allergies: [], favorite_items: [] };
    }
  }
}

export default new SQLiteService();
