'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function inviteClientUser(clientId: string, email?: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        // Verify Access (User must belong to the team that owns the client)
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('team_id')
            .eq('id', clientId)
            .single()

        if (clientError || !clientData) throw new Error('Client not found')

        // Verify Team Membership
        const { data: membership } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', clientData.team_id)
            .eq('user_id', user.id)
            .single()

        if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
            throw new Error('Insufficient permissions')
        }

        // Create Invitation
        const { data, error } = await supabase
            .from('client_invitations')
            .insert({
                client_id: clientId,
                email: email || null, // Allow null for generic invites
                status: 'pending'
            })
            .select('token')
            .single()

        if (error) throw error

        revalidatePath(`/admin/clients/${clientId}`)
        return { success: true, token: data.token }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getClientInvitations(clientId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('client_invitations')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) return []
    return data
}

export async function deleteClientInvitation(id: string) {
    const supabase = await createClient()
    await supabase.from('client_invitations').delete().eq('id', id)
    revalidatePath('/admin/clients')
}

export async function resetClientPassword(userIdOrEmail: string, newPassword: string) {
    const supabaseAdmin = createAdminClient()

    try {
        let targetUserId = userIdOrEmail

        // If it looks like an email, look up the user ID
        if (userIdOrEmail.includes('@')) {
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            if (listError) throw listError
            const user = users.find(u => u.email === userIdOrEmail)
            if (!user) throw new Error('User not found with this email')
            targetUserId = user.id
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            password: newPassword,
            user_metadata: { must_change_password: true }
        })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Update default analyst mapping
export async function updateClientAnalyst(teamId: string, clientId: string, analystId: string | null) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        // Verify Team Membership & Role
        const { data: membership } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .single()

        if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
            throw new Error('Insufficient permissions')
        }

        const { error } = await supabase
            .from('clients')
            .update({ default_analyst_id: analystId })
            .eq('id', clientId)
            .eq('team_id', teamId)

        if (error) throw error

        revalidatePath('/admin/clients')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
