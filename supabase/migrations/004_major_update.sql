-- ================================================================
-- MIGRATION 004: Major Update
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Add ROOT_ADMIN role
ALTER TYPE IF EXISTS user_role ADD VALUE IF NOT EXISTS 'ROOT_ADMIN';

-- If above fails (enum already has it or different syntax), use:
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
--   CHECK (role IN ('ROOT_ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'AGENT'));

-- 2. Agent profile fields
ALTER TABLE public.agents 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS email_personal TEXT,
  ADD COLUMN IF NOT EXISTS address_personal TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_login_id TEXT;

-- 3. Meeting photos table
CREATE TABLE IF NOT EXISTS public.meeting_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  location TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Polling votes table (who they voted for)
ALTER TABLE public.polling_records
  ADD COLUMN IF NOT EXISTS voted_for TEXT, -- 'OUR_PANEL', 'OPPOSITION', 'NOT_CONFIRMED'
  ADD COLUMN IF NOT EXISTS panel_id UUID REFERENCES public.panels(id),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Fix polling_records unique constraint issue
ALTER TABLE public.polling_records 
  DROP CONSTRAINT IF EXISTS polling_records_agent_id_member_id_key;

ALTER TABLE public.polling_records
  ADD CONSTRAINT IF NOT EXISTS polling_records_unique 
  UNIQUE (agent_id, member_id);

-- 5. Bulk assignment table for tracking CSV imports
CREATE TABLE IF NOT EXISTS public.bulk_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_by UUID REFERENCES public.profiles(id),
  assignee_id UUID NOT NULL, -- director or agent id
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('director', 'agent')),
  filename TEXT,
  total_members INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Storage bucket for meeting photos (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-photos', 'meeting-photos', true) ON CONFLICT DO NOTHING;

-- 7. RLS policies for new tables
ALTER TABLE public.meeting_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_assignments ENABLE ROW LEVEL SECURITY;

-- Meeting photos: agents can manage their own, admins see all
CREATE POLICY IF NOT EXISTS "meeting_photos_agent_own" ON public.meeting_photos
  FOR ALL TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ROOT_ADMIN', 'SUPER_ADMIN')
    OR agent_id IN (
      SELECT a.id FROM public.agents a
      JOIN public.directors d ON a.director_id = d.id
      WHERE d.profile_id = auth.uid()
    )
  );

-- Bulk assignments: admins only
CREATE POLICY IF NOT EXISTS "bulk_assignments_admin" ON public.bulk_assignments
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ROOT_ADMIN', 'SUPER_ADMIN'));

-- 8. Fix counseling_visits unique constraint
ALTER TABLE public.counseling_visits
  DROP CONSTRAINT IF EXISTS counseling_visits_agent_id_member_id_key;

-- Add proper unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'counseling_visits_unique' 
    AND conrelid = 'public.counseling_visits'::regclass
  ) THEN
    ALTER TABLE public.counseling_visits 
      ADD CONSTRAINT counseling_visits_unique UNIQUE (agent_id, member_id);
  END IF;
END $$;

-- 9. Fix predictions unique constraint  
ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_agent_id_member_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'predictions_unique'
    AND conrelid = 'public.predictions'::regclass
  ) THEN
    ALTER TABLE public.predictions 
      ADD CONSTRAINT predictions_unique UNIQUE (agent_id, member_id);
  END IF;
END $$;

-- 10. Performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_member_assignments_agent ON public.agent_member_assignments(agent_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_member_assignments_member ON public.agent_member_assignments(member_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_director_member_assignments_director ON public.director_member_assignments(director_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_counseling_visits_agent ON public.counseling_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_polling_records_agent ON public.polling_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON public.members(full_name);
CREATE INDEX IF NOT EXISTS idx_meeting_photos_agent ON public.meeting_photos(agent_id);

-- 11. Allow directors to see their agent assignments
CREATE POLICY IF NOT EXISTS "agent_assignments_director_read" ON public.agent_member_assignments
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ROOT_ADMIN', 'SUPER_ADMIN')
    OR agent_id IN (
      SELECT a.id FROM public.agents a
      JOIN public.directors d ON a.director_id = d.id
      WHERE d.profile_id = auth.uid()
    )
    OR agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
  );

-- 12. Allow agents to read their own polling records
CREATE POLICY IF NOT EXISTS "polling_records_agent" ON public.polling_records
  FOR ALL TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ROOT_ADMIN', 'SUPER_ADMIN', 'DIRECTOR')
  );

-- 13. Meeting photos policies - agents read own
CREATE POLICY IF NOT EXISTS "agents_read_members" ON public.members
  FOR SELECT TO authenticated
  USING (true);

-- 14. Verify
SELECT 'Migration 004 complete' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
