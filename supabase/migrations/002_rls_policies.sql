-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_member_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_member_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counseling_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counseling_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's director id
CREATE OR REPLACE FUNCTION public.current_director_id()
RETURNS UUID AS $$
  SELECT id FROM public.directors WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's agent id
CREATE OR REPLACE FUNCTION public.current_agent_id()
RETURNS UUID AS $$
  SELECT id FROM public.agents WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES RLS
-- ============================================================
CREATE POLICY "profiles_super_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_director_read_agents" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND role = 'AGENT'
    AND id IN (
      SELECT profile_id FROM public.agents
      WHERE director_id = public.current_director_id()
    )
  );

-- ============================================================
-- BRANCHES RLS
-- ============================================================
CREATE POLICY "branches_super_admin_all" ON public.branches
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "branches_director_read" ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND (
      (SELECT all_branches_access FROM public.directors WHERE profile_id = auth.uid()) = true
      OR id IN (SELECT branch_id FROM public.user_branch_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "branches_agent_read" ON public.branches
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'AGENT');

-- ============================================================
-- MEMBERS RLS
-- ============================================================
CREATE POLICY "members_super_admin_all" ON public.members
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "members_director_read" ON public.members
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND id IN (
      SELECT member_id FROM public.director_member_assignments
      WHERE director_id = public.current_director_id() AND is_active = true
    )
  );

CREATE POLICY "members_agent_read" ON public.members
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND id IN (
      SELECT member_id FROM public.agent_member_assignments
      WHERE agent_id = public.current_agent_id() AND is_active = true
    )
  );

-- ============================================================
-- DIRECTORS RLS
-- ============================================================
CREATE POLICY "directors_super_admin_all" ON public.directors
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "directors_self_read" ON public.directors
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- AGENTS RLS
-- ============================================================
CREATE POLICY "agents_super_admin_all" ON public.agents
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "agents_director_read" ON public.agents
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND director_id = public.current_director_id()
  );

CREATE POLICY "agents_self_read" ON public.agents
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- DIRECTOR MEMBER ASSIGNMENTS RLS
-- ============================================================
CREATE POLICY "dma_super_admin_all" ON public.director_member_assignments
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "dma_director_own" ON public.director_member_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND director_id = public.current_director_id()
  );

-- ============================================================
-- AGENT MEMBER ASSIGNMENTS RLS
-- ============================================================
CREATE POLICY "ama_super_admin_all" ON public.agent_member_assignments
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "ama_director_read" ON public.agent_member_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND director_id = public.current_director_id()
  );

CREATE POLICY "ama_agent_own" ON public.agent_member_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

-- ============================================================
-- ASSIGNMENT HISTORY RLS
-- ============================================================
CREATE POLICY "ah_super_admin_read" ON public.assignment_history
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "ah_director_read" ON public.assignment_history
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND (
      new_director_id = public.current_director_id()
      OR previous_director_id = public.current_director_id()
    )
  );

-- ============================================================
-- ELECTIONS, PANELS, CANDIDATES RLS
-- ============================================================
CREATE POLICY "elections_super_admin_all" ON public.elections
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "elections_others_read" ON public.elections
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('DIRECTOR', 'AGENT'));

CREATE POLICY "panels_super_admin_all" ON public.panels
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "panels_others_read" ON public.panels
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('DIRECTOR', 'AGENT'));

CREATE POLICY "candidates_super_admin_all" ON public.candidates
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "candidates_others_read" ON public.candidates
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('DIRECTOR', 'AGENT'));

-- ============================================================
-- COUNSELING VISITS RLS
-- ============================================================
CREATE POLICY "cv_super_admin_all" ON public.counseling_visits
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "cv_director_read" ON public.counseling_visits
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND agent_id IN (
      SELECT id FROM public.agents WHERE director_id = public.current_director_id()
    )
  );

CREATE POLICY "cv_agent_own" ON public.counseling_visits
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

-- ============================================================
-- COUNSELING MEDIA RLS
-- ============================================================
CREATE POLICY "cm_super_admin_all" ON public.counseling_media
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "cm_agent_own" ON public.counseling_media
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

-- ============================================================
-- PREDICTIONS RLS
-- ============================================================
CREATE POLICY "pred_super_admin_all" ON public.predictions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "pred_director_read" ON public.predictions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND agent_id IN (
      SELECT id FROM public.agents WHERE director_id = public.current_director_id()
    )
  );

CREATE POLICY "pred_agent_own" ON public.predictions
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

-- ============================================================
-- POLLING RECORDS RLS
-- ============================================================
CREATE POLICY "pr_super_admin_all" ON public.polling_records
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "pr_director_read" ON public.polling_records
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND agent_id IN (
      SELECT id FROM public.agents WHERE director_id = public.current_director_id()
    )
  );

CREATE POLICY "pr_agent_own" ON public.polling_records
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

-- ============================================================
-- AGENT ACTIVITY LOGS RLS
-- ============================================================
CREATE POLICY "aal_super_admin_all" ON public.agent_activity_logs
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "aal_director_read" ON public.agent_activity_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND agent_id IN (
      SELECT id FROM public.agents WHERE director_id = public.current_director_id()
    )
  );

CREATE POLICY "aal_agent_insert_own" ON public.agent_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

CREATE POLICY "aal_agent_read_own" ON public.agent_activity_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'AGENT'
    AND agent_id = public.current_agent_id()
  );

-- ============================================================
-- AUDIT LOGS RLS (READ-ONLY for Super Admin)
-- ============================================================
CREATE POLICY "audit_super_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "audit_service_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Server-side inserts only

-- ============================================================
-- IMPORT BATCHES RLS
-- ============================================================
CREATE POLICY "ib_super_admin_all" ON public.import_batches
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "ib_director_own" ON public.import_batches
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND uploaded_by = auth.uid()
  );

-- ============================================================
-- IMPORT ERRORS RLS
-- ============================================================
CREATE POLICY "ie_super_admin_all" ON public.import_errors
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "ie_director_own" ON public.import_errors
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'DIRECTOR'
    AND batch_id IN (
      SELECT id FROM public.import_batches WHERE uploaded_by = auth.uid()
    )
  );

-- ============================================================
-- PERMISSIONS RLS
-- ============================================================
CREATE POLICY "perms_super_admin_all" ON public.permissions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "perms_others_read" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- USER PERMISSIONS RLS
-- ============================================================
CREATE POLICY "up_super_admin_all" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "up_self_read" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- USER BRANCH ACCESS RLS
-- ============================================================
CREATE POLICY "uba_super_admin_all" ON public.user_branch_access
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "uba_self_read" ON public.user_branch_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- SYSTEM SETTINGS RLS
-- ============================================================
CREATE POLICY "ss_super_admin_all" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "ss_others_read" ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);
