/**
 * Service de gestion financière (sessions de caisse, transactions, mouvements)
 */

import { invokeOrFallback } from './platform';
import {
  web_get_open_cash_session,
  web_open_cash_session,
  web_close_cash_session,
  web_get_order_payments,
  CashSession,
  Payment,
} from './db-web';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CashMovement {
  id: string;
  cash_session_id: string;
  type: 'in' | 'out';
  amount: number;
  reason?: string;
  category?: string;
  created_at: string;
}

export interface FinanceTransaction {
  date: string;
  description: string;
  detail: string;
  category: string;
  type: 'in' | 'out';
  amount: number;
  source: 'payment' | 'movement';
  source_id: string;
}

export interface CashDrawerSummary {
  opening_balance: number;
  closing_balance: number;
  total_cash_in: number;
  total_cash_out: number;
  transactions: FinanceTransaction[];
  session?: CashSession;
}

// ─── Cash Session ───────────────────────────────────────────────────────────

export async function getOpenCashSession(
  restaurantId: string
): Promise<CashSession | null> {
  return invokeOrFallback(
    'get_open_cash_session',
    { restaurant_id: restaurantId },
    () => web_get_open_cash_session(restaurantId)
  );
}

export async function openCashSession(
  restaurantId: string,
  openingBalance: number,
  openedBy?: string,
  sessionType: 'X' | 'Z' = 'X'
): Promise<CashSession> {
  const now = new Date().toISOString();
  const session: CashSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    restaurant_id: restaurantId,
    type: sessionType,
    date_ouverture: now,
    date_fermeture: null,
    est_ouverte: true,
    ca_total: 0,
    nombre_commandes: 0,
    sync_status: 'pending',
    date_creation: now,
    date_modification: now,
  };

  return invokeOrFallback(
    'open_cash_session',
    { session },
    () => web_open_cash_session(session)
  );
}

export async function closeCashSession(
  sessionId: string,
  closingBalance: number,
  closedBy?: string,
  notes?: string
): Promise<CashSession> {
  const now = new Date().toISOString();
  
  return invokeOrFallback(
    'close_cash_session',
    {
      session_id: sessionId,
      closed_by: closedBy,
      closing_amount: closingBalance,
      closed_at: now,
      notes,
    },
    () => web_close_cash_session(sessionId, closingBalance)
  );
}

// ─── Cash Movements ─────────────────────────────────────────────────────────

export async function addCashMovement(
  cashSessionId: string,
  type: 'in' | 'out',
  amount: number,
  reason?: string,
  category?: string
): Promise<CashMovement> {
  const now = new Date().toISOString();
  const movement: CashMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cash_session_id: cashSessionId,
    type,
    amount,
    reason,
    category,
    created_at: now,
  };

  const result = await invokeOrFallback(
    'add_cash_movement',
    { movement },
    () => web_add_cash_movement(movement)
  );

  // Synchronisation bidirectionnelle
  const bidirectionalSync = (await import('./bidirectional-sync.service')).default;
  await bidirectionalSync.pushMutation({
    action: 'CREATE',
    entityType: 'cash_movement',
    entityId: movement.id,
    data: movement,
  });

  return result;
}

export async function getCashMovements(
  cashSessionId: string
): Promise<CashMovement[]> {
  return invokeOrFallback(
    'get_cash_movements',
    { cash_session_id: cashSessionId },
    () => web_get_cash_movements(cashSessionId)
  );
}

// ─── Finance Summary ────────────────────────────────────────────────────────

export async function getCashDrawerSummary(
  restaurantId: string,
  sessionId?: string
): Promise<CashDrawerSummary> {
  // Récupérer la session (ouverte ou spécifique)
  let session: CashSession | null = null;
  
  if (sessionId) {
    session = await invokeOrFallback(
      'get_cash_session_by_id',
      { session_id: sessionId },
      () => web_get_cash_session_by_id(sessionId)
    );
  } else {
    session = await getOpenCashSession(restaurantId);
  }

  if (!session) {
    return {
      opening_balance: 0,
      closing_balance: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      transactions: [],
    };
  }

  // Récupérer les paiements de cette session
  const payments: Payment[] = await invokeOrFallback(
    'get_session_payments',
    { cash_session_id: session.id },
    () => web_get_session_payments(session.id)
  );

  // Récupérer les mouvements de caisse
  const movements = await getCashMovements(session.id);

  // Calculer les totaux
  let totalCashIn = 0;
  let totalCashOut = 0;
  const transactions: FinanceTransaction[] = [];

  // Ajouter les paiements
  for (const payment of payments) {
    totalCashIn += payment.amount;
    transactions.push({
      date: new Date(payment.created_at).toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      description: `Paiement ${payment.method}`,
      detail: `Commande #${payment.order_id.substring(0, 8)}`,
      category: 'Ventes',
      type: 'in',
      amount: payment.amount,
      source: 'payment',
      source_id: payment.id,
    });
  }

  // Ajouter les mouvements
  for (const movement of movements) {
    if (movement.type === 'in') {
      totalCashIn += movement.amount;
    } else {
      totalCashOut += movement.amount;
    }

    transactions.push({
      date: new Date(movement.created_at).toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      description: movement.reason || `Mouvement ${movement.type === 'in' ? 'entrant' : 'sortant'}`,
      detail: movement.category || 'Divers',
      category: movement.category || 'Divers',
      type: movement.type,
      amount: movement.amount,
      source: 'movement',
      source_id: movement.id,
    });
  }

  // Trier par date (plus récent en premier)
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openingBalance = 0;
  const closingBalance = openingBalance + totalCashIn - totalCashOut;

  return {
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    total_cash_in: totalCashIn,
    total_cash_out: totalCashOut,
    transactions,
    session,
  };
}

// ─── Fonctions web (fallback IndexedDB) ────────────────────────────────────

async function web_add_cash_movement(movement: CashMovement): Promise<CashMovement> {
  const { getDb } = await import('./db-web');
  const db = await getDb();
  await db.put('cash_movements', movement);
  return movement;
}

async function web_get_cash_movements(cashSessionId: string): Promise<CashMovement[]> {
  const { getDb } = await import('./db-web');
  const db = await getDb();
  
  if (!db.objectStoreNames.contains('cash_movements')) {
    return [];
  }
  
  const all = await db.getAllFromIndex('cash_movements', 'cash_session_id', cashSessionId);
  return all;
}

async function web_get_cash_session_by_id(sessionId: string): Promise<CashSession | null> {
  const { getDb } = await import('./db-web');
  const db = await getDb();
  return (await db.get('cash_sessions', sessionId)) || null;
}

async function web_get_session_payments(cashSessionId: string): Promise<Payment[]> {
  const { getDb } = await import('./db-web');
  const db = await getDb();
  return db.getAllFromIndex('payments', 'cash_session_id', cashSessionId);
}
