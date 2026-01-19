'use client'

import { useState, useEffect, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Crown, Shield, Sword, User, Send, MessageSquare, FileText, Clock, Settings, AlertTriangle, AlertOctagon, Zap, X } from 'lucide-react'
import { getTaskWithComments, addTaskComment, updateTaskDescription, updateTask, abortTask, reactivateTask } from '@/app/(dashboard)/admin/pipeline/actions'

interface TaskDetailPanelProps {
    taskId: string | null
    teamId?: string // Optional, if we can infer it or fetch it. For Inbox we might not have it immediately in the feed item.
    canEdit: boolean
    onClose?: () => void // For mobile close
}

// ... Interfaces (Comment, TaskDetail) same as Drawer ...
interface Comment {
    id: string
    content: string
    created_at: string
    author?: { id: string; email: string; first_name: string | null; last_name: string | null } | null
    authorRole: string
}

interface TaskDetail {
    id: string
    title: string
    description: string | null
    created_at?: string
    quest_id?: string | null
    size_id?: string | null
    urgency_id?: string | null
    assigned_to?: string | null
    project_id?: string | null
    department_id?: string | null
    client_id?: string | null
    needs_info?: boolean
    was_dropped?: boolean
    team_id: string // Need this for updates
    quest?: { id: string; name: string } | null
    size?: { id: string; name: string; xp_points: number } | null
    urgency?: { id: string; name: string; color: string } | null
    assignee?: { id: string; email: string; first_name: string | null; last_name: string | null } | null
    project?: { id: string; name: string } | null
    department?: { id: string; name: string } | null
}

const ROLE_ICONS: Record<string, typeof Crown> = {
    owner: Crown,
    admin: Shield,
    manager: Sword,
    analyst: User,
    member: User
}

const ROLE_COLORS: Record<string, string> = {
    owner: 'text-yellow-600',
    admin: 'text-blue-600',
    manager: 'text-purple-600',
    analyst: 'text-slate-600',
    member: 'text-slate-500'
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
}

function linkify(text: string): React.ReactNode {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return (
        <>
            {parts.map((part, i) =>
                urlRegex.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all">{part}</a>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    )
}

export function TaskDetailPanel({ taskId, canEdit, onClose }: TaskDetailPanelProps) {
    const [task, setTask] = useState<TaskDetail | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [newComment, setNewComment] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [description, setDescription] = useState('')
    const [isEditingDesc, setIsEditingDesc] = useState(false)
    const [isSavingDesc, setIsSavingDesc] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const commentsEndRef = useRef<HTMLDivElement>(null)

    // Derived teamId from task if not provided prop? 
    // Actually getTaskWithComments requires teamId usually for permission check, BUT simple getTask might not?
    // Let's assume we can fetch task by ID if we don't have teamId context, OR the server action handles null teamId loosely?
    // The existing action `getTaskWithComments(taskId, teamId)` strictly requires teamId for RLS context usually if using checkTeamAccess.
    // However, for Inbox, we are viewing *assigned* tasks. User should have access.
    // We might need to update `getTaskWithComments` to be more flexible or fetch teamId first.
    // Update: I'll try to fetch with just taskId if possible, or I'll need to fetch the task first to get teamId.
    // Since `getTaskWithComments` is from `pipeline/actions`, let's check it. It takes `teamId`.
    // I will write a generic `getTaskDetails(taskId)` in `inbox/actions.ts` that determines teamId securely.

    // fetching logic ...
    useEffect(() => {
        async function loadTask() {
            if (!taskId) return
            setIsLoading(true)
            setError(null)

            // We need a way to get task details without knowing teamId upfront, 
            // OR we rely on a new server action in inbox/actions.ts
            try {
                // Temporary: use a specific action for inbox that doesn't need teamId (finds it)
                // See below for `getTaskDetailsForInbox` implementation needed.
                // For now, I'll assume we import it from inbox/actions
                // Wait, I can't import circular. I'll need to add it to inbox/actions.

                // Dynamic import to avoid circular dependency issues? No, server actions are fine.
                // I will assume `getInboxTaskDetails` exists in `@/app/(dashboard)/inbox/actions`
                const { getInboxTaskDetails } = await import('@/app/(dashboard)/inbox/actions')
                // @ts-ignore
                const result = await getInboxTaskDetails(taskId)

                if (!result) {
                    setError('Task not found.')
                    setTask(null)
                } else {
                    const taskData = result.task as unknown as TaskDetail
                    setTask(taskData)
                    setComments(result.comments as unknown as Comment[])
                    setDescription(taskData.description || '')
                }
            } catch (e: any) {
                console.error(e)
                setError(e.message)
            } finally {
                setIsLoading(false)
            }
        }
        loadTask()
    }, [taskId])

    useEffect(() => {
        if (commentsEndRef.current) commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }, [comments])

    const handleSendComment = async () => {
        if (!taskId || !task || !newComment.trim()) return
        setIsSending(true)
        // We know teamId from task.team_id now
        const result = await addTaskComment(taskId, task.team_id, newComment)
        setIsSending(false)
        if (result.success) {
            setNewComment('')
            // Refresh
            const { getInboxTaskDetails } = await import('@/app/(dashboard)/inbox/actions')
            // @ts-ignore
            const updated = await getInboxTaskDetails(taskId)
            if (updated) setComments(updated.comments as unknown as Comment[])
        } else {
            // @ts-ignore
            alert(result.error?.message || 'Failed')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendComment()
        }
    }

    // Simplified Render for Panel (No Dialog)
    if (!taskId) return <div className="h-full flex items-center justify-center text-muted-foreground uppercase tracking-widest font-mono text-sm">Select a transmission to decrypt</div>

    if (isLoading) return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Decrypting...</div>
    if (error) return <div className="h-full flex items-center justify-center text-destructive font-bold">{error}</div>

    return (
        <div className="flex flex-col h-full bg-background/50 border-l border-border">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex-shrink-0 flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tighter leading-tight">
                        {task?.title}
                    </h2>
                    {task?.quest && (
                        <p className="text-xs font-mono text-blue-600">
                            Objective: {task.quest.name}
                        </p>
                    )}
                </div>
                {onClose && (
                    <button onClick={onClose} className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Brief */}
                <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Brief</h3>
                    </div>
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {task?.description ? linkify(task.description) : <span className="text-muted-foreground italic">No brief.</span>}
                    </div>
                </div>

                {/* Comments Feed */}
                <div className="px-6 py-4 space-y-4">
                    {comments.map(comment => {
                        const RoleIcon = ROLE_ICONS[comment.authorRole] || User
                        const roleColor = ROLE_COLORS[comment.authorRole] || 'text-slate-500'
                        const authorName = comment.author?.first_name ? `${comment.author.first_name} ${comment.author?.last_name || ''}` : 'Unknown'

                        return (
                            <div key={comment.id} className="flex gap-3 group">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center ${roleColor}`}>
                                    <RoleIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-foreground text-sm">{authorName}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">{formatRelativeTime(comment.created_at)}</span>
                                    </div>
                                    <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">{linkify(comment.content)}</div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={commentsEndRef} />
                </div>
            </div>

            {/* Sticky Input */}
            <div className="px-6 py-4 border-t border-border bg-background flex-shrink-0">
                <div className="flex gap-2 relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a comment..."
                        rows={1}
                        className="flex-1 px-4 py-3 bg-muted/30 border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[44px] max-h-[100px]"
                    />
                    <button
                        onClick={handleSendComment}
                        disabled={isSending || !newComment.trim()}
                        className="absolute right-2 top-2 bottom-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-0 transition-all flex items-center justify-center aspect-square h-auto"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
