-- Migration: add resource_id to sport_class
-- Date: 2026-03-02

ALTER TABLE sport_class
  ADD COLUMN IF NOT EXISTS resource_id INT
    REFERENCES resource(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sport_class_resource
  ON sport_class (resource_id, starts_at)
  WHERE resource_id IS NOT NULL;
