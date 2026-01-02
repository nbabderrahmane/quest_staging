'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Ship Quest Doctrine: Unified Role Detection
 * 
 * Uses the Admin Client to bypass RLS and ensure 100% reliable role detection
 * regardless of how many teams or organizations a user belongs to.
 */
export async function getUnifiedUserRoles() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.log('[getUnifiedUserRoles] No user session found')
        return { isStaff: false, isClient: false, userId: null, requiresSelection: false }
    }

    const admin = createAdminClient()

    // Run checks in parallel with admin privileges
    const [staffRes, clientRes] = await Promise.all([
        admin.from('team_members').select('user_id').eq('user_id', user.id).limit(1),
        admin.from('client_members').select('id').eq('user_id', user.id).limit(1)
    ])

    const isStaff = !!(staffRes.data && staffRes.data.length > 0)
    const isClient = !!(clientRes.data && clientRes.data.length > 0)

    console.log('[getUnifiedUserRoles]', {
        userId: user.id,
        isStaff,
        isClient,
        staffDataLength: staffRes.data?.length,
        clientDataLength: clientRes.data?.length,
        staffError: staffRes.error,
        clientError: clientRes.error
    })

    return {
        isStaff,
        isClient,
        userId: user.id,
        requiresSelection: isStaff && isClient
    }
}
