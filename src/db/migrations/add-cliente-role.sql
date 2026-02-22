-- Migration: Add 'cliente' role
-- Run: psql -d booking_platform -f add-cliente-role.sql

INSERT INTO role (name, description, created_at, updated_at)
VALUES ('cliente', 'Cliente/usuario que reserva canchas', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
