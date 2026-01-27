'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInboxFeed, markItemAsRead, InboxItem } from '@/app/(dashboard)/inbox/actions'
import { useNotifications } from '@/components/notification-provider'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

export function NotificationBell({ userId }: { userId: string }) {
    const { unreadCount: count, refreshCount: fetchCount } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<InboxItem[]>([])
    const router = useRouter()

    const fetchNotifications = async () => {
        try {
            const data = await getInboxFeed()
            // Filter to show relevant items (maybe exclude very old assignments if they are read?)
            // For now, mirroring inbox exactly as requested.
            setNotifications(data)
        } catch (e) {
            console.error('Failed to fetch notifications', e)
        }
    }

    // Load data when opening
    useEffect(() => {
        if (isOpen) {
            fetchNotifications()
        }
    }, [isOpen])

    const handleMarkRead = async (id: string, resourceId: string, type: 'task' | 'ticket' = 'task') => {
        await markItemAsRead(id, type)
        await fetchCount() // Ensure global count is updated
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setIsOpen(false)
        router.refresh()

        // Navigation Logic
        if (type === 'task') {
            // If it's a deadline alert (id starts with deadline-), extract real ID?
            // resourceId is already the real task ID from getInboxFeed
            router.push(`/quest-board?taskId=${resourceId}`)
        }
    }

    const handleMarkAllRead = async () => {
        // Warning: mark all read might be slow if individual calls.
        // For now, try to mark visible ones?
        // Or add a bulk mark endpoint?
        // Iterating for now (client-side feeling)
        const unread = notifications.filter(n => !n.isRead)
        for (const n of unread) {
            await markItemAsRead(n.id, n.resourceType)
        }
        await fetchCount()
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        router.refresh()
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-sidebar-foreground hover:bg-sidebar-accent">
                    <Bell className="h-5 w-5" />
                    {count > 0 && (
                        <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-sidebar animate-pulse" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {count > 0 && (
                        <Button variant="ghost" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary" onClick={handleMarkAllRead}>
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => handleMarkRead(n.id, n.resourceId, n.resourceType)}
                                    className={`
                                        flex flex-col gap-1 p-4 text-left border-b last:border-0 hover:bg-muted/50 transition-colors
                                        ${!n.isRead ? 'bg-primary/5' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <span className="font-medium text-sm line-clamp-1 text-foreground/90">{n.title}</span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(n.date), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {n.message}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
