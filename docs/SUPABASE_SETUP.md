# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Set project name: `bems` (or your choice)
4. Set a strong database password (save this!)
5. Choose region closest to your users (e.g., South Asia for India)
6. Click **Create new project**

---

## Step 2: Configure Authentication

1. Go to **Authentication → Settings**
2. Under **Auth Providers**, ensure **Email** is enabled
3. Turn OFF **Confirm email** (or set up SMTP if you want email flows)
4. Set **Site URL** to your Vercel deployment URL (or `http://localhost:3000` for dev)

---

## Step 3: Run SQL Migrations

In the Supabase **SQL Editor**, run these files IN ORDER:

### Migration 1 — Schema
Copy and paste the entire contents of:
```
supabase/migrations/001_initial_schema.sql
```
Click **Run**.

### Migration 2 — RLS Policies
Copy and paste:
```
supabase/migrations/002_rls_policies.sql
```
Click **Run**.

### Seed Data
Copy and paste:
```
supabase/seed.sql
```
Click **Run**.

---

## Step 4: Configure Storage (for Counseling Photos)

1. Go to **Storage → Create bucket**
2. Bucket name: `counseling-media`
3. **Public**: OFF (private bucket)
4. Click **Create bucket**

In **SQL Editor**, run:
```sql
-- Storage policy: Agents can upload their own counseling media
CREATE POLICY "agents_upload_own_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'counseling-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "agents_read_own_media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'counseling-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "admin_read_all_media" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'counseling-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );
```

---

## Step 5: Enable Realtime

1. Go to **Database → Replication**
2. Enable realtime for these tables:
   - `agent_activity_logs`
   - `counseling_visits`
   - `polling_records`
   - `system_settings`

---

## Step 6: Create Super Admin

### Method A: Via Supabase Dashboard + SQL

1. Go to **Authentication → Users → Add User**
2. Email: `sa001@bems.internal`
3. Password: (set a strong password — this is your Super Admin password)
4. Click **Create User** — note the UUID of the created user

Then in **SQL Editor**:
```sql
-- Replace 'PASTE-UUID-HERE' with the actual user UUID from step above
INSERT INTO public.profiles (id, login_id, full_name, email, role, is_active)
VALUES (
  'PASTE-UUID-HERE',
  'SA001',
  'System Administrator',
  'sa001@bems.internal',
  'SUPER_ADMIN',
  true
);
```

### Login Credentials
- **Login ID**: `SA001`
- **Password**: (what you set in step above)
- **URL**: `/login`

---

## Step 7: Get API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 8: Test

1. Add credentials to `.env.local`
2. Run `npm run dev`
3. Go to `http://localhost:3000/login`
4. Login with `SA001` / your password
5. Should redirect to `/admin`

---

## Troubleshooting

**"Invalid Login ID or password"**
- Check the profile was inserted correctly: `SELECT * FROM profiles WHERE login_id = 'SA001';`

**"Account disabled"**
- Run: `UPDATE profiles SET is_active = true WHERE login_id = 'SA001';`

**RLS blocking queries**
- Check the user has the correct role in `profiles` table
- Ensure `current_user_role()` function returns the expected value

**pgvector or pg_trgm error**
- The trigram index requires pg_trgm extension. Run: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
