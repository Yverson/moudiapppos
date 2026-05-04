/**
 * Service de gestion financière (sessions de caisse, transactions, mouvements)
 * Utilise exclusivement SQLite via Tauri.
 */

import { tauriInvoke } from './platform';

// ─── Types ──────────────────────────────────────────────────────────────────

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
  updated_at?: string;
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
  return tauriInvoke<CashSession | null>('get_open_cash_session', { restaurant_id: restaurantId });
}

export async function openCashSession(
  restaurantId: string,
  _openingBalance: number,
  _openedBy?: string,
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

  return tauriInvoke<CashSession>('open_cash_session', { session });
}

export async function closeCashSession(
  sessionId: string,
  closingBalance: number,
  closedBy?: string,
  notes?: string
): Promise<CashSession> {
  const now = new Date().toISOString();

  return tauriInvoke<CashSession>('close_cash_session', {
    sessionId,
    closedBy: closedBy || null,
    closingAmount: closingBalance,
    closedAt: now,
    notes: notes || null,
  });
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

  const result = await tauriInvoke<CashMovement>('add_cash_movement', { movement });

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
  return tauriInvoke<CashMovement[]>('get_cash_movements', { cashSessionId });
}

// ─── Finance Summary ────────────────────────────────────────────────────────

export async function getCashDrawerSummary(
  restaurantId: string,
  sessionId?: string
): Promise<CashDrawerSummary> {
  let session: CashSession | null = null;

  if (sessionId) {
    session = await tauriInvoke<CashSession | null>('get_cash_session_by_id', { sessionId });
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

  const payments: Payment[] = await tauriInvoke<Payment[]>('get_session_payments', { cashSessionId: session.id });
  const movements = await getCashMovements(session.id);

  let totalCashIn = 0;
  let totalCashOut = 0;
  const transactions: FinanceTransaction[] = [];

  for (const payment of payments) {
    totalCashIn += payment.amount;
    transactions.push({
      date: new Date(payment.created_at).toLocaleDateString('fr-FR', {
        month: 'short', day: 'numeric', year: 'numeric',
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

  for (const movement of movements) {
    if (movement.type === 'in') {
      totalCashIn += movement.amount;
    } else {
      totalCashOut += movement.amount;
    }
    transactions.push({
      date: new Date(movement.created_at).toLocaleDateString('fr-FR', {
        month: 'short', day: 'numeric', year: 'numeric',
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
