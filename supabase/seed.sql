-- ============================================================
-- SEED DATA
-- BANK ELECTION MANAGEMENT SYSTEM
-- ============================================================

-- ============================================================
-- DEFAULT PERMISSIONS
-- ============================================================
INSERT INTO public.permissions (permission_key, description, applies_to, default_value) VALUES
  -- Director permissions
  ('director.see_all_branches', 'Director can see all branches', 'DIRECTOR', false),
  ('director.search_member_id', 'Director can search by Member ID', 'DIRECTOR', true),
  ('director.search_full_name', 'Director can search by Full Name', 'DIRECTOR', true),
  ('director.import_member_ids', 'Director can import Member IDs', 'DIRECTOR', false),
  ('director.import_full_names', 'Director can import Full Names', 'DIRECTOR', false),
  ('director.assign_members', 'Director can assign members', 'DIRECTOR', false),
  ('director.create_agents', 'Director can create Agents', 'DIRECTOR', false),
  ('director.reassign_agents', 'Director can reassign Agents', 'DIRECTOR', false),
  ('director.view_counseling', 'Director can view counseling', 'DIRECTOR', true),
  ('director.view_polling', 'Director can view polling', 'DIRECTOR', false),
  ('director.export_reports', 'Director can export reports', 'DIRECTOR', false),
  ('director.view_mobile', 'Director can view member mobile numbers', 'DIRECTOR', true),
  ('director.view_addresses', 'Director can view member addresses', 'DIRECTOR', true),
  ('director.view_all_agents', 'Director can view all agents', 'DIRECTOR', true),
  ('director.view_all_members', 'Director can view all assigned members', 'DIRECTOR', true),
  ('director.manage_agents', 'Director can manage assigned agents', 'DIRECTOR', false),
  ('director.import_csv', 'Director can import CSV/Excel', 'DIRECTOR', false),
  -- Agent permissions
  ('agent.search_member_id', 'Agent can search by Member ID', 'AGENT', true),
  ('agent.search_full_name', 'Agent can search by Full Name', 'AGENT', false),
  ('agent.search_branch', 'Agent can search by Branch', 'AGENT', false),
  ('agent.search_mobile', 'Agent can search by Mobile Number', 'AGENT', false),
  ('agent.import_member_ids', 'Agent can import Member IDs', 'AGENT', false),
  ('agent.import_full_names', 'Agent can import Full Names', 'AGENT', false),
  ('agent.import_csv', 'Agent can import CSV', 'AGENT', false),
  ('agent.import_excel', 'Agent can import Excel', 'AGENT', false),
  ('agent.view_additional_branches', 'Agent can view additional branches', 'AGENT', false),
  ('agent.call_members', 'Agent can call members', 'AGENT', true),
  ('agent.whatsapp_members', 'Agent can WhatsApp members', 'AGENT', true),
  ('agent.view_addresses', 'Agent can view addresses', 'AGENT', true),
  ('agent.view_mobile', 'Agent can view mobile numbers', 'AGENT', true),
  ('agent.counseling', 'Agent can access counseling module', 'AGENT', true),
  ('agent.prediction', 'Agent can access prediction module', 'AGENT', true),
  ('agent.polling', 'Agent can access polling module', 'AGENT', false),
  ('agent.export', 'Agent can export data', 'AGENT', false),
  -- Election permissions
  ('election.polling_day_module', 'Polling Day module enabled', 'ELECTION', false),
  ('election.show_countdown_directors', 'Show countdown to Directors', 'ELECTION', true),
  ('election.show_countdown_agents', 'Show countdown to Agents', 'ELECTION', true)
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================================
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('election_date', '2026-12-01', 'Default election date'),
  ('election_time', '08:00:00', 'Election start time'),
  ('election_timezone', 'Asia/Kolkata', 'Election timezone'),
  ('election_name', 'Board Election 2026', 'Name of the election'),
  ('organization_name', 'The Muslim Co-Operative Bank Ltd.', 'Organization name'),
  ('system_name', 'Bank Election Management System', 'System name'),
  ('pagination_size', '25', 'Default pagination size'),
  ('max_upload_size_mb', '10', 'Maximum file upload size in MB'),
  ('import_mode_default', 'insert', 'Default import mode: insert or upsert')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- DEFAULT ELECTION
-- ============================================================
INSERT INTO public.elections (
  election_name, election_date, election_time, timezone, num_seats, status, is_active
) VALUES (
  'Board Election 2026',
  '2026-12-01',
  '08:00:00',
  'Asia/Kolkata',
  7,
  'upcoming',
  true
) ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTES ON SUPER ADMIN CREATION
-- ============================================================
-- After running this seed, create the Super Admin user via Supabase Dashboard:
-- 1. Go to Authentication > Users > Add User
-- 2. Email: admin@bems.local
-- 3. Password: (set a strong password)
-- 4. Then run the script in scripts/create-super-admin.sql
-- Or use the browser console script in docs/SUPABASE_SETUP.md
