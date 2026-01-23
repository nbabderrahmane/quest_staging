'use client'

import { useEffect, useState } from 'react'
import { getInboxFeed, InboxItem, markItemAsRead, markItemAsUnread } from './actions'
import { Archive, Bell, MessageSquare, Briefcase, RefreshCw, ChevronRight, Circle, CheckCircle2, Terminal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TaskDetailPanel } from '@/components/dashboard/task-detail-panel'
import { useNotifications } from '@/components/notification-provider'

export default function InboxPage() {
    const [feed, setFeed] = useState<InboxItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
    const [selectedResource, setSelectedResource] = useState<{ id: string, type: 'task' | 'ticket' } | null>(null)
    const { refreshCount } = useNotifications()

    const router = useRouter()

    const loadFeed = async () => {
        setIsLoading(true)
        try {
            const data = await getInboxFeed()
            setFeed(data)
            // Auto-select first item if desktop?
            // if (data.length > 0 && window.innerWidth > 768) setSelectedResource({ id: data[0].resourceId, type: data[0].resourceType })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadFeed()
    }, [])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await loadFeed()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    const handleToggleRead = async (e: React.MouseEvent, item: InboxItem) => {
        e.stopPropagation()
        const newReadStatus = !item.isRead

        // Optimistic update
        setFeed(prev => prev.map(i => i.id === item.id ? { ...i, isRead: newReadStatus } : i))

        try {
            if (newReadStatus) {
                await markItemAsRead(item.resourceId, item.resourceType)
            } else {
                await markItemAsUnread(item.resourceId, item.resourceType)
            }
            refreshCount()
            router.refresh() // Update global badges
        } catch (error) {
            console.error('Failed to toggle read status', error)
            // Revert on error
            setFeed(prev => prev.map(i => i.id === item.id ? { ...i, isRead: !newReadStatus } : i))
        }
    }

    const handleSelect = async (item: InboxItem) => {
        setSelectedItemId(item.id)
        setSelectedResource({ id: item.resourceId, type: item.resourceType })

        // Auto mark as read on select if not already
        if (!item.isRead) {
            setFeed(prev => prev.map(i => i.id === item.id ? { ...i, isRead: true } : i))
            await markItemAsRead(item.resourceId, item.resourceType)
            refreshCount()
            router.refresh()
        }
    }

    return (
        <div className="flex bg-background h-[calc(100vh-8rem)] -m-8 overflow-hidden">
            {/* List Column */}
            <div className={`
                flex flex-col border-r border-border bg-white dark:bg-zinc-950 w-full md:w-[450px] shrink-0 transition-all duration-300
                ${selectedItemId ? 'hidden md:flex' : 'flex'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between h-[60px] bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-primary" />
                        <h1 className="font-bold text-lg tracking-tight text-foreground">Inbox</h1>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className={`p-2 rounded-full hover:bg-primary/10 transition-colors ${isRefreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/30">
                    {isLoading && !isRefreshing && feed.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground animate-pulse font-mono text-xs uppercase tracking-widest">Scanning signals...</div>
                    ) : feed.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground space-y-3">
                            <Archive className="h-10 w-10 mx-auto opacity-10" />
                            <p className="text-sm font-medium opacity-50">Empty transmission log.</p>
                        </div>
                    ) : (
                        feed.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                className={`
                                    group relative flex px-4 py-3 cursor-pointer transition-all border-l-[3px]
                                    ${selectedItemId === item.id
                                        ? 'bg-primary/5 border-primary shadow-inner'
                                        : 'bg-white dark:bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800'}
                                    ${!item.isRead ? 'z-10 bg-zinc-50/30' : ''}
                                `}
                            >
                                {/* Unread Indicator */}
                                <div className="mt-1.5 mr-3 shrink-0">
                                    {!item.isRead ? (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                                    ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className={`text-[11px] uppercase tracking-widest ${!item.isRead ? 'font-black text-foreground' : 'font-semibold text-muted-foreground/60'}`}>
                                            {item.actor?.name || 'System'}
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground/40 whitespace-nowrap ml-2">
                                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <h3 className={`text-sm ${!item.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/70'} truncate leading-snug mb-0.5`}>
                                        {item.title}
                                    </h3>

                                    <p className={`text-xs truncate ${!item.isRead ? 'text-foreground/60' : 'text-muted-foreground/50'}`}>
                                        {item.message}
                                    </p>

                                    {/* Item Meta Tags */}
                                    <div className="mt-2 flex items-center gap-2 opacity-60">
                                        {item.type === 'assignment' && <Briefcase className="h-3 w-3 text-primary" />}
                                        {item.type === 'notification' && <Bell className="h-3 w-3 text-orange-400" />}
                                        <span className="text-[9px] uppercase font-bold tracking-tighter text-muted-foreground/40">{item.metadata?.questName || 'General'}</span>
                                    </div>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleToggleRead(e, item)}
                                        className="p-1.5 rounded bg-background shadow-sm border border-border hover:bg-muted text-muted-foreground transition-all"
                                        title={item.isRead ? "Mark as unread" : "Mark as read"}
                                    >
                                        {item.isRead ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detail Column */}
            <div className={`
                flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-900/20
                ${!selectedItemId ? 'hidden md:flex' : 'flex fixed inset-0 z-[100] md:static'}
            `}>
                {selectedResource ? (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Mobile Header */}
                        <div className="p-4 border-b border-border bg-white dark:bg-black md:hidden">
                            <button
                                onClick={() => setSelectedItemId(null)}
                                className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-widest"
                            >
                                <ChevronRight className="h-4 w-4 rotate-180" /> Back to Log
                            </button>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-auto custom-scrollbar md:p-6 pb-20">
                            <TaskDetailPanel
                                taskId={selectedResource.id}
                                canEdit={true}
                                onClose={() => setSelectedItemId(null)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-20 select-none">
                        <div className="relative mb-6">
                            <Archive className="h-20 w-20 text-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Terminal className="h-8 w-8 text-primary animate-pulse" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-[0.25em] mb-2 text-foreground">Select Signal</h2>
                        <p className="max-w-xs text-sm font-medium">Monitoring alliance frequencies. Select a mission beacon or intelligence report to begin analysis.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
