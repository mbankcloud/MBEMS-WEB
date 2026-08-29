# Backup and Recovery

## Supabase Automatic Backups

Supabase automatically backs up your database:

- **Free tier**: 7-day backup retention
- **Pro tier**: 14-day backup retention with Point-in-Time Recovery (PITR)
- **Team/Enterprise**: 30+ day retention, PITR to the second

To restore: **Supabase Dashboard → Database → Backups → Restore**

## Manual Export

### Full Database Export (pg_dump)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-acl --no-owner -Fc -f bems_backup_$(date +%Y%m%d).dump
```

### CSV Export of Key Tables

```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" \
  -c "\COPY members TO 'members_export.csv' CSV HEADER"
```

### Via Supabase Dashboard

1. Go to **Database → Schema Visualizer**
2. Use **Table Editor** → select table → **Export CSV**

## Recovery Procedures

### Restore from Supabase Backup

1. Go to **Database → Backups**
2. Select restore point
3. Click **Restore** (creates a new branch — does NOT overwrite production)
4. Verify data on branch
5. Manually apply changes to production if needed

### Restore from pg_dump

```bash
pg_restore -d "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-acl --no-owner bems_backup_20261201.dump
```

## Critical Tables — Never Delete

The following tables have immutability enforced at the database level:

- `audit_logs` — CANNOT be modified or deleted (trigger enforced)
- `agent_activity_logs` — CANNOT be modified or deleted
- `assignment_history` — CANNOT be modified or deleted

These tables grow monotonically and serve as the legal audit trail.

## Member Data Backup Strategy

1. **Daily**: Supabase automatic backup (Pro plan)
2. **Weekly**: Manual CSV export of members table
3. **Before import**: Always export current member data before running bulk imports

## Recommended Backup Schedule

| Frequency | Action |
|---|---|
| Daily (auto) | Supabase DB snapshot |
| Weekly | Export members, audit_logs to S3/Drive |
| Before major imports | Manual pg_dump |
| After election | Archive full DB snapshot |
