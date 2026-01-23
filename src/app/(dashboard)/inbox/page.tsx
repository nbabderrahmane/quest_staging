'use client'

import { useEffect, useState } from 'react'
import { getInboxFeed, InboxItem, markItemAsRead } from './actions'
import { Archive, Bell, MessageSquare, Briefcase, RefreshCw, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TaskDetailPanel } from '@/components/dashboard/task-detail-panel'

export default function InboxPage() {
    const [feed, setFeed] = useState<InboxItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
    const [selectedResource, setSelectedResource] = useState<{ id: string, type: 'task' | 'ticket' } | null>(null)

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

    const handleSelect = async (item: InboxItem) => {
        setSelectedItemId(item.id)
        setSelectedResource({ id: item.resourceId, type: item.resourceType })

        // Optimistic update
        if (!item.isRead) {
            setFeed(prev => prev.map(i => i.id === item.id ? { ...i, isRead: true } : i))

            // Server action (fire and forget)
            markItemAsRead(item.resourceId, item.resourceType).then(res => {
                if (!res.success) {
                    // Revert if failed? usually not worth the UX flicker for read status
                    console.error('Failed to mark read', res.error)
                }
            })
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background -m-8">
            {/* Left Column: Feed List */}
            <div className={`
                flex flex-col border-r border-border bg-card w-full md:w-[400px] shrink-0 transition-all duration-300
                ${selectedResource ? 'hidden md:flex' : 'flex'} 
            `}>
                {/* Header */}
                <div className="border-b border-border p-4 bg-muted/10 flex justify-between items-center shrink-0 h-[60px]">
                    <h1 className="text-lg font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                        <Archive className="h-5 w-5 text-primary" />
                        Inbox
                    </h1>
                    <button
                        onClick={handleRefresh}
                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Feed Items */}
                <div className="flex-1 overflow-y-auto p-0 space-y-0">
                    {isLoading && !isRefreshing && feed.length === 0 ? (
                        <div className="p-8 text-center text-xs font-mono animate-pulse text-muted-foreground">Scanning...</div>
                    ) : feed.length === 0 ? (
                        <div className="p-8 text-center opacity-50 space-y-2">
                            <Archive className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">No signals</p>
                        </div>
                    ) : (
                        feed.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                className={`
                                    group relative p-4 border-b border-border hover:bg-muted/50 transition-all cursor-pointer select-none
                                    ${selectedItemId === item.id ? 'bg-primary/5 border-l-4 border-l-primary pl-[12px]' : 'border-l-4 border-l-transparent'}
                                `}
                            >
                                <div className="flex gap-3">
                                    <div className="mt-0.5">
                                        {item.type === 'assignment' && <Briefcase className="h-4 w-4 text-primary" />}
                                        {item.type === 'comment' && <MessageSquare className="h-4 w-4 text-blue-500" />}
                                        {item.type === 'notification' && <Bell className="h-4 w-4 text-orange-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h3 className={`text-sm ${!item.isRead ? 'font-black' : 'font-medium'} truncate pr-2 ${selectedItemId === item.id ? 'text-primary' : 'text-foreground'}`}>
                                                {item.title}
                                            </h3>
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono whitespace-nowrap opacity-70">
                                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-90">
                                            {item.message}
                                        </p>

                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                                            {item.metadata?.statusName && (
                                                <span className="px-1.5 py-px rounded bg-muted text-foreground/80 font-mono uppercase border border-border">
                                                    {item.metadata.statusName}
                                                </span>
                                            )}
                                            <span>•</span>
                                            <span className="truncate max-w-[120px]">{item.metadata?.questName || 'General'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Detail View */}
            <div className={`
                flex-1 bg-background flex flex-col min-w-0
                ${!selectedResource ? 'hidden md:flex' : 'flex fixed inset-0 z-50 md:static'}
            `}>
                {selectedResource ? (
                    selectedResource.type === 'task' ? (
                        <TaskDetailPanel
                            taskId={selectedResource.id}
                            canEdit={true} // Allow edits from inbox
                            onClose={() => setSelectedResource(null)}
                        />
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="p-4 border-b border-border md:hidden">
                                <button onClick={() => setSelectedResource(null)} className="text-sm font-bold uppercase flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 rotate-180" /> Back
                                </button>
                            </div>
                            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                                Feature for Ticket details in split view coming soon.
                                <button onClick={() => router.push(`/portal/tickets/${selectedResource.id}`)} className="block mt-4 text-primary underline">
                                    Open Ticket Page
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 select-none">
                        <Archive className="h-16 w-16 mb-4" />
                        <p className="font-black uppercase tracking-[0.2em]">Select Transmission</p>
                    </div>
                )}
            </div>
        </div>
    )
}
