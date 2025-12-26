# Deployment Guide (Vercel)

## 1. Environment Variables
Ensure the following variables are set in your Vercel Project Settings:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Public Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key (Critical for Admin Actions) |

## 2. Deployment Steps

### Option A: Via GitHub Integration (Recommended)
1.  Push your code to the `main` branch of your repository (`quest_staging`).
    ```bash
    git push -u origin main
    ```
2.  Go to Vercel Dashboard -> Add New Project.
3.  Import `quest_staging`.
4.  Paste the Environment Variables.
5.  Click **Deploy**.

### Option B: Via Vercel CLI
If you prefer deploying directly from your terminal:
```bash
npx vercel --prod
```
*Follow the prompts and link the project.*

## 3. Post-Deployment Verification
-   **Login**: Verify admin login works.
-   **Quest Board**: Check if dragging tasks works (triggers confetti).
-   **Boss Bar**: Confirm it loads active quest data.
