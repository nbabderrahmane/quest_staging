import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

/**
 * Factory for creating a user-scoped Supabase client.
 * Uses cookies/auth header to identify the caller.
 * Enforces RLS (Row Level Security).
 */
export async function getUserClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/**
 * Factory for creating a service-role (Admin) Supabase client.
 * BYPASSES ALL RLS. Use ONLY for:
 * 1. Admin-only operations where RLS is impossible.
 * 2. Background jobs.
 * 3. Role/Permission verifications that require elevated access.
 * 
 * @security This client has SUPERUSER privileges.
 */
export function getAdminClient() {
    return createAdmin<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
