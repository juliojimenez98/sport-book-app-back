-- Migration: add requiresAddress feature fields
-- Date: 2026-02-27

-- Add address field to app_user table
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS address VARCHAR(500);

-- Add requires_address field to branch table
ALTER TABLE branch ADD COLUMN IF NOT EXISTS requires_address BOOLEAN NOT NULL DEFAULT false;

-- Add requires_address field to tenant table
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS requires_address BOOLEAN NOT NULL DEFAULT false;
