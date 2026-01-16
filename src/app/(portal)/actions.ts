'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getUserClient, getAdminClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { Result } from '@/lib/result'
import { revalidatePath } from 'next/cache'

// 1. Auth: Sign Up with Invite (Requires Admin for User Creation + Link)
export async function signUpWithInvite(
    token: string,
    email: string,
    password: string
): Promise<Result<void>> {
    return runAction('signUpWithInvite', async () => {
        const supabaseAdmin = getAdminClient()

        // 1. Verify Invite
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: invite, error: inviteError } = await (supabaseAdmin.from('client_invitations') as any)
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single()

        if (inviteError || !invite) {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid or expired invitation' } }
        }

        // 2. Create User
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: email.split('@')[0] }
        })

        let userId = userData.user?.id

        if (createError) {
            // Handle "User already exists" gracefully
            if (createError.message.includes('already been registered') || createError.status === 422) {
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const existingUser = users?.find((u: any) => u.email === email)

                if (existingUser) {
                    if (existingUser.email_confirmed_at) {
                        return { success: false, error: { code: 'CONFLICT', message: 'User already exists.' } }
                    }

                    // For unconfirmed users, claim the account
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        email_confirm: true,
                        password: password
                    })
                    userId = existingUser.id
                } else {
                    return { success: false, error: { code: 'CONFLICT', message: 'User already exists.' } }
                }
            } else {
                return { success: false, error: { code: 'INTERNAL_ERROR', message: createError.message } }
            }
        }

        if (!userId) return { success: false, error: { code: 'INTERNAL_ERROR', message: 'User creation failed.' } }

        // 3. Link to Client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: memberError } = await (supabaseAdmin.from('client_members') as any)
            .insert({
                client_id: invite.client_id,
                user_id: userId,
                role: 'member'
            })

        if (memberError && memberError.code !== '23505') {
            return { success: false, error: { code: 'DB_ERROR', message: memberError.message } }
        }

        // 4. Mark Accepted
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin.from('client_invitations') as any)
            .update({ status: 'accepted' })
            .eq('id', invite.id)

        return { success: true, data: undefined }
    })
}

// 2. Auth: Accept Invite (Existing User)
export async function acceptClientInvite(token: string, email: string): Promise<Result<void>> {
    return runAction('acceptClientInvite', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Must be logged in.' } }

        // Use Admin to verify invite (bypass RLS for invitations table if public read is not allowed)
        // Ideally invitations should be readable if you have the token? No, row level security usually filters by user.
        // Public/Anonymous access to invitations by token is a valid pattern, but using Admin here for safety.
        const supabaseAdmin = getAdminClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: invite, error: inviteError } = await (supabaseAdmin.from('client_invitations') as any)
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single()

        if (inviteError || !invite) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid or expired invitation' } }
        if (invite.email && invite.email !== user.email) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invitation email mismatch.' } }

        // Link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: memberError } = await (supabaseAdmin.from('client_members') as any)
            .insert({
                client_id: invite.client_id,
                user_id: user.id,
                role: 'member'
            })

        if (memberError && memberError.code !== '23505') {
            return { success: false, error: { code: 'DB_ERROR', message: memberError.message } }
        }

        // Update Invite
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin.from('client_invitations') as any)
            .update({ status: 'accepted' })
            .eq('id', invite.id)

        return { success: true, data: undefined }
    })
}

// 3. Dashboard Data: Read View (Should use RLS)
export async function getClientDashboardData(): Promise<Result<any>> {
    return runAction('getClientDashboardData', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: true, data: { clients: [], tasks: [], teams: [], statuses: [], profile: null, shouldChangePassword: false, isStaff: false } }
        }

        // Check Staff via RLS (reading own team_members)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: staffData } = await (supabase.from('team_members') as any)
            .select('user_id')
            .eq('user_id', user.id)
            .limit(1)

        const isStaff = !!(staffData && staffData.length > 0)

        // Fetch Profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).single()

        // Fetch Clients (RLS: read own client_members)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: members, error: memberError } = await (supabase.from('client_members') as any)
            .select(`
                client_id, 
                role, 
                clients!client_id(
                    id, name, company_name, team_id,
                    teams!team_id(id, name)
                )
            `)
            .eq('user_id', user.id)

        if (memberError) {
            console.error('getMembers error', memberError)
            // Proceed with empty
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validClients = (members || []).map((m: any) => m.clients).filter(Boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientIds = validClients.map((c: any) => c.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uniqueTeamIds = Array.from(new Set(validClients.map((c: any) => c.team_id)))

        if (clientIds.length === 0) {
            return { success: true, data: { clients: [], tasks: [], teams: [], statuses: [], profile, shouldChangePassword: false, isStaff } }
        }

        const [tasksRes, statusesRes] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('tasks') as any).select('*, status:statuses!status_id(id, name, category, color), urgency:urgencies!urgency_id(name, color)').in('client_id', clientIds).order('created_at', { ascending: false }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('statuses') as any).select('*').in('team_id', uniqueTeamIds).eq('is_active', true).order('sort_order', { ascending: true })
        ])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teams = validClients.reduce((acc: any[], current: any) => {
            if (current.teams && !acc.find((t: any) => t.id === current.teams.id)) {
                acc.push(current.teams)
            }
            return acc
        }, [])

        return {
            success: true,
            data: {
                clients: validClients,
                tasks: tasksRes.data || [],
                teams: teams,
                statuses: statusesRes.data || [],
                profile,
                shouldChangePassword: user.user_metadata?.must_change_password || false,
                isStaff
            }
        }
    })
}

export async function updateProfile(data: { phone?: string }): Promise<Result<void>> {
    return runAction('updateProfile', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('profiles') as any)
            .update({ phone: data.phone })
            .eq('id', user.id)

        if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } }

        revalidatePath('/portal/dashboard')
        return { success: true, data: undefined }
    })
}

// Helper - EXPORTED for Page usage
export async function getTicketDetails(taskId: string) {
    const supabase = await getUserClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error } = await (supabase.from('tasks') as any)
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

    if (error || !task) throw new Error('Ticket not found or access denied')
    return task
}

export async function addClientComment(taskId: string, content: string): Promise<Result<void>> {
    return runAction('addClientComment', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }

        // Check if we can see the task (RLS check implicit)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: task } = await (supabase.from('tasks') as any)
            .select('team_id')
            .eq('id', taskId)
            .single()

        if (!task) return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('task_comments') as any)
            .insert({
                task_id: taskId,
                team_id: task.team_id,
                author_id: user.id,
                content
            })

        if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } }

        revalidatePath(`/portal/tickets/${taskId}`)
        return { success: true, data: undefined }
    })
}

export async function approveTicket(taskId: string): Promise<Result<void>> {
    return runAction('approveTicket', async () => {
        const supabase = await getUserClient()

        // 1. Get Task
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: task } = await (supabase.from('tasks') as any).select('team_id').eq('id', taskId).single()
        if (!task) return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }

        // 2. Get Done Status (Read via UserClient)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: doneStatus } = await (supabase.from('statuses') as any)
            .select('id')
            .eq('team_id', task.team_id)
            .eq('category', 'done')
            .order('sort_order')
            .limit(1)
            .single()

        if (!doneStatus) return { success: false, error: { code: 'INTERNAL_ERROR', message: 'No Done status found' } }

        // 3. Update Status (Via UserClient - RLS must allow this for Client Members)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('tasks') as any)
            .update({ status_id: doneStatus.id })
            .eq('id', taskId)

        if (error) return { success: false, error: { code: 'DB_ERROR', message: `Update failed: ${error.message}` } }

        // 4. Audit Comment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('task_comments') as any).insert({
                task_id: taskId,
                team_id: task.team_id,
                author_id: user.id,
                content: '✅ [TICKET APPROVED] Client has validated the deliverables and marked the ticket as Done.'
            })
        }

        revalidatePath(`/portal/tickets/${taskId}`)
        revalidatePath('/portal/dashboard')
        revalidatePath('/quest-board')
        revalidatePath('/admin/pipeline')
        return { success: true, data: undefined }
    })
}

export async function requestChanges(taskId: string, comment: string): Promise<Result<void>> {
    return runAction('requestChanges', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        // 1. Get Task
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: task } = await (supabase.from('tasks') as any).select('team_id').eq('id', taskId).single()
        if (!task) return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }

        // 2. Add Comment
        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('task_comments') as any).insert({
                task_id: taskId,
                team_id: task.team_id,
                author_id: user.id,
                content: `❌ [CHANGES REQUESTED] ${comment}`
            })
        }

        // 3. Find target status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: items } = await (supabase.from('statuses') as any)
            .select('id')
            .eq('team_id', task.team_id)
            .eq('category', 'active')
            .order('sort_order', { ascending: true })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let targetStatusId = items?.[0]?.id

        if (!targetStatusId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: backlog } = await (supabase.from('statuses') as any)
                .select('id')
                .eq('team_id', task.team_id)
                .eq('category', 'backlog')
                .limit(1)
                .single()
            targetStatusId = backlog?.id
        }

        if (!targetStatusId) return { success: false, error: { code: 'INTERNAL_ERROR', message: 'No target status found.' } }

        // 4. Update (User Client)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('tasks') as any)
            .update({ status_id: targetStatusId })
            .eq('id', taskId)

        if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } }

        revalidatePath(`/portal/tickets/${taskId}`)
        revalidatePath('/portal/dashboard')
        revalidatePath('/quest-board')
        revalidatePath('/admin/pipeline')
        return { success: true, data: undefined }
    })
}

export async function createClientTicket(
    clientId: string,
    title: string,
    description: string,
    urgencyId?: string
): Promise<Result<void>> {
    return runAction('createClientTicket', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }

        // 1. Verify Membership
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: membership } = await (supabase.from('client_members') as any)
            .select('client_id, clients!client_id(team_id)')
            .eq('user_id', user.id)
            .eq('client_id', clientId)
            .single()

        if (!membership || !membership.clients) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Client not found or access denied' } }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teamId = membership.clients.team_id

        // 2. Get Defaults (User Client)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: statuses } = await (supabase.from('statuses') as any)
            .select('id, category')
            .eq('team_id', teamId)
            .order('sort_order')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let statusId = statuses?.find((s: any) => s.category === 'backlog')?.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!statusId) statusId = statuses?.find((s: any) => s.category === 'active')?.id
        if (!statusId) statusId = statuses?.[0]?.id

        if (!statusId) return { success: false, error: { code: 'INTERNAL_ERROR', message: 'No statuses defined' } }

        // Active Quest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: activeQuest } = await (supabase.from('quests') as any)
            .select('id')
            .eq('team_id', teamId)
            .eq('is_active', true)
            .maybeSingle()

        let questId = activeQuest?.id
        if (!questId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: latestQuest } = await (supabase.from('quests') as any)
                .select('id')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            questId = latestQuest?.id
        }

        if (!questId) return { success: false, error: { code: 'INTERNAL_ERROR', message: 'No Quests found.' } }

        // 3. Create Task (User Client)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: taskError } = await (supabase.from('tasks') as any)
            .insert({
                team_id: teamId,
                quest_id: questId,
                client_id: clientId,
                title: title,
                description: description,
                status: 'todo', // Fallback or remove if status_id is enough? The schema might require status text or ID.
                status_id: statusId,
                urgency_id: urgencyId || null,
                size_id: null,
                created_by: user.id
            })

        if (taskError) return { success: false, error: { code: 'DB_ERROR', message: taskError.message } }

        revalidatePath('/portal/dashboard')
        revalidatePath('/quest-board')
        revalidatePath('/admin/pipeline')
        return { success: true, data: undefined }
    })
}

export async function updateClientPassword(password: string): Promise<Result<void>> {
    return runAction('updateClientPassword', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }

        const supabaseAdmin = getAdminClient()
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: password,
            user_metadata: { must_change_password: false }
        })

        if (error) return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }

        return { success: true, data: undefined }
    })
}

// Notifications
export async function getNotifications(): Promise<any[]> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('notifications') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    return data || []
}

export async function markNotificationRead(id: string) {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)

    revalidatePath('/portal/notifications')
}
