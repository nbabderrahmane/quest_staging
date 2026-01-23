'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Notification, NotificationService } from '@/services/notification-service'
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
    const [count, setCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const router = useRouter()

    const fetchCount = async () => {
        const c = await NotificationService.getUnreadCountClient()
        setCount(c || 0)
    }

    const fetchNotifications = async () => {
        const data = await NotificationService.getNotifications(20)
        setNotifications(data)
    }

    // Initial Fetch
    useEffect(() => {
        fetchCount()

        // Subscription
        const supabase = createClient()
        const channel = supabase
            .channel('notification-bell')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('New Notification received!', payload)
                    setCount((prev) => prev + 1)
                    // Optionally toast here
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    // Load data when opening
    useEffect(() => {
        if (isOpen) {
            fetchNotifications()
        }
    }, [isOpen])

    const handleMarkRead = async (id: string, resourceId: string) => {
        await NotificationService.markAsRead(id)
        setCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setIsOpen(false)
        router.refresh()
        // Navigate
        // TODO: Handle different resource types. Default task.
        router.push(`/quest-board?taskId=${resourceId}`)
    }

    const handleMarkAllRead = async () => {
        await NotificationService.markAllAsRead()
        setCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
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
                                    onClick={() => handleMarkRead(n.id, n.resource_id)}
                                    className={`
                                        flex flex-col gap-1 p-4 text-left border-b last:border-0 hover:bg-muted/50 transition-colors
                                        ${!n.is_read ? 'bg-primary/5' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <span className="font-medium text-sm line-clamp-1 text-foreground/90">{n.title}</span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
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
