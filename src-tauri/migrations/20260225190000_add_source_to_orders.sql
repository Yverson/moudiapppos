-- Add source column to orders table
ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'local';
