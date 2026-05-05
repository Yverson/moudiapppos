/**
 * Service de gestion des utilisateurs locaux (staff/employés du restaurant).
 * SQLite via Tauri uniquement.
 */

import { tauriInvoke } from './platform';
import bidirectionalSync from './bidirectional-sync.service';

export interface StaffMember {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: string;
  permissions: string;
  is_active: boolean;
  is_online: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPermissions {
  processRefunds: boolean;
  applyDiscounts: boolean;
  voidOrders: boolean;
  manageStockLevels: boolean;
  createPurchaseOrders: boolean;
  transferStock: boolean;
  viewSalesReports: boolean;
  viewStaffLogs: boolean;
  manageUsers: boolean;
  editMenuItems: boolean;
}

export interface StaffMemberWithPermissions {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: string;
  permissions: StaffPermissions;
  is_active: boolean;
  is_online: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export type StaffRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN';

export const DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  ADMIN: {
    processRefunds: true, applyDiscounts: true, voidOrders: true,
    manageStockLevels: true, createPurchaseOrders: true, transferStock: true,
    viewSalesReports: true, viewStaffLogs: true, manageUsers: true, editMenuItems: true,
  },
  MANAGER: {
    processRefunds: true, applyDiscounts: true, voidOrders: true,
    manageStockLevels: true, createPurchaseOrders: true, transferStock: true,
    viewSalesReports: true, viewStaffLogs: true, manageUsers: false, editMenuItems: true,
  },
  CASHIER: {
    processRefunds: true, applyDiscounts: true, voidOrders: false,
    manageStockLevels: false, createPurchaseOrders: false, transferStock: false,
    viewSalesReports: false, viewStaffLogs: false, manageUsers: false, editMenuItems: false,
  },
  WAITER: {
    processRefunds: false, applyDiscounts: false, voidOrders: false,
    manageStockLevels: false, createPurchaseOrders: false, transferStock: false,
    viewSalesReports: false, viewStaffLogs: false, manageUsers: false, editMenuItems: false,
  },
  KITCHEN: {
    processRefunds: false, applyDiscounts: false, voidOrders: false,
    manageStockLevels: false, createPurchaseOrders: false, transferStock: false,
    viewSalesReports: false, viewStaffLogs: false, manageUsers: false, editMenuItems: false,
  },
};

class StaffService {
  async syncFromCloud(restaurantId: string): Promise<void> {
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'https://glad-oriented-camel.ngrok-free.app';
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${baseURL}/api/restaurants/${restaurantId}/staff`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const result = await response.json();
      const cloudStaff = result.data || [];

      for (const cloudMember of cloudStaff) {
        const localMember: StaffMember = {
          id: cloudMember.id,
          restaurant_id: restaurantId,
          first_name: cloudMember.prenom || cloudMember.first_name || '',
          last_name: cloudMember.nom || cloudMember.last_name || '',
          email: cloudMember.email || '',
          username: cloudMember.username || '',
          role: cloudMember.role || 'WAITER',
          permissions: cloudMember.permissions || JSON.stringify(DEFAULT_PERMISSIONS[cloudMember.role as StaffRole] || DEFAULT_PERMISSIONS.WAITER),
          is_active: cloudMember.estActif ?? cloudMember.est_actif ?? cloudMember.is_active ?? true,
          is_online: false,
          last_login: cloudMember.last_login || null,
          created_at: cloudMember.dateCreation || cloudMember.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const existing = await tauriInvoke<StaffMember | null>('get_staff_by_id', { id: localMember.id });

        if (existing) {
          await tauriInvoke('update_staff', { staff: localMember });
        } else {
          await tauriInvoke('create_staff', { staff: localMember });
        }
      }
    } catch (error) {
      console.error('[StaffService] Erreur lors de la synchronisation depuis le cloud:', error);
      throw error;
    }
  }

  async getAllStaff(restaurantId: string): Promise<StaffMemberWithPermissions[]> {
    try {
      try {
        await this.syncFromCloud(restaurantId);
      } catch (syncError) {
        console.warn('[StaffService] Sync cloud échouée, données locales:', syncError);
      }

      const staff = await tauriInvoke<StaffMember[]>('get_all_staff', { restaurantId });
      return staff.map(member => ({
        ...member,
        permissions: this.parsePermissions(member.permissions),
      }));
    } catch (error) {
      console.error('[StaffService] Erreur récupération staff:', error);
      throw error;
    }
  }

  async getStaffById(id: string): Promise<StaffMemberWithPermissions | null> {
    try {
      const member = await tauriInvoke<StaffMember | null>('get_staff_by_id', { id });
      if (!member) return null;
      return {
        ...member,
        permissions: this.parsePermissions(member.permissions),
      };
    } catch (error) {
      console.error('[StaffService] Erreur récupération membre:', error);
      throw error;
    }
  }

  async createStaff(
    restaurantId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      username: string;
      role: StaffRole;
      permissions?: Partial<StaffPermissions>;
    }
  ): Promise<StaffMemberWithPermissions> {
    try {
      const now = new Date().toISOString();
      const id = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const defaultPerms = DEFAULT_PERMISSIONS[data.role];
      const finalPermissions = { ...defaultPerms, ...data.permissions };

      const newMember: StaffMember = {
        id,
        restaurant_id: restaurantId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        username: data.username,
        role: data.role,
        permissions: JSON.stringify(finalPermissions),
        is_active: true,
        is_online: false,
        last_login: null,
        created_at: now,
        updated_at: now,
      };

      await tauriInvoke('create_staff', { staff: newMember });

      await bidirectionalSync.pushMutation({
        action: 'CREATE',
        entityType: 'staff',
        entityId: id,
        data: {
          RestaurantId: restaurantId,
          Prenom: data.firstName,
          Nom: data.lastName,
          Email: data.email,
          Username: data.username,
          Role: data.role,
          Permissions: JSON.stringify(finalPermissions),
          EstActif: true,
        },
      });

      return { ...newMember, permissions: finalPermissions };
    } catch (error) {
      console.error('[StaffService] Erreur création membre:', error);
      throw error;
    }
  }

  async updateStaff(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      role?: StaffRole;
      permissions?: Partial<StaffPermissions>;
      isActive?: boolean;
    }
  ): Promise<StaffMemberWithPermissions> {
    try {
      const existing = await this.getStaffById(id);
      if (!existing) throw new Error(`Membre ${id} introuvable`);

      const now = new Date().toISOString();

      let finalPermissions = existing.permissions;
      if (data.permissions) {
        finalPermissions = { ...finalPermissions, ...data.permissions };
      } else if (data.role && data.role !== existing.role) {
        finalPermissions = DEFAULT_PERMISSIONS[data.role];
      }

      const updatedMember: StaffMember = {
        ...existing,
        first_name: data.firstName ?? existing.first_name,
        last_name: data.lastName ?? existing.last_name,
        email: data.email ?? existing.email,
        username: data.username ?? existing.username,
        role: data.role ?? existing.role,
        permissions: JSON.stringify(finalPermissions),
        is_active: data.isActive ?? existing.is_active,
        updated_at: now,
      };

      await tauriInvoke('update_staff', { staff: updatedMember });

      await bidirectionalSync.pushMutation({
        action: 'UPDATE',
        entityType: 'staff',
        entityId: id,
        data: {
          Prenom: updatedMember.first_name,
          Nom: updatedMember.last_name,
          Email: updatedMember.email,
          Username: updatedMember.username,
          Role: updatedMember.role,
          Permissions: JSON.stringify(finalPermissions),
          EstActif: updatedMember.is_active,
        },
      });

      return { ...updatedMember, permissions: finalPermissions };
    } catch (error) {
      console.error('[StaffService] Erreur mise à jour membre:', error);
      throw error;
    }
  }

  async deleteStaff(id: string): Promise<void> {
    try {
      await tauriInvoke('delete_staff', { id });

      await bidirectionalSync.pushMutation({
        action: 'DELETE',
        entityType: 'staff',
        entityId: id,
        data: { EstActif: false },
      });
    } catch (error) {
      console.error('[StaffService] Erreur suppression membre:', error);
      throw error;
    }
  }

  async updateOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    try {
      const existing = await this.getStaffById(id);
      if (!existing) return;

      const now = new Date().toISOString();
      const updatedMember: StaffMember = {
        id: existing.id,
        restaurant_id: existing.restaurant_id,
        first_name: existing.first_name,
        last_name: existing.last_name,
        email: existing.email,
        username: existing.username,
        role: existing.role,
        permissions: JSON.stringify(existing.permissions),
        is_active: existing.is_active,
        is_online: isOnline,
        last_login: isOnline ? now : existing.last_login,
        created_at: existing.created_at,
        updated_at: now,
      };

      await tauriInvoke('update_staff', { staff: updatedMember });
    } catch (error) {
      console.error('[StaffService] Erreur mise à jour statut:', error);
      throw error;
    }
  }

  private parsePermissions(permissionsJson: string): StaffPermissions {
    try {
      return JSON.parse(permissionsJson);
    } catch {
      return DEFAULT_PERMISSIONS.WAITER;
    }
  }
}

export default new StaffService();
