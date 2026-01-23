'use server'

import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { runAction, safeAction } from '@/lib/safe-action'
import { getRoleContext } from '@/lib/role-service'
import { getUserClient, getAdminClient } from '@/lib/supabase/factory'
import { Database } from '@/lib/database.types'
import { TaskService } from '@/services/task-service'
import { EisenhowerService } from '@/services/eisenhower-service'
import { Task } from '@/lib/types'

// Get all tasks for the pipeline (no category filtering)
export async function getTasks(teamId: string, filters?: { statusCategory?: string; questId?: string; search?: string; clientId?: string; quadrant?: string }) {
    const supabase = await getUserClient()

    noStore()
    // Build query
    let query = supabase
        .from('tasks')
        .select(`
            *,
            status:statuses!status_id(id, name, category),
            size:sizes!size_id(id, name, xp_points),
            urgency:urgencies!urgency_id(id, name, color),
            assignee:profiles!assigned_to(id, email, first_name, last_name),
            creator:profiles!created_by(id, email, first_name, last_name),
            quest:quests!quest_id(id, name),
            project:projects!project_id(id, name),
            department:departments!department_id(id, name),
            client:clients!client_id(id, name, logo_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

    if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId)
    }

    const { data, error } = await query

    if (error) {
        console.error('getTasks: Failed', error)
        return { error: `[${error.code}] ${error.message} ` }
    }

    const enriched = EisenhowerService.enrichTasks(data as unknown as Task[])

    let finalData = enriched
    if (filters?.quadrant) {
        finalData = finalData.filter(t => t.quadrant === filters.quadrant)
    }

    // Safe log: only count
    console.log(`DEBUG: getTasks returned ${finalData.length} rows`)
    return finalData
}

// Get projects for dropdown
export async function getProjectsForDropdown(teamId: string) {
    const supabase = await getUserClient()

    const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('team_id', teamId)
        .order('name')

    return data || []
}

// Get departments for dropdown
export async function getDepartmentsForDropdown(teamId: string) {
    const supabase = await getUserClient()

    const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('team_id', teamId)
        .order('name')

    return data || []
}

// Get clients for dropdown
export async function getClientsForDropdown(teamId: string) {
    const supabase = await getUserClient()

    const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('team_id', teamId)
        .order('name')

    return data || []
}

// Get quest objectives for dropdown
export async function getQuestsForDropdown(teamId: string) {
    const supabase = await getUserClient()

    const { data } = await supabase
        .from('quests')
        .select('id, name')
        .eq('team_id', teamId)
        .is('is_archived', false)
        .order('name')

    return data || []
}

// Get crew members for assignment dropdown
export async function getCrewForAssignment(teamId: string) {
    const supabase = await getUserClient()

    const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId)
        .in('role', ['owner', 'admin', 'manager', 'analyst', 'member']) // Include all potential assignees

    // Explicit cast due to inference issue
    const members = membersData as unknown as { user_id: string; role: string }[] | null

    if (!members || members.length === 0) return []

    const userIds = members.map(m => m.user_id)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds)
        .order('first_name')

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
        project_id?: string
        department_id?: string
        client_id?: string
        is_recurring?: boolean
        recurrence_rule?: any
        recurrence_next_date?: string
        recurrence_end_date?: string
        deadline_at?: string | null
    }
) {
    return await runAction('createTask', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }
        }

        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager', 'analyst'].includes(ctx.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Insufficient clearance.' } }
        }

        // Delegate to Service Layer
        const result = await TaskService.create(teamId, user.id, data)

        if (result.success) {
            // NOTIFICATION LOGIC: If assigned, mark as unread for assignee
            if (data.assigned_to && data.assigned_to !== user.id) {
                await supabase.from('inbox_read_status').insert({
                    team_id: teamId,
                    user_id: data.assigned_to,
                    resource_type: 'task',
                    resource_id: result.data.task.id,
                    is_read: false
                } as any)
            }

            revalidatePath('/admin/pipeline')
            // Transform to expected UI contract (if needed by frontend)
            // But wait, frontend expects { success: true, questName? }
            // Our Service returns { task, questName }
            // So we return full data object
            return result
        }

        return result
    })
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

        project_id: string | null
        department_id: string | null
        client_id: string | null
        deadline_at?: string | null
        needs_info?: boolean
        was_dropped?: boolean
    }>
) {
    return await runAction('updateTask', async () => {
        const ctx = await getRoleContext(teamId)
        // Allow Owner, Admin, Manager, Analyst to update task details
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager', 'analyst'].includes(ctx.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Insufficient clearance to modify tasks.' } }
        }

        // Use Admin Client to ensure update succeeds regardless of RLS
        // (We already verified permissions above via RoleContext)
        const supabaseAdmin = getAdminClient()
        const updatePayload: any = {
            ...data,
            updated_at: new Date().toISOString()
        }

        const { error } = await (supabaseAdmin.from('tasks') as any)
            .update(updatePayload)
            .eq('id', taskId)
            .eq('team_id', teamId)

        if (error) {
            return {
                success: false,
                error: { code: 'DB_ERROR', message: `Failed to update task: ${error.message}` }
            }
        }

        revalidatePath('/admin/pipeline')
        return { success: true, data: null }
    })
}

// Delete a task - Owner only
// Delete a task - Owner only
export async function deleteTask(taskId: string, teamId: string) {
    return await runAction('deleteTask', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx || (!ctx.isOwner && !ctx.isAdmin)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only the Owner or Admin can abandon tasks.' } }
        }

        const result = await TaskService.delete(teamId, taskId)

        if (result.success) {
            revalidatePath('/admin/pipeline')
        }
        return result
    })
}

// Get single task with full details and comments
export async function getTaskWithComments(taskId: string, teamId: string) {
    return await safeAction('getTaskWithComments', async () => {
        const supabase = await getUserClient()

        noStore()
        // Get task details
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select(`
                *,
                status:statuses!status_id(id, name, category),
                size:sizes!size_id(id, name, xp_points),
                urgency:urgencies!urgency_id(id, name, color),
                assignee:profiles!assigned_to(id, email, first_name, last_name),
                creator:profiles!created_by(id, email, first_name, last_name),
                quest:quests!quest_id(id, name),
                client:clients!client_id(id, name)
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
            const { data: debugTask } = await supabase.from('tasks').select('team_id').eq('id', taskId).single()
            if (debugTask) {
                console.error(`DEBUG: Task exists but team_id is ${(debugTask as any).team_id}, expected ${teamId}`)
                return { error: `Task belongs to different team (${(debugTask as any).team_id} vs ${teamId})` }
            }
            return { error: 'Task not found or access denied' }
        }

        // Get comments (manual join for author to avoid missing FK issues)
        const { data: rawComments, error: commentsError } = await supabase
            .from('task_comments')
            .select('id, content, created_at, author_id')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true })

        if (commentsError) {
            console.error('getTaskWithComments: Comments fetch failed', commentsError)
        }

        const comments = rawComments || []
        const authorIds = [...new Set(comments.map((c: any) => c.author_id).filter(Boolean))] as string[]

        let authorsMap: Record<string, any> = {}
        let rolesMap: Record<string, string> = {}

        if (authorIds.length > 0) {
            // Fetch authors profiles and roles in parallel
            const [profilesResult, membersResult] = await Promise.all([
                supabase.from('profiles').select('id, email, first_name, last_name').in('id', authorIds),
                supabase.from('team_members').select('user_id, role').eq('team_id', teamId).in('user_id', authorIds)
            ])

            if (profilesResult.data) {
                authorsMap = Object.fromEntries(profilesResult.data.map((p: any) => [p.id, p]))
            }
            if (membersResult.data) {
                rolesMap = Object.fromEntries(membersResult.data.map((m: any) => [m.user_id, m.role]))
            }
        }

        return {
            task: task as any,
            comments: comments.map((c: any) => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                author: authorsMap[c.author_id] || { id: c.author_id, email: 'unknown' },
                authorRole: rolesMap[c.author_id] || 'member'
            }))
        }
    })
}

// Add a comment to a task
// Add a comment to a task
export async function addTaskComment(taskId: string, teamId: string, content: string) {
    return await safeAction('addTaskComment', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'SECURITY BREACH: User not authenticated.' }
        }

        if (!content || content.trim().length === 0) {
            return { success: false, error: 'PROTOCOL VIOLATION: Comment cannot be empty.' }
        }

        const { error } = await (supabase
            .from('task_comments') as any)
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

        // NOTIFICATION LOGIC
        // NOTIFICATION LOGIC
        // 1. Get Task Assignee
        const { data: taskData } = await supabase.from('tasks').select('assigned_to, title').eq('id', taskId).single()
        const task = taskData as { assigned_to: string | null; title: string } | null

        if (task) {
            const notifications = []

            // Notify Assignee (if not author)
            if (task.assigned_to && task.assigned_to !== user.id) {
                notifications.push({
                    team_id: teamId,
                    user_id: task.assigned_to,
                    resource_type: 'task',
                    resource_id: taskId,
                    is_read: false
                })
            }

            // Notify Mentioned Users (Pseudo-logic: simplistic regex for @username)
            // In a real app we'd resolve usernames to IDs. For now, let's assume we skip this or implement if we have a way to resolve.
            // Skipping mention resolution for speed unless critical.

            if (notifications.length > 0) {
                await supabase.from('inbox_read_status').upsert(notifications as any, { onConflict: 'user_id, resource_id' })
            }
        }

        revalidatePath('/admin/pipeline')
        return { success: true }
    })
}

// Update task description
// Update task description
export async function updateTaskDescription(taskId: string, teamId: string, description: string) {
    return await safeAction('updateTaskDescription', async () => {
        const ctx = await getRoleContext(teamId)
        // Allow Owner, Admin, Manager, Analyst to update description (Aligned with updateTask)
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager', 'analyst'].includes(ctx.role)) {
            return { success: false, error: 'SECURITY BREACH: Insufficient clearance to modify task descriptions.' }
        }

        // Use Admin Client to ensure update succeeds
        const supabaseAdmin = getAdminClient()

        const { error } = await (supabaseAdmin
            .from('tasks') as any)
            .update({ description: description.trim() || null, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .eq('team_id', teamId)

        if (error) {
            console.error('updateTaskDescription: Failed', error)
            return { success: false, error: `UPDATE FAILED: ${error.message}` }
        }

        revalidatePath('/admin/pipeline')
        return { success: true }
    })
}

// Abort a task (Drop)
// Abort a task (Drop)
export async function abortTask(taskId: string, teamId: string) {
    return await safeAction('abortTask', async () => {
        const ctx = await getRoleContext(teamId)
        // Allow Owner, Admin, Manager, Analyst to abort missions
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager', 'analyst'].includes(ctx.role)) {
            return { success: false, error: 'SECURITY BREACH: Insufficient clearance to abort missions.' }
        }

        const supabase = await getUserClient()

        const { error } = await (supabase
            .from('tasks') as any)
            .update({ was_dropped: true, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .eq('team_id', teamId)

        if (error) {
            console.error('abortTask: Failed', error)
            return { success: false, error: `ABORT FAILED: ${error.message}` }
        }

        revalidatePath('/admin/pipeline')
        return { success: true }
    })
}

// Reactivate a task (Undrop)
// Reactivate a task (Undrop)
export async function reactivateTask(taskId: string, teamId: string) {
    return await safeAction('reactivateTask', async () => {
        const ctx = await getRoleContext(teamId)
        // Allow Owner, Admin, Manager, Analyst to reactivate missions
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager', 'analyst'].includes(ctx.role)) {
            return { success: false, error: 'SECURITY BREACH: Insufficient clearance to reactivate missions.' }
        }

        const supabase = await getUserClient()

        const { error } = await (supabase
            .from('tasks') as any)
            .update({ was_dropped: false, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .eq('team_id', teamId)

        if (error) {
            console.error('reactivateTask: Failed', error)
            return { success: false, error: `REACTIVATION FAILED: ${error.message}` }
        }

        revalidatePath('/admin/pipeline')
        return { success: true }
    })
}
