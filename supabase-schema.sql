-- =============================================
-- RELIEF DISTRIBUTION SYSTEM - SUPABASE SCHEMA
-- Paste this into Supabase SQL Editor and run
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'distributor' CHECK (role IN ('admin', 'supervisor', 'distributor')),
  ward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Houses table
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_name TEXT NOT NULL,
  address TEXT NOT NULL,
  ward TEXT NOT NULL,
  members_count INTEGER DEFAULT 1,
  phone TEXT,
  email TEXT,                          -- Used for OTP delivery via /my-token portal
  ration_card_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  wards TEXT[],
  items TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tokens table
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  token_code TEXT NOT NULL UNIQUE,
  qr_code TEXT, -- base64 data URL
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'distributed')),
  distributed_at TIMESTAMPTZ,
  distributed_by UUID REFERENCES profiles(id),
  is_flagged BOOLEAN DEFAULT FALSE,
  fraud_flags JSONB,
  resolution_note TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, house_id)
);

-- Fraud logs table
CREATE TABLE fraud_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES tokens(id),
  distributor_id UUID REFERENCES profiles(id),
  flags JSONB,
  scanned_at TIMESTAMPTZ,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tokens_event_id ON tokens(event_id);
CREATE INDEX idx_tokens_house_id ON tokens(house_id);
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_tokens_is_flagged ON tokens(is_flagged);
CREATE INDEX idx_tokens_token_code ON tokens(token_code);
CREATE INDEX idx_tokens_distributed_by ON tokens(distributed_by);
CREATE INDEX idx_houses_ward ON houses(ward);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER houses_updated_at BEFORE UPDATE ON houses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;

-- Since backend uses service role key, RLS won't block it.
-- These policies protect direct Supabase client access.
CREATE POLICY "Service role bypasses RLS" ON profiles USING (true);
CREATE POLICY "Service role bypasses RLS" ON houses USING (true);
CREATE POLICY "Service role bypasses RLS" ON events USING (true);
CREATE POLICY "Service role bypasses RLS" ON tokens USING (true);
CREATE POLICY "Service role bypasses RLS" ON fraud_logs USING (true);
