import { invokeOrFallback } from './platform';
import {
  web_get_livreurs,
  web_create_livreur,
  web_update_livreur,
  web_delete_livreur,
} from './db-web';
import bidirectionalSync from './bidirectional-sync.service';

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

class LivreurService {
  async getLivreurs(restaurantId: string, activeOnly = false): Promise<Livreur[]> {
    return await invokeOrFallback('get_livreurs', { restaurantId, activeOnly }, () => web_get_livreurs(restaurantId, activeOnly));
  }

  async createLivreur(livreur: Omit<Livreur, 'id' | 'created_at' | 'updated_at'>): Promise<Livreur> {
    const now = new Date().toISOString();
    const id = `livreur-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newLivreur: Livreur = {
      ...livreur,
      id,
      created_at: now,
      updated_at: now,
    };
    
    const result = await invokeOrFallback('create_livreur', { livreur: newLivreur }, () => web_create_livreur(newLivreur));
    bidirectionalSync.pushMutation({ action: 'CREATE', entityType: 'livreur', entityId: newLivreur.id, data: newLivreur });
    return result;
  }

  async updateLivreur(livreur: Livreur): Promise<Livreur> {
    const updated: Livreur = {
      ...livreur,
      updated_at: new Date().toISOString(),
    };
    const result = await invokeOrFallback('update_livreur', { livreur: updated }, () => web_update_livreur(updated));
    bidirectionalSync.pushMutation({ action: 'UPDATE', entityType: 'livreur', entityId: livreur.id, data: updated });
    return result;
  }

  async deleteLivreur(id: string): Promise<void> {
    await invokeOrFallback('delete_livreur', { id }, () => web_delete_livreur(id));
    bidirectionalSync.pushMutation({ action: 'DELETE', entityType: 'livreur', entityId: id, data: { id } });
  }

  createLivreurObject(data: {
    restaurantId: string;
    nom: string;
    prenom: string;
    telephone?: string;
    email?: string;
  }): Omit<Livreur, 'id' | 'created_at' | 'updated_at'> {
    return {
      restaurant_id: data.restaurantId,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      email: data.email,
      active: true,
    };
  }

  getFullName(livreur: Livreur): string {
    return `${livreur.prenom} ${livreur.nom}`;
  }
}

export default new LivreurService();
