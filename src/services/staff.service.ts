/**
 * Service de gestion des utilisateurs locaux (staff/employés du restaurant).
 * Gère les opérations CRUD avec synchronisation bidirectionnelle.
 */

import { invokeOrFallback } from './platform';
import {
  web_get_all_staff,
  web_get_staff_by_id,
  web_create_staff,
  web_update_staff,
  web_delete_staff,
  StaffMember,
} from './db-web';
import bidirectionalSync from './bidirectional-sync.service';

export interface StaffPermissions {
  // POS Operations
  processRefunds: boolean;
  applyDiscounts: boolean;
  voidOrders: boolean;
  
  // Inventory Control
  manageStockLevels: boolean;
  createPurchaseOrders: boolean;
  transferStock: boolean;
  
  // Reports & Analytics
  viewSalesReports: boolean;
  viewStaffLogs: boolean;
  
  // System Settings
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
    processRefunds: true,
    applyDiscounts: true,
    voidOrders: true,
    manageStockLevels: true,
    createPurchaseOrders: true,
    transferStock: true,
    viewSalesReports: true,
    viewStaffLogs: true,
    manageUsers: true,
    editMenuItems: true,
  },
  MANAGER: {
    processRefunds: true,
    applyDiscounts: true,
    voidOrders: true,
    manageStockLevels: true,
    createPurchaseOrders: true,
    transferStock: true,
    viewSalesReports: true,
    viewStaffLogs: true,
    manageUsers: false,
    editMenuItems: true,
  },
  CASHIER: {
    processRefunds: true,
    applyDiscounts: true,
    voidOrders: false,
    manageStockLevels: false,
    createPurchaseOrders: false,
    transferStock: false,
    viewSalesReports: false,
    viewStaffLogs: false,
    manageUsers: false,
    editMenuItems: false,
  },
  WAITER: {
    processRefunds: false,
    applyDiscounts: false,
    voidOrders: false,
    manageStockLevels: false,
    createPurchaseOrders: false,
    transferStock: false,
    viewSalesReports: false,
    viewStaffLogs: false,
    manageUsers: false,
    editMenuItems: false,
  },
  KITCHEN: {
    processRefunds: false,
    applyDiscounts: false,
    voidOrders: false,
    manageStockLevels: false,
    createPurchaseOrders: false,
    transferStock: false,
    viewSalesReports: false,
    viewStaffLogs: false,
    manageUsers: false,
    editMenuItems: false,
  },
};

class StaffService {
  /**
   * Synchroniser les données du staff depuis le cloud
   */
  async syncFromCloud(restaurantId: string): Promise<void> {
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
      const token = localStorage.getItem('authToken');
      
      console.log(
        '═══ [StaffService] ═══\n',
        'Action: SYNC_FROM_CLOUD - Début',
        '\nURL:', `${baseURL}/api/restaurants/${restaurantId}/staff`,
        '\nToken présent:', !!token
      );

      const response = await fetch(`${baseURL}/api/restaurants/${restaurantId}/staff`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StaffService] Erreur API:', response.status, errorText);
        throw new Error(`Erreur API: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[StaffService] Réponse API:', result);
      
      const cloudStaff = result.data || [];
      console.log('[StaffService] Nombre de membres reçus du cloud:', cloudStaff.length);

      // Mettre à jour la base de données locale avec les données du cloud
      for (const cloudMember of cloudStaff) {
        console.log('[StaffService] Traitement membre:', cloudMember);
        
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

        console.log('[StaffService] Membre local créé:', localMember);

        // Vérifier si le membre existe déjà
        const existing = await invokeOrFallback<StaffMember | null>(
          'get_staff_by_id',
          { id: localMember.id },
          () => web_get_staff_by_id(localMember.id)
        );

        if (existing) {
          console.log('[StaffService] Mise à jour du membre existant:', localMember.id);
          await invokeOrFallback(
            'update_staff',
            { staff: localMember },
            () => web_update_staff(localMember)
          );
        } else {
          console.log('[StaffService] Création du nouveau membre:', localMember.id);
          await invokeOrFallback(
            'create_staff',
            { staff: localMember },
            () => web_create_staff(localMember)
          );
        }
      }

      console.log(
        '═══ [StaffService] ═══\n',
        'Action: SYNC_FROM_CLOUD - Terminé',
        '\nNombre de membres synchronisés:', cloudStaff.length
      );
    } catch (error) {
      console.error('[StaffService] Erreur lors de la synchronisation depuis le cloud:', error);
      throw error; // Propager l'erreur pour le débogage
    }
  }

  /**
   * Récupérer tous les membres du staff
   */
  async getAllStaff(restaurantId: string): Promise<StaffMemberWithPermissions[]> {
    try {
      // Synchroniser depuis le cloud AVANT de récupérer les données locales
      try {
        await this.syncFromCloud(restaurantId);
      } catch (syncError) {
        console.warn('[StaffService] Sync cloud échouée, utilisation des données locales:', syncError);
      }

      const staff = await invokeOrFallback<StaffMember[]>(
        'get_all_staff',
        { restaurantId: restaurantId },
        () => web_get_all_staff(restaurantId)
      );

      return staff.map(member => ({
        ...member,
        permissions: this.parsePermissions(member.permissions),
      }));
    } catch (error) {
      console.error('[StaffService] Erreur lors de la récupération du staff:', error);
      throw error;
    }
  }

  /**
   * Récupérer un membre du staff par ID
   */
  async getStaffById(id: string): Promise<StaffMemberWithPermissions | null> {
    try {
      const member = await invokeOrFallback<StaffMember | null>(
        'get_staff_by_id',
        { id },
        () => web_get_staff_by_id(id)
      );

      if (!member) return null;

      return {
        ...member,
        permissions: this.parsePermissions(member.permissions),
      };
    } catch (error) {
      console.error('[StaffService] Erreur lors de la récupération du membre:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau membre du staff
   */
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

      // Fusionner les permissions par défaut avec les permissions personnalisées
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

      await invokeOrFallback(
        'create_staff',
        { staff: newMember },
        () => web_create_staff(newMember)
      );

      console.log(
        '═══ [StaffService] ═══\n',
        'Action: CREATE',
        '\nMembre:', `${data.firstName} ${data.lastName}`,
        '\nRôle:', data.role
      );

      // Synchronisation bidirectionnelle
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

      return {
        ...newMember,
        permissions: finalPermissions,
      };
    } catch (error) {
      console.error('[StaffService] Erreur lors de la création du membre:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un membre du staff
   */
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
      if (!existing) {
      throw new Error(`Membre du personnel ${id} introuvable`);
      }

      const now = new Date().toISOString();

      // Fusionner les permissions
      let finalPermissions = existing.permissions;
      if (data.permissions) {
        finalPermissions = { ...finalPermissions, ...data.permissions };
      } else if (data.role && data.role !== existing.role) {
        // Si le rôle change, réinitialiser les permissions par défaut
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

      await invokeOrFallback(
        'update_staff',
        { staff: updatedMember },
        () => web_update_staff(updatedMember)
      );

      console.log(
        '═══ [StaffService] ═══\n',
        'Action: UPDATE',
        '\nMembre:', `${updatedMember.first_name} ${updatedMember.last_name}`,
        '\nID:', id
      );

      // Synchronisation bidirectionnelle
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

      return {
        ...updatedMember,
        permissions: finalPermissions,
      };
    } catch (error) {
      console.error('[StaffService] Erreur lors de la mise à jour du membre:', error);
      throw error;
    }
  }

  /**
   * Désactiver un membre du staff (soft delete)
   */
  async deleteStaff(id: string): Promise<void> {
    try {
      await invokeOrFallback(
        'delete_staff',
        { id },
        () => web_delete_staff(id)
      );

      console.log(
        '═══ [StaffService] ═══\n',
        'Action: DELETE',
        '\nID:', id
      );

      // Synchronisation bidirectionnelle
      await bidirectionalSync.pushMutation({
        action: 'DELETE',
        entityType: 'staff',
        entityId: id,
        data: {
          EstActif: false,
        },
      });
    } catch (error) {
      console.error('[StaffService] Erreur lors de la suppression du membre:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut en ligne d'un membre
   */
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

      await invokeOrFallback(
        'update_staff',
        { staff: updatedMember },
        () => web_update_staff(updatedMember)
      );
    } catch (error) {
      console.error('[StaffService] Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  /**
   * Parser les permissions depuis JSON
   */
  private parsePermissions(permissionsJson: string): StaffPermissions {
    try {
      return JSON.parse(permissionsJson);
    } catch {
      // Retourner les permissions par défaut pour WAITER en cas d'erreur
      return DEFAULT_PERMISSIONS.WAITER;
    }
  }
}

export default new StaffService();
