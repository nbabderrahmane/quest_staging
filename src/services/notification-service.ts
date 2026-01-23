import { createClient } from '@/lib/supabase/client'
export interface Notification {
    id: string
    title: string
    message: string
    type: 'info_request' | 'comment' | 'status_change'
    is_read: boolean
    created_at: string
    payload: any
    resource_id: string
}

export const NotificationService = {
    // Client-side fetch
    async getUnreadCountClient() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return 0

        // 1. Notifications from physical table
        const { count: notifCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        // 2. Notifications from virtual inbox_read_status
        const { count: inboxCount } = await supabase
            .from('inbox_read_status')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        return (notifCount || 0) + (inboxCount || 0)
    },

    async getNotifications(limit = 10) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data as Notification[]
    },

    async markAsRead(id: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)

        if (error) throw error
    },

    async markAllAsRead() {
        const supabase = createClient()
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false)

        if (error) throw error
    }
}
