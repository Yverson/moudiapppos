import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import menuService, { MenuItem, CreateMenuItemRequest } from '../services/menu.service';

export interface MenuContextType {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  fetchMenuItems: (categoryId?: string) => Promise<void>;
  createMenuItem: (data: CreateMenuItemRequest) => Promise<MenuItem>;
  updateMenuItem: (id: string, data: Partial<CreateMenuItemRequest>) => Promise<MenuItem>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleMenuItemAvailability: (id: string) => Promise<MenuItem>;
  reorderMenuItems: (categoryId: string, itemIds: string[]) => Promise<MenuItem[]>;
  getMenuItem: (id: string) => Promise<MenuItem | null>;
  getMenuItemsByCategory: (categoryId: string) => MenuItem[];
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuItems = useCallback(async (categoryId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await menuService.getMenuItems(categoryId);
      setMenuItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch menu items');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMenuItem = useCallback(async (data: CreateMenuItemRequest): Promise<MenuItem> => {
    try {
      setError(null);
      const newItem = await menuService.createMenuItem(data);
      setMenuItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create menu item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateMenuItem = useCallback(async (id: string, data: Partial<CreateMenuItemRequest>): Promise<MenuItem> => {
    try {
      setError(null);
      const updatedItem = await menuService.updateMenuItem(id, data);
      setMenuItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update menu item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteMenuItem = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await menuService.deleteMenuItem(id);
      setMenuItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete menu item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const toggleMenuItemAvailability = useCallback(async (id: string): Promise<MenuItem> => {
    try {
      setError(null);
      const updatedItem = await menuService.toggleMenuItemAvailability(id);
      setMenuItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle menu item availability';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const reorderMenuItems = useCallback(async (categoryId: string, itemIds: string[]): Promise<MenuItem[]> => {
    try {
      setError(null);
      const reordered = await menuService.reorderMenuItems(categoryId, itemIds);
      
      // Update the items in the specific category
      setMenuItems(prev => {
        const otherItems = prev.filter(item => item.category_id !== categoryId);
        return [...otherItems, ...reordered];
      });
      
      return reordered;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder menu items';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getMenuItem = useCallback(async (id: string): Promise<MenuItem | null> => {
    try {
      setError(null);
      return await menuService.getMenuItem(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get menu item');
      return null;
    }
  }, []);

  const getMenuItemsByCategory = useCallback((categoryId: string): MenuItem[] => {
    return menuItems.filter(item => item.category_id === categoryId);
  }, [menuItems]);

  // Load all menu items on mount
  React.useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const value: MenuContextType = {
    menuItems,
    loading,
    error,
    fetchMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    reorderMenuItems,
    getMenuItem,
    getMenuItemsByCategory,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextType {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within MenuProvider');
  }
  return context;
}
