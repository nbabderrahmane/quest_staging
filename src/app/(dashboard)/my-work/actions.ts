'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { EisenhowerService } from '@/services/eisenhower-service'
import { TaskService } from '@/services/task-service'
import { Task } from '@/lib/types'
import { revalidatePath } from 'next/cache'

import { WIP_LIMIT } from './constants'

/**
 * Fetches and groups tasks for the My Work page.
 */
export async function getMyWorkTasks(teamId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Fetch all tasks assigned to user that are NOT archived
    const { data: rawTasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            quest:quests(*),
            size:sizes(*),
            urgency:urgencies(*),
            status:statuses(*),
            project:projects(*),
            department:departments(*),
            client:clients(*)
        `)
        .eq('team_id', teamId)
        .eq('assigned_to', ctx.userId)
        .neq('status.category', 'archived')

    if (error) {
        console.error('Error fetching My Work tasks:', error)
        return { now: [], next: [], waiting: [], wip: 0 }
    }

    const tasks = (rawTasks as unknown as Task[]) || []

    // 2. Enrich with Eisenhower
    const enriched = EisenhowerService.enrichTasks(tasks)
    const sorted = EisenhowerService.sortTasks(enriched)

    // 3. Grouping
    const doneTasks = sorted.filter(t => t.status?.category === 'done')
    const waitingTasks = sorted.filter(t => t.needs_info && t.status?.category !== 'done')
    const activeTasks = sorted.filter(t => !t.needs_info && t.status?.category !== 'done')

    // WIP: In Progress tasks
    const wipTasks = activeTasks.filter(t => t.status?.category === 'active')
    const wipCount = wipTasks.length

    // Sections
    const now = activeTasks.slice(0, 3)
    const next = activeTasks.slice(3, 15) // max 12 more

    return {
        now,
        next,
        waiting: waitingTasks,
        wip: wipCount
    }
}

/**
 * Starts a task (moves to 'active' category status).
 */
export async function startTask(teamId: string, taskId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return { success: false, error: 'Unauthorized' }

    const supabase = await createClient()

    // WIP Check
    const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('assigned_to', ctx.userId)
        .eq('status.category', 'active')

    if (count !== null && count >= WIP_LIMIT) {
        return { success: false, error: `WIP limit reached (${WIP_LIMIT}). Finish or block a mission first.` }
    }

    // Find first 'active' status for the team
    const { data: activeStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('team_id', teamId)
        .eq('category', 'active')
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()

    if (!activeStatus) return { success: false, error: 'No active status found in Forge.' }

    const res = await TaskService.update(teamId, taskId, { status_id: activeStatus.id, needs_info: false })

    // Log comment
    if (res.success) {
        await supabase.from('task_comments').insert({
            task_id: taskId,
            author_id: ctx.userId,
            content: 'Mission started. Priority lock established.'
        })
        revalidatePath('/my-work')
    }

    return res
}

/**
 * Blocks a task (needs_info = true).
 */
export async function blockTask(teamId: string, taskId: string, reason: string = 'Needs info') {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return { success: false, error: 'Unauthorized' }

    const res = await TaskService.update(teamId, taskId, { needs_info: true })

    if (res.success) {
        const supabase = await createClient()
        await supabase.from('task_comments').insert({
            task_id: taskId,
            author_id: ctx.userId,
            content: `Blocked: ${reason}`
        })
        revalidatePath('/my-work')
    }

    return res
}

/**
 * Unblocks a task (needs_info = false).
 */
export async function unblockTask(teamId: string, taskId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return { success: false, error: 'Unauthorized' }

    const res = await TaskService.update(teamId, taskId, { needs_info: false })

    if (res.success) {
        const supabase = await createClient()
        await supabase.from('task_comments').insert({
            task_id: taskId,
            author_id: ctx.userId,
            content: 'Unblocked. Back to active registry.'
        })
        revalidatePath('/my-work')
    }

    return res
}

/**
 * Completes a task (moves to 'done' category status).
 */
export async function completeTask(teamId: string, taskId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return { success: false, error: 'Unauthorized' }

    const supabase = await createClient()

    // Find first 'done' status for the team
    const { data: doneStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('team_id', teamId)
        .eq('category', 'done')
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()

    if (!doneStatus) return { success: false, error: 'No done status found in Forge.' }

    const res = await TaskService.update(teamId, taskId, { status_id: doneStatus.id, needs_info: false })

    if (res.success) {
        await supabase.from('task_comments').insert({
            task_id: taskId,
            author_id: ctx.userId,
            content: 'Mission Objective COMPLETE. Archiving record.'
        })
        revalidatePath('/my-work')
    }

    return res
}
