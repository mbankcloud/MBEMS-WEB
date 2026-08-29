-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This fixes all RLS issues causing redirect to login
-- ============================================================

-- 1. Allow anon to read profiles (needed for login page)
DROP POLICY IF EXISTS "allow_login_lookup" ON public.profiles;
CREATE POLICY "allow_login_lookup" ON public.profiles
  FOR SELECT TO anon
  USING (true);

-- 2. Allow authenticated users to read all profiles
-- (needed for admin/director/agent layouts)
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 3. Allow authenticated users to read their own agent/director record
DROP POLICY IF EXISTS "agents_self_read" ON public.agents;
CREATE POLICY "agents_self_read" ON public.agents
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "directors_self_read" ON public.directors;
CREATE POLICY "directors_self_read" ON public.directors
  FOR SELECT TO authenticated
  USING (true);

-- 4. Allow authenticated to read system_settings
DROP POLICY IF EXISTS "system_settings_read" ON public.system_settings;
CREATE POLICY "system_settings_read" ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);

-- 5. Allow authenticated to read permissions
DROP POLICY IF EXISTS "permissions_read" ON public.permissions;
CREATE POLICY "permissions_read" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- Verify all policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
