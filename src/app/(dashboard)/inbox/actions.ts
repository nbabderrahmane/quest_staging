'use server'

import { getUserClient } from '@/lib/supabase/factory'

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

export async function getInboxFeed(): Promise<InboxItem[]> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const feed: InboxItem[] = []

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
            tasks.forEach((task: any) => {
                const isNew = new Date(task.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                feed.push({
                    id: `task-${task.id}`,
                    type: 'assignment',
                    title: task.title,
                    message: isNew ? 'You were assigned to this mission.' : 'Mission updated.',
                    date: task.updated_at,
                    isRead: !isNew,
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

        // 2. Comments logic (simplified for brevity, assume similar to before)
        const taskIds = tasks?.map((t: any) => t.id) || []

        if (taskIds.length > 0) {
            const { data: comments } = await supabase
                .from('task_comments')
                .select(`
                    id, content, created_at, task_id,
                    author:profiles!author_id(first_name, last_name, avatar_url),
                    task:tasks!task_id(title)
                `)
                .in('task_id', taskIds)
                .neq('author_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (comments) {
                comments.forEach((comment: any) => {
                    feed.push({
                        id: `comment-${comment.id}`,
                        type: 'comment',
                        title: `New intel on: ${comment.task?.title}`,
                        message: comment.content,
                        date: comment.created_at,
                        isRead: false,
                        resourceId: comment.task_id,
                        resourceType: 'task',
                        actor: {
                            name: `${comment.author?.first_name || ''} ${comment.author?.last_name || ''}`.trim() || 'Unknown Agent',
                            avatarUrl: comment.author?.avatar_url
                        }
                    })
                })
            }
        }
    } catch (error) {
        console.error('Error fetching inbox feed:', error)
    }

    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// New Helper for Split View
export async function getInboxTaskDetails(taskId: string) {
    const supabase = await getUserClient()

    // 1. Fetch Task (and infer teamId automatically)
    // We don't check teamId permissions explicitly other than RLS because a user should see tasks assigned to them.
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

    // 2. Fetch Comments
    const { data: comments } = await supabase
        .from('task_comments')
        .select(`
            *,
            author:profiles!author_id(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

    // Helper to determine role (simplified, mock logic or need team members fetch)
    // For now we just return formatted comments.
    const formattedComments = (comments || []).map((c: any) => ({
        ...c,
        authorRole: 'member' // TODO: fetch real role if needed, simplified for speed
    }))

    return {
        task,
        comments: formattedComments
    }
}
