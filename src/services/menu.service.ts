import sqliteService from "./sqlite.service";
import type { MenuItem as SQLiteMenuItem } from "./sqlite.service";

// Types
export interface MenuItemVariant {
  name: string;
  price: number;
  default: boolean;
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
  allergens: string[];
  preparation_time: number;
  order: number;
  variants: MenuItemVariant[];
  created_at: string;
  updated_at: string;
}

export interface CreateMenuItemRequest {
  category_id: string;
  name: string;
  description: string;
  price: number;
  cost_price?: number;
  image_url?: string;
  available?: boolean;
  allergens?: string[];
  preparation_time?: number;
  order?: number;
  variants?: MenuItemVariant[];
}

// Service
class MenuService {
  async getMenuItems(categoryId?: string): Promise<MenuItem[]> {
    try {
      const sqliteItems = await sqliteService.getMenuItems(categoryId);
      return sqliteItems
        .map((item) => this.convertFromSQLite(item))
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error("Failed to load menu items from database:", error);
      // Initialize with default menu items if database is empty
      return this.initializeDefaultMenuItems();
    }
  }

  async getMenuItem(id: string): Promise<MenuItem | null> {
    const items = await this.getMenuItems();
    return items.find((item) => item.id === id) || null;
  }

  async createMenuItem(data: CreateMenuItemRequest): Promise<MenuItem> {
    const items = await this.getMenuItems();
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      category_id: data.category_id,
      name: data.name,
      description: data.description,
      price: data.price,
      cost_price: data.cost_price || 0,
      image_url: data.image_url,
      available: data.available !== false,
      allergens: data.allergens || [],
      preparation_time: data.preparation_time || 10,
      order: data.order || items.length + 1,
      variants: data.variants || [
        {
          name: "Standard",
          price: data.price,
          default: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sqliteItem = this.convertToSQLite(newItem);
    const result = await sqliteService.syncMenuItems([sqliteItem]);
    return this.convertFromSQLite(result[0]);
  }

  async updateMenuItem(
    id: string,
    data: Partial<CreateMenuItemRequest>,
  ): Promise<MenuItem> {
    const item = await this.getMenuItem(id);

    if (!item) {
      throw new Error("Menu item not found");
    }

    const updated: MenuItem = {
      ...item,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const sqliteItem = this.convertToSQLite(updated);
    const result = await sqliteService.syncMenuItems([sqliteItem]);
    return this.convertFromSQLite(result[0]);
  }

  async deleteMenuItem(id: string): Promise<void> {
    const item = await this.getMenuItem(id);
    if (item) {
      // Instead of deleting, mark as unavailable
      await this.updateMenuItem(id, { available: false });
    }
  }

  async toggleMenuItemAvailability(id: string): Promise<MenuItem> {
    const item = await this.getMenuItem(id);
    if (!item) {
      throw new Error("Menu item not found");
    }

    return this.updateMenuItem(id, { available: !item.available });
  }

  async reorderMenuItems(
    categoryId: string,
    itemIds: string[],
  ): Promise<MenuItem[]> {
    const items = await this.getMenuItems(categoryId);
    const reordered = itemIds.map((id, index) => {
      const item = items.find((item) => item.id === id);
      if (!item) throw new Error(`Menu item ${id} not found`);
      return {
        ...item,
        order: index + 1,
        updated_at: new Date().toISOString(),
      };
    });

    // Get all items and update only the ones in this category
    const allItems = await this.getMenuItems();
    const otherItems = allItems.filter(
      (item) => item.category_id !== categoryId,
    );
    const finalItems = [...otherItems, ...reordered];

    const sqliteItems = finalItems.map((item) => this.convertToSQLite(item));
    const result = await sqliteService.syncMenuItems(sqliteItems);
    return result
      .slice(-reordered.length)
      .map((item) => this.convertFromSQLite(item));
  }

  private convertToSQLite(item: MenuItem): SQLiteMenuItem {
    return {
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.cost_price,
      image_url: item.image_url,
      available: item.available,
      allergens: JSON.stringify(item.allergens),
      preparation_time: item.preparation_time,
      order: item.order,
      variants: JSON.stringify(item.variants),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  private convertFromSQLite(item: SQLiteMenuItem): MenuItem {
    return {
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.cost_price,
      image_url: item.image_url,
      available: item.available,
      allergens: sqliteService.parseAllergens(item.allergens),
      preparation_time: item.preparation_time,
      order: item.order,
      variants: sqliteService.parseVariants(item.variants),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  private async initializeDefaultMenuItems(): Promise<MenuItem[]> {
    const defaultItems: MenuItem[] = [
      {
        id: "item-default-1",
        category_id: "cat-default-1",
        name: "Salade César",
        description: "Laitue fraîche, parmesan, croûtons, sauce césar",
        price: 12.5,
        cost_price: 4.2,
        available: true,
        allergens: ["gluten", "lactose"],
        preparation_time: 10,
        order: 1,
        variants: [
          { name: "Standard", price: 12.5, default: true },
          { name: "Grande portion", price: 16.5, default: false },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "item-default-2",
        category_id: "cat-default-2",
        name: "Steak Frites",
        description: "Steak de bœuf grillé, frites maison, sauce au choix",
        price: 24.0,
        cost_price: 8.5,
        available: true,
        allergens: [],
        preparation_time: 20,
        order: 1,
        variants: [
          { name: "Point", price: 24.0, default: true },
          { name: "À point", price: 24.0, default: false },
          { name: "Bien cuit", price: 24.0, default: false },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "item-default-3",
        category_id: "cat-default-3",
        name: "Tiramisu",
        description: "Dessert italien traditionnel au café et mascarpone",
        price: 8.5,
        cost_price: 2.8,
        available: true,
        allergens: ["lactose", "gluten"],
        preparation_time: 5,
        order: 1,
        variants: [{ name: "Standard", price: 8.5, default: true }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "item-default-4",
        category_id: "cat-default-4",
        name: "Café Expresso",
        description: "Café italien fort et aromatique",
        price: 2.5,
        cost_price: 0.8,
        available: true,
        allergens: [],
        preparation_time: 2,
        order: 1,
        variants: [
          { name: "Simple", price: 2.5, default: true },
          { name: "Double", price: 3.5, default: false },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Save defaults to database
    try {
      const sqliteItems = defaultItems.map((item) =>
        this.convertToSQLite(item),
      );
      await sqliteService.syncMenuItems(sqliteItems);
    } catch (error) {
      console.error("Failed to initialize default menu items:", error);
    }

    return defaultItems;
  }
}

export default new MenuService();
