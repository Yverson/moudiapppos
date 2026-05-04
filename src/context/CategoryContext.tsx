import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useCategories } from '../hooks/useDatabase';
import sqliteService, { Category } from '../services/sqlite.service';
import syncService from '../services/sync.service';
import bidirectionalSync from '../services/bidirectional-sync.service';
import { getActiveRestaurantId } from '../services/restaurant-config';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  createCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<Category[]>;
  getCategoryById: (id: string) => Category | undefined;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { categories, loading, refresh: refreshCategories, isConnected, error: connectionError } = useCategories();
  const [error, setError] = useState<string | null>(null);
  
  // Helper pour mettre à jour l'état local pendant les opérations
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  // Auto-sync au chargement
  React.useEffect(() => {
    const autoSync = async () => {
      try {
        await syncService.syncAll({ categories: true, menuItems: false, customers: false, livreurs: false });
        await refreshCategories();
      } catch (err) {
        console.warn('[CategoryContext] Auto-sync échouée:', err);
      }
    };
    autoSync();
  }, []);

  React.useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    } else {
      setError(null);
    }
  }, [connectionError]);

  const createCategory = useCallback(async (data: Partial<Category>) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      const restaurantId = getActiveRestaurantId();
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: data.name || 'Nouvelle catégorie',
        description: data.description || '',
        color: data.color || '#CCCCCC',
        icon: data.icon || 'category',
        order: data.order || categories.length + 1,
        active: data.active !== undefined ? data.active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      };
      
      // Sauvegarder en local
      const savedCategory = await sqliteService.syncCategories([newCategory]);
      
      // Synchroniser vers le cloud (ou mettre en queue si hors ligne)
      await bidirectionalSync.pushMutation({
        action: 'CREATE',
        entityType: 'category',
        entityId: newCategory.id,
        data: {
          restaurantId,
          ...newCategory
        }
      });
      
      await refreshCategories();
      return savedCategory[0];
    } catch (err) {
      setError('Impossible de créer la catégorie dans SQLite.');
      throw err;
    }
  }, [categories, isConnected, refreshCategories]);

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      const restaurantId = getActiveRestaurantId();
      const existingCategory = categories.find(cat => cat.id === id);
      if (!existingCategory) {
        throw new Error('Catégorie introuvable');
      }
      const updatedCategory: Category = {
        ...existingCategory,
        ...data,
        updated_at: new Date().toISOString(),
      };
      
      // Sauvegarder en local
      const savedCategory = await sqliteService.syncCategories([updatedCategory]);
      
      // Synchroniser vers le cloud (ou mettre en queue si hors ligne)
      await bidirectionalSync.pushMutation({
        action: 'UPDATE',
        entityType: 'category',
        entityId: id,
        data: {
          restaurantId,
          ...updatedCategory
        }
      });
      
      await refreshCategories();
      return savedCategory[0];
    } catch (err) {
      setError('Impossible de mettre à jour la catégorie dans SQLite.');
      throw err;
    }
  }, [categories, isConnected, refreshCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      const restaurantId = getActiveRestaurantId();
      const existingCategory = categories.find(cat => cat.id === id);
      if (!existingCategory) {
        throw new Error('Catégorie introuvable');
      }
      
      const updatedCategory: Category = {
        ...existingCategory,
        active: false,
        updated_at: new Date().toISOString(),
      };
      
      // Sauvegarder en local (marquer comme inactive)
      await sqliteService.syncCategories([updatedCategory]);
      
      // Synchroniser vers le cloud (ou mettre en queue si hors ligne)
      await bidirectionalSync.pushMutation({
        action: 'DELETE',
        entityType: 'category',
        entityId: id,
        data: {
          restaurantId
        }
      });
      
      await refreshCategories();
    } catch (err) {
      setError('Impossible de supprimer la catégorie dans SQLite.');
      throw err;
    }
  }, [isConnected, categories, refreshCategories]);

  const reorderCategories = useCallback(async (categoryIds: string[]) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      const reorderedCategories = categoryIds.map((id, index) => {
        const category = categories.find(cat => cat.id === id);
        if (!category) throw new Error(`Catégorie ${id} introuvable`);
        return { ...category, order: index + 1, updated_at: new Date().toISOString() };
      });
      const savedCategories = await sqliteService.syncCategories(reorderedCategories);
      await refreshCategories();
      return savedCategories;
    } catch (err) {
      setError('Impossible de réordonner les catégories dans SQLite.');
      throw err;
    }
  }, [categories, isConnected, refreshCategories]);

  const getCategoryById = useCallback((id: string) => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  // Mise à jour automatique des catégories locales
  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const value: CategoryContextType = {
    categories: localCategories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getCategoryById,
    refreshCategories,
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory(): CategoryContextType {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within CategoryProvider');
  }
  return context;
}
