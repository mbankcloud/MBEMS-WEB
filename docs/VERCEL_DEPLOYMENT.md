# Vercel Deployment Guide

## Prerequisites

- Supabase project set up (see `docs/SUPABASE_SETUP.md`)
- GitHub/GitLab account
- Vercel account (free tier works)

## Steps

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial BEMS deployment"
git remote add origin https://github.com/YOUR_USERNAME/bems.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your `bems` repository
4. Framework preset: **Next.js** (auto-detected)
5. Click **Deploy** (will fail — you need to add env vars first)

### 3. Add Environment Variables

In Vercel Project → **Settings → Environment Variables**, add:

| Name | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview |

> **Security**: `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the browser. Vercel automatically keeps non-`NEXT_PUBLIC_` variables server-side only.

### 4. Redeploy

After adding env vars, go to **Deployments → Redeploy**.

### 5. Configure Supabase Auth Redirect URLs

In Supabase → **Authentication → Settings → Redirect URLs**, add:
```
https://your-project.vercel.app/**
https://your-custom-domain.com/**
```

### 6. Verify Deployment

- Visit `https://your-project.vercel.app/login`
- Login as `SA001`
- Check all pages load without errors

## Custom Domain

1. In Vercel → **Settings → Domains**, add your domain
2. Follow DNS configuration instructions
3. Add the new domain to Supabase redirect URLs

## Environment-specific Configs

For staging/preview environments, create separate Supabase projects and set Preview-specific env vars in Vercel.
