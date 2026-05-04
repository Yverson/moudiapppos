/**
 * Service de session local avec synchronisation cloud (X/Z)
 * Utilise exclusivement SQLite via Tauri.
 */

import axios from 'axios';
import { tauriInvoke } from './platform';
import bidirectionalSync from './bidirectional-sync.service';
import { getActiveRestaurantId } from './restaurant-config';

// --- Types ---

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
  autoOpenNew?: boolean;
  newSessionType?: 'X' | 'Z';
}

// --- Configuration API ---

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5084';
export const api = axios.create({
  baseURL,
  timeout: 10000,
});

/**
 * Mettre à jour l'URL de base de l'API pour les sessions
 */
export function setSessionApiBaseUrl(url: string) {
  api.defaults.baseURL = url;
  console.log(`[LocalSession] URL API mise à jour : ${url}`);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const API_BASE = '/api/proprietaire';

// --- Session Locale ---

export async function getOpenLocalSession(
  restaurantId?: string,
  _sessionType?: 'X' | 'Z'
): Promise<LocalSession | null> {
  const restoId = restaurantId || getActiveRestaurantId();
  if (!restoId) return null;
  return tauriInvoke<LocalSession | null>('get_open_cash_session', { restaurantId: restoId });
}

export async function getAllLocalSessions(restaurantId?: string): Promise<LocalSession[]> {
  const restoId = restaurantId || getActiveRestaurantId();
  if (!restoId) return [];
  return tauriInvoke<LocalSession[]>('get_restaurant_sessions', { restaurantId: restoId, ouvertesSeulement: false });
}

/**
 * Récupérer une session par son ID
 */
export async function getLocalSessionById(sessionId: string): Promise<LocalSession | null> {
  return tauriInvoke<LocalSession | null>('get_cash_session_by_id', { sessionId });
}

export async function createLocalSession(
  request: CreateSessionRequest,
  restaurantId?: string
): Promise<LocalSession> {
  const restoId = restaurantId || getActiveRestaurantId();
  if (!restoId) throw new Error('Restaurant ID non configuré');

  const existingOpen = await getOpenLocalSession(restoId, request.sessionType);
  if (existingOpen) {
    throw new Error(`Une session ${request.sessionType} est déjà ouverte`);
  }

  const now = new Date().toISOString();
  const session: CashSession = {
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

  await tauriInvoke<CashSession>('open_cash_session', { session });

  try {
    await syncSessionToCloud(session);
  } catch (err) {
    console.warn('[LocalSession] Échec sync initiale:', err);
  }

  return session;
}

export async function closeLocalSession(
  sessionId: string,
  request: CloseSessionRequest
): Promise<{ closed: LocalSession; newSession?: LocalSession }> {
  const now = new Date().toISOString();
  const closed = await tauriInvoke<CashSession>('close_cash_session', {
    sessionId,
    closedBy: null,
    closingAmount: request.closingBalance,
    closedAt: now,
    notes: request.notes,
  });

  try {
    await syncCloseSessionToCloud(closed);
  } catch (err) {
    console.warn('[LocalSession] Échec sync clôture:', err);
  }

  let newSession: LocalSession | undefined;

  if (request.autoOpenNew !== false) {
    const newType = request.newSessionType || closed.type;
    try {
      newSession = await createLocalSession({
        sessionType: newType,
        openingBalance: request.closingBalance,
        notes: `Session automatique après clôture de ${closed.id}`,
      });
    } catch (err) {
      console.warn('[LocalSession] Impossible d\'ouvrir nouvelle session:', err);
    }
  }

  return { closed, newSession };
}

export async function assignOrderToSession(
  orderId: string,
  sessionId?: string
): Promise<void> {
  const restaurantId = getActiveRestaurantId();
  if (!restaurantId) return;

  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const openSession = await getOpenLocalSession(restaurantId);
    if (!openSession) {
      throw new Error('Aucune session ouverte pour assigner la commande');
    }
    targetSessionId = openSession.id;
  }

  // Utiliser la commande Tauri pour assigner la commande à la session
  await tauriInvoke<void>('update_order_offline', {
    order: {
      id: orderId,
      session_id: targetSessionId,
      updated_at: new Date().toISOString(),
    }
  });
}

// --- Synchronisation Cloud ---

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
    await tauriInvoke<CashSession>('update_cash_session', { session });
  } catch (err) {
    session.sync_status = 'error';
    session.sync_error = err instanceof Error ? err.message : 'Erreur sync';
    await tauriInvoke<CashSession>('update_cash_session', { session });
    throw err;
  }
}

async function syncCloseSessionToCloud(session: LocalSession): Promise<void> {
  try {
    await syncSessionToCloud(session);

    if (!session.est_ouverte) {
      session.sync_status = 'synced';
      session.synced_at = new Date().toISOString();
      session.sync_error = undefined;
      await tauriInvoke<CashSession>('update_cash_session', { session });
      return;
    }

    await api.patch(`${API_BASE}/sessions/${session.id}/close`, {
      notes: session.notes,
    });

    session.sync_status = 'synced';
    session.synced_at = new Date().toISOString();
    session.sync_error = undefined;
    await tauriInvoke<CashSession>('update_cash_session', { session });
  } catch (err) {
    session.sync_status = 'error';
    session.sync_error = err instanceof Error ? err.message : 'Erreur sync clôture';
    await tauriInvoke<CashSession>('update_cash_session', { session });
    throw err;
  }
}

export async function syncPendingSessions(): Promise<{ synced: number; errors: number }> {
  const restaurantId = getActiveRestaurantId();
  if (!restaurantId) return { synced: 0, errors: 0 };

  const allSessions = await getAllLocalSessions(restaurantId);
  const pendingSessions = allSessions.filter(s => s.sync_status !== 'synced' || !s.synced_at);

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
      console.error(`[Sync] Échec synchronisation session ${session.id}:`, err);
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Synchroniser une session spécifique par son ID (même si elle semble déjà synchronisée)
 */
export async function syncSessionById(sessionId: string): Promise<boolean> {
  const session = await getLocalSessionById(sessionId);

  if (!session) {
    console.error(`[SyncSession] Session ${sessionId} non trouvée localement`);
    return false;
  }

  try {
    if (session.est_ouverte) {
      await syncSessionToCloud(session);
    } else {
      await syncCloseSessionToCloud(session);
    }
    return true;
  } catch (err) {
    console.error(`[SyncSession] Échec synchronisation session ${sessionId}:`, err);
    return false;
  }
}

// --- Agrégation des produits vendus ---

export async function getLocalSessionProductSales(
  sessionId: string
): Promise<SessionWithProducts | null> {
  const session = await getLocalSessionById(sessionId);
  if (!session) return null;

  // Récupérer les produits via la commande Tauri get_session_products
  const result = await tauriInvoke<{
    session: CashSession;
    products: Array<{ nom_plat: string; quantite: number; prix_unitaire_moyen: number; montant_total: number }>;
    total_ventes: number;
    total_articles: number;
  }>('get_session_products', { sessionId });

  if (!result) return null;

  const produitsVendus: SessionProductSales[] = result.products.map(p => ({
    nomProduit: p.nom_plat,
    quantiteTotale: p.quantite,
    montantTotal: p.montant_total,
    prixUnitaireMoyen: p.prix_unitaire_moyen,
  }));

  return {
    ...session,
    produitsVendus,
  };
}

// --- Utilitaires ---

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

// --- Hook de synchronisation ---

export function initSessionSync(): () => void {
  const unsubscribe = bidirectionalSync.subscribe(async (isOnline) => {
    if (isOnline) {
      console.log('[LocalSession] Connexion rétablie, sync des sessions...');
      await syncPendingSessions();
    }
  });

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
  assignOrderToSession,
  syncPendingSessions,
  getLocalSessionProductSales,
  formatMontantFCFA,
  formatSessionDate,
  initSessionSync,
};
