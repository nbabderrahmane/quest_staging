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
