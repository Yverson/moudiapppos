-- Align local sessions with the cloud Sessions model.
ALTER TABLE orders ADD COLUMN session_id TEXT;

ALTER TABLE cash_sessions ADD COLUMN type TEXT;
ALTER TABLE cash_sessions ADD COLUMN date_ouverture TEXT;
ALTER TABLE cash_sessions ADD COLUMN date_fermeture TEXT;
ALTER TABLE cash_sessions ADD COLUMN est_ouverte INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cash_sessions ADD COLUMN ca_total REAL NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN nombre_commandes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN date_creation TEXT;
ALTER TABLE cash_sessions ADD COLUMN date_modification TEXT;
ALTER TABLE cash_sessions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE cash_sessions ADD COLUMN sync_error TEXT;
ALTER TABLE cash_sessions ADD COLUMN synced_at TEXT;

UPDATE cash_sessions
SET
    type = COALESCE(type, 'X'),
    date_ouverture = COALESCE(date_ouverture, opened_at, created_at),
    date_fermeture = COALESCE(date_fermeture, closed_at),
    est_ouverte = CASE WHEN COALESCE(status, 'open') = 'open' THEN 1 ELSE 0 END,
    date_creation = COALESCE(date_creation, created_at, opened_at),
    date_modification = COALESCE(date_modification, updated_at, closed_at, opened_at)
WHERE date_ouverture IS NULL OR type IS NULL;

UPDATE orders
SET session_id = (
    SELECT cash_session_id 
    FROM payments 
    WHERE order_id = orders.id 
    AND cash_session_id IS NOT NULL 
    LIMIT 1
)
WHERE session_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders (session_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_restaurant_open_type ON cash_sessions (restaurant_id, est_ouverte, type);
