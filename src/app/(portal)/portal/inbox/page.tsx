'use client'

import { useEffect, useState } from 'react'
import { getClientInboxFeed } from './actions'
import { InboxItem } from '@/app/(dashboard)/inbox/actions'
import { Archive, MessageSquare, Ticket, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ClientInboxPage() {
    const [feed, setFeed] = useState<InboxItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const router = useRouter()

    const loadFeed = async () => {
        setIsLoading(true)
        try {
            const data = await getClientInboxFeed()
            setFeed(data)
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

    if (isLoading && !isRefreshing && feed.length === 0) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse font-mono min-h-screen flex items-center justify-center">Loading Updates...</div>
    }

    return (
        <div className="min-h-screen bg-muted/10 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors md:hidden">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                            <Archive className="h-6 w-6 text-primary" />
                            Inbox
                        </h1>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 hover:bg-card rounded-full text-muted-foreground hover:text-primary transition-colors bg-white border border-border shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Feed */}
                <div className="space-y-4">
                    {feed.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border space-y-4">
                            <div className="inline-block p-4 rounded-full bg-muted">
                                <Archive className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">No new updates</p>
                        </div>
                    ) : (
                        feed.map((item) => (
                            <div
                                key={item.id}
                                className={`group relative bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer`}
                                onClick={() => {
                                    if (item.resourceType === 'ticket') {
                                        router.push(`/portal/tickets/${item.resourceId}`)
                                    }
                                }}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 p-2 rounded-full shrink-0 ${item.type === 'comment' ? 'bg-blue-50 text-blue-600' : 'bg-primary/10 text-primary'
                                        }`}>
                                        {item.type === 'comment' ? (
                                            <MessageSquare className="h-4 w-4" />
                                        ) : (
                                            <Ticket className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-sm font-bold text-foreground truncate pr-4">
                                                {item.title}
                                            </h3>
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono whitespace-nowrap">
                                                {new Date(item.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {item.message}
                                        </p>

                                        <div className="mt-3 flex items-center gap-3 text-xs">
                                            {item.actor && (
                                                <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
                                                    {item.actor.avatarUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={item.actor.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                                            {item.actor.name[0]}
                                                        </div>
                                                    )}
                                                    {item.actor.name}
                                                </div>
                                            )}
                                            {item.metadata?.statusName && (
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                                    style={{
                                                        backgroundColor: `${item.metadata.statusColor}20`,
                                                        color: item.metadata.statusColor,
                                                        border: `1px solid ${item.metadata.statusColor}40`
                                                    }}
                                                >
                                                    {item.metadata.statusName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="self-center">
                                        <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
