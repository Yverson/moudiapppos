import { invoke } from '@tauri-apps/api';

/**
 * Service pour vider les données dans la base SQLite Tauri
 */
export class TauriClearService {
  /**
   * Vider toutes les commandes pour un restaurant
   */
  static async clearOrders(restaurantId: string): Promise<number> {
    try {
      const result = await invoke<number>('clear_orders', { restaurantId });
      return result;
    } catch (error) {
      console.error('[TauriClear] Erreur vidage commandes:', error);
      throw error;
    }
  }

  /**
   * Vider toutes les commandes (tous restaurants)
   */
  static async clearAllOrders(): Promise<number> {
    try {
      const result = await invoke<number>('clear_all_orders');
      return result;
    } catch (error) {
      console.error('[TauriClear] Erreur vidage toutes commandes:', error);
      throw error;
    }
  }

  /**
   * Vider toutes les données de toutes les tables
   */
  static async clearAllData(): Promise<{ [key: string]: number }> {
    const tables = [
      'categories', 'menu_items', 'customers', 'livreurs', 'staff',
      'orders', 'sync_queue', 'cash_sessions', 'payments', 
      'cash_movements', 'payment_methods', 'sync_status'
    ];

    const results: { [key: string]: number } = {};

    for (const table of tables) {
      try {
        const result = await invoke<number>(`clear_${table}`);
        results[table] = result;
        console.log(`[TauriClear] Table ${table} vidée: ${result} enregistrements`);
      } catch (error) {
        console.error(`[TauriClear] Erreur vidage table ${table}:`, error);
        results[table] = 0;
      }
    }

    return results;
  }
}
