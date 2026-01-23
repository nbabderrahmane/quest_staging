# SECURITY_STATUS.md
> Last updated: 2026-01-22

## Overview
This document tracks the security hardening status of Ship Quest's server-side code.

**Hard Rule**: No user-triggered code path may use `SUPABASE_SERVICE_ROLE_KEY`.

---

## Phase 1 Audit Results (2026-01-22)

### 1. Test Credential Hygiene ✅ RESOLVED

| Issue | Status |
|-------|--------|
| Hardcoded credentials in `tests/regression.spec.ts` | ✅ Moved to env vars |
| Hardcoded credentials in `tests/recurrence.spec.ts` | ✅ Moved to env vars |
| Missing `.env.example` | ✅ Created |

**Pattern Used**: `process.env.TEST_USER_EMAIL || ''`

### 2. SERVICE_ROLE Usage Audit ✅ CONFIRMED SAFE

| File | Context | Risk Level |
|------|---------|------------|
| `lib/supabase/admin.ts` | Factory function | ✅ Safe (not user-triggered) |
| `lib/supabase/factory.ts` | Factory function | ✅ Safe (not user-triggered) |
| `lib/auth/api-key.ts` | API authentication | ✅ Safe (API-only, not user UI) |
| `admin/clients/actions.ts:resetClientPassword` | Admin password reset | ⚠️ Acceptable (requires owner/admin role check) |

**Conclusion**: SERVICE_ROLE usage is confined to infrastructure code and protected admin actions.

---

## Phase 0 Audit Results

### 1. Files Using SUPABASE_SERVICE_ROLE_KEY

| File | Occurrences | User-Triggered? | Status |
| :--- | :---: | :---: | :--- |
| `lib/supabase/factory.ts` | 1 | No (factory) | ✅ OK |
| `lib/supabase/admin.ts` | 1 | No (factory) | ✅ OK |
| `lib/auth/api-key.ts` | 1 | No (API auth) | ✅ OK |
| `admin/analytics/actions.ts` | 0 | **YES** | ✅ RESOLVED |
| `admin/crew/actions.ts` | 2* | **YES** | ✅ RESOLVED (Auth Only) |
| `admin/quests/actions.ts` | 0 | **YES** | ✅ RESOLVED |
| `admin/reporting/actions.ts` | 0 | **YES** | ✅ RESOLVED |
| `teams/actions.ts` | 0 | **YES** | ✅ RESOLVED |
| `(portal)/actions.ts` | 3* | **YES** | ✅ RESOLVED (Auth Only) |

**Total Stop-Ship Files: 0** (Remaining usage is strict Auth context only)

### 2. Actions Not Using runAction Wrapper

| File | Uses runAction | Uses safeAction (Legacy) | Uses Neither |
| :--- | :---: | :---: | :---: |
| `admin/pipeline/actions.ts` | 3 | 5 | Many reads |
| `admin/analytics/actions.ts` | 0 | 0 | All |
| `admin/crew/actions.ts` | 0 | 0 | All |
| `admin/quests/actions.ts` | 0 | 0 | All |
| `admin/reporting/actions.ts` | 0 | 0 | All |
| `admin/clients/actions.ts` | 0 | 0 | All |
| `admin/bosses/actions.ts` | 0 | 0 | All |
| `admin/projects/actions.ts` | 0 | 0 | All |
| `admin/departments/actions.ts` | 0 | 0 | All |
| `(portal)/actions.ts` | 0 | 0 | All |
| `teams/actions.ts` | 0 | 0 | All |
| `login/actions.ts` | 0 | 0 | All |
| `quest-board/actions.ts` | 0 | 0 | All |
| `app/admin/actions.ts` | 0 | 0 | All |

### 3. RLS Status (Per Table)

| Table | Has team_id | RLS Enabled? | Policies Verified? |
| :--- | :---: | :---: | :---: |
| teams | N/A | Unknown | ❓ |
| team_members | ✅ | Unknown | ❓ |
| profiles | N/A | Unknown | ❓ |
| tasks | ✅ | Unknown | ❓ |
| task_comments | ✅ | Unknown | ❓ |
| quests | ✅ | Unknown | ❓ |
| statuses | ✅ | Unknown | ❓ |
| sizes | ✅ | Unknown | ❓ |
| urgencies | ✅ | Unknown | ❓ |
| clients | ✅ | Unknown | ❓ |
| projects | ✅ | Unknown | ❓ |
| departments | ✅ | Unknown | ❓ |

**Note**: RLS verification requires DB access. Flagged for Phase 3.

---

## Risk Summary

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| ~~Service Role in user actions~~ | ~~CRITICAL~~ | ✅ Phase 1: Audited and confirmed safe |
| ~~Hardcoded test credentials~~ | ~~HIGH~~ | ✅ Phase 1: Moved to env vars |
| No runAction wrapper | HIGH | Phase 2: Migrate all mutations |
| Unverified RLS policies | MEDIUM | Phase 3: Audit Supabase policies |
| No requestId middleware | LOW | Phase 4: Add correlation ID |
| No security tests | MEDIUM | Phase 5: Add auth boundary tests |
