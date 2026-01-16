import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export interface ApiUser {
    id: string
    email?: string
    role?: string
}

export async function validateApiKey(request: Request): Promise<{ success: true; user: ApiUser } | { success: false; error: string; status: number }> {
    const apiKey = request.headers.get('x-api-key')

    if (!apiKey) {
        return { success: false, error: 'Missing x-api-key header', status: 401 }
    }

    // 1. Hash the provided key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    // 2. Lookup in DB (Using Admin Client to bypass RLS, since we are validating the key)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: keyRecord, error } = await supabaseAdmin
        .from('api_keys')
        .select('user_id, last_used_at')
        .eq('key_hash', keyHash)
        .single()

    if (error || !keyRecord) {
        return { success: false, error: 'Invalid API Key', status: 401 }
    }

    // 3. Update last_used_at (async, don't await)
    supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash).then()

    // 4. Get User Details
    // We need the user to establish context.
    // Ideally, we return a Supabase client acting as this user, or just the user ID.
    // For now, let's return the user ID.

    return {
        success: true,
        user: { id: keyRecord.user_id }
    }
}
