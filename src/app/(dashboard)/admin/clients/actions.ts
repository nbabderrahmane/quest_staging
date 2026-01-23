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

// Create new client with departments
export async function createNewClient(formData: FormData) {
    const supabase = await createClient()
    const teamId = formData.get('teamId') as string
    const companyName = formData.get('companyName') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const departmentIds = formData.getAll('departmentIds') as string[]

    try {
        // 1. Construct Display Name
        let displayName = companyName.trim()
        if (firstName.trim() || lastName.trim()) {
            displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
            if (companyName.trim()) {
                displayName += ` (${companyName.trim()})`
            }
        }
        if (!displayName) throw new Error('Client name required')

        // 2. Insert Client
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .insert({
                team_id: teamId,
                name: displayName,
                company_name: companyName.trim() || null,
                first_name: firstName.trim() || null,
                last_name: lastName.trim() || null,
                email: email.trim() || null,
                phone: phone.trim() || null
            })
            .select()
            .single()

        if (clientError) throw clientError

        // 3. Insert Departments
        if (departmentIds.length > 0) {
            const deptInserts = departmentIds.map(deptId => ({
                client_id: client.id,
                department_id: deptId
            }))
            const { error: deptError } = await supabase
                .from('client_departments')
                .insert(deptInserts)

            if (deptError) throw deptError
        }

        revalidatePath('/admin/clients')
        return { success: true, data: client }
    } catch (error: any) {
        return { error: error.message }
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

// Update client department assignments
export async function updateClientDepartments(clientId: string, departmentIds: string[]) {
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

        // Verify Team Membership & Role
        const { data: membership } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', clientData.team_id)
            .eq('user_id', user.id)
            .single()

        if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
            throw new Error('Insufficient permissions')
        }

        // Delete existing assignments
        const { error: deleteError } = await supabase
            .from('client_departments')
            .delete()
            .eq('client_id', clientId)

        if (deleteError) throw deleteError

        // Insert new assignments
        if (departmentIds.length > 0) {
            const inserts = departmentIds.map(deptId => ({
                client_id: clientId,
                department_id: deptId
            }))
            const { error: insertError } = await supabase
                .from('client_departments')
                .insert(inserts)

            if (insertError) throw insertError
        }

        revalidatePath(`/admin/clients/${clientId}`)
        revalidatePath('/admin/clients')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Get client departments
export async function getClientDepartments(clientId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('client_departments')
        .select('department_id')
        .eq('client_id', clientId)

    if (error) return []
    return data.map(d => d.department_id)
}

