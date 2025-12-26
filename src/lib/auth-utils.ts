import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Validates that the current user has one of the allowed roles for the given team.
 * Throws an error (or redirects) if validation fails.
 * 
 * @param teamId The team context
 * @param allowedRoles Array of allowed roles (e.g. ['owner', 'admin'])
 * @returns The user's role if validation succeeds
 */
export async function requireRole(teamId: string, allowedRoles: string[]) {
    const supabase = await createClient()

    // 1. Get Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    // 2. Get User Role in Team
    // We use a direct query to team_members. RLS should allow reading own membership.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

    if (memberError || !member) {
        console.error(`RBAC Denial: User ${user.id} has no membership in team ${teamId}`)
        throw new Error('Access Denied: You are not a member of this Alliance.')
    }

    // 3. Verify Role Usage
    if (!allowedRoles.includes(member.role)) {
        console.warn(`RBAC Denial: User ${user.id} is '${member.role}', required: [${allowedRoles.join(', ')}]`)
        throw new Error(`PROTOCOL ERROR: ACCESS RESERVED FOR [${allowedRoles.join('/').toUpperCase()}]`)
    }

    return member.role
}
