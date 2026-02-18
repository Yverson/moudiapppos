import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useCategories } from '../hooks/useDatabase';
import sqliteService, { Category } from '../services/sqlite.service';

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
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: data.name || 'New Category',
        description: data.description || '',
        color: data.color || '#CCCCCC',
        icon: data.icon || 'category',
        order: data.order || categories.length + 1,
        active: data.active !== undefined ? data.active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      };
      const savedCategory = await sqliteService.syncCategories([newCategory]);
      await refreshCategories();
      return savedCategory[0];
    } catch (err) {
      setError('Failed to create category in SQLite.');
      throw err;
    }
  }, [categories, isConnected, refreshCategories]);

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      const existingCategory = categories.find(cat => cat.id === id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }
      const updatedCategory: Category = {
        ...existingCategory,
        ...data,
        updated_at: new Date().toISOString(),
      };
      const savedCategory = await sqliteService.syncCategories([updatedCategory]);
      await refreshCategories();
      return savedCategory[0];
    } catch (err) {
      setError('Failed to update category in SQLite.');
      throw err;
    }
  }, [categories, isConnected, refreshCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      // Pour l'instant, on simule la suppression localement
      // TODO: Implémenter la commande delete_category dans Rust
      setLocalCategories((prev: Category[]) => prev.filter((cat: Category) => cat.id !== id));
    } catch (err) {
      setError('Failed to delete category from SQLite.');
      throw err;
    }
  }, [isConnected, setLocalCategories]);

  const reorderCategories = useCallback(async (categoryIds: string[]) => {
    if (!isConnected) {
      setError('Base de données non connectée');
      throw new Error('Base de données non connectée');
    }

    try {
      const reorderedCategories = categoryIds.map((id, index) => {
        const category = categories.find(cat => cat.id === id);
        if (!category) throw new Error(`Category ${id} not found`);
        return { ...category, order: index + 1, updated_at: new Date().toISOString() };
      });
      const savedCategories = await sqliteService.syncCategories(reorderedCategories);
      await refreshCategories();
      return savedCategories;
    } catch (err) {
      setError('Failed to reorder categories in SQLite.');
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
