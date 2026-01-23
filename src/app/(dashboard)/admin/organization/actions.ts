'use server'

import { getUserClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { revalidatePath } from 'next/cache'

export async function updateOrganizationProfile(
    teamId: string,
    data: { description?: string, website?: string, contact_email?: string }
) {
    return await runAction('updateOrganizationProfile', async () => {
        const supabase = await getUserClient()

        // Check permissions (Owner/Admin)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: member } = await (supabase.from('team_members') as any)
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .single()

        if (!member || !['owner', 'admin'].includes(member.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Insufficient command rank.' } }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('teams') as any)
            .update({
                description: data.description || null,
                website: data.website || null,
                contact_email: data.contact_email || null
            })
            .eq('id', teamId)

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: error.message } }
        }

        revalidatePath('/admin/organization')
        return { success: true, data: null }
    })
}
