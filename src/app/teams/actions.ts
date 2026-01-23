'use server'

import { createClient as createServerClient } from '@/lib/supabase/server' // Legacy alias
import { getUserClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { Result } from '@/lib/result'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Team } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

function generateCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export async function getUserTeams(): Promise<Team[]> {
    const supabase = await getUserClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return []

    // Fetch team memberships
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberData, error: memberError } = await (supabase.from('team_members') as any)
        .select('team_id')
        .eq('user_id', user.id)

    if (memberError || !memberData || memberData.length === 0) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamIds = memberData.map((m: any) => m.team_id)

    // Fetch team details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teamsData, error: teamsError } = await (supabase.from('teams') as any)
        .select('*')
        .in('id', teamIds)
        .order('created_at', { ascending: false })

    if (teamsError) return []

    return teamsData as Team[]
}

export async function createTeam(formData: FormData) {
    const supabase = await getUserClient()
    const name = formData.get('name') as string
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
        redirect('/login')
    }

    const domain = userData.user.email?.split('@')[1]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('teams') as any)
        .insert({
            name,
            slug,
            created_by: userData.user.id,
            domain,
            join_code_admin: `ADM-${generateCode()}`,
            join_code_manager: `MGR-${generateCode()}`,
            join_code_analyst: `AST-${generateCode()}`,
            join_code_developer: `DEV-${generateCode()}`,
            join_code_member: `MBR-${generateCode()}`
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating team:', error)
        redirect('/?error=Failed to create team')
    }

    // Add creator as owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('team_members') as any).insert({
        team_id: data.id,
        user_id: userData.user.id,
        role: 'owner'
    })

    // Create default "General" squad
    try {
        const { data: squad, error: squadError } = await (supabase.from('sub_teams') as any)
            .insert({
                org_id: data.id,
                name: 'General'
            })
            .select()
            .single()

        if (!squadError && squad) {
            // Join creator to General squad
            await (supabase.from('sub_team_members') as any).insert({
                sub_team_id: squad.id,
                user_id: userData.user.id
            })
        }
    } catch (squadErr) {
        console.error('Non-critical: Failed to create default squad', squadErr)
    }

    const cookieStore = await cookies()
    cookieStore.set('selected_team', data.id)

    redirect('/')
}

export async function signOut() {
    const supabase = await getUserClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function initializeTeamData(teamId: string) {
    const supabase = await getUserClient()
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)('initialize_team_defaults', { target_team_id: teamId })
    } catch (e) {
        console.error('Error initializing team:', e)
    }
    redirect('/')
}

export async function initializeTeamConfiguration(teamId: string, config: Record<string, unknown>) {
    const supabase = await getUserClient()
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)('initialize_team_configuration', { target_team_id: teamId, config: config })
    } catch (e) {
        console.error('Error initializing team config:', e)
    }
    redirect('/')
}

export async function uploadTeamLogo(formData: FormData): Promise<Result<{ url: string }>> {
    return runAction('uploadTeamLogo', async () => {
        const supabase = await getUserClient()
        const teamId = formData.get('teamId') as string
        const file = formData.get('file') as File

        if (!teamId || !file) {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing team ID or file.' } }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: membership } = await (supabase.from('team_members') as any)
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .single()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only Commanders can update branding.' } }
        }

        const fileExt = file.name.split('.').pop()
        const filePath = `${teamId}/logo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            return { success: false, error: { code: 'INTERNAL_ERROR', message: `Upload failed: ${uploadError.message}` } }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('team-logos')
            .getPublicUrl(filePath)

        // RLS Enforced Update (User must have permission via policy)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('teams') as any)
            .update({ logo_url: publicUrl })
            .eq('id', teamId)

        if (updateError) {
            return { success: false, error: { code: 'DB_ERROR', message: `Failed to update alliance record: ${updateError.message}` } }
        }

        revalidatePath('/')
        return { success: true, data: { url: publicUrl } }
    })
}

export async function getMatchingAlliances(domain: string): Promise<Team[]> {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
        .from('teams')
        .select('*')
        .eq('domain', domain)

    if (error) return []
    return data as Team[]
}

export async function joinAllianceByCode(code: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()

    // Find team and role by code
    const roles = ['admin', 'manager', 'analyst', 'developer', 'member']
    let targetTeamId = null
    let targetRole = 'member'

    const upperCode = code.toUpperCase().trim()

    for (const role of roles) {
        const { data: team } = await supabaseAdmin
            .from('teams')
            .select('id')
            .eq(`join_code_${role}`, upperCode)
            .single()

        if (team) {
            targetTeamId = team.id
            targetRole = role
            break
        }
    }

    if (!targetTeamId) {
        return { success: false, error: 'Invalid join code. Authorization denied.' }
    }

    // Join team
    const { error: joinError } = await supabaseAdmin
        .from('team_members')
        .insert({
            team_id: targetTeamId,
            user_id: user.id,
            role: targetRole
        })

    if (joinError) {
        if (joinError.code === '23505') return { success: false, error: 'You are already a member of this alliance.' }
        return { success: false, error: joinError.message }
    }

    // Join General squad if it exists
    const { data: generalSquad } = await supabaseAdmin
        .from('sub_teams')
        .select('id')
        .eq('org_id', targetTeamId)
        .eq('name', 'General')
        .single()

    if (generalSquad) {
        await supabaseAdmin
            .from('sub_team_members')
            .insert({
                sub_team_id: generalSquad.id,
                user_id: user.id
            })
    }

    const cookieStore = await cookies()
    cookieStore.set('selected_team', targetTeamId)

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function generateAllianceCodes(teamId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check permissions (Owner/Admin only)
    const { data: membership } = await (supabase.from('team_members') as any)
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return { success: false, error: 'Only Commanders can generate security codes.' }
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('teams')
        .update({
            join_code_admin: `ADM-${generateCode()}`,
            join_code_manager: `MGR-${generateCode()}`,
            join_code_analyst: `AST-${generateCode()}`,
            join_code_developer: `DEV-${generateCode()}`,
            join_code_member: `MBR-${generateCode()}`
        })
        .eq('id', teamId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/')
    return { success: true }
}
