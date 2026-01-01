'use client'

import { useState, useEffect } from 'react'
import { getNotifications, markNotificationRead } from '../../actions'
import { Loader2, Bell, Check, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleMarkRead(id: string) {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        await markNotificationRead(id)
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

    return (
        <div className="min-h-screen bg-muted/10 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground uppercase transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black tracking-tight uppercase">Notifications</h1>
                </div>

                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center bg-card rounded-xl border border-border border-dashed">
                            <p className="text-muted-foreground">No notifications.</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                className={`p-4 rounded-xl border transition-all flex gap-4 ${n.is_read ? 'bg-card border-border opacity-60' : 'bg-card border-primary/20 shadow-sm'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-foreground text-sm">{n.title}</h4>
                                        <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-foreground/80">{n.message}</p>

                                    {/* Actions (Link to ticket) */}
                                    {n.resource_type === 'task' && (
                                        <button
                                            onClick={() => {
                                                if (!n.is_read) handleMarkRead(n.id);
                                                router.push(`/portal/tickets/${n.resource_id}`);
                                            }}
                                            className="text-xs font-bold text-primary hover:underline mt-2 inline-block"
                                        >
                                            View Ticket
                                        </button>
                                    )}
                                </div>
                                {!n.is_read && (
                                    <button
                                        onClick={() => handleMarkRead(n.id)}
                                        className="self-center p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
                                        title="Mark as read"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
