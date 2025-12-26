'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Team } from '@/lib/types'

export async function getUserTeams(): Promise<Team[]> {
    const supabase = await createClient()

    // 1. Verify User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.warn('getUserTeams: No authenticated user found.', {
            error: authError?.message,
            code: authError?.code
        })
        return []
    }

    // 2. Fetch Teams via Team Members (Explicit Join/Subquery Pattern)
    // This ensures we only get teams the user is actually a member of, compliant with RLS.
    // Query: Select teams where id is in the list of team_ids from team_members for this user.

    // First, get the team IDs the user belongs to.
    const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

    if (memberError) {
        console.error('getUserTeams: Error fetching team memberships.', JSON.stringify(memberError, null, 2))
        return []
    }

    const teamIds = memberData.map(m => m.team_id)

    if (teamIds.length === 0) {
        return []
    }

    // Now fetch the actual details for these teams
    const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)
        .order('created_at', { ascending: false })

    if (teamsError) {
        console.error('getUserTeams: Error fetching team details.', {
            message: teamsError.message,
            code: teamsError.code,
            details: teamsError.details,
            hint: teamsError.hint
        })
        return []
    }

    const teams = teamsData as Team[]

    return teams
}

export async function createTeam(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    const { data, error } = await supabase
        .from('teams')
        .insert({ name, slug })
        .select()
        .single()

    if (error) {
        console.error('Error creating team:', error)
        // In a real app, return error state to form
        // return { error: error.message }
        redirect('/?error=Failed to create team')
    }

    // Add creator as owner in team_members
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
        await supabase.from('team_members').insert({
            team_id: data.id,
            user_id: userData.user.id,
            role: 'owner'
        })
    }

    redirect(`/${data.slug}`) // Assuming dynamic route for team
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function initializeTeamData(teamId: string) {
    console.log('Initializing Team Data for ID:', teamId)
    const supabase = await createClient()

    try {
        const { error } = await supabase.rpc('initialize_team_defaults', {
            target_team_id: teamId
        })

        if (error) {
            console.error('RPC Error initializing team:', error)
            return { success: false, error: error.message }
        }

    } catch (e: any) {
        console.error('Unexpected error initializing team:', e)
        return { success: false, error: 'An unexpected error occurred during initialization.' }
    }


    // Refresh context
    redirect('/')
}

export async function initializeTeamConfiguration(teamId: string, config: any) {
    console.log('Initializing Team Config for ID:', teamId)
    const supabase = await createClient()

    try {
        const { error } = await supabase.rpc('initialize_team_configuration', {
            target_team_id: teamId,
            config: config
        })

        if (error) {
            console.error('RPC Error initializing team config:', error)
            return { success: false, error: error.message }
        }

    } catch (e: any) {
        console.error('Unexpected error initializing team config:', e)
        return { success: false, error: 'An unexpected error occurred during initialization.' }
    }

    // Refresh context
    redirect('/')
}
