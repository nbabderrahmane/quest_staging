'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationService } from '@/services/notification-service'

interface NotificationContextType {
    unreadCount: number
    refreshCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchCount = useCallback(async () => {
        try {
            const count = await NotificationService.getUnreadCountClient()
            setUnreadCount(count)
        } catch (error) {
            console.error('[NotificationProvider] Error fetching count:', error)
        }
    }, [])

    useEffect(() => {
        if (!userId) return

        // Initial fetch
        fetchCount()

        // Realtime Subscription
        const supabase = createClient()
        const channel = supabase
            .channel(`user-notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('[NotificationProvider] Postgres change:', payload)
                    // Refresh count on any relevant change
                    fetchCount()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, fetchCount])

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshCount: fetchCount }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
