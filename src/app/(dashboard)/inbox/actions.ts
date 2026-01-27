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
        isDone?: boolean
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
        // Direct notifications (global but treated as part of this count)
        const { count: notifCount } = await (supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false) as any)

        // Assignments/Tasks for this team
        const { data: tasks } = await (supabase.from('tasks').select('id, updated_at').eq('assigned_to', user.id).eq('org_id', teamId).neq('status', 'done') as any)
        const taskList = (tasks as { id: string, updated_at: string }[]) || []
        let unreadTasksCount = 0
        if (taskList.length > 0) {
            const { data: readRecords } = await (supabase.from('inbox_read_status').select('resource_id, last_read_at, is_read').eq('user_id', user.id).in('resource_id', taskList.map(t => t.id)) as any)
            const readMap = new Map((readRecords as { resource_id: string, last_read_at: string, is_read: boolean }[])?.map(r => [r.resource_id, r]))
            unreadTasksCount = taskList.filter(t => {
                const rs = readMap.get(t.id)
                return !rs || (!rs.is_read) || (new Date(rs.last_read_at).getTime() < new Date(t.updated_at).getTime())
            }).length
        }

        // Deadline Alerts (Staff Only)
        const { data: member } = await (supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', teamId).maybeSingle() as any)
        let deadlineAlertsCount = 0
        if (member && ['owner', 'admin', 'manager', 'analyst'].includes(member.role)) {
            const { data: dt } = await (supabase.from('tasks').select(`deadline_at, status:statuses!status_id(category)`).eq('org_id', teamId).neq('status.category', 'done').neq('status.category', 'archived').not('deadline_at', 'is', null) as any)
            if (dt) {
                const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                dt.forEach((t: any) => {
                    const dd = new Date(new Date(t.deadline_at).getFullYear(), new Date(t.deadline_at).getMonth(), new Date(t.deadline_at).getDate())
                    if (Math.floor((dd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 1) deadlineAlertsCount++
                })
            }
        }

        return (notifCount || 0) + unreadTasksCount + deadlineAlertsCount
    } catch (e) { console.error(e); return 0 }
}

/**
 * Get accurate global unread count without double-counting.
 */
export async function getGlobalUnreadCount(): Promise<number> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    try {
        // 1. Direct Notifications
        const { count: notifCount } = await (supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false) as any)

        // 2. Unread Tasks globally (Assignments)
        const { data: tasks } = await (supabase.from('tasks').select('id, updated_at').eq('assigned_to', user.id).neq('status', 'done') as any)
        const taskList = (tasks as { id: string, updated_at: string }[]) || []
        let unreadTasksCount = 0
        if (taskList.length > 0) {
            const { data: readRecords } = await (supabase.from('inbox_read_status').select('resource_id, last_read_at, is_read').eq('user_id', user.id).in('resource_id', taskList.map(t => t.id)) as any)
            const readMap = new Map((readRecords as { resource_id: string, last_read_at: string, is_read: boolean }[])?.map(r => [r.resource_id, r]))
            unreadTasksCount = taskList.filter(t => {
                const rs = readMap.get(t.id)
                return !rs || (!rs.is_read) || (new Date(rs.last_read_at).getTime() < new Date(t.updated_at).getTime())
            }).length
        }

        // 3. Deadline Alerts (Staff Only per team)
        const { data: memberships } = await (supabase.from('team_members').select('team_id, role').eq('user_id', user.id) as any)
        const staffTeamIds = (memberships as any[] || []).filter(m => ['owner', 'admin', 'manager', 'analyst'].includes(m.role)).map(m => m.team_id)
        let deadlineAlertsCount = 0
        if (staffTeamIds.length > 0) {
            const { data: dt } = await (supabase.from('tasks').select(`deadline_at, status:statuses!status_id(category)`).in('org_id', staffTeamIds).neq('status.category', 'done').neq('status.category', 'archived').not('deadline_at', 'is', null) as any)
            if (dt) {
                const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                dt.forEach((t: any) => {
                    const dd = new Date(new Date(t.deadline_at).getFullYear(), new Date(t.deadline_at).getMonth(), new Date(t.deadline_at).getDate())
                    if (Math.floor((dd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 1) deadlineAlertsCount++
                })
            }
        }

        return (notifCount || 0) + unreadTasksCount + deadlineAlertsCount
    } catch (e) { console.error(e); return 0 }
}

async function getReadStatusMap(userId: string, teamId: string, resourceIds: string[]) {
    const supabase = await getUserClient()
    const { data } = await supabase.from('inbox_read_status').select('resource_id, last_read_at, is_read').eq('user_id', userId).eq('team_id', teamId).in('resource_id', resourceIds)
    const map = new Map<string, { last_read_at: string, is_read: boolean }>()
    if (data) data.forEach((item: any) => map.set(item.resource_id, item))
    return map
}

export async function getInboxFeed(): Promise<InboxItem[]> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: member } = await (supabase.from('team_members').select('team_id, role').eq('user_id', user.id).limit(1).maybeSingle() as any)
    if (!member) return []

    const feed: InboxItem[] = [], ids = new Set<string>()
    try {
        const { data: tasks } = await (supabase.from('tasks').select(`id, title, updated_at, status_id, priority:urgencies!urgency_id(name, color), status:statuses!status_id(name, color, category), quest:quests!quest_id(name), creator:profiles!created_by(first_name, last_name)`).eq('assigned_to', user.id).neq('status.category', 'done').order('updated_at', { ascending: false }).limit(20) as any)
        if (tasks) tasks.forEach((t: any) => ids.add(t.id))

        const { data: directNotifs } = await (supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20) as any)
        const rsMap = await getReadStatusMap(user.id, member.team_id, Array.from(ids))

        if (tasks) tasks.forEach((t: any) => {
            const rs = rsMap.get(t.id)
            const unread = !rs || (new Date(rs.last_read_at).getTime() < new Date(t.updated_at).getTime())
            feed.push({ id: t.id, type: 'assignment', title: t.title, message: 'New mission assigned', date: t.updated_at, isRead: !unread, resourceId: t.id, resourceType: 'task', actor: { name: `${t.creator?.first_name || ''} ${t.creator?.last_name || ''}`.trim() || 'Command' }, metadata: { statusColor: t.status?.color, statusName: t.status?.name, priority: t.priority?.name, questName: t.quest?.name } })
        })

        if (['owner', 'admin', 'manager', 'analyst', 'member'].includes(member.role)) {
            // Updated Logic: Privileged users see all, Members see assigned only.
            // Also include DONE tasks but mark them specific way
            let deadlineQuery = supabase.from('tasks').select(`id, title, deadline_at, assigned_to, status:statuses!status_id(category)`).not('deadline_at', 'is', null).limit(50)

            if (!['owner', 'admin', 'manager'].includes(member.role)) {
                deadlineQuery = deadlineQuery.eq('assigned_to', user.id)
            } else {
                // Manager/Admin sees all (filtered by team via context usually, but wait 'tasks' table has team_id/org_id?)
                // The original query didn't filter by team_id?
                // Line 128 gets member.team_id. The tasks query at line 133 filters for assigned_to user (which implies team via RLS maybe?)
                // But for deadline query (admin), we must filter by team_id
                deadlineQuery = deadlineQuery.eq('team_id', member.team_id)
            }

            const { data: dt } = await (deadlineQuery as any)

            if (dt) {
                const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                dt.forEach((t: any) => {
                    const isDone = t.status?.category === 'done' || t.status?.category === 'archived'
                    const dd = new Date(new Date(t.deadline_at).getFullYear(), new Date(t.deadline_at).getMonth(), new Date(t.deadline_at).getDate())
                    const diff = Math.floor((dd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                    // If done, we only show if it was recent? Or always?
                    // User wants them "marked as read". 
                    // To avoid spamming done tasks from years ago, maybe we filter?
                    // But for now let's just show them IF they are in the limit(50).
                    // Actually, getting all done tasks might be huge.
                    // But we have limit(50).

                    let title = ''
                    if (diff === 1) title = 'Deadline J-1'; else if (diff === 0) title = 'Deadline JOUR J'; else if (diff < 0) title = 'SOUCIS DE DEADLINE (J+)'

                    if (title) {
                        feed.push({
                            id: `deadline-${t.id}-${diff}`,
                            type: 'notification',
                            title: isDone ? `(Resolue) ${title}` : title,
                            message: `Mission Alert: ${t.title}`,
                            date: now.toISOString(),
                            isRead: isDone, // Mark as read if done
                            resourceId: t.id,
                            resourceType: 'task',
                            metadata: { isDone }
                        })
                    }
                })
            }
        }

        if (directNotifs) directNotifs.forEach((n: any) => feed.push({ id: `notif-${n.id}`, type: 'notification', title: n.title, message: n.message, date: n.created_at, isRead: n.is_read, resourceId: n.resource_id, resourceType: (n.resource_type as any) || 'task', actor: { name: 'Command' } }))
    } catch (e) { console.error(e) }
    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function markItemAsRead(id: string, type: 'task' | 'ticket') {
    const supabase = await getUserClient(), { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }
    if (id.startsWith('notif-')) {
        await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id.replace('notif-', '')).eq('user_id', user.id)
    } else {
        const { data: m } = await (supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle() as any)
        if (m) await (supabase.from('inbox_read_status') as any).upsert({ user_id: user.id, team_id: m.team_id, resource_id: id, resource_type: type, last_read_at: new Date().toISOString(), is_read: true }, { onConflict: 'user_id, resource_id' })
    }
    revalidatePath('/inbox'); return { success: true }
}

export async function markItemAsUnread(id: string, type: 'task' | 'ticket') {
    const supabase = await getUserClient(), { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }
    if (id.startsWith('notif-')) {
        await (supabase.from('notifications') as any).update({ is_read: false }).eq('id', id.replace('notif-', '')).eq('user_id', user.id)
    } else {
        const { data: m } = await (supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle() as any)
        if (m) await (supabase.from('inbox_read_status') as any).upsert({ user_id: user.id, team_id: m.team_id, resource_id: id, resource_type: type, last_read_at: new Date(0).toISOString(), is_read: false }, { onConflict: 'user_id, resource_id' })
    }
    revalidatePath('/inbox'); return { success: true }
}

export async function getInboxTaskDetails(id: string) {
    const supabase = await getUserClient()
    const { data: t } = await (supabase.from('tasks') as any).select(`*, quest:quests(*), size:sizes(*), urgency:urgencies(*), status:statuses(*), assignee:profiles!assigned_to(*)`).eq('id', id).single()
    if (!t) return null
    const { data: c } = await (supabase.from('task_comments') as any).select(`*, author:profiles!author_id(*)`).eq('task_id', id).order('created_at', { ascending: true })
    return { task: t, comments: (c || []).map((x: any) => ({ ...x, authorRole: 'member' })) }
}
