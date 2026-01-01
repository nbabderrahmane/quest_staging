'use client'

import { useState, useEffect, use } from 'react'
import { getTicketDetails, addClientComment, approveTicket, requestChanges } from '../../../actions'
import { Loader2, ArrowLeft, Send, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: taskId } = use(params)
    const [task, setTask] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Actions
    const [commentText, setCommentText] = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)
    const [processingAction, setProcessingAction] = useState(false)
    const [showRejectInput, setShowRejectInput] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [taskId])

    async function loadData() {
        try {
            const data = await getTicketDetails(taskId)
            setTask(data)
        } catch (e) {
            console.error(e)
            // router.push('/portal/dashboard')
        } finally {
            setLoading(false)
        }
    }

    async function handleComment(e: React.FormEvent) {
        e.preventDefault()
        if (!commentText.trim()) return
        setSubmittingComment(true)
        try {
            await addClientComment(taskId, commentText)
            setCommentText('')
            loadData()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setSubmittingComment(false)
        }
    }

    async function handleApprove() {
        if (!confirm('Are you sure you want to validate this ticket? It will be marked as Done.')) return
        setProcessingAction(true)
        try {
            await approveTicket(taskId)
            loadData()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setProcessingAction(false)
        }
    }

    async function handleRequestChanges() {
        if (!rejectReason.trim()) return
        setProcessingAction(true)
        try {
            await requestChanges(taskId, rejectReason)
            setShowRejectInput(false)
            setRejectReason('')
            loadData()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setProcessingAction(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

    if (!task) return <div className="p-8 text-center">Ticket not found</div>

    const isValidationPhase = task.status?.name === 'Validation'

    return (
        <div className="min-h-screen bg-muted/10 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground uppercase transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-black text-foreground">{task.title}</h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${task.status?.color || 'bg-slate-100 border-slate-200 text-slate-600'
                                            }`}>
                                            {task.status?.name}
                                        </span>
                                        {task.urgency && (
                                            <span className={`text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1`}>
                                                Priority: <span className={task.urgency.color.replace('bg-', 'text-')}>{task.urgency.name}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 prose prose-sm text-foreground">
                                {task.description ? (
                                    <p className="whitespace-pre-wrap">{task.description}</p>
                                ) : (
                                    <p className="text-muted-foreground italic">No description provided.</p>
                                )}
                            </div>
                        </div>

                        {/* Validation Block */}
                        {isValidationPhase && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-lg font-bold text-emerald-700 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" /> Validation Requested
                                </h3>
                                <p className="text-sm text-emerald-600 mt-2">
                                    The team has marked this ticket as ready for your validation. Please review the deliverables.
                                </p>

                                {!showRejectInput ? (
                                    <div className="flex gap-4 mt-6">
                                        <button
                                            onClick={handleApprove}
                                            disabled={processingAction}
                                            className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg font-bold uppercase shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Validate & Close
                                        </button>
                                        <button
                                            onClick={() => setShowRejectInput(true)}
                                            disabled={processingAction}
                                            className="flex-1 bg-white text-destructive border border-destructive/20 px-4 py-3 rounded-lg font-bold uppercase shadow-sm hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Request Changes
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-6 space-y-4 bg-white p-4 rounded-lg border border-destructive/20">
                                        <h4 className="text-sm font-bold text-destructive uppercase">Reason for changes</h4>
                                        <textarea
                                            className="w-full p-3 text-sm border border-border rounded-lg min-h-[100px] focus:outline-none focus:ring-2 focus:ring-destructive/20"
                                            placeholder="Please describe what needs to be fixed..."
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setShowRejectInput(false)}
                                                className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground hover:bg-muted rounded"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleRequestChanges}
                                                disabled={processingAction || !rejectReason}
                                                className="px-4 py-2 bg-destructive text-white text-xs font-bold uppercase rounded shadow-sm hover:bg-destructive/90"
                                            >
                                                {processingAction ? 'Sending...' : 'Submit Request'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comments */}
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" /> Discussion
                            </h3>

                            <div className="space-y-6 mb-6 max-h-[400px] overflow-y-auto pr-2">
                                {task.comments && task.comments.length > 0 ? (
                                    task.comments.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                                {comment.profiles?.first_name?.[0] || 'U'}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-foreground">
                                                        {comment.profiles?.first_name} {comment.profiles?.last_name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(comment.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/80 bg-muted/20 p-3 rounded-lg rounded-tl-none">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground italic text-center py-4">No comments yet.</p>
                                )}
                            </div>

                            <form onSubmit={handleComment} className="flex gap-4 items-start">
                                <Input
                                    className="flex-1"
                                    placeholder="Type a message..."
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                />
                                <button disabled={submittingComment} type="submit" className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                                    {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Meta (Simplified) */}
                    <div className="space-y-6">
                        {/* Could add timeline or attachments here later */}
                    </div>
                </div>
            </div>
        </div>
    )
}
