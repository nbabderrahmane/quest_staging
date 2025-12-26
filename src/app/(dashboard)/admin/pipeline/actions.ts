'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

// Get all tasks for the pipeline (no category filtering)
export async function getTasks(teamId: string, filters?: { statusCategory?: string; questId?: string; search?: string }) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    noStore()
    // Build query
    let query = supabaseAdmin
        .from('tasks')
        .select(`
            *,
            status:statuses!status_id(id, name, category),
            size:sizes!size_id(id, name, xp_points),
            urgency:urgencies!urgency_id(id, name, color),
            assignee:profiles!assigned_to(id, email, first_name, last_name),
            creator:profiles!created_by(id, email, first_name, last_name),
            quest:quests!quest_id(id, name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
        console.error('getTasks: Failed', error)
        return { error: `[${error.code}] ${error.message} ` }
    }

    console.log(`DEBUG: getTasks returned ${data ? data.length : 0} rows. IDs: [${(data || []).map((t: any) => t.id).join(', ')}]`)
    return data || []
}

// Get quest objectives for dropdown
export async function getQuestsForDropdown(teamId: string) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data } = await supabaseAdmin
        .from('quests')
        .select('id, name')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('name')

    return data || []
}

// Get crew members for assignment dropdown
export async function getCrewForAssignment(teamId: string) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: members } = await supabaseAdmin
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId)

    if (!members || members.length === 0) return []

    const userIds = members.map(m => m.user_id)
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds)

    return profiles || []
}

// Create a new task - Owner/Admin only
export async function createTask(
    teamId: string,
    data: {
        title: string
        description?: string
        quest_id?: string
        size_id?: string
        urgency_id?: string
        assigned_to?: string
    }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'SECURITY BREACH: User not authenticated.' }
    }

    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.role || !['owner', 'admin', 'manager', 'analyst'].includes(ctx.role)) {
        return { success: false, error: 'SECURITY BREACH: Insufficient clearance to decree tasks.' }
    }

    if (!data.title || data.title.trim().length === 0) {
        return { success: false, error: 'PROTOCOL VIOLATION: Task title is required.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Auto-assign backlog status: get oldest status with category 'backlog'
    const { data: backlogStatus, error: statusError } = await supabaseAdmin
        .from('statuses')
        .select('id')
        .eq('team_id', teamId)
        .eq('category', 'backlog')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    if (statusError || !backlogStatus) {
        return { success: false, error: 'FORGE ERROR: No Backlog status found. Please configure the Forge first.' }
    }

    // Get quest name if provided
    let questName: string | null = null
    if (data.quest_id) {
        const { data: questData } = await supabaseAdmin
            .from('quests')
            .select('name')
            .eq('id', data.quest_id)
            .single()
        questName = questData?.name || null
    }

    // Debug: Log payload before insert
    const taskPayload = {
        team_id: teamId,
        created_by: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        quest_id: data.quest_id || null,
        status_id: backlogStatus.id,
        size_id: data.size_id || null,
        urgency_id: data.urgency_id || null,
        assigned_to: data.assigned_to || null
    }
    console.log('Task Data Payload:', taskPayload)

    const { error } = await supabaseAdmin
        .from('tasks')
        .insert(taskPayload)

    if (error) {
        console.error('createTask: Failed', error)
        return { success: false, error: `TASK CREATION FAILED: ${error.message} ` }
    }

    revalidatePath('/admin/pipeline')
    return { success: true, questName }
}

// Update a task
export async function updateTask(
    taskId: string,
    teamId: string,
    data: Partial<{
        title: string
        description: string
        quest_id: string | null
        status_id: string
        size_id: string
        urgency_id: string
        assigned_to: string | null
        needs_info?: boolean
    }>
) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can modify tasks.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('tasks')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('team_id', teamId)

    if (error) {
        console.error('updateTask: Failed', error)
        return { success: false, error: `TASK UPDATE FAILED: ${error.message} ` }
    }

    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Delete a task - Owner only
export async function deleteTask(taskId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.isOwner) {
        return { success: false, error: 'SECURITY BREACH: Only the Owner can abandon tasks.' }
    }
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('team_id', teamId)

    if (error) {
        console.error('deleteTask: Failed', error)
        return { success: false, error: `TASK DELETION FAILED: ${error.message} ` }
    }

    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Get single task with full details and comments
export async function getTaskWithComments(taskId: string, teamId: string) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    noStore()
    // Get task details
    const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .select(`
            *,
            status:statuses!status_id(id, name, category),
            size:sizes!size_id(id, name, xp_points),
            urgency:urgencies!urgency_id(id, name, color),
            assignee:profiles!assigned_to(id, email, first_name, last_name),
            creator:profiles!created_by(id, email, first_name, last_name),
            quest:quests!quest_id(id, name)
        `)
        .eq('id', taskId)
        .eq('team_id', teamId)
        .maybeSingle()

    if (taskError) {
        console.error('getTaskWithComments: Query error', taskError)
        return { error: `DB Error: ${taskError.message}` }
    }

    if (!task) {
        console.error(`getTaskWithComments: Task not found. ID: ${taskId}, Team: ${teamId}`)
        // Fallback: Check if task exists without team_id filter to debug
        const { data: debugTask } = await supabaseAdmin.from('tasks').select('team_id').eq('id', taskId).single()
        if (debugTask) {
            console.error(`DEBUG: Task exists but team_id is ${debugTask.team_id}, expected ${teamId}`)
            return { error: `Task belongs to different team (${debugTask.team_id} vs ${teamId})` }
        }
        return { error: 'Task not found or access denied' }
    }

    // Get comments with author info
    const { data: comments, error: commentsError } = await supabaseAdmin
        .from('task_comments')
        .select(`
            id,
            content,
            created_at,
            author:author_id(id, email, first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

    if (commentsError) {
        console.error('getTaskWithComments: Comments fetch failed', commentsError)
    }

    // Get author roles for icons
    const authorIds = (comments || []).map((c: any) => c.author?.id).filter(Boolean)
    let authorRoles: Record<string, string> = {}

    if (authorIds.length > 0) {
        const { data: members } = await supabaseAdmin
            .from('team_members')
            .select('user_id, role')
            .eq('team_id', teamId)
            .in('user_id', authorIds)

        if (members) {
            authorRoles = Object.fromEntries(members.map(m => [m.user_id, m.role]))
        }
    }

    return {
        task,
        comments: (comments || []).map((c: any) => ({
            ...c,
            authorRole: authorRoles[c.author?.id] || 'member'
        }))
    }
}

// Add a comment to a task
export async function addTaskComment(taskId: string, teamId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'SECURITY BREACH: User not authenticated.' }
    }

    if (!content || content.trim().length === 0) {
        return { success: false, error: 'PROTOCOL VIOLATION: Comment cannot be empty.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('task_comments')
        .insert({
            task_id: taskId,
            team_id: teamId,
            author_id: user.id,
            content: content.trim()
        })

    if (error) {
        console.error('addTaskComment: Failed', error)
        return { success: false, error: `COMMENT FAILED: ${error.message}` }
    }

    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Update task description
export async function updateTaskDescription(taskId: string, teamId: string, description: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can modify task descriptions.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('tasks')
        .update({ description: description.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('team_id', teamId)

    if (error) {
        console.error('updateTaskDescription: Failed', error)
        return { success: false, error: `UPDATE FAILED: ${error.message}` }
    }

    revalidatePath('/admin/pipeline')
    return { success: true }
}
