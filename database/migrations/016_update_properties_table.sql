-- Migration: Update properties table with additional fields
-- Description: Add house_number, street, status, owner_id, current_resident_id, and gate controls
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we need to recreate the table

-- Create new properties table with all fields
CREATE TABLE IF NOT EXISTS properties_new (
  id TEXT PRIMARY KEY,
  house_number TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'desocupada' CHECK (status IN ('ocupada', 'desocupada', 'en_renta', 'en_venta')),
  owner_id TEXT,
  current_resident_id TEXT,
  gate_control_1 TEXT,
  gate_control_2 TEXT,
  gate_control_3 TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (owner_id) REFERENCES residents(id) ON DELETE SET NULL,
  FOREIGN KEY (current_resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

-- Copy existing data from old table if it exists
INSERT INTO properties_new (id, created_at, updated_at, deleted_at)
SELECT id, created_at, updated_at, deleted_at
FROM properties
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='properties');

-- Drop old table
DROP TABLE IF EXISTS properties;

-- Rename new table
ALTER TABLE properties_new RENAME TO properties;

-- Create indexes for better query performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_house_number ON properties(house_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_current_resident_id ON properties(current_resident_id);
CREATE INDEX IF NOT EXISTS idx_properties_street ON properties(street);

-- Made with Bob
