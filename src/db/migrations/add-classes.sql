-- Migration: add sport_class and class_enrollment tables
-- Date: 2026-03-02

CREATE TABLE IF NOT EXISTS sport_class (
  id            SERIAL PRIMARY KEY,
  tenant_id     INT NOT NULL REFERENCES tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  branch_id     INT NOT NULL REFERENCES branch(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  sport_id      INT NOT NULL REFERENCES sport(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  name          VARCHAR(150)    NOT NULL,
  description   TEXT,
  instructor    VARCHAR(100),
  starts_at     TIMESTAMPTZ     NOT NULL,
  ends_at       TIMESTAMPTZ     NOT NULL,
  max_capacity  INT             NOT NULL DEFAULT 20,
  price         DECIMAL(10, 2)  NOT NULL DEFAULT 0,
  currency      VARCHAR(3)      NOT NULL DEFAULT 'CLP',
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_enrollment (
  id           SERIAL PRIMARY KEY,
  class_id     INT  NOT NULL REFERENCES sport_class(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id      INT  REFERENCES app_user(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sport_class_branch_starts
  ON sport_class (branch_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_class_enrollment_class
  ON class_enrollment (class_id);

CREATE INDEX IF NOT EXISTS idx_class_enrollment_user
  ON class_enrollment (user_id);
