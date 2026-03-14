-- Fineco AWS RDS PostgreSQL schema
-- Safe to run in order on a fresh database.

CREATE TYPE account_type AS ENUM ('CASH', 'BANK', 'CARD', 'SAVINGS', 'EWALLET');
CREATE TYPE txn_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE debt_type AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE debt_status AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120),
  base_currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  type account_type NOT NULL,
  currency CHAR(3) NOT NULL,
  initial_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_accounts_user ON accounts(user_id);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  kind txn_type NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, kind)
);

CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  type txn_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  fx_rate_to_base NUMERIC(18,8),
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_txn_user_time ON transactions(user_id, occurred_at DESC);
CREATE INDEX idx_txn_account ON transactions(account_id);

CREATE TABLE transfers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  from_amount NUMERIC(18,2) NOT NULL CHECK (from_amount > 0),
  to_amount NUMERIC(18,2) NOT NULL CHECK (to_amount > 0),
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,
  fx_rate NUMERIC(18,8) NOT NULL,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_account_id <> to_account_id)
);
CREATE INDEX idx_transfers_user_time ON transfers(user_id, occurred_at DESC);

CREATE TABLE debts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind debt_type NOT NULL,
  counterparty VARCHAR(140) NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  due_date DATE,
  status debt_status NOT NULL DEFAULT 'OPEN',
  note TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_debts_user_status ON debts(user_id, status);

CREATE TABLE budget_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  limit_amount NUMERIC(18,2) NOT NULL CHECK (limit_amount > 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, month_start)
);

CREATE TABLE monthly_targets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  target_income NUMERIC(18,2) NOT NULL CHECK (target_income >= 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_start)
);
