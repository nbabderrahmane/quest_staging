'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Server Action Import
import { createAdminClient } from '@/lib/supabase/admin'

// ... existing imports ...

export async function signUpWithInvite(token: string, email: string, password: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Verify Invite Validity
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('client_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single()

        if (inviteError || !invite) throw new Error('Invalid or expired invitation')

        // 2. Create User (Confirmed)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: email.split('@')[0]
            }
        })

        if (createError) {
            // Check if user already exists
            if (createError.message.includes('already been registered') || createError.status === 422) {
                // Fetch the user to see if they need confirmation
                const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers()
                const existingUser = users?.find(u => u.email === email)

                if (existingUser && !existingUser.email_confirmed_at) {
                    // Auto-confirm the user so they can login
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { email_confirm: true })
                }

                return { success: false, error: 'User already exists', code: 'USER_EXISTS' }
            }
            throw createError
        }
        const user = userData.user

        // 3. Link to Client
        const { error: memberError } = await supabaseAdmin
            .from('client_members')
            .insert({
                client_id: invite.client_id,
                user_id: user.id,
                role: 'member'
            })

        if (memberError && memberError.code !== '23505') throw memberError

        // 4. Mark Invite Accepted
        await supabaseAdmin
            .from('client_invitations')
            .update({ status: 'accepted' })
            .eq('id', invite.id)

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function acceptClientInvite(token: string, email: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error('You must be logged in to accept an invitation.')

        // Verify Invite using Admin to bypass RLS
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('client_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single()

        if (inviteError || !invite) {
            console.error('Invite verification error:', inviteError)
            throw new Error('Invalid or expired invitation')
        }

        // Email check
        if (invite.email && invite.email !== user.email) {
            throw new Error('This invitation is for a different email address.')
        }

        // Create Member Link using Admin to bypass RLS
        const { error: memberError } = await supabaseAdmin
            .from('client_members')
            .insert({
                client_id: invite.client_id,
                user_id: user.id,
                role: 'member'
            })

        if (memberError) {
            if (memberError.code === '23505') {
                console.log('User already a member, updating invite status anyway.')
            } else {
                console.error('Membership creation error:', memberError)
                throw memberError
            }
        }

        // Update Invite Status using Admin
        await supabaseAdmin
            .from('client_invitations')
            .update({ status: 'accepted' })
            .eq('id', invite.id)

        return { success: true }
    } catch (error: any) {
        console.error('acceptClientInvite exception:', error)
        return { success: false, error: error.message }
    }
}

export async function getClientDashboardData() {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { clients: [], tasks: [], teams: [], statuses: [], profile: null, shouldChangePassword: false, isStaff: false }
    }

    // Run profile and staff check in parallel
    const [profileRes, staffRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabaseAdmin.from('team_members').select('user_id').eq('user_id', user.id).limit(1)
    ])

    const profile = profileRes.data
    const isStaff = !!(staffRes.data && staffRes.data.length > 0)

    // Get Clients I belong to
    const { data: members, error: memberError } = await supabase
        .from('client_members')
        .select(`
            client_id, 
            role, 
            clients!client_id(
                id, name, company_name, team_id,
                teams!team_id(id, name)
            )
        `)
        .eq('user_id', user.id)

    if (memberError) console.error('Error fetching client_members:', memberError)

    if (!members || members.length === 0) {
        return { clients: [], tasks: [], teams: [], statuses: [], profile, shouldChangePassword: false, isStaff }
    }

    const validClients = members.map((m: any) => m.clients).filter((c: any) => c !== null)
    const clientIds = validClients.map((c: any) => c.id)
    const uniqueTeamIds = Array.from(new Set(validClients.map((c: any) => c.team_id)))

    // Get Tasks and Statuses in parallel
    const [tasksRes, statusesRes] = await Promise.all([
        supabase.from('tasks').select('*, status:statuses!status_id(id, name, category, color), urgency:urgencies!urgency_id(name, color)').in('client_id', clientIds).order('created_at', { ascending: false }),
        supabase.from('statuses').select('*').in('team_id', uniqueTeamIds).eq('is_active', true).order('sort_order', { ascending: true })
    ])

    // Extract unique teams for the filter
    const teams = validClients.reduce((acc: any[], current: any) => {
        if (current.teams && !acc.find(t => t.id === current.teams.id)) {
            acc.push(current.teams)
        }
        return acc
    }, [])

    return {
        clients: validClients,
        tasks: tasksRes.data || [],
        teams: teams,
        statuses: statusesRes.data || [],
        profile,
        shouldChangePassword: user.user_metadata?.must_change_password || false,
        isStaff
    }
}

export async function checkUserRoles() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { isStaff: false, isClient: false }

    const [staffRes, clientRes] = await Promise.all([
        supabase.from('team_members').select('user_id').eq('user_id', user.id).limit(1),
        supabase.from('client_members').select('id').eq('user_id', user.id).limit(1)
    ])

    return {
        isStaff: !!(staffRes.data && staffRes.data.length > 0),
        isClient: !!(clientRes.data && clientRes.data.length > 0)
    }
}


export async function updateProfile(data: { phone?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({
            phone: data.phone
        })
        .eq('id', user.id)

    if (error) {
        console.error('updateProfile error:', error)
        throw error
    }

    revalidatePath('/portal/dashboard')
    return { success: true }
}

export async function getTicketDetails(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Verify Access via RLS
    const { data: task, error } = await supabase
        .from('tasks')
        .select(`
            *,
            status:statuses!status_id(*),
            urgency:urgencies!urgency_id(*),
            size:sizes!size_id(*),
            comments:task_comments!task_id(
                id, content, created_at, author_id, 
                profiles!author_id(first_name, last_name, email)
            )
        `)
        .eq('id', taskId)
        .single()

    if (error || !task) {
        console.error('getTicketDetails error:', error)
        throw new Error('Ticket not found or access denied')
    }

    return task
}

export async function addClientComment(taskId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Need team_id for comments
    const { data: task } = await supabase
        .from('tasks')
        .select('team_id')
        .eq('id', taskId)
        .single()

    if (!task) throw new Error('Task not found')

    const { error } = await supabase
        .from('task_comments')
        .insert({
            task_id: taskId,
            team_id: task.team_id,
            author_id: user.id,
            content
        })

    if (error) {
        console.error('addClientComment error:', error)
        throw error
    }

    revalidatePath(`/portal/tickets/${taskId}`)
    return { success: true }
}

export async function approveTicket(taskId: string) {
    const supabase = await createClient()

    // 1. Get Task to find Team ID
    const task = await getTicketDetails(taskId)

    // 2. Find 'Done' status for this team
    const { data: doneStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('team_id', task.team_id)
        .eq('category', 'done')
        .order('sort_order')
        .limit(1)
        .single()

    if (!doneStatus) throw new Error('Configuration error: No Done status found.')

    // 3. Update Status (Use Admin Client to bypass RLS for portal members)
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('tasks')
        .update({ status_id: doneStatus.id })
        .eq('id', taskId)

    if (error) throw error

    // 4. Add Audit Comment
    await addClientComment(taskId, '✅ [TICKET APPROVED] Client has validated the deliverables and marked the ticket as Done.')

    // 5. Create Notification for Team (TODO)

    revalidatePath(`/portal/tickets/${taskId}`)
    revalidatePath('/portal/dashboard')
    revalidatePath('/quest-board')
    revalidatePath('/admin/pipeline')
    return { success: true }
}

export async function requestChanges(taskId: string, comment: string) {
    const supabase = await createClient()

    // 1. Add Comment
    await addClientComment(taskId, `❌ [CHANGES REQUESTED] ${comment}`)

    // 2. Get Task to find Team ID
    const task = await getTicketDetails(taskId)

    // 3. Find 'Active' status (or 'To Do') for this team to revert to
    // We'll pick the first 'active' status
    const { data: items } = await supabase
        .from('statuses')
        .select('id')
        .eq('team_id', task.team_id)
        .eq('category', 'active')
        .order('sort_order', { ascending: true }) // First active status

    let targetStatusId = items?.[0]?.id

    // Fallback: Backlog?
    if (!targetStatusId) {
        const { data: backlog } = await supabase.from('statuses').select('id').eq('team_id', task.team_id).eq('category', 'backlog').limit(1).single()
        targetStatusId = backlog?.id
    }

    if (!targetStatusId) throw new Error('Configuration error: No target status found.')

    // 4. Update Status (Use Admin Client to bypass RLS for portal members)
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('tasks')
        .update({ status_id: targetStatusId })
        .eq('id', taskId)

    if (error) throw error

    revalidatePath(`/portal/tickets/${taskId}`)
    revalidatePath('/portal/dashboard')
    revalidatePath('/quest-board')
    revalidatePath('/admin/pipeline')
    return { success: true }
}

export async function getNotifications() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    return data || []
}

export async function markNotificationRead(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)

    revalidatePath('/portal/notifications')
}

export async function createClientTicket(clientId: string, title: string, description: string, urgencyId?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        // 1. Verify Membership & Get Team ID (Using User Client for Security)
        const { data: membership } = await supabase
            .from('client_members')
            .select('client_id, clients!client_id(team_id)')
            .eq('user_id', user.id)
            .eq('client_id', clientId)
            .single()

        if (!membership || !membership.clients) throw new Error('Unauthorized or Client not found')

        // @ts-ignore
        const teamId = membership.clients.team_id

        // 2. Get Default Status & Active Quest - Using Admin Client
        const supabaseAdmin = createAdminClient()

        // Find 'backlog' status
        const { data: statuses } = await supabaseAdmin
            .from('statuses')
            .select('id, category')
            .eq('team_id', teamId)
            .order('sort_order')

        let statusId = statuses?.find(s => s.category === 'backlog')?.id
        if (!statusId) statusId = statuses?.find(s => s.category === 'active')?.id
        if (!statusId) statusId = statuses?.[0]?.id

        if (!statusId) throw new Error('System configuration error: No statuses defined for this team.')

        // Find Active Quest (Required by Tasks table)
        const { data: activeQuest } = await supabaseAdmin
            .from('quests')
            .select('id')
            .eq('team_id', teamId)
            .eq('is_active', true)
            .maybeSingle()

        let questId = activeQuest?.id
        if (!questId) {
            // Fallback to latest quest
            const { data: latestQuest } = await supabaseAdmin
                .from('quests')
                .select('id')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            questId = latestQuest?.id
        }

        if (!questId) throw new Error('System configuration error: No Quests found. Please create a Quest in Admin first.')

        // 3. Create Task
        const { error: taskError } = await supabaseAdmin
            .from('tasks')
            .insert({
                team_id: teamId,
                quest_id: questId,
                client_id: clientId,
                title: title,
                description: description,
                status_id: statusId,
                urgency_id: urgencyId || null,
                size_id: null,
                created_by: user.id
            })

        if (taskError) throw taskError

        revalidatePath('/portal/dashboard')
        revalidatePath('/quest-board')
        revalidatePath('/admin/pipeline')

        return { success: true }
    } catch (e: any) {
        console.error('Error creating client ticket:', e)
        return { success: false, error: e.message || 'An unknown error occurred' }
    }
}

export async function updateClientPassword(password: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const supabaseAdmin = createAdminClient()
    try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: password,
            user_metadata: { must_change_password: false }
        })
        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('updateClientPassword error:', error)
        return { success: false, error: error.message }
    }
}
