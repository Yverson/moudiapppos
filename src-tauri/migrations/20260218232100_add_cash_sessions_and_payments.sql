-- Cash sessions table (cash drawer sessions)
CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    opened_by TEXT,
    opening_amount REAL NOT NULL DEFAULT 0,
    closed_at TEXT,
    closed_by TEXT,
    closing_amount REAL,
    status TEXT NOT NULL DEFAULT 'open', -- open, closed
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Payments table (supports split: multiple rows per order)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    cash_session_id TEXT,
    method TEXT NOT NULL, -- cash, card, mobile_money
    amount REAL NOT NULL,
    tendered REAL, -- cash received (optional)
    change REAL, -- change given (optional)
    status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed, refunded
    transaction_id TEXT,
    metadata TEXT, -- JSON (optional)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions (id) ON DELETE SET NULL
);

-- Cash movements table (manual in/out, expenses, etc.)
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    cash_session_id TEXT NOT NULL,
    type TEXT NOT NULL, -- in, out
    amount REAL NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cash_sessions_restaurant_status ON cash_sessions (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON cash_sessions (opened_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments (cash_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments (method);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements (cash_session_id);
