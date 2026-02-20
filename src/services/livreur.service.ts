import { invoke } from '@tauri-apps/api/tauri';

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
    return await invoke('get_livreurs', { restaurantId, activeOnly });
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
    
    return await invoke('create_livreur', { livreur: newLivreur });
  }

  async updateLivreur(livreur: Livreur): Promise<Livreur> {
    const updated: Livreur = {
      ...livreur,
      updated_at: new Date().toISOString(),
    };
    return await invoke('update_livreur', { livreur: updated });
  }

  async deleteLivreur(id: string): Promise<void> {
    return await invoke('delete_livreur', { id });
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
