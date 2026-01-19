'use server'

import { getUserClient } from '@/lib/supabase/factory'
import { InboxItem } from '@/app/(dashboard)/inbox/actions' // Reuse type

export async function getClientInboxFeed(): Promise<InboxItem[]> {
    const supabase = await getUserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const feed: InboxItem[] = []

    try {
        // 1. Identify Client
        // Clients are linked via client_members
        const { data: membership } = await supabase
            .from('client_members')
            .select('client_id')
            .eq('user_id', user.id)
            .single()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientId = (membership as any)?.client_id

        if (!clientId) return []

        // 2. Fetch Active Tickets/Tasks for this Client
        // We want to show updates on tickets requested by this client (or all tickets for this client?)
        // Usually clients want to see all their tickets.
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select(`
                id, title, description, created_at, updated_at, status_id,
                status:statuses!status_id(name, color, category),
                urgency:urgencies!urgency_id(name, color)
            `)
            .eq('client_id', clientId)
            .order('updated_at', { ascending: false })
            .limit(20)

        if (!tasksError && tasks) {
            tasks.forEach((task: any) => {
                // Determine if it looks "new" (created recently)
                const isNew = new Date(task.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // last 7 days

                feed.push({
                    id: `ticket-${task.id}`,
                    type: 'assignment', // reusing type, functionally "Ticket Update"
                    title: task.title,
                    message: `Status: ${task.status?.name}`,
                    date: task.updated_at,
                    isRead: !isNew,
                    resourceId: task.id,
                    resourceType: 'ticket', // specific for portal link
                    metadata: {
                        statusColor: task.status?.color,
                        statusName: task.status?.name,
                        priority: task.urgency?.name
                    }
                })
            })
        }

        // 3. Fetch Comments from Crew on Client Tickets
        // task.client_id = clientId AND author_id != user.id
        const taskIds = tasks?.map((t: any) => t.id) || []

        if (taskIds.length > 0) {
            const { data: comments, error: commentsError } = await supabase
                .from('task_comments')
                .select(`
                    id, content, created_at, task_id,
                    author:profiles!author_id(first_name, last_name, avatar_url),
                    task:tasks!task_id(title)
                `)
                .in('task_id', taskIds)
                .neq('author_id', user.id) // Don't show own comments
                .order('created_at', { ascending: false })
                .limit(20)

            if (!commentsError && comments) {
                comments.forEach((comment: any) => {
                    feed.push({
                        id: `comment-${comment.id}`,
                        type: 'comment',
                        title: `New reply on: ${comment.task?.title}`,
                        message: comment.content,
                        date: comment.created_at,
                        isRead: false,
                        resourceId: comment.task_id,
                        resourceType: 'ticket',
                        actor: {
                            name: `${comment.author?.first_name || ''} ${comment.author?.last_name || ''}`.trim() || 'Support Agent',
                            avatarUrl: comment.author?.avatar_url
                        }
                    })
                })
            }
        }

    } catch (error) {
        console.error('Error fetching client inbox:', error)
    }

    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
