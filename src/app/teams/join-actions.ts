'use server'

import { getUserClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function joinTeam(orgId: string) {
    return await runAction('joinTeam', async () => {
        if (!orgId) {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Organization ID is required.' } }
        }

        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated.' } }
        }

        // 1. Check if organization exists
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('id', orgId)
            .single()

        if (teamError || !team) {
            return { success: false, error: { code: 'NOT_FOUND', message: 'Organization not found. Check the ID.' } }
        }

        // 2. Add user to team_members
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: joinError } = await (supabase.from('team_members') as any).insert({
            team_id: orgId,
            user_id: user.id,
            role: 'member' // Default role
        })

        if (joinError) {
            // distinct handling for "already member"
            if (joinError.code === '23505') { // Unique violation
                return { success: false, error: { code: 'CONFLICT', message: 'You are already a member of this Alliance.' } }
            }
            return { success: false, error: { code: 'DB_ERROR', message: `Failed to join: ${joinError.message}` } }
        }

        // 3. Set cookie context
        const cookieStore = await cookies()
        cookieStore.set('selected_team', orgId)

        revalidatePath('/')
        return { success: true, data: { teamId: orgId } }
    })
}

export async function joinSquad(subTeamId: string) {
    return await runAction('joinSquad', async () => {
        if (!subTeamId) {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Squad ID is required.' } }
        }

        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated.' } }
        }

        // Add user to sub_team_members
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: joinError } = await (supabase.from('sub_team_members') as any).insert({
            sub_team_id: subTeamId,
            user_id: user.id
        })

        if (joinError) {
            if (joinError.code === '23505') {
                return { success: true, data: undefined } // Already in
            }
            return { success: false, error: { code: 'DB_ERROR', message: `Failed to join squad: ${joinError.message}` } }
        }

        revalidatePath('/')
        return { success: true, data: undefined }
    })
}
