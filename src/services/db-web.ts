/**
 * Implémentation IndexedDB pour le mode web (navigateur).
 * Reproduit les mêmes opérations que le backend Rust/SQLite de Tauri.
 * Utilise la lib `idb` pour une API Promise-based propre.
 */

import { openDB, IDBPDatabase, IDBPTransaction } from 'idb';

// ─── Types (identiques aux structs Rust) ────────────────────────────────────

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

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  image_url?: string;
  available: boolean;
  allergens: string;
  preparation_time: number;
  order: number;
  variants: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  customer_type: 'regular' | 'vip' | 'corporate';
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  preferences?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

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

export interface Order {
  id: string;
  restaurant_id: string;
  order_number?: string;
  customer_id?: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  items: string;
  payment_status: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: string;
  sync_error?: string;
  source?: string;
  livreur_id?: string;
  session_id?: string;
}

export interface SyncQueue {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  data: string;
  retries: number;
  max_retries: number;
  last_attempt?: string;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CashSession {
  id: string;
  restaurant_id: string;
  type: 'X' | 'Z';
  date_ouverture: string;
  date_fermeture?: string | null;
  est_ouverte: boolean;
  ca_total: number;
  nombre_commandes: number;
  notes?: string;
  sync_status: 'pending' | 'synced' | 'error';
  sync_error?: string;
  synced_at?: string;
  date_creation: string;
  date_modification?: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  cash_session_id?: string;
  method: string;
  amount: number;
  tendered?: number;
  change?: number;
  status: string;
  transaction_id?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  cash_session_id: string;
  type: 'in' | 'out';
  amount: number;
  reason?: string;
  category?: string;
  created_at: string;
}

export interface SyncStatus {
  [tableName: string]: string | null;
}

// ─── Initialisation de la base IndexedDB ────────────────────────────────────

const DB_NAME = 'moudi-pos-web';
const DB_VERSION = 5;

let dbInstance: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase, oldVersion: number, _newVersion: number | null, transaction: IDBPTransaction<unknown, string[], 'versionchange'>) {
      // Categories
      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('active', 'active');
      }
      // Menu items
      if (!db.objectStoreNames.contains('menu_items')) {
        const menuStore = db.createObjectStore('menu_items', { keyPath: 'id' });
        menuStore.createIndex('category_id', 'category_id');
        menuStore.createIndex('available', 'available');
      }
      // Customers
      if (!db.objectStoreNames.contains('customers')) {
        const custStore = db.createObjectStore('customers', { keyPath: 'id' });
        custStore.createIndex('email', 'email');
        custStore.createIndex('phone', 'phone');
      }
      // Livreurs
      if (!db.objectStoreNames.contains('livreurs')) {
        const livStore = db.createObjectStore('livreurs', { keyPath: 'id' });
        livStore.createIndex('restaurant_id', 'restaurant_id');
        livStore.createIndex('active', 'active');
      }
      // Staff members
      if (!db.objectStoreNames.contains('staff')) {
        const staffStore = db.createObjectStore('staff', { keyPath: 'id' });
        staffStore.createIndex('restaurant_id', 'restaurant_id');
        staffStore.createIndex('is_active', 'is_active');
        staffStore.createIndex('role', 'role');
      }
      // Orders
      if (!db.objectStoreNames.contains('orders')) {
        const ordStore = db.createObjectStore('orders', { keyPath: 'id' });
        ordStore.createIndex('restaurant_id', 'restaurant_id');
        ordStore.createIndex('status', 'status');
        ordStore.createIndex('sync_status', 'sync_status');
      }
      // Sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('status', 'status');
        syncStore.createIndex('entity_type', 'entity_type');
      }
      // Cash sessions (v3: ajout index session_type)
      if (!db.objectStoreNames.contains('cash_sessions')) {
        const cashStore = db.createObjectStore('cash_sessions', { keyPath: 'id' });
        cashStore.createIndex('restaurant_id', 'restaurant_id');
        cashStore.createIndex('status', 'status');
        cashStore.createIndex('session_type', 'session_type');
      }
      // Payments
      if (!db.objectStoreNames.contains('payments')) {
        const payStore = db.createObjectStore('payments', { keyPath: 'id' });
        payStore.createIndex('order_id', 'order_id');
        payStore.createIndex('cash_session_id', 'cash_session_id');
      }
      // Cash movements
      if (!db.objectStoreNames.contains('cash_movements')) {
        const movStore = db.createObjectStore('cash_movements', { keyPath: 'id' });
        movStore.createIndex('cash_session_id', 'cash_session_id');
        movStore.createIndex('type', 'type');
      }
      // Sync status metadata
      if (!db.objectStoreNames.contains('sync_status')) {
        db.createObjectStore('sync_status', { keyPath: 'table_name' });
      }
      // Payment methods (v4: ajout pour service payment-methods)
      if (!db.objectStoreNames.contains('payment_methods')) {
        const pmStore = db.createObjectStore('payment_methods', { keyPath: 'id' });
        pmStore.createIndex('user_id', 'user_id');
        pmStore.createIndex('is_default', 'is_default');
      }
      if (oldVersion < 5) {
        if (db.objectStoreNames.contains('orders')) {
          const ordStore = transaction.objectStore('orders');
          if (!ordStore.indexNames.contains('session_id')) {
            ordStore.createIndex('session_id', 'session_id');
          }
        }
        if (db.objectStoreNames.contains('cash_sessions')) {
          const cashStore = transaction.objectStore('cash_sessions');
          if (!cashStore.indexNames.contains('type')) {
            cashStore.createIndex('type', 'type');
          }
          if (!cashStore.indexNames.contains('est_ouverte')) {
            cashStore.createIndex('est_ouverte', 'est_ouverte');
          }
        }
      }
    },
  });

  return dbInstance;
}

// ─── Helper : mise à jour du sync status ────────────────────────────────────

async function updateSyncStatus(tableName: string): Promise<void> {
  const db = await getDb();
  await db.put('sync_status', { table_name: tableName, last_sync: new Date().toISOString() });
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function web_get_categories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAll('categories');
}

export async function web_sync_categories(categories: Category[]): Promise<Category[]> {
  const db = await getDb();
  const tx = db.transaction('categories', 'readwrite');
  for (const cat of categories) {
    await tx.store.put(cat);
  }
  await tx.done;
  await updateSyncStatus('categories');
  return categories;
}

// ─── Menu Items ─────────────────────────────────────────────────────────────

export async function web_get_menu_items(categoryId?: string): Promise<MenuItem[]> {
  const db = await getDb();
  if (categoryId) {
    return db.getAllFromIndex('menu_items', 'category_id', categoryId);
  }
  return db.getAll('menu_items');
}

export async function web_sync_menu_items(items: MenuItem[]): Promise<MenuItem[]> {
  const db = await getDb();
  const tx = db.transaction('menu_items', 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
  await updateSyncStatus('menu_items');
  return items;
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function web_get_customers(): Promise<Customer[]> {
  const db = await getDb();
  return db.getAll('customers');
}

export async function web_sync_customers(customers: Customer[]): Promise<Customer[]> {
  const db = await getDb();
  const tx = db.transaction('customers', 'readwrite');
  for (const customer of customers) {
    await tx.store.put(customer);
  }
  await tx.done;
  await updateSyncStatus('customers');
  return customers;
}

// ─── Sync Status ────────────────────────────────────────────────────────────

export async function web_get_sync_status(): Promise<SyncStatus> {
  const db = await getDb();
  const all = await db.getAll('sync_status');
  const result: SyncStatus = {};
  for (const entry of all) {
    result[entry.table_name] = entry.last_sync || null;
  }
  return result;
}

// ─── Livreurs ───────────────────────────────────────────────────────────────

export async function web_get_livreurs(restaurantId: string, activeOnly: boolean): Promise<Livreur[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('livreurs', 'restaurant_id', restaurantId);
  if (activeOnly) {
    return all.filter((l: Livreur) => l.active);
  }
  return all;
}

export async function web_create_livreur(livreur: Livreur): Promise<Livreur> {
  const db = await getDb();
  await db.put('livreurs', livreur);
  return livreur;
}

export async function web_upsert_livreur(livreur: Livreur): Promise<Livreur> {
  const db = await getDb();
  await db.put('livreurs', livreur);
  return livreur;
}

export async function web_update_livreur(livreur: Livreur): Promise<Livreur> {
  const db = await getDb();
  const existing = await db.get('livreurs', livreur.id);
  if (!existing) throw new Error(`Livreur ${livreur.id} non trouvé`);
  const updated = { ...existing, ...livreur, updated_at: new Date().toISOString() };
  await db.put('livreurs', updated);
  return updated;
}

export async function web_delete_livreur(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('livreurs', id);
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export async function web_create_order_offline(order: Order): Promise<Order> {
  const db = await getDb();
  await db.put('orders', order);
  return order;
}

export async function web_update_order_offline(order: Order): Promise<Order> {
  const db = await getDb();
  const existing = await db.get('orders', order.id);
  if (!existing) throw new Error(`Commande ${order.id} non trouvée`);
  const updated = { ...existing, ...order, updated_at: new Date().toISOString() };
  await db.put('orders', updated);
  return updated;
}

export async function web_get_orders(restaurantId: string, status?: string): Promise<Order[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('orders', 'restaurant_id', restaurantId);
  if (status) {
    return all.filter((o: Order) => o.status === status);
  }
  return all;
}

export async function web_get_pending_orders(restaurantId: string): Promise<Order[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('orders', 'restaurant_id', restaurantId);
  return all.filter((o: Order) => o.sync_status === 'pending');
}

// ─── Sync Queue ─────────────────────────────────────────────────────────────

export async function web_add_to_sync_queue(queueItem: SyncQueue): Promise<SyncQueue> {
  const db = await getDb();
  await db.put('sync_queue', queueItem);
  return queueItem;
}

export async function web_get_pending_sync_items(): Promise<SyncQueue[]> {
  const db = await getDb();
  return db.getAllFromIndex('sync_queue', 'status', 'pending');
}

export async function web_sync_pending_orders(
  restaurantId: string,
  apiUrl: string
): Promise<{ synced: number; errors: number; error_details: string[] }> {
  const pendingOrders = await web_get_pending_orders(restaurantId);
  let synced = 0;
  let errors = 0;
  const error_details: string[] = [];

  for (const order of pendingOrders) {
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, SessionId: order.session_id }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated: Order = {
        ...order,
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
      };
      await web_update_order_offline(updated);
      synced++;
    } catch (err) {
      errors++;
      error_details.push(err instanceof Error ? err.message : 'Erreur inconnue');
      const failed: Order = {
        ...order,
        sync_status: 'error',
        sync_error: err instanceof Error ? err.message : 'Erreur inconnue',
      };
      await web_update_order_offline(failed);
    }
  }

  return { synced, errors, error_details };
}

// ─── Payments ───────────────────────────────────────────────────────────────

export async function web_get_order_payments(orderId: string): Promise<Payment[]> {
  const db = await getDb();
  return db.getAllFromIndex('payments', 'order_id', orderId);
}

export interface CompletePaymentRequest {
  order_id: string;
  restaurant_id: string;
  cash_session_id?: string | null;
  final_status?: string | null;
  payments: Array<{
    method: string;
    amount: number;
    tendered?: number | null;
    change?: number | null;
    transaction_id?: string | null;
    metadata?: string | null;
  }>;
  paid_at: string;
}

export interface CompletePaymentResponse {
  order_id: string;
  total_due: number;
  total_paid: number;
  payment_status: string;
  payment_method?: string;
  payments: Payment[];
}

export async function web_complete_order_payment(
  request: CompletePaymentRequest
): Promise<CompletePaymentResponse> {
  const db = await getDb();

  // Récupérer la commande
  const order = await db.get('orders', request.order_id);
  if (!order) throw new Error(`Commande ${request.order_id} non trouvée`);

  const now = new Date().toISOString();
  const savedPayments: Payment[] = [];
  let totalPaid = 0;

  const finalStatus = request.final_status === 'delivered' ? 'delivered' : 'pending_delivery';

  // Enregistrer chaque paiement
  for (const p of request.payments) {
    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order_id: request.order_id,
      cash_session_id: request.cash_session_id || undefined,
      method: p.method,
      amount: p.amount,
      tendered: p.tendered || undefined,
      change: p.change || undefined,
      status: 'completed',
      transaction_id: p.transaction_id || undefined,
      metadata: p.metadata || undefined,
      created_at: now,
      updated_at: now,
    };
    await db.put('payments', payment);
    savedPayments.push(payment);
    totalPaid += p.amount;
  }

  // Mettre à jour la commande - statut devient 'pending_delivery' après paiement
  const updatedOrder: Order = {
    ...order,
    status: finalStatus,
    payment_status: 'paid',
    payment_method: request.payments.length === 1 ? request.payments[0]?.method : 'split',
    session_id: order.session_id || request.cash_session_id || undefined,
    updated_at: now,
  };
  await db.put('orders', updatedOrder);

  if (request.cash_session_id) {
    await recalculateWebSessionStats(request.cash_session_id);
  }

  return {
    order_id: request.order_id,
    total_due: order.total,
    total_paid: totalPaid,
    payment_status: 'paid',
    payment_method: request.payments[0]?.method,
    payments: savedPayments,
  };
}

// ─── Cash Movements ─────────────────────────────────────────────────────────

export async function web_add_cash_movement(movement: CashMovement): Promise<CashMovement> {
  const db = await getDb();
  await db.put('cash_movements', movement);
  return movement;
}

export async function web_get_cash_movements(cashSessionId: string): Promise<CashMovement[]> {
  const db = await getDb();
  if (!db.objectStoreNames.contains('cash_movements')) {
    return [];
  }
  return db.getAllFromIndex('cash_movements', 'cash_session_id', cashSessionId);
}

export async function web_get_cash_session_by_id(sessionId: string): Promise<CashSession | null> {
  const db = await getDb();
  return (await db.get('cash_sessions', sessionId)) || null;
}

export async function web_get_session_payments(cashSessionId: string): Promise<Payment[]> {
  const db = await getDb();
  return db.getAllFromIndex('payments', 'cash_session_id', cashSessionId);
}

// ─── Cash Sessions (X/Z) ──────────────────────────────────────────────────

export async function web_get_open_cash_session(restaurantId: string, sessionType?: 'X' | 'Z'): Promise<CashSession | null> {
  const db = await getDb();
  const all = await db.getAllFromIndex('cash_sessions', 'restaurant_id', restaurantId);
  const openSessions = all.filter((s: CashSession) => s.est_ouverte);
  if (sessionType) {
    return openSessions.find((s: CashSession) => s.type === sessionType) || null;
  }
  return openSessions[0] || null;
}

export async function web_get_all_cash_sessions(restaurantId: string): Promise<CashSession[]> {
  const db = await getDb();
  return db.getAllFromIndex('cash_sessions', 'restaurant_id', restaurantId);
}

export async function web_create_cash_session(session: CashSession): Promise<CashSession> {
  const db = await getDb();
  await db.put('cash_sessions', session);
  return session;
}

// Alias pour compatibilité avec finance.service.ts
export const web_open_cash_session = web_create_cash_session;

export async function web_update_cash_session(session: CashSession): Promise<CashSession> {
  const db = await getDb();
  const existing = await db.get('cash_sessions', session.id);
  if (!existing) throw new Error(`Session ${session.id} non trouvée`);
  const updated = { ...existing, ...session, updated_at: new Date().toISOString() };
  await db.put('cash_sessions', updated);
  return updated;
}

export async function web_close_cash_session(
  sessionId: string,
  closingBalance: number,
  notes?: string
): Promise<CashSession> {
  const db = await getDb();
  const existing = await db.get('cash_sessions', sessionId);
  if (!existing) throw new Error(`Session ${sessionId} non trouvée`);

  const now = new Date().toISOString();
  const updated: CashSession = {
    ...existing,
    est_ouverte: false,
    date_fermeture: now,
    notes: notes || existing.notes,
    sync_status: 'pending',
    date_modification: now,
  };
  await db.put('cash_sessions', updated);
  return recalculateWebSessionStats(sessionId);
}

export async function web_update_session_stats(
  sessionId: string,
  totalOrders: number,
  totalRevenue: number
): Promise<CashSession> {
  const db = await getDb();
  const existing = await db.get('cash_sessions', sessionId);
  if (!existing) throw new Error(`Session ${sessionId} non trouvée`);

  const updated: CashSession = {
    ...existing,
    nombre_commandes: totalOrders,
    ca_total: totalRevenue,
    date_modification: new Date().toISOString(),
  };
  await db.put('cash_sessions', updated);
  return updated;
}

async function recalculateWebSessionStats(sessionId: string): Promise<CashSession> {
  const db = await getDb();
  const session = await db.get('cash_sessions', sessionId);
  if (!session) throw new Error(`Session ${sessionId} non trouvée`);

  const restaurantOrders = await db.getAllFromIndex('orders', 'restaurant_id', session.restaurant_id);
  let changed = false;
  const dateOuverture = new Date(session.date_ouverture).getTime();
  const dateFermeture = session.date_fermeture ? new Date(session.date_fermeture).getTime() : Number.POSITIVE_INFINITY;

  for (const order of restaurantOrders) {
    if (!order.session_id) {
      const createdAt = new Date(order.created_at).getTime();
      if (createdAt >= dateOuverture && createdAt <= dateFermeture) {
        order.session_id = sessionId;
        order.updated_at = new Date().toISOString();
        await db.put('orders', order);
        changed = true;
      }
    }
  }

  const sessionOrders = changed
    ? await db.getAllFromIndex('orders', 'session_id', sessionId)
    : restaurantOrders.filter((order: Order) => order.session_id === sessionId);
  const paidOrders = sessionOrders.filter((order: Order) => order.payment_status === 'paid');
  const updated: CashSession = {
    ...session,
    ca_total: paidOrders.reduce((sum: number, order: Order) => sum + order.total, 0),
    nombre_commandes: paidOrders.length,
    date_modification: new Date().toISOString(),
  };
  await db.put('cash_sessions', updated);
  return updated;
}

export async function web_sync_cash_sessions(sessions: CashSession[]): Promise<CashSession[]> {
  const db = await getDb();
  const tx = db.transaction('cash_sessions', 'readwrite');
  for (const session of sessions) {
    await tx.store.put(session);
  }
  await tx.done;
  return sessions;
}

// ─── Staff Members ──────────────────────────────────────────────────────────

export async function web_get_all_staff(restaurantId: string): Promise<StaffMember[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('staff', 'restaurant_id', restaurantId);
  return all;
}

export async function web_get_staff_by_id(id: string): Promise<StaffMember | null> {
  const db = await getDb();
  return (await db.get('staff', id)) || null;
}

export async function web_create_staff(staff: StaffMember): Promise<StaffMember> {
  const db = await getDb();
  await db.put('staff', staff);
  return staff;
}

export async function web_update_staff(staff: StaffMember): Promise<StaffMember> {
  const db = await getDb();
  const existing = await db.get('staff', staff.id);
  if (!existing) throw new Error(`Membre du personnel ${staff.id} introuvable`);
  const updated = { ...existing, ...staff, updated_at: new Date().toISOString() };
  await db.put('staff', updated);
  return updated;
}

export async function web_delete_staff(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get('staff', id);
  if (!existing) throw new Error(`Membre du personnel ${id} introuvable`);
  const updated = { ...existing, is_active: false, updated_at: new Date().toISOString() };
  await db.put('staff', updated);
}
