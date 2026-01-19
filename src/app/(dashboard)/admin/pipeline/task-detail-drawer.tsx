'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Crown, Shield, Sword, User, Send, MessageSquare, FileText, Clock, Settings, AlertTriangle, AlertOctagon, Zap } from 'lucide-react'
import { getTaskWithComments, addTaskComment, updateTaskDescription, updateTask, abortTask, reactivateTask } from './actions'

interface TaskDetailDrawerProps {
    taskId: string | null
    teamId: string
    open: boolean
    onClose: () => void
    canEdit: boolean
    quests?: { id: string; name: string }[]
    sizes?: { id: string; name: string; xp_points: number }[]
    urgencies?: { id: string; name: string; color: string }[]
    crew?: { id: string; email: string; first_name: string | null; last_name: string | null }[]
    projects?: { id: string; name: string }[]
    departments?: { id: string; name: string }[]
    clients?: { id: string; name: string }[]
}

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
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                        {part}
                    </a>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    )
}

export function TaskDetailDrawer({ taskId, teamId, open, onClose, canEdit, quests = [], sizes = [], urgencies = [], crew = [], projects = [], departments = [], clients = [] }: TaskDetailDrawerProps) {
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

    useEffect(() => {
        console.log('[TaskDetailDrawer] Mounted', { taskId, canEdit, teamId })
        async function loadTask() {
            if (!taskId || !open) return
            setIsLoading(true)
            setError(null)
            const result = await getTaskWithComments(taskId, teamId)
            if ('error' in result) {
                console.error(result.error)
                const errorMsg = (result as any).refId ? `${result.error} (Ref: ${(result as any).refId})` : (result.error || 'Failed to load task')
                setError(errorMsg)
                setTask(null)
            } else {
                console.log('[TaskDetailDrawer] Task loaded', { id: result.task?.id, assigned_to: result.task?.assigned_to })
                setTask(result.task)
                setComments(result.comments)
                setDescription(result.task?.description || '')
            }
            setIsLoading(false)
        }
        loadTask()
    }, [taskId, teamId, open])

    // Scroll to bottom when new comments appear
    useEffect(() => {
        if (commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [comments])

    const handleSendComment = async () => {
        if (!taskId || !newComment.trim()) return
        setIsSending(true)
        const result = await addTaskComment(taskId, teamId, newComment)
        setIsSending(false)

        if (result.success) {
            setNewComment('')
            // Refresh comments
            const updated = await getTaskWithComments(taskId, teamId)
            if (!('error' in updated)) {
                setComments(updated.comments)
            }
        } else {
            alert((result as any).refId ? `Failed to send comment. (Ref: ${(result as any).refId})` : 'Failed to send comment.')
        }
    }

    const handleSaveDescription = async () => {
        if (!taskId) return
        setIsSavingDesc(true)
        const result = await updateTaskDescription(taskId, teamId, description)
        setIsSavingDesc(false)
        setIsEditingDesc(false)

        if (result.success) {
            setTask(prev => prev ? { ...prev, description } : null)
        } else {
            alert((result as any).refId ? `Failed to save description. (Ref: ${(result as any).refId})` : 'Failed to save description.')
        }
    }

    const handleUpdateParameter = async (key: string, value: any) => {
        if (!taskId || !task) return

        // Optimistic update
        setTask(prev => prev ? { ...prev, [key]: value === '_none' ? null : value } : null)

        const updateData: any = {}
        if (value === '_none') {
            updateData[key] = null
        } else {
            updateData[key] = value
        }

        await updateTask(taskId, teamId, updateData)
    }

    const handleAbort = async () => {
        if (!taskId || !task) return
        if (!confirm('WARNING: Are you sure you want to ABORT this mission? This action will mark the task as dropped.')) return

        const result = await abortTask(taskId, teamId)
        if (result.success) {
            setTask(prev => prev ? { ...prev, was_dropped: true } : null)
        } else {
            const msg = (result as any).refId ? `Failed to abort mission. (Ref: ${(result as any).refId})` : 'Failed to abort mission.'
            alert(msg)
        }
    }

    const handleReactivate = async () => {
        if (!taskId || !task) return
        if (!confirm('CONFIRM: Reactivate this mission?')) return

        const result = await reactivateTask(taskId, teamId)
        if (result.success) {
            setTask(prev => prev ? { ...prev, was_dropped: false } : null)
        } else {
            const msg = (result as any).refId ? `Failed to reactivate mission. (Ref: ${(result as any).refId})` : 'Failed to reactivate mission.'
            alert(msg)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendComment()
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="
                bg-background border border-border text-foreground shadow-xl flex flex-col p-0 gap-0 overflow-hidden
                fixed z-[200]
                top-0 left-0 translate-x-0 translate-y-0 w-full h-[100dvh] max-w-none rounded-none
                md:top-[50%] md:left-[50%] md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:h-auto md:max-h-[90vh] md:rounded-lg
            ">
                <div className="flex flex-col md:flex-row h-full min-h-0 md:min-h-[600px]">
                    {/* Left Column: Brief & Comms (100% Mobile, 60% Desktop) */}
                    {/* On mobile, take 60% height to show comms, let params take 40% */}
                    <div className="w-full md:w-[60%] h-[60%] md:h-full flex flex-col border-b md:border-b-0 md:border-r border-border order-2 md:order-1">
                        {/* Header */}
                        <div className="px-6 py-6 border-b border-border bg-muted/20 flex-shrink-0">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl font-black text-foreground pr-2 uppercase tracking-tighter">
                                        {task?.title || 'Loading...'}
                                    </DialogTitle>
                                    {task?.was_dropped && (
                                        <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded border border-red-200">
                                            Mission Aborted
                                        </span>
                                    )}
                                    {task?.quest && (
                                        <p className="text-xs font-mono text-blue-600">
                                            Objective: {task.quest.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading task details...</div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-500 bg-red-50 m-6 rounded-lg border border-red-200">
                                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="font-bold">Error Loading Task</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        ) : (
                            <>
                                {/* Description Section */}
                                <div className="px-6 py-4 border-b border-border bg-background flex-shrink-0 hidden md:block">
                                    {/* Hide description on mobile to save space? Or keep it? */}
                                    {/* Let's keep it but maybe compact */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Brief</h3>
                                    </div>
                                    {isEditingDesc && canEdit ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                placeholder="Add mission briefing..."
                                                autoFocus
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => { setIsEditingDesc(false); setDescription(task?.description || '') }}
                                                    className="px-3 py-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveDescription}
                                                    disabled={isSavingDesc}
                                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isSavingDesc ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => canEdit && setIsEditingDesc(true)}
                                            className={`min-h-[60px] p-3 bg-muted/30 border border-border rounded-md text-sm text-foreground whitespace-pre-wrap ${canEdit ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                                        >
                                            {task?.description ? (
                                                linkify(task.description)
                                            ) : (
                                                <span className="text-muted-foreground italic">
                                                    {canEdit ? 'Click to add mission briefing...' : 'No briefing provided.'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Only: Brief Toggle or just reduced header? */}
                                {/* For simplicity, just rendering it same as desktop for now, relying on scrolling */}
                                <div className="px-6 py-4 border-b border-border bg-background flex-shrink-0 md:hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-bold uppercase text-foreground">Brief</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-3" onClick={() => canEdit && setIsEditingDesc(true)}>
                                        {task?.description || 'No briefing.'}
                                    </p>
                                </div>


                                {/* Comms Feed Section */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="px-4 md:px-6 py-2 md:py-3 border-b border-border bg-muted/30 flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Comms Feed</h3>
                                            <span className="text-xs text-muted-foreground">({comments.length})</span>
                                        </div>
                                    </div>

                                    {/* Comments List */}
                                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 bg-background/50">
                                        {comments.length === 0 ? (
                                            <p className="text-center text-muted-foreground text-sm py-8">
                                                No comms yet. Start the conversation.
                                            </p>
                                        ) : (
                                            comments.map(comment => {
                                                const RoleIcon = ROLE_ICONS[comment.authorRole] || User
                                                const roleColor = ROLE_COLORS[comment.authorRole] || 'text-slate-500'
                                                const authorName = comment.author?.first_name || comment.author?.last_name
                                                    ? `${comment.author.first_name || ''} ${comment.author.last_name || ''}`.trim()
                                                    : comment.author?.email || 'Unknown'

                                                return (
                                                    <div key={comment.id} className="flex gap-3">
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center ${roleColor}`}>
                                                            <RoleIcon className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="font-bold text-foreground text-sm">{authorName}</span>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {formatRelativeTime(comment.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                                                                {linkify(comment.content)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                        <div ref={commentsEndRef} />
                                    </div>

                                    {/* Comment Input */}
                                    <div className="px-4 md:px-6 py-3 md:py-4 border-t border-border bg-muted/30 flex-shrink-0">
                                        <div className="flex gap-2">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Write a message..."
                                                rows={1}
                                                className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px]"
                                            />
                                            <button
                                                onClick={handleSendComment}
                                                disabled={isSending || !newComment.trim()}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                <Send className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right Column: Mission Parameters (100% Mobile, 40% Desktop) */}
                    {/* On Desktop: 40% width. On Mobile: height 40%, order-1 (so it's on top? Or bottom?) */}
                    {/* Actually, user might want to see parameters first? No, Title is in Left col header. */}
                    {/* Let's put Parameters at TOP on mobile (under standard header if possible, but standard header is inside Left Col). */}
                    {/* Current Structure: Columns wrap everything including headers. */}
                    {/* If we want Title to be always top, we might need to restructure. */}
                    {/* For now, just stacking: Brief/Comms (Bottom 60%) and Params (Top 40%)? */}
                    {/* Or Params (Bottom 40%)? Usually you check params then chat. */}
                    {/* Let's try Params TOP (order-1) so you see status/assignee, then scroll down to Comms. */}
                    {/* BUT Header with Title is in Left Column... this is awkward. */}
                    {/* Let's keep Left (Order-2) and Right (Order-1)? No, Title is in Left. */}
                    {/* Compromise: Left Col (Title + Comms) is Order-1 (Top). Right Col (Params) is Order-2 (Bottom). */}
                    <div className="w-full md:w-[40%] h-[40%] md:h-full bg-muted/10 flex flex-col overflow-y-auto border-t md:border-t-0 order-1 md:order-2">
                        {/* Mobile Handle / Indicator? */}
                        <div className="md:hidden flex justify-center py-2 border-b border-slate-100 bg-white">
                            <div className="w-12 h-1 bg-slate-200 rounded-full" />
                        </div>

                        <div className="px-6 py-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Mission Parameters</h3>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Needs Info Toggle */}
                            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className={`h-4 w-4 ${task?.needs_info ? 'text-destructive' : 'text-muted-foreground'}`} />
                                    <span className="text-sm font-bold text-foreground">Needs Info</span>
                                </div>
                                <Switch
                                    checked={task?.needs_info || false}
                                    onCheckedChange={(checked) => handleUpdateParameter('needs_info', checked)}
                                    disabled={!canEdit}
                                />
                            </div>


                            {/* Project & Department */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold text-muted-foreground">Project</label>
                                    <Select
                                        value={task?.project_id || '_none'}
                                        onValueChange={(val) => handleUpdateParameter('project_id', val)}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="bg-background border-input">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">None</SelectItem>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold text-muted-foreground">Department</label>
                                    <Select
                                        value={task?.department_id || '_none'}
                                        onValueChange={(val) => handleUpdateParameter('department_id', val)}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="bg-background border-input">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">None</SelectItem>
                                            {departments.map(d => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Client */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-muted-foreground">Client</label>
                                <Select
                                    value={task?.client_id || '_none'}
                                    onValueChange={(val) => handleUpdateParameter('client_id', val)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-background border-input">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">None</SelectItem>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Objective (Quest) */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-muted-foreground">Objective (Quest)</label>
                                <Select
                                    value={task?.quest_id || '_none'}
                                    onValueChange={(val) => handleUpdateParameter('quest_id', val)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-background border-input">
                                        <SelectValue placeholder="No Quest" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">No Quest</SelectItem>
                                        {quests.map(q => (
                                            <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Size (XP) */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-muted-foreground">XP Value (Size)</label>
                                <Select
                                    value={task?.size_id || '_none'}
                                    onValueChange={(val) => handleUpdateParameter('size_id', val)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-background border-input">
                                        <SelectValue placeholder="No Size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">No Size</SelectItem>
                                        {sizes.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.xp_points} XP)</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Urgency */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-muted-foreground">Urgency</label>
                                <Select
                                    value={task?.urgency_id || '_none'}
                                    onValueChange={(val) => handleUpdateParameter('urgency_id', val)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-background border-input">
                                        <SelectValue placeholder="No Urgency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">No Urgency</SelectItem>
                                        {urgencies.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Operator (Assignee) */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-muted-foreground">Operator</label>
                                <Select
                                    value={task?.assigned_to || '_none'}
                                    onValueChange={(val) => handleUpdateParameter('assigned_to', val)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-background border-input">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">Unassigned</SelectItem>
                                        {crew.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.first_name || m.last_name
                                                    ? `${m.first_name || ''} ${m.last_name || ''}`.trim()
                                                    : m.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Abort / Reactivate Mission Button */}
                            {canEdit && (
                                <div className="pt-4 border-t border-border mt-4">
                                    {task?.was_dropped ? (
                                        <button
                                            onClick={handleReactivate}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 rounded-md text-xs font-bold uppercase transition-colors"
                                        >
                                            <Zap className="h-4 w-4" />
                                            Reactivate Mission
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleAbort}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 hover:border-destructive/30 rounded-md text-xs font-bold uppercase transition-colors"
                                        >
                                            <AlertOctagon className="h-4 w-4" />
                                            Abort Mission
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Read-only Info */}
                            <div className="pt-8 mt-auto">
                                <div className="p-4 bg-muted/50 rounded text-xs text-muted-foreground font-mono space-y-1">
                                    <p>TASK ID: {task?.id}</p>
                                    <p>CREATED: {task && task.created_at ? new Date(task.created_at).toLocaleDateString() : '...'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent >
        </Dialog >
    )
}
