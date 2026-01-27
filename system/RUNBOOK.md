# Ship Quest Runbook

This runbook guides you through running, deploying, and troubleshooting Ship Quest.

## 1. Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Create .env.local from template
cp .env.example .env.local
# Fill in your Supabase credentials

# Start development server
npm run dev
```

Server runs on port `3000` by default.

## 2. Environment Configuration

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |

## 3. Production Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Build

```bash
npm run build
npm run start
```

## 4. Common Failure Modes

### Login Issues

**Symptom**: POST /api/auth/login returns 500  
**Cause**: Missing database columns or RLS policy issues  
**Solution**: 
- Check Supabase logs for specific error
- Verify `profiles` table has required columns
- Ensure RLS policies allow read access

### Quest Board Not Loading

**Symptom**: Blank page or "No Team Found"  
**Cause**: User not associated with any team  
**Solution**:
- Check `team_members` table for user entry
- Verify team exists in `teams` table

### Hydration Errors

**Symptom**: Console shows "Hydration failed" warning  
**Cause**: Server/client render mismatch (often date formatting)  
**Solution**:
- Use consistent date formatting (ISO strings)
- Avoid `new Date()` in render paths
- Use `suppressHydrationWarning` for unavoidable cases

## 5. Database Migrations

SQL migration files are located in `/system/*.sql`. Apply in order:

```bash
# Example: Apply via Supabase CLI
supabase db push
```

## 6. Logs & Monitoring

### Where to Look

| Issue Type | Location |
|---|---|
| Build errors | Vercel build logs |
| Runtime errors | Vercel function logs |
| Database errors | Supabase Dashboard > Logs |
| Auth issues | Supabase Dashboard > Authentication > Logs |

### Key Log Patterns

- `[SAFE-ACTION] [ERR-XXXXXXXX]` — Server action error with reference ID
- `RBAC Denial` — Role-based access control rejection
- `getCurrentUserRole` — Role lookup failures

## 7. Quick Diagnostics

```bash
# Check build health
npm run build

# Run lint checks
npm run lint

# Run E2E tests (requires app running)
npx playwright test
```

## 8. Rollback Procedures

If a deployment fails or introduces critical bugs, follow these steps to rollback.

### Vercel Rollback

1. Go to **Deployments** in the Vercel dashboard.
2. Locate the last stable deployment before the current one.
3. Click the three dots and select **Redeploy**.
4. Confirm the redeployment.

### Database Rollback

If a database migration needs to be reverted:

1. Identify the migration file in `/system/` that caused the issue.
2. Write a manual SQL script to undo the changes (e.g., `DROP COLUMN`, `DROP TABLE`).
3. Apply the script via the Supabase SQL Editor.
4. If using Supabase CLI: `supabase db reset` (Warning: this will wipe and recreate the database).

### Environment Variable Rollback

1. Revert changes in the Vercel dashboard or `.env.local`.
2. Redeploy the application to ensure the changes take effect.

## 9. Feature Guides & Troubleshooting

### Mission Reporting
- **Usage**: Go to `/admin/reporting`. Select "Date Range" for time-based export or "By Sprint" to export specific quest deliverables.
- **Troubleshooting**: If report is empty, ensure tasks in that range/sprint are marked as "Done".

### Recurring Tasks
- **Mechanism**: Handled by `/api/cron/recurrence` endpoint, typically verified via Cron job (e.g., Vercel Cron or GitHub Actions).
- **Failure Mode**: If tasks don't appear, check if the "Next Recurrence Date" falls on a weekend or gap between sprints. The system attempts to find the *next future sprint*, but if no sprints are planned, it may fall back to the generic backlog or fail if no active quest exists.


