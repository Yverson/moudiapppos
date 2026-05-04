/**
 * Service de session local avec synchronisation cloud (X/Z)
 * - Fonctionne offline avec stockage IndexedDB
 * - Synchronise avec le cloud quand online
 * - Ouvre automatiquement une nouvelle session aprÃ¨s clÃ´ture
 */

import axios from 'axios';
import { invokeOrFallback, isDesktop } from './platform';
import {
  CashSession,
  web_get_open_cash_session,
  web_get_all_cash_sessions,
  web_create_cash_session,
  web_update_cash_session,
  web_close_cash_session,
  web_update_session_stats,
  web_get_cash_movements,
  web_get_session_payments,
} from './db-web';
import bidirectionalSync from './bidirectional-sync.service';
import { getActiveRestaurantId } from './restaurant-config';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface LocalSession extends CashSession {}

export interface SessionProductSales {
  nomProduit: string;
  quantiteTotale: number;
  montantTotal: number;
  prixUnitaireMoyen: number;
}

export interface SessionWithProducts extends LocalSession {
  produitsVendus: SessionProductSales[];
}

export interface CreateSessionRequest {
  sessionType: 'X' | 'Z';
  openingBalance: number;
  notes?: string;
}

export interface CloseSessionRequest {
  closingBalance: number;
  notes?: string;
  autoOpenNew?: boolean; // Ouvrir automatiquement une nouvelle session
  newSessionType?: 'X' | 'Z'; // Type de la nouvelle session
}

// â”€â”€â”€ Configuration API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const API_BASE = '/api/proprietaire';

// â”€â”€â”€ Session Locale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * RÃ©cupÃ©rer la session ouverte pour un restaurant
 */
export async function getOpenLocalSession(
  restaurantId?: string,
  sessionType?: 'X' | 'Z'
): Promise<LocalSession | null> {
  const restoId = restaurantId || getActiveRestaurantId();
  if (!restoId) return null;
  return web_get_open_cash_session(restoId, sessionType);
}

/**
 * RÃ©cupÃ©rer toutes les sessions locales d'un restaurant
 */
export async function getAllLocalSessions(restaurantId?: string): Promise<LocalSession[]> {
  const restoId = restaurantId || getActiveRestaurantId();
  if (!restoId) return [];
  return web_get_all_cash_sessions(restoId);
}

/**
 * CrÃ©er une nouvelle session locale (X ou Z)
 */
export async function createLocalSession(
  request: CreateSessionRequest,
  restaurantId?: string
): Promise<LocalSession> {
  const restoId = restaurantId || getActiveRestaurantId();
  if (!restoId) throw new Error('Restaurant ID non configurÃ©');

  // VÃ©rifier qu'il n'y a pas dÃ©jÃ  une session ouverte du mÃªme type
  const existingOpen = await getOpenLocalSession(restoId, request.sessionType);
  if (existingOpen) {
    throw new Error(`Une session ${request.sessionType} est dÃ©jÃ  ouverte`);
  }

  const now = new Date().toISOString();
  const session: LocalSession = {
    id: `local-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    restaurant_id: restoId,
    type: request.sessionType,
    date_ouverture: now,
    date_fermeture: null,
    est_ouverte: true,
    ca_total: 0,
    nombre_commandes: 0,
    notes: request.notes,
    sync_status: 'pending',
    date_creation: now,
    date_modification: now,
  };

  await invokeOrFallback(
    'open_cash_session',
    { session },
    () => web_create_cash_session(session)
  );

  // Synchroniser avec le cloud si online
  try {
    await syncSessionToCloud(session);
  } catch (err) {
    console.warn('[LocalSession] Ã‰chec sync initiale:', err);
    // Continuer - la sync sera retentÃ©e plus tard
  }

  return session;
}

/**
 * ClÃ´turer une session locale et optionnellement ouvrir une nouvelle
 */
export async function closeLocalSession(
  sessionId: string,
  request: CloseSessionRequest
): Promise<{ closed: LocalSession; newSession?: LocalSession }> {
  // 1. ClÃ´turer la session
  const now = new Date().toISOString();
  const closed = await invokeOrFallback(
    'close_cash_session',
    {
      sessionId,
      closedBy: null,
      closingAmount: request.closingBalance,
      closedAt: now,
      notes: request.notes,
    },
    () => web_close_cash_session(sessionId, request.closingBalance, request.notes)
  );

  // 2. Calculer les statistiques finales
  if (!isDesktop()) {
    await recalculateSessionStats(sessionId);
  }

  // 3. Synchroniser la clÃ´ture avec le cloud
  try {
    await syncCloseSessionToCloud(closed);
  } catch (err) {
    console.warn('[LocalSession] Ã‰chec sync clÃ´ture:', err);
    // La sync sera retentÃ©e plus tard
  }

  let newSession: LocalSession | undefined;

  // 4. Ouvrir automatiquement une nouvelle session si demandÃ©
  if (request.autoOpenNew !== false) {
    const newType = request.newSessionType || closed.type;
    try {
      newSession = await createLocalSession({
        sessionType: newType,
        openingBalance: request.closingBalance, // Le fond de caisse devient l'ouverture
        notes: `Session automatique aprÃ¨s clÃ´ture de ${closed.id}`,
      });
    } catch (err) {
      console.warn('[LocalSession] Impossible d\'ouvrir nouvelle session:', err);
    }
  }

  return { closed, newSession };
}

/**
 * Mettre Ã  jour les statistiques d'une session (nombre de commandes, CA)
 */
export async function recalculateSessionStats(sessionId: string): Promise<LocalSession> {
  // RÃ©cupÃ©rer les paiements de cette session
  const { getDb } = await import('./db-web');
  const db = await getDb();
  const session = await db.get('cash_sessions', sessionId);
  if (!session) throw new Error(`Session ${sessionId} non trouvÃ©e`);

  const allOrders = await db.getAllFromIndex('orders', 'restaurant_id', session.restaurant_id);
  const openedAt = new Date(session.date_ouverture).getTime();
  const closedAt = session.date_fermeture ? new Date(session.date_fermeture).getTime() : Number.POSITIVE_INFINITY;

  for (const order of allOrders) {
    if (!order.session_id) {
      const createdAt = new Date(order.created_at).getTime();
      if (createdAt >= openedAt && createdAt <= closedAt) {
        order.session_id = sessionId;
        order.updated_at = new Date().toISOString();
        await db.put('orders', order);
      }
    }
  }

  const sessionOrders = (await db.getAllFromIndex('orders', 'session_id', sessionId))
    .filter(order => order.payment_status === 'paid');
  const totalRevenue = sessionOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = sessionOrders.length;

  // Mettre Ã  jour la session
  return web_update_session_stats(sessionId, totalOrders, totalRevenue);
}

/**
 * Assigner une commande Ã  la session ouverte
 */
export async function assignOrderToSession(
  orderId: string,
  sessionId?: string
): Promise<void> {
  const restaurantId = getActiveRestaurantId();
  if (!restaurantId) return;

  // Si pas de sessionId fourni, utiliser la session ouverte
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const openSession = await getOpenLocalSession(restaurantId);
    if (!openSession) {
      throw new Error('Aucune session ouverte pour assigner la commande');
    }
    targetSessionId = openSession.id;
  }

  // Mettre Ã  jour la commande avec l'ID de session
  const { getDb } = await import('./db-web');
  const db = await getDb();
  const order = await db.get('orders', orderId);
  if (order) {
    order.session_id = targetSessionId;
    order.updated_at = new Date().toISOString();
    await db.put('orders', order);
  }

  // Recalculer les stats de la session
  await recalculateSessionStats(targetSessionId);
}

// â”€â”€â”€ Synchronisation Cloud â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Synchroniser une session vers le cloud (crÃ©ation)
 */
async function syncSessionToCloud(session: LocalSession): Promise<void> {
  try {
    await api.post(`${API_BASE}/restaurants/${session.restaurant_id}/sessions`, {
      id: session.id,
      type: session.type,
      dateOuverture: session.date_ouverture,
      dateFermeture: session.date_fermeture,
      estOuverte: session.est_ouverte,
      caTotal: session.ca_total,
      nombreCommandes: session.nombre_commandes,
      notes: session.notes,
    });

    session.sync_status = 'synced';
    session.synced_at = new Date().toISOString();
    session.sync_error = undefined;
    await web_update_cash_session(session);
  } catch (err) {
    session.sync_status = 'error';
    session.sync_error = err instanceof Error ? err.message : 'Erreur sync';
    await web_update_cash_session(session);
    throw err;
  }
}

/**
 * Synchroniser la clÃ´ture d'une session vers le cloud
 */
async function syncCloseSessionToCloud(session: LocalSession): Promise<void> {

  try {
    await syncSessionToCloud(session);

    if (!session.est_ouverte) {
      session.sync_status = 'synced';
      session.synced_at = new Date().toISOString();
      session.sync_error = undefined;
      await web_update_cash_session(session);
      return;
    }

    await api.patch(`${API_BASE}/sessions/${session.id}/close`, {
      notes: session.notes,
    });

    session.sync_status = 'synced';
    session.synced_at = new Date().toISOString();
    session.sync_error = undefined;
    await web_update_cash_session(session);
  } catch (err) {
    session.sync_status = 'error';
    session.sync_error = err instanceof Error ? err.message : 'Erreur sync clÃ´ture';
    await web_update_cash_session(session);
    throw err;
  }
}

/**
 * Synchroniser toutes les sessions locales en attente
 */
export async function syncPendingSessions(): Promise<{ synced: number; errors: number }> {
  const restaurantId = getActiveRestaurantId();
  if (!restaurantId) return { synced: 0, errors: 0 };

  const allSessions = await getAllLocalSessions(restaurantId);
  const pendingSessions = allSessions.filter(s => s.sync_status === 'pending' || s.sync_status === 'error');

  let synced = 0;
  let errors = 0;

  for (const session of pendingSessions) {
    try {
      if (session.est_ouverte) {
        await syncSessionToCloud(session);
      } else {
        await syncCloseSessionToCloud(session);
      }
      synced++;
    } catch (err) {
      errors++;
    }
  }

  return { synced, errors };
}

// â”€â”€â”€ AgrÃ©gation des produits vendus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * RÃ©cupÃ©rer les dÃ©tails des produits vendus pour une session locale
 */
export async function getLocalSessionProductSales(
  sessionId: string
): Promise<SessionWithProducts | null> {
  const { getDb } = await import('./db-web');
  const db = await getDb();

  // RÃ©cupÃ©rer la session
  const session = await db.get('cash_sessions', sessionId);
  if (!session) return null;

  // RÃ©cupÃ©rer toutes les commandes de cette session
  const allOrders = await db.getAllFromIndex('orders', 'session_id', sessionId);

  // AgrÃ©ger les produits vendus
  const productMap = new Map<string, { qty: number; total: number; prices: number[] }>();

  for (const order of allOrders) {
    if (!order.items) continue;
    try {
      const items = JSON.parse(order.items);
      for (const item of items) {
        const name = item.name || item.nom || 'Produit inconnu';
        const qty = item.quantity || item.quantite || 1;
        const price = item.price || item.prix || 0;
        const total = price * qty;

        if (!productMap.has(name)) {
          productMap.set(name, { qty: 0, total: 0, prices: [] });
        }
        const data = productMap.get(name)!;
        data.qty += qty;
        data.total += total;
        data.prices.push(price);
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }

  // Convertir en tableau
  const produitsVendus: SessionProductSales[] = Array.from(productMap.entries())
    .map(([nomProduit, data]) => ({
      nomProduit,
      quantiteTotale: data.qty,
      montantTotal: data.total,
      prixUnitaireMoyen: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
    }))
    .sort((a, b) => b.quantiteTotale - a.quantiteTotale);

  return {
    ...session,
    produitsVendus,
  };
}

// â”€â”€â”€ Utilitaires â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function formatMontantFCFA(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

export function formatSessionDate(dateString: string): string {
  return new Date(dateString).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// â”€â”€â”€ Hook de synchronisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Initialiser la synchronisation automatique des sessions
 */
export function initSessionSync(): () => void {
  // Synchroniser au retour online
  const unsubscribe = bidirectionalSync.subscribe(async (isOnline) => {
    if (isOnline) {
      console.log('[LocalSession] Connexion rÃ©tablie, sync des sessions...');
      await syncPendingSessions();
    }
  });

  // Sync initiale si online
  if (bidirectionalSync.isOnline) {
    syncPendingSessions();
  }

  return unsubscribe;
}

export default {
  getOpenLocalSession,
  getAllLocalSessions,
  createLocalSession,
  closeLocalSession,
  recalculateSessionStats,
  assignOrderToSession,
  syncPendingSessions,
  getLocalSessionProductSales,
  formatMontantFCFA,
  formatSessionDate,
  initSessionSync,
};
