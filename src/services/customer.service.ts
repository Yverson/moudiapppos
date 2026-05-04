import sqliteService from "./sqlite.service";
import type { Customer as SQLiteCustomer } from "./sqlite.service";
import bidirectionalSync from "./bidirectional-sync.service";

// Types
export interface CustomerAddress {
  street: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface CustomerPreferences {
  dietary: string[];
  allergies: string[];
  favorite_items: string[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: CustomerAddress;
  type: "regular" | "vip" | "corporate";
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  preferences?: CustomerPreferences;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  address?: CustomerAddress;
  type?: "regular" | "vip" | "corporate";
  preferences?: CustomerPreferences;
  notes?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  loyalty_points?: number;
  total_orders?: number;
  total_spent?: number;
}

// Service
class CustomerService {
  async getCustomers(): Promise<Customer[]> {
    try {
      const sqliteCustomers = await sqliteService.getCustomers();
      return sqliteCustomers.map((customer) =>
        this.convertFromSQLite(customer),
      );
    } catch (error) {
      console.error("Impossible de charger les clients depuis la base de données:", error);
      // Initialize with default customers if database is empty
      return this.initializeDefaultCustomers();
    }
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    return customers.find((customer) => customer.id === id) || null;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const customers = await this.getCustomers();
    const lowerQuery = query.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(lowerQuery) ||
        customer.email.toLowerCase().includes(lowerQuery) ||
        customer.phone.includes(query),
    );
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    const customers = await this.getCustomers();

    // Check for existing email
    const existing = customers.find((c) => c.email === data.email);
    if (existing) {
      throw new Error("Un client avec cet email existe déjà");
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      type: data.type || "regular",
      loyalty_points: 0,
      total_orders: 0,
      total_spent: 0,
      preferences: data.preferences || {
        dietary: [],
        allergies: [],
        favorite_items: [],
      },
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sqliteCustomer = this.convertToSQLite(newCustomer);
    const result = await sqliteService.syncCustomers([sqliteCustomer]);
    bidirectionalSync.pushMutation({ action: 'CREATE', entityType: 'customer', entityId: newCustomer.id, data: newCustomer });
    return this.convertFromSQLite(result[0]);
  }

  async updateCustomer(
    id: string,
    data: UpdateCustomerRequest,
  ): Promise<Customer> {
    const customer = await this.getCustomer(id);

    if (!customer) {
      throw new Error("Client introuvable");
    }

    const updated: Customer = {
      ...customer,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const sqliteCustomer = this.convertToSQLite(updated);
    const result = await sqliteService.syncCustomers([sqliteCustomer]);
    bidirectionalSync.pushMutation({ action: 'UPDATE', entityType: 'customer', entityId: id, data: updated });
    return this.convertFromSQLite(result[0]);
  }

  async deleteCustomer(id: string): Promise<void> {
    const customer = await this.getCustomer(id);
    if (customer) {
      bidirectionalSync.pushMutation({ action: 'DELETE', entityType: 'customer', entityId: id, data: { id } });
    }
  }

  async addLoyaltyPoints(id: string, points: number): Promise<Customer> {
    const customer = await this.getCustomer(id);
    if (!customer) {
      throw new Error("Client introuvable");
    }

    return this.updateCustomer(id, {
      loyalty_points: customer.loyalty_points + points,
    });
  }

  async recordOrder(id: string, amount: number): Promise<Customer> {
    const customer = await this.getCustomer(id);
    if (!customer) {
      throw new Error("Client introuvable");
    }

    // Add 1 point per 10€ spent
    const pointsEarned = Math.floor(amount / 10);

    return this.updateCustomer(id, {
      total_orders: customer.total_orders + 1,
      total_spent: customer.total_spent + amount,
      loyalty_points: customer.loyalty_points + pointsEarned,
    });
  }

  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    const customers = await this.getCustomers();
    return customers
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, limit);
  }

  async getVipCustomers(): Promise<Customer[]> {
    const customers = await this.getCustomers();
    return customers.filter(
      (customer) =>
        customer.type === "vip" ||
        customer.total_spent > 500 ||
        customer.loyalty_points > 100,
    );
  }

  private convertToSQLite(customer: Customer): SQLiteCustomer {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address ? JSON.stringify(customer.address) : undefined,
      customer_type: customer.type,
      loyalty_points: customer.loyalty_points,
      total_orders: customer.total_orders,
      total_spent: customer.total_spent,
      preferences: customer.preferences
        ? JSON.stringify(customer.preferences)
        : undefined,
      notes: customer.notes,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  }

  private convertFromSQLite(customer: SQLiteCustomer): Customer {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: sqliteService.parseAddress(customer.address),
      type:
        (customer.customer_type as "regular" | "vip" | "corporate") ||
        "regular",
      loyalty_points: customer.loyalty_points,
      total_orders: customer.total_orders,
      total_spent: customer.total_spent,
      preferences: sqliteService.parsePreferences(customer.preferences),
      notes: customer.notes,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  }

  private async initializeDefaultCustomers(): Promise<Customer[]> {
    const defaultCustomers: Customer[] = [
      {
        id: "cust-default-1",
        name: "Jean Dupont",
        email: "jean.dupont@email.com",
        phone: "+33612345678",
        address: {
          street: "123 Rue de la République",
          city: "Paris",
          postal_code: "75001",
          country: "France",
        },
        type: "regular",
        loyalty_points: 250,
        total_orders: 15,
        total_spent: 450.0,
        preferences: {
          dietary: ["vegetarian"],
          allergies: ["nuts"],
          favorite_items: ["item-default-1", "item-default-3"],
        },
        notes: "Client fidèle, aime les plats végétariens",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cust-default-2",
        name: "Marie Martin",
        email: "marie.martin@email.com",
        phone: "+33687654321",
        type: "vip",
        loyalty_points: 850,
        total_orders: 42,
        total_spent: 1250.0,
        preferences: {
          dietary: [],
          allergies: ["gluten"],
          favorite_items: ["item-default-2"],
        },
        notes: "Client VIP, allergie au gluten",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Save defaults to database
    try {
      const sqliteCustomers = defaultCustomers.map((customer) =>
        this.convertToSQLite(customer),
      );
      await sqliteService.syncCustomers(sqliteCustomers);
    } catch (error) {
      console.error("Impossible d'initialiser les clients par défaut:", error);
    }

    return defaultCustomers;
  }
}

export default new CustomerService();
