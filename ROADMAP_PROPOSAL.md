# Ship Quest Next Steps - Roadmap Proposal

Based on the recent work on Recurrence, Reporting, and Notifications, and a review of the system architecture, here are the recommended next steps to elevate the solution.

## 1. Quick Wins (Low Effort, High Impact)

### A. Notifications Deep-Dive
- **Action**: Add "Notification Settings" in User Profile.
- **Why**: Currently, notifications are all-or-nothing. Users might want to mute "Comment" alerts but keep "Deadline" alerts.
- **Tech**: Add `notification_preferences` column to `profiles` (JSONB) and filter in `getInboxFeed` / API triggers.

### B. Recurrence UI Polishing
- **Action**: Add "Recurs Every X" badge on Task Cards in the Board.
- **Why**: Users can't distinguish a recurring task from a normal one in the Board view until they open it.
- **Tech**: Front-end change in `QuestBoard`.

### C. Client Portal "Lite"
- **Action**: Add a "Public Status Page" for clients.
- **Why**: Clients currently need full login. A read-only hashed link (e.g., `shipquest.com/status/xyz-123`) would allow "low friction" updates.
- **Tech**: New public route `src/app/status/[token]/page.tsx`.

## 2. Technical Health (Medium Effort)

### A. Type Safety Refactor
- **Action**: Remove `as any` casts in `src/app/(dashboard)/admin/reporting/actions.ts` and `inbox/actions.ts`.
- **Why**: These were added for velocity but reduce type safety.
- **Tech**: Define proper Return Types interfacing with Supabase auto-generated types.

### B. End-to-End Testing (CI Ready)
- **Action**: Fix the `npm run build` permission issues locally and set up a GitHub Actions workflow.
- **Why**: You are manually deploying/verifying. CI Automation prevents regression.
- **Tech**: `.github/workflows/ci.yml` + fixing the `node_modules` permission issue (likely using `docker` for local dev or fixing `nvm`).

## 3. High Value / "Wow" Features (High Effort)

### A. "The Oracle" (AI Integration)
- **Action**: Re-integrate an LLM (via Vercel AI SDK or the previous MCP attempt).
- **Features**:
  - "Summarize this Sprint": GenAI report of what happened.
  - "Auto-Triage": AI suggests priority/size based on description.
- **Tech**: Vercel AI SDK is cleaner than the custom MCP server for Next.js app integration.

### B. Gamification 2.0
- **Action**: Add Leaderboards and "Streaks".
- **Why**: You have XP, but no comparison.
- **Tech**: New `leaderboards` widget in Dashboard. Logic to calculate "Weekly Velocity".

## Summary Recommendation
I recommend starting with **1.B (Recurrence UI)** and **2.A (Type Safety)** as they solidify the recent work. Then, **3.A** would be a huge differentiator.
