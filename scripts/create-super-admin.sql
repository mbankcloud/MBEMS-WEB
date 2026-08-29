-- Run this in Supabase SQL Editor AFTER creating the auth user manually
-- Replace the UUID and adjust values as needed

-- Step 1: Find the auth user UUID (run this first)
-- SELECT id, email FROM auth.users WHERE email = 'sa001@bems.internal';

-- Step 2: Insert the profile (replace UUID below)
INSERT INTO public.profiles (
  id,
  login_id,
  full_name,
  email,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'PASTE-YOUR-AUTH-USER-UUID-HERE',  -- From auth.users.id
  'SA001',
  'System Administrator',
  'sa001@bems.internal',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  login_id = 'SA001',
  role = 'SUPER_ADMIN',
  is_active = true;

-- Verify
SELECT id, login_id, full_name, role, is_active FROM public.profiles WHERE role = 'SUPER_ADMIN';
