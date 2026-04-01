-- Run this SQL in Supabase SQL Editor to add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_messages_count integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_gender text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS baby_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS baby_gender text;
