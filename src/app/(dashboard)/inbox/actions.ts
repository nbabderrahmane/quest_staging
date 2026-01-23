'use server'

import { getUserClient } from '@/lib/supabase/factory'
import { revalidatePath } from 'next/cache'

export type InboxItemType = 'assignment' | 'comment' | 'status_change' | 'notification' | 'mention'

export interface InboxItem {
    id: string
    type: InboxItemType
    title: string
    message: string
    date: string // ISO string
    isRead: boolean
    resourceId: string
    resourceType: 'task' | 'ticket'
    actor?: {
        name: string
        avatarUrl?: string | null
    }
    metadata?: {
        statusColor?: string
        statusName?: string
        priority?: string
        questName?: string
    }
}

/**
 * Get unified unread count for a specific team context.
 */
export async function getUnreadCount(teamId: string): Promise<number> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    try {
        // 1. Explicitly marked as unread in inbox_read_status
        const { count: inboxCount } = await (supabase
            .from('inbox_read_status')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('team_id', teamId)
            .eq('is_read', false) as any)

        // 2. Direct notifications (table based)
        const { count: notifCount } = await (supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false) as any)

        // 3. New Assignments for this team
        const { data: assignedTasks } = await (supabase.from('tasks') as any)
            .select('id')
            .eq('assigned_to', user.id)
            .eq('org_id', teamId)
            .neq('status', 'done')

        const taskIds = (assignedTasks as { id: string }[])?.map(t => t.id) || []
        let newTasksCount = 0
        if (taskIds.length > 0) {
            const { data: readRecords } = await (supabase
                .from('inbox_read_status')
                .select('resource_id')
                .eq('user_id', user.id)
                .in('resource_id', taskIds) as any)
            const readIds = new Set((readRecords as { resource_id: string }[])?.map(r => r.resource_id) || [])
            newTasksCount = taskIds.filter(id => !readIds.has(id)).length
        }

        // 4. Deadline Alerts for this team
        const { data: memberData } = await (supabase
            .from('team_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('team_id', teamId)
            .maybeSingle() as any)

        let deadlineAlertsCount = 0
        if (memberData && ['owner', 'admin', 'manager', 'analyst'].includes(memberData.role)) {
            const { data: deadlineTasks } = await (supabase
                .from('tasks')
                .select(`id, deadline_at, status:statuses!status_id(category)`)
                .eq('org_id', teamId)
                .neq('status.category', 'done')
                .neq('status.category', 'archived')
                .not('deadline_at', 'is', null) as any)

            if (deadlineTasks) {
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                deadlineTasks.forEach((task: any) => {
                    const deadline = new Date(task.deadline_at)
                    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
                    const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    if (diffDays <= 1) deadlineAlertsCount++
                })
            }
        }

        return (inboxCount || 0) + (notifCount || 0) + (newTasksCount || 0) + deadlineAlertsCount
    } catch (error) {
        console.error('getUnreadCount error:', error)
        return 0
    }
}

/**
 * Get global unread count across all user teams.
 */
export async function getGlobalUnreadCount(): Promise<number> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    try {
        // 1. Notifications (Count once)
        const { count: notifCount } = await (supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false) as any)

        // 2. Global explicit unreads
        const { count: inboxCount } = await (supabase
            .from('inbox_read_status')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false) as any)

        // 3. New assignments globally
        const { data: assignedTasks } = await (supabase.from('tasks') as any)
            .select('id')
            .eq('assigned_to', user.id)
            .neq('status', 'done')

        const taskIds = (assignedTasks as { id: string }[])?.map(t => t.id) || []
        let newTasksCount = 0
        if (taskIds.length > 0) {
            const { data: readRecords } = await (supabase
                .from('inbox_read_status')
                .select('resource_id')
                .eq('user_id', user.id)
                .in('resource_id', taskIds) as any)
            const readIds = new Set((readRecords as { resource_id: string }[])?.map(r => r.resource_id) || [])
            newTasksCount = taskIds.filter(id => !readIds.has(id)).length
        }

        // 4. Global Deadline Alerts (Staff Only per team)
        const { data: memberships } = await (supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', user.id) as any)

        const staffTeamIds = (memberships as any[] || [])
            .filter(m => ['owner', 'admin', 'manager', 'analyst'].includes(m.role))
            .map(m => m.team_id)

        let deadlineAlertsCount = 0
        if (staffTeamIds.length > 0) {
            const { data: deadlineTasks } = await (supabase
                .from('tasks')
                .select(`id, deadline_at, status:statuses!status_id(category)`)
                .in('org_id', staffTeamIds)
                .neq('status.category', 'done')
                .neq('status.category', 'archived')
                .not('deadline_at', 'is', null) as any)

            if (deadlineTasks) {
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                deadlineTasks.forEach((task: any) => {
                    const deadlineDate = new Date(new Date(task.deadline_at).getFullYear(), new Date(task.deadline_at).getMonth(), new Date(task.deadline_at).getDate())
                    const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    if (diffDays <= 1) deadlineAlertsCount++
                })
            }
        }

        return (notifCount || 0) + (inboxCount || 0) + (newTasksCount || 0) + deadlineAlertsCount
    } catch (error) {
        console.error('getGlobalUnreadCount error:', error)
        return 0
    }
}

// Fetch helper
async function getReadStatusMap(userId: string, teamId: string, resourceIds: string[]) {
    const supabase = await getUserClient()
    const { data } = await supabase
        .from('inbox_read_status')
        .select('resource_id, last_read_at, is_read')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .in('resource_id', resourceIds)

    const map = new Map<string, { last_read_at: string, is_read: boolean }>()
    if (data) {
        data.forEach((item: any) => {
            map.set(item.resource_id, { last_read_at: item.last_read_at, is_read: item.is_read })
        })
    }
    return map
}

export async function getInboxFeed(): Promise<InboxItem[]> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: membership } = await (supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle() as any)

    if (!membership) return []

    const feed: InboxItem[] = []
    const resourceIdsToFetch = new Set<string>()

    try {
        // Assignments
        const { data: tasks } = await (supabase
            .from('tasks')
            .select(`
                id, title, description, created_at, updated_at, status_id, priority:urgencies!urgency_id(name, color),
                status:statuses!status_id(name, color, category),
                quest:quests!quest_id(name),
                creator:profiles!created_by(first_name, last_name)
            `)
            .eq('assigned_to', user.id)
            .neq('status.category', 'done')
            .order('updated_at', { ascending: false })
            .limit(20) as any)

        if (tasks) tasks.forEach((t: any) => resourceIdsToFetch.add(t.id))

        // Comments
        const taskIds = (tasks as { id: string }[])?.map(t => t.id) || []
        let comments: any[] = []
        if (taskIds.length > 0) {
            const { data } = await (supabase
                .from('task_comments')
                .select(`id, content, created_at, task_id, author:profiles!author_id(first_name, last_name, avatar_url), task:tasks!task_id(title, assigned_to)`)
                .in('task_id', taskIds)
                .neq('author_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20) as any)
            comments = data || []
            comments.forEach((c: any) => resourceIdsToFetch.add(c.task_id))
        }

        // Notifications
        const { data: directNotifs } = await (supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20) as any)

        const readStatusMap = await getReadStatusMap(user.id, membership.team_id, Array.from(resourceIdsToFetch))

        // Assignments
        if (tasks) {
            tasks.forEach((task: any) => {
                const rs = readStatusMap.get(task.id)
                const unread = !rs || (new Date(rs.last_read_at).getTime() < new Date(task.updated_at).getTime())
                feed.push({
                    id: task.id, type: 'assignment', title: task.title, message: 'Task assigned', date: task.updated_at, isRead: !unread, resourceId: task.id, resourceType: 'task',
                    actor: { name: `${task.creator?.first_name || ''} ${task.creator?.last_name || ''}`.trim() || 'Command' },
                    metadata: { statusColor: task.status?.color, statusName: task.status?.name, priority: task.priority?.name, questName: task.quest?.name }
                })
            })
        }

        // Comments
        comments.forEach((c: any) => {
            const mentioned = c.content?.includes(`@${user.email?.split('@')[0]}`)
            if (!mentioned && c.task?.assigned_to !== user.id) return
            const rs = readStatusMap.get(c.task_id)
            const unread = !rs || (new Date(rs.last_read_at).getTime() < new Date(c.created_at).getTime())
            feed.push({
                id: `comment-${c.id}`, type: mentioned ? 'mention' : 'comment', title: mentioned ? `Mention in ${c.task?.title}` : `Comment on ${c.task?.title}`,
                message: c.content, date: c.created_at, isRead: !unread, resourceId: c.task_id, resourceType: 'task',
                actor: { name: `${c.author?.first_name || ''} ${c.author?.last_name || ''}`.trim() || 'Agent', avatarUrl: c.author?.avatar_url }
            })
        })

        // Deadline Alerts
        if (['owner', 'admin', 'manager', 'analyst'].includes(membership.role)) {
            const { data: dt } = await (supabase.from('tasks').select(`id, title, deadline_at, status:statuses!status_id(category)`).neq('status.category', 'done').neq('status.category', 'archived').not('deadline_at', 'is', null).limit(50) as any)
            if (dt) {
                const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                dt.forEach((t: any) => {
                    const dd = new Date(new Date(t.deadline_at).getFullYear(), new Date(t.deadline_at).getMonth(), new Date(t.deadline_at).getDate())
                    const diff = Math.floor((dd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    let title = '', level = 'info'
                    if (diff === 1) { title = 'Deadline J-1'; level = 'warning' }
                    else if (diff === 0) { title = 'Deadline JOUR J'; level = 'error' }
                    else if (diff < 0) { title = 'SOUCIS DE DEADLINE (J+)'; level = 'error' }
                    if (title) feed.push({
                        id: `deadline-${t.id}-${diff}`, type: 'notification', title, message: `Alert: ${t.title}`, date: now.toISOString(), isRead: false, resourceId: t.id, resourceType: 'task',
                        metadata: { priority: level === 'error' ? 'High' : (level === 'warning' ? 'Medium' : 'Low') }
                    })
                })
            }
        }

        // Notifications
        if (directNotifs) directNotifs.forEach((n: any) => feed.push({
            id: `notif-${n.id}`, type: 'notification', title: n.title, message: n.message, date: n.created_at, isRead: n.is_read, resourceId: n.resource_id, resourceType: (n.resource_type as 'task' | 'ticket') || 'task', actor: { name: 'Command' }
        }))
    } catch (error) { console.error(error) }

    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function markItemAsRead(resourceId: string, resourceType: 'task' | 'ticket') {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }
    if (resourceId.startsWith('notif-')) {
        const id = resourceId.replace('notif-', '')
        await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id).eq('user_id', user.id)
        revalidatePath('/inbox'); return { success: true }
    }
    const { data: m } = await (supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle() as any)
    if (!m) return { success: false }
    await (supabase.from('inbox_read_status') as any).upsert({ user_id: user.id, team_id: m.team_id, resource_id: resourceId, resource_type: resourceType, last_read_at: new Date().toISOString(), is_read: true }, { onConflict: 'user_id, resource_id' })
    revalidatePath('/inbox'); return { success: true }
}

export async function markItemAsUnread(resourceId: string, resourceType: 'task' | 'ticket') {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }
    if (resourceId.startsWith('notif-')) {
        const id = resourceId.replace('notif-', '')
        await (supabase.from('notifications') as any).update({ is_read: false }).eq('id', id).eq('user_id', user.id)
        revalidatePath('/inbox'); return { success: true }
    }
    const { data: m } = await (supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle() as any)
    if (!m) return { success: false }
    await (supabase.from('inbox_read_status') as any).upsert({ user_id: user.id, team_id: m.team_id, resource_id: resourceId, resource_type: resourceType, last_read_at: new Date(0).toISOString(), is_read: false }, { onConflict: 'user_id, resource_id' })
    revalidatePath('/inbox'); return { success: true }
}

export async function getInboxTaskDetails(taskId: string) {
    const supabase = await getUserClient()
    const { data: task } = await (supabase.from('tasks') as any).select(`*, quest:quests(*), size:sizes(*), urgency:urgencies(*), status:statuses(*), assignee:profiles!assigned_to(*)`).eq('id', taskId).single()
    if (!task) return null
    const { data: c } = await (supabase.from('task_comments') as any).select(`*, author:profiles!author_id(*)`).eq('task_id', taskId).order('created_at', { ascending: true })
    return { task, comments: (c || []).map((x: any) => ({ ...x, authorRole: 'member' })) }
}
