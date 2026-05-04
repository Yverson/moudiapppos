import sqliteService from "./sqlite.service";
import bidirectionalSync from "./bidirectional-sync.service";

// Types
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

export interface CreateCategoryRequest {
  name: string;
  description: string;
  color: string;
  icon: string;
  order?: number;
}

// Service
class CategoryService {
  async getCategories(): Promise<Category[]> {
    try {
      return await sqliteService.getCategories();
    } catch (error) {
      console.error("Impossible de charger les catégories depuis la base de données:", error);
      // Initialize with default categories if database is empty
      return this.initializeDefaultCategories();
    }
  }

  async getCategory(id: string): Promise<Category | null> {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.id === id) || null;
  }

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const categories = await this.getCategories();
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      order: data.order || categories.length + 1,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await sqliteService.syncCategories([newCategory]);
    bidirectionalSync.pushMutation({ action: 'CREATE', entityType: 'category', entityId: newCategory.id, data: newCategory });
    return result[0];
  }

  async updateCategory(
    id: string,
    data: Partial<Category>,
  ): Promise<Category> {
    const category = await this.getCategory(id);

    if (!category) {
      throw new Error("Catégorie introuvable");
    }

    const updated: Category = {
      ...category,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const result = await sqliteService.syncCategories([updated]);
    bidirectionalSync.pushMutation({ action: 'UPDATE', entityType: 'category', entityId: id, data: updated });
    return result[0];
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.getCategory(id);
    if (category) {
      await this.updateCategory(id, { active: false });
      bidirectionalSync.pushMutation({ action: 'DELETE', entityType: 'category', entityId: id, data: { id } });
    }
  }

  async reorderCategories(categoryIds: string[]): Promise<Category[]> {
    const categories = await this.getCategories();
    const reordered = categoryIds.map((id, index) => {
      const category = categories.find((cat) => cat.id === id);
      if (!category) throw new Error(`Catégorie ${id} introuvable`);
      return {
        ...category,
        order: index + 1,
        updated_at: new Date().toISOString(),
      };
    });

    return await sqliteService.syncCategories(reordered);
  }

  private async initializeDefaultCategories(): Promise<Category[]> {
    const defaultCategories: Category[] = [
      {
        id: "cat-default-1",
        name: "Entrées",
        description: "Plats d'entrée et apéritifs",
        color: "#FF6B6B",
        icon: "restaurant",
        order: 1,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cat-default-2",
        name: "Plats Principaux",
        description: "Plats chauds principaux",
        color: "#4ECDC4",
        icon: "dinner_dining",
        order: 2,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cat-default-3",
        name: "Desserts",
        description: "Desserts et sucreries",
        color: "#FFD93D",
        icon: "cake",
        order: 3,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cat-default-4",
        name: "Boissons",
        description: "Boissons chaudes et froides",
        color: "#6BCF7F",
        icon: "local_cafe",
        order: 4,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Save defaults to database
    try {
      await sqliteService.syncCategories(defaultCategories);
    } catch (error) {
      console.error("Impossible d'initialiser les catégories par défaut:", error);
    }

    return defaultCategories;
  }
}

export default new CategoryService();
