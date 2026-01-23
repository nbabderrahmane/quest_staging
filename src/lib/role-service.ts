'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Ship Quest Doctrine: Centralized Role Service
 * 
 * This is the SINGLE SOURCE OF TRUTH for user roles.
 * All UI components and Server Actions should use this function.
 */

export interface RoleContext {
    userId: string
    teamId: string
    role: string | null
    isOwner: boolean
    isAdmin: boolean
    isManager: boolean
    isDeveloper: boolean
    canManageForge: boolean  // owner, admin
    canAssignTasks: boolean  // manager only
    canViewData: boolean     // all roles
}

/**
 * Get the current user's role for a specific team.
 * Uses the get_user_role SQL function if available, otherwise queries team_members directly.
 */
export async function getCurrentUserRole(teamId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Direct query to team_members (SQL function may not exist yet)
    const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

    if (error || !data) {
        console.error('getCurrentUserRole: Failed to fetch role', error)
        return null
    }

    return data.role
}

/**
 * Get full role context with computed permissions.
 * Automatically detects team from cookie or uses provided teamId.
 */
export async function getRoleContext(teamIdOverride?: string): Promise<RoleContext | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Get team ID from cookie or override
    let teamId = teamIdOverride
    if (!teamId) {
        const cookieStore = await cookies()
        teamId = cookieStore.get('selected_team')?.value
    }

    // If still no team, try to get first team
    if (!teamId) {
        const { data: memberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1)

        teamId = memberships?.[0]?.team_id
    }

    if (!teamId) return null

    const role = await getCurrentUserRole(teamId)

    return {
        userId: user.id,
        teamId,
        role,
        isOwner: role === 'owner',
        isAdmin: role === 'admin',
        isManager: role === 'manager',
        isDeveloper: role === 'developer',
        canManageForge: role === 'owner' || role === 'admin',
        canAssignTasks: role === 'manager',
        canViewData: role !== null,
    }
}

/**
 * Get the active team ID from cookie or fallback to first team.
 */
export async function getActiveTeamId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const cookieStore = await cookies()
    const cookieTeamId = cookieStore.get('selected_team')?.value

    if (cookieTeamId) return cookieTeamId

    // Fallback: get first team
    const { data } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)

    return data?.[0]?.team_id || null
}
