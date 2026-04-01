-- Run this SQL in Supabase SQL Editor to enable Row Level Security
-- The server uses service_role key which bypasses RLS automatically

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON users USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only" ON conversations USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only" ON schedules USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only" ON funnel_events USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only" ON verification_codes USING (true) WITH CHECK (true);
