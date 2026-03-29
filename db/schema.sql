-- 电子宠物（儿童习惯养成）数据库结构 - PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('parent', 'child');
CREATE TYPE task_category AS ENUM ('life', 'learning');
CREATE TYPE reward_type AS ENUM ('stars', 'item', 'animation');

CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name TEXT NOT NULL,
  birth_date DATE,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mood SMALLINT NOT NULL DEFAULT 50 CHECK (mood BETWEEN 0 AND 100),
  health SMALLINT NOT NULL DEFAULT 50 CHECK (health BETWEEN 0 AND 100),
  wisdom SMALLINT NOT NULL DEFAULT 50 CHECK (wisdom BETWEEN 0 AND 100),
  hygiene SMALLINT NOT NULL DEFAULT 50 CHECK (hygiene BETWEEN 0 AND 100),
  level INT NOT NULL DEFAULT 1,
  stars_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category task_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  estimated_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (estimated_minutes BETWEEN 1 AND 60),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE RESTRICT,
  task_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'skipped')),
  assigned_stars SMALLINT NOT NULL DEFAULT 5,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(child_id, task_template_id, task_date)
);

CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_task_id UUID NOT NULL UNIQUE REFERENCES daily_tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proof_type TEXT NOT NULL DEFAULT 'manual' CHECK (proof_type IN ('manual', 'photo', 'voice')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_daily_task_id UUID REFERENCES daily_tasks(id) ON DELETE SET NULL,
  reward reward_type NOT NULL,
  stars_delta INT NOT NULL DEFAULT 0,
  item_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE streaks (
  child_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_completed_date DATE
);

CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_task_templates_family_active ON task_templates(family_id, active);
CREATE INDEX idx_daily_tasks_child_date ON daily_tasks(child_id, task_date);
CREATE INDEX idx_reward_ledger_child_created_at ON reward_ledger(child_id, created_at DESC);
