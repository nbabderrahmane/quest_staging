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

// Get unread notification count for badge
export async function getUnreadCount(teamId: string): Promise<number> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return 0

    try {
        // 1. Count unread tasks (assigned to user, not done, and either no read_status record or is_read = false)
        // This is a bit complex for a single query, so we'll fetch task IDs and then check read status.
        // For performance in counts, we can approximate or use a subquery if supported.
        // Actually, let's just use the notifications table for the most accurate "number" if we want to be fast.
        // BUT the user wants Inbox numbers. Inbox contains more than just notifications.

        // Let's use a simpler heuristic for now: count notifications + explicit is_read=false records.
        // If we want to show numbers for "New missions", we'd need to join.

        const { count: inboxCount } = await supabase
            .from('inbox_read_status')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('team_id', teamId)
            .eq('is_read', false)

        const { count: notifCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        // Additionally, count tasks assigned to user NOT in read_status table
        // (SQL: SELECT count(*) FROM tasks WHERE assigned_to = UID AND id NOT IN (SELECT resource_id FROM inbox_read_status WHERE user_id = UID))
        const { data: assignedTasks } = await (supabase.from('tasks') as any)
            .select('id')
            .eq('assigned_to', user.id)
            .neq('status', 'done')

        const taskIds = (assignedTasks as { id: string }[])?.map(t => t.id) || []
        let newTasksCount = 0

        if (taskIds.length > 0) {
            const { data: readRecords } = await (supabase
                .from('inbox_read_status') as any)
                .select('resource_id')
                .eq('user_id', user.id)
                .in('resource_id', taskIds)

            const readIds = new Set((readRecords as { resource_id: string }[])?.map(r => r.resource_id) || [])
            newTasksCount = taskIds.filter(id => !readIds.has(id)).length
        }

        return (inboxCount || 0) + (notifCount || 0) + (newTasksCount || 0)
    } catch (error) {
        console.error('Failed to get unread count:', error)
        return 0
    }
}

// Helper to get read status for a batch of items
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
            map.set(item.resource_id, {
                last_read_at: item.last_read_at,
                is_read: item.is_read
            })
        })
    }
    return map
}

export async function getInboxFeed(): Promise<InboxItem[]> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Get user's active team membership to scope items
    const { data: membershipData } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    const membership = membershipData as { team_id: string; role: string } | null

    if (!membership) return []

    const feed: InboxItem[] = []
    const resourceIdsToFetch = new Set<string>()

    try {
        // 1. Fetch Assignments (Active Tasks assigned to user)
        const { data: tasks } = await supabase
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
            .limit(20)

        if (tasks) {
            tasks.forEach((task: any) => resourceIdsToFetch.add(task.id))
        }

        // 2. Comments logic
        const taskIds = tasks?.map((t: any) => t.id) || []
        let comments: any[] = []

        if (taskIds.length > 0) {
            const { data: fetchedComments } = await supabase
                .from('task_comments')
                .select(`
                    id, content, created_at, task_id,
                    author:profiles!author_id(first_name, last_name, avatar_url),
                    task:tasks!task_id(title, assigned_to)
                `)
                .in('task_id', taskIds)
                .neq('author_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            comments = fetchedComments || []
            comments.forEach((c: any) => resourceIdsToFetch.add(c.task_id))
        }

        // 3. Direct Notifications from notifications table
        const { data: directNotifs } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        // Fetch Read Status Map
        const readStatusMap = await getReadStatusMap(user.id, membership.team_id, Array.from(resourceIdsToFetch))

        // Process Tasks
        if (tasks) {
            tasks.forEach((task: any) => {
                const readStatus = readStatusMap.get(task.id)
                // Unread if: No read record OR last_read_at < updated_at
                const isUnread = !readStatus || (new Date(readStatus.last_read_at).getTime() < new Date(task.updated_at).getTime())

                feed.push({
                    id: task.id,
                    type: 'assignment',
                    title: task.title,
                    message: 'Mission Status Update',
                    date: task.updated_at,
                    isRead: !isUnread,
                    resourceId: task.id,
                    resourceType: 'task',
                    actor: {
                        name: `${task.creator?.first_name || ''} ${task.creator?.last_name || ''}`.trim() || 'Command',
                    },
                    metadata: {
                        statusColor: task.status?.color,
                        statusName: task.status?.name,
                        priority: task.priority?.name,
                        questName: task.quest?.name
                    }
                })
            })
        }

        // Process Comments
        if (comments) {
            comments.forEach((comment: any) => {
                const isMentioned = comment.content?.includes(`@${user.email?.split('@')[0]}`)
                const isAssignee = comment.task?.assigned_to === user.id

                if (!isMentioned && !isAssignee) return

                const readStatus = readStatusMap.get(comment.task_id)
                // Unread if: No read record OR last_read_at < comment.created_at
                const isUnread = !readStatus || (new Date(readStatus.last_read_at).getTime() < new Date(comment.created_at).getTime())

                feed.push({
                    id: `comment-${comment.id}`,
                    type: isMentioned ? 'mention' : 'comment',
                    title: isMentioned ? `You were mentioned in: ${comment.task?.title}` : `New intel on: ${comment.task?.title}`,
                    message: comment.content,
                    date: comment.created_at,
                    isRead: !isUnread,
                    resourceId: comment.task_id,
                    resourceType: 'task',
                    actor: {
                        name: `${comment.author?.first_name || ''} ${comment.author?.last_name || ''}`.trim() || 'Unknown Agent',
                        avatarUrl: comment.author?.avatar_url
                    }
                })
            })
        }

        // 4. Deadline Alerts (For Analysts & Admins)
        const isStaff = membership && ['owner', 'admin', 'manager', 'analyst'].includes(membership.role)

        if (isStaff) {
            const { data: deadlineTasks } = await supabase
                .from('tasks')
                .select(`
                    id, title, deadline_at, status:statuses!status_id(category)
                `)
                .neq('status.category', 'done')
                .neq('status.category', 'archived')
                .not('deadline_at', 'is', null)
                .limit(50)

            if (deadlineTasks) {
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

                deadlineTasks.forEach((task: any) => {
                    const deadline = new Date(task.deadline_at)
                    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())

                    const diffTime = deadlineDate.getTime() - today.getTime()
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

                    let alertTitle = ''
                    let alertMsg = ''
                    let alertLevel: 'info' | 'warning' | 'error' = 'info'

                    if (diffDays === 1) {
                        alertTitle = 'Deadline J-1'
                        alertMsg = `Protocol deadline tomorrow for: ${task.title}`
                        alertLevel = 'warning'
                    } else if (diffDays === 0) {
                        alertTitle = 'Deadline JOUR J'
                        alertMsg = `CRITICAL: Protocol deadline today! Check status for: ${task.title}`
                        alertLevel = 'error'
                    } else if (diffDays < 0) {
                        alertTitle = 'SOUCIS DE DEADLINE (J+)'
                        alertMsg = `DEVIATION DETECTED: Missed deadline for: ${task.title}`
                        alertLevel = 'error'
                    }

                    if (alertTitle) {
                        feed.push({
                            id: `deadline-${task.id}-${diffDays}`,
                            type: 'notification',
                            title: alertTitle,
                            message: alertMsg,
                            date: now.toISOString(),
                            isRead: false,
                            resourceId: task.id,
                            resourceType: 'task',
                            metadata: {
                                priority: alertLevel === 'error' ? 'High' : (alertLevel === 'warning' ? 'Medium' : 'Low')
                            }
                        })
                    }
                })
            }
        }

        // 5. Direct Notifications
        if (directNotifs) {
            directNotifs.forEach((n: any) => {
                feed.push({
                    id: `notif-${n.id}`,
                    type: 'notification',
                    title: n.title,
                    message: n.message,
                    date: n.created_at,
                    isRead: n.is_read,
                    resourceId: n.resource_id,
                    resourceType: (n.resource_type as 'task' | 'ticket') || 'task',
                    actor: {
                        name: 'Command Notification'
                    }
                })
            })
        }
    } catch (error) {
        console.error('Error fetching inbox feed:', error)
    }

    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function markItemAsRead(resourceId: string, resourceType: 'task' | 'ticket') {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check if it's a direct notification (id might be passed as notif-XXX)
    if (resourceId.startsWith('notif-')) {
        const realId = resourceId.replace('notif-', '')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('notifications') as any)
            .update({ is_read: true })
            .eq('id', realId)
            .eq('user_id', user.id)

        if (error) return { success: false, error: error.message }
        revalidatePath('/inbox')
        return { success: true }
    }

    // Get team_id
    const { data: membershipData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    const membership = membershipData as { team_id: string } | null
    if (!membership) return { success: false, error: 'No team found' }

    try {
        const { error } = await supabase
            .from('inbox_read_status')
            .upsert({
                user_id: user.id,
                team_id: membership.team_id,
                resource_id: resourceId,
                resource_type: resourceType,
                last_read_at: new Date().toISOString(),
                is_read: true
            } as any, {
                onConflict: 'user_id, resource_id'
            })

        if (error) throw error
        revalidatePath('/inbox')
        return { success: true }
    } catch (error: any) {
        console.error('Error marking as read:', error)
        return { success: false, error: error.message }
    }
}

export async function markItemAsUnread(resourceId: string, resourceType: 'task' | 'ticket') {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (resourceId.startsWith('notif-')) {
        const realId = resourceId.replace('notif-', '')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('notifications') as any)
            .update({ is_read: false })
            .eq('id', realId)
            .eq('user_id', user.id)

        if (error) return { success: false, error: error.message }
        revalidatePath('/inbox')
        return { success: true }
    }

    const { data: membershipData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    const membership = membershipData as { team_id: string } | null
    if (!membership) return { success: false, error: 'No team found' }

    try {
        const { error } = await supabase
            .from('inbox_read_status')
            .upsert({
                user_id: user.id,
                team_id: membership.team_id,
                resource_id: resourceId,
                resource_type: resourceType,
                last_read_at: new Date(0).toISOString(),
                is_read: false
            } as any, {
                onConflict: 'user_id, resource_id'
            })

        if (error) throw error
        revalidatePath('/inbox')
        return { success: true }
    } catch (error: any) {
        console.error('Error marking as unread:', error)
        return { success: false, error: error.message }
    }
}

// New Helper for Split View
export async function getInboxTaskDetails(taskId: string) {
    const supabase = await getUserClient()

    const { data: task, error } = await supabase
        .from('tasks')
        .select(`
            *,
            quest:quests(*),
            size:sizes(*),
            urgency:urgencies(*),
            status:statuses(*),
            assignee:profiles!assigned_to(*),
            project:projects(*),
            department:departments(*),
            client:clients(*)
        `)
        .eq('id', taskId)
        .single()

    if (error || !task) return null

    const { data: comments } = await supabase
        .from('task_comments')
        .select(`
            *,
            author:profiles!author_id(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

    const formattedComments = (comments || []).map((c: any) => ({
        ...c,
        authorRole: 'member'
    }))

    return {
        task,
        comments: formattedComments
    }
}
