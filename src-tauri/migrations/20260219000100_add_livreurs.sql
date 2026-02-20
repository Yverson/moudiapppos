-- Table des livreurs (delivery drivers)
CREATE TABLE IF NOT EXISTS livreurs (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT,
    email TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_livreurs_restaurant ON livreurs (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_livreurs_active ON livreurs (active);
