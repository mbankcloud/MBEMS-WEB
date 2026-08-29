-- ============================================================
-- BANK ELECTION MANAGEMENT SYSTEM
-- Initial Schema Migration
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'DIRECTOR', 'AGENT')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_name TEXT NOT NULL,
  branch_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  gender TEXT,
  address TEXT,
  mobile_number TEXT,
  branch_id UUID REFERENCES public.branches(id),
  branch_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  extra_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON public.members(full_name);
CREATE INDEX IF NOT EXISTS idx_members_branch_id ON public.members(branch_id);
CREATE INDEX IF NOT EXISTS idx_members_mobile ON public.members(mobile_number);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON public.members USING gin(full_name gin_trgm_ops);

-- ============================================================
-- DIRECTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.directors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  director_code TEXT UNIQUE NOT NULL,
  all_branches_access BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AGENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_code TEXT UNIQUE NOT NULL,
  director_id UUID REFERENCES public.directors(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_director ON public.agents(director_id);

-- ============================================================
-- DIRECTOR MEMBER ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.director_member_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  director_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_active_director_member UNIQUE NULLS NOT DISTINCT (director_id, member_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_dma_director ON public.director_member_assignments(director_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dma_member ON public.director_member_assignments(member_id, is_active);

-- ============================================================
-- AGENT MEMBER ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_member_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  director_id UUID REFERENCES public.directors(id),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ama_agent ON public.agent_member_assignments(agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ama_member ON public.agent_member_assignments(member_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ama_director ON public.agent_member_assignments(director_id, is_active);

-- Prevent duplicate active assignment of same member to multiple agents
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_agent_member
  ON public.agent_member_assignments(member_id)
  WHERE is_active = true;

-- ============================================================
-- ASSIGNMENT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.members(id),
  previous_director_id UUID REFERENCES public.directors(id),
  new_director_id UUID REFERENCES public.directors(id),
  previous_agent_id UUID REFERENCES public.agents(id),
  new_agent_id UUID REFERENCES public.agents(id),
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ah_member ON public.assignment_history(member_id);

-- ============================================================
-- ELECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_name TEXT NOT NULL,
  election_date DATE NOT NULL DEFAULT '2026-12-01',
  election_time TIME NOT NULL DEFAULT '08:00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  num_seats INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'active', 'completed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PANELS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.panels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  panel_name TEXT NOT NULL,
  panel_color TEXT DEFAULT '#1e40af',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CANDIDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID NOT NULL REFERENCES public.panels(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  position TEXT,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUNSELING VISITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.counseling_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_CONTACTED'
    CHECK (status IN ('VISITED','NOT_HOME','PHONE_CONTACT','RESCHEDULED','REFUSED','NOT_CONTACTED')),
  contact_method TEXT,
  visit_date DATE,
  feedback TEXT,
  notes TEXT,
  follow_up_date DATE,
  field_assessment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_agent ON public.counseling_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_cv_member ON public.counseling_visits(member_id);
CREATE INDEX IF NOT EXISTS idx_cv_status ON public.counseling_visits(status);

-- ============================================================
-- COUNSELING MEDIA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.counseling_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counseling_visit_id UUID NOT NULL REFERENCES public.counseling_visits(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  member_id UUID NOT NULL REFERENCES public.members(id),
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (prediction IN ('WILL_VOTE_US','WILL_VOTE_OTHER','UNDECIDED','WILL_NOT_VOTE','UNKNOWN')),
  panel_preference TEXT,
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_pred_agent ON public.predictions(agent_id);
CREATE INDEX IF NOT EXISTS idx_pred_member ON public.predictions(member_id);

-- ============================================================
-- POLLING RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.polling_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  polling_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (polling_status IN ('PENDING','VOTED','NOT_VOTED','UNKNOWN')),
  contact_status TEXT,
  field_observation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_agent ON public.polling_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_pr_member ON public.polling_records(member_id);

-- ============================================================
-- AGENT ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id),
  activity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aal_agent ON public.agent_activity_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_member ON public.agent_activity_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_aal_type ON public.agent_activity_logs(activity_type);

-- ============================================================
-- AUDIT LOGS (IMMUTABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  user_login_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- ============================================================
-- IMPORT BATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  import_mode TEXT NOT NULL DEFAULT 'insert' CHECK (import_mode IN ('insert','upsert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- IMPORT ERRORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.import_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  source_value TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  suggested_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ie_batch ON public.import_errors(batch_id);

-- ============================================================
-- PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('DIRECTOR','AGENT','ELECTION')),
  default_value BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PERMISSIONS (OVERRIDES)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(permission_key) ON UPDATE CASCADE,
  value BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_up_user ON public.user_permissions(user_id);

-- ============================================================
-- USER BRANCH ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_branch_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_directors_updated_at BEFORE UPDATE ON public.directors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_elections_updated_at BEFORE UPDATE ON public.elections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_panels_updated_at BEFORE UPDATE ON public.panels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_cv_updated_at BEFORE UPDATE ON public.counseling_visits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_pred_updated_at BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_pr_updated_at BEFORE UPDATE ON public.polling_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_import_batches_updated_at BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_up_updated_at BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_ss_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUDIT LOG IMMUTABILITY TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

-- Activity log immutability
CREATE TRIGGER trg_aal_no_update BEFORE UPDATE ON public.agent_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();
CREATE TRIGGER trg_aal_no_delete BEFORE DELETE ON public.agent_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

-- Assignment history immutability
CREATE OR REPLACE FUNCTION public.prevent_history_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Assignment history records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ah_no_update BEFORE UPDATE ON public.assignment_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_history_modification();
CREATE TRIGGER trg_ah_no_delete BEFORE DELETE ON public.assignment_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_history_modification();

-- ============================================================
-- FUNCTION: GET USER PERMISSION
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_permission(
  p_user_id UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_override BOOLEAN;
  v_default BOOLEAN;
BEGIN
  -- Check individual override first
  SELECT value INTO v_override
  FROM public.user_permissions
  WHERE user_id = p_user_id AND permission_key = p_permission_key;

  IF FOUND THEN
    RETURN v_override;
  END IF;

  -- Fall back to default
  SELECT default_value INTO v_default
  FROM public.permissions
  WHERE permission_key = p_permission_key;

  RETURN COALESCE(v_default, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: SAFE ASSIGN MEMBER TO AGENT (prevents duplicates)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_member_to_agent(
  p_member_id UUID,
  p_agent_id UUID,
  p_director_id UUID,
  p_assigned_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing_agent_id UUID;
  v_existing_assignment_id UUID;
  v_new_assignment_id UUID;
BEGIN
  -- Check for existing active assignment
  SELECT agent_id, id INTO v_existing_agent_id, v_existing_assignment_id
  FROM public.agent_member_assignments
  WHERE member_id = p_member_id AND is_active = true;

  IF FOUND AND v_existing_agent_id = p_agent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member already assigned to this agent');
  END IF;

  -- If assigned to another agent, deactivate previous
  IF FOUND AND v_existing_agent_id != p_agent_id THEN
    UPDATE public.agent_member_assignments
    SET is_active = false
    WHERE id = v_existing_assignment_id;

    -- Record history
    INSERT INTO public.assignment_history
      (member_id, previous_agent_id, new_agent_id, changed_by, reason)
    VALUES
      (p_member_id, v_existing_agent_id, p_agent_id, p_assigned_by, p_reason);
  END IF;

  -- Create new assignment
  INSERT INTO public.agent_member_assignments
    (agent_id, member_id, director_id, assigned_by, is_active)
  VALUES
    (p_agent_id, p_member_id, p_director_id, p_assigned_by, true)
  RETURNING id INTO v_new_assignment_id;

  RETURN jsonb_build_object('success', true, 'assignment_id', v_new_assignment_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member already has an active assignment');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
