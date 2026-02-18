-- Orders table for offline POS functionality
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    order_number TEXT UNIQUE,
    customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_local',
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    discount REAL DEFAULT 0,
    items TEXT NOT NULL, -- JSON array of order items
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT, -- NULL si non synchronisé
    sync_status TEXT DEFAULT 'pending', -- pending, synced, error
    sync_error TEXT, -- Message d'erreur si échec
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
);

-- Order items table for detailed order tracking
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    variant_name TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE RESTRICT
);

-- Sync queue for offline operations
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL, -- CREATE_ORDER, UPDATE_ORDER, DELETE_ORDER, CREATE_CUSTOMER, etc.
    entity_type TEXT NOT NULL, -- order, customer, menu_item, etc.
    entity_id TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON payload
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    last_attempt TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, synced, error, failed
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Add sync_status to existing tables if not exists
-- This will be handled by the database service to avoid errors

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders (sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue (created_at);
