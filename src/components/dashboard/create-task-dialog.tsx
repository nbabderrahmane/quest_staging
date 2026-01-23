'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Size, Urgency, Status } from "@/lib/types"
import { createTask } from "@/app/(dashboard)/admin/pipeline/actions"
import { useState, useEffect } from "react"
import { Plus, Calendar, Repeat, Target, Loader2, Settings } from "lucide-react"
import { getClientDepartments } from '@/app/(dashboard)/admin/clients/actions'

interface Option {
    id: string
    name: string
}

interface CreateTaskDialogProps {
    questId?: string
    teamId: string
    sizes: Size[]
    urgencies: Urgency[]
    statuses: Status[]
    projects?: Option[]
    departments?: Option[]
    clients?: Option[]
    questOptions?: Option[]
    crew?: { user_id: string; first_name: string | null; last_name: string | null; email?: string }[]
    defaultStatusId?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
    children?: React.ReactNode
}

export function CreateTaskDialog({
    questId,
    teamId,
    sizes,
    urgencies,
    statuses,
    projects = [],
    departments = [],
    clients = [],
    questOptions = [],
    crew = [],
    defaultStatusId,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    onSuccess,
    children
}: CreateTaskDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    // Helper to call both setters if needed
    const setOpen = (val: boolean) => {
        if (setControlledOpen) setControlledOpen(val)
        setInternalOpen(val)
    }

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [selectedQuestId, setSelectedQuestId] = useState<string>(questId || '_none')
    const [selectedSizeId, setSelectedSizeId] = useState<string>('')
    const [selectedUrgencyId, setSelectedUrgencyId] = useState<string>('')
    const [selectedAssignee, setSelectedAssignee] = useState<string>('_none')
    const [selectedProjectId, setSelectedProjectId] = useState<string>('_none')
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('_none')
    const [selectedClientId, setSelectedClientId] = useState<string>('_none')
    const [deadlineAt, setDeadlineAt] = useState<string>('')

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false)
    const [frequency, setFrequency] = useState('weekly')
    const [recurrenceInterval, setRecurrenceInterval] = useState('1')
    const [recurrenceDays, setRecurrenceDays] = useState<string[]>([])
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState('')

    // Client-Department Filter State
    const [filteredDeptIds, setFilteredDeptIds] = useState<string[] | null>(null)
    const [isFetchingDepts, setIsFetchingDepts] = useState(false)

    // Effect: Fetch allowed departments when client changes
    useEffect(() => {
        async function fetchClientDepts() {
            if (selectedClientId && selectedClientId !== '_none') {
                setIsFetchingDepts(true)
                try {
                    const ids = await getClientDepartments(selectedClientId)
                    setFilteredDeptIds(ids)

                    // If current selection is invalid for this client, reset it
                    if (selectedDepartmentId !== '_none' && !ids.includes(selectedDepartmentId)) {
                        setSelectedDepartmentId('_none')
                    }
                } catch (err) {
                    console.error('Failed to fetch client departments', err)
                } finally {
                    setIsFetchingDepts(false)
                }
            } else {
                setFilteredDeptIds(null) // Show all
            }
        }
        fetchClientDepts()
    }, [selectedClientId])

    // Reset when opening
    useEffect(() => {
        if (open) {
            setTitle('')
            setDescription('')
            // Default to passed questId if exists, else _none
            setSelectedQuestId(questId || '_none')
            setSelectedSizeId('')
            setSelectedUrgencyId('')
            setSelectedAssignee('_none')
            setSelectedProjectId('_none')
            setSelectedDepartmentId('_none')
            setSelectedClientId('_none')
            setIsRecurring(false)
            setFrequency('weekly')
            setRecurrenceInterval('1')
            setRecurrenceDays([])
            setStartDate(new Date().toISOString().split('T')[0])
            setEndDate('')
            setDeadlineAt('')
            setError(null)
        }
    }, [open, questId])

    const backlogStatus = statuses.find(s => s.category === 'backlog')?.id
    const finalDefaultStatus = defaultStatusId || backlogStatus

    const daysOfWeek = [
        { id: '1', label: 'Mon' },
        { id: '2', label: 'Tue' },
        { id: '3', label: 'Wed' },
        { id: '4', label: 'Thu' },
        { id: '5', label: 'Fri' },
        { id: '6', label: 'Sat' },
        { id: '0', label: 'Sun' },
    ]

    const handleDayToggle = (dayId: string) => {
        setRecurrenceDays(prev =>
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        )
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Build Recurrence Rule
            let recurrenceRule = null
            if (isRecurring) {
                recurrenceRule = {
                    frequency,
                    interval: parseInt(recurrenceInterval) || 1,
                    days: frequency === 'weekly' ? recurrenceDays : []
                }
            }

            const res = await createTask(teamId, {
                title,
                description: description || undefined,
                quest_id: (selectedQuestId && selectedQuestId !== '_none') ? selectedQuestId : undefined,
                size_id: selectedSizeId || undefined,
                urgency_id: selectedUrgencyId || undefined,
                assigned_to: (selectedAssignee && selectedAssignee !== '_none') ? selectedAssignee : undefined,
                project_id: (selectedProjectId && selectedProjectId !== '_none') ? selectedProjectId : undefined,
                department_id: (selectedDepartmentId && selectedDepartmentId !== '_none') ? selectedDepartmentId : undefined,
                client_id: (selectedClientId && selectedClientId !== '_none') ? selectedClientId : undefined,
                // Recurrence Fields
                is_recurring: isRecurring,
                recurrence_rule: recurrenceRule,
                recurrence_next_date: isRecurring ? startDate : undefined,
                recurrence_end_date: (isRecurring && endDate) ? endDate : undefined,
                deadline_at: deadlineAt || undefined
            })

            if (res.success) {
                setOpen(false)
                if (onSuccess) onSuccess()
            } else {
                setError(res.error?.message || 'Failed to create task')
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <button className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary text-primary-foreground text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors rounded">
                        <Plus className="h-4 w-4" />
                        <span className="hidden md:inline">Create New Task</span>
                        <span className="md:hidden">New Task</span>
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-card border border-border text-foreground shadow-lg max-w-lg h-[100dvh] md:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
                    <DialogTitle className="uppercase tracking-wider font-bold text-foreground flex items-center gap-2 text-left">
                        <Target className="h-5 w-5 text-primary" />
                        Create New Task
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Create a new task to track progress in the quest board.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="create-task-form"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-hidden flex flex-col md:flex-row bg-muted/5"
                >
                    {/* Left Column: Core Objective (60%) */}
                    <div className="w-full md:w-[60%] h-[60%] md:h-full flex flex-col border-b md:border-b-0 md:border-r border-border bg-background overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Task Title *</label>
                                <Input
                                    autoFocus
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter task objective..."
                                    required
                                    className="bg-background border-input text-foreground h-11 text-base font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Brief / Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide detailed mission briefing..."
                                    rows={10}
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[250px] resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Mission Parameters (40%) */}
                    <div className="w-full md:w-[40%] h-[40%] md:h-full flex flex-col bg-muted/10 overflow-y-auto">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mission Parameters</h3>
                            </div>

                            {/* Project & Department */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs uppercase text-muted-foreground font-bold">Project</label>
                                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                        <SelectTrigger className="bg-background border-input h-9 text-xs">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">None</SelectItem>
                                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs uppercase text-muted-foreground font-bold">Dept.</label>
                                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                                        <SelectTrigger className="bg-background border-input h-9 text-xs">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">None</SelectItem>
                                            {departments
                                                .filter(d => filteredDeptIds === null || filteredDeptIds.includes(d.id))
                                                .map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs uppercase text-muted-foreground font-bold">Client</label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger className="bg-background border-input h-9 text-xs">
                                        <SelectValue placeholder="Select client..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">None</SelectItem>
                                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs uppercase text-muted-foreground font-bold">Objective (Quest)</label>
                                <Select value={selectedQuestId} onValueChange={setSelectedQuestId}>
                                    <SelectTrigger className="bg-background border-input h-9 text-xs">
                                        <SelectValue placeholder="Select quest..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">No Quest</SelectItem>
                                        {questOptions.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs uppercase text-muted-foreground font-bold">Size (XP)</label>
                                    <Select value={selectedSizeId} onValueChange={setSelectedSizeId}>
                                        <SelectTrigger className="bg-background border-input h-9 text-xs">
                                            <SelectValue placeholder="XP..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sizes.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.xp_points || 0} XP)</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs uppercase text-muted-foreground font-bold">Urgency</label>
                                    <Select value={selectedUrgencyId} onValueChange={setSelectedUrgencyId}>
                                        <SelectTrigger className="bg-background border-input h-9 text-xs">
                                            <SelectValue placeholder="Level..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {urgencies.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs uppercase text-muted-foreground font-bold">Assign Operator</label>
                                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                                    <SelectTrigger className="bg-background border-input h-9 text-xs">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">Unassigned</SelectItem>
                                        {crew.map(member => (
                                            <SelectItem key={member.user_id} value={member.user_id}>
                                                {member.first_name || member.last_name
                                                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                                    : member.email || 'Unknown'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs uppercase text-muted-foreground font-bold">Deadline (Optional)</label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={deadlineAt}
                                        onChange={(e) => setDeadlineAt(e.target.value)}
                                        className="bg-background border-input text-xs pl-8 h-9"
                                    />
                                    <Calendar className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                </div>
                            </div>

                            {/* Recurrence Section */}
                            <div className="border border-border p-3 bg-muted/20 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Repeat className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Recurrence</span>
                                    </div>
                                    <Switch
                                        checked={isRecurring}
                                        onCheckedChange={setIsRecurring}
                                    />
                                </div>

                                {isRecurring && (
                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">Freq.</label>
                                                <Select value={frequency} onValueChange={setFrequency}>
                                                    <SelectTrigger className="h-8 text-[10px] bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">Interval</label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={recurrenceInterval}
                                                    onChange={e => setRecurrenceInterval(e.target.value)}
                                                    className="h-8 text-[10px] bg-background"
                                                />
                                            </div>
                                        </div>

                                        {frequency === 'weekly' && (
                                            <div>
                                                <div className="flex flex-wrap gap-1">
                                                    {daysOfWeek.map(day => (
                                                        <div
                                                            key={day.id}
                                                            onClick={() => handleDayToggle(day.id)}
                                                            className={`
                                                                w-6 h-6 flex items-center justify-center border text-[9px] font-bold cursor-pointer transition-colors rounded
                                                                ${recurrenceDays.includes(day.id)
                                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                                    : 'bg-background text-muted-foreground border-border hover:bg-muted'}
                                                            `}
                                                        >
                                                            {day.label[0]}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">Start</label>
                                                <div className="relative">
                                                    <Input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="h-8 text-[10px] bg-background pl-7"
                                                        required={isRecurring}
                                                    />
                                                    <Calendar className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">End</label>
                                                <div className="relative">
                                                    <Input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="h-8 text-[10px] bg-background pl-7"
                                                    />
                                                    <Calendar className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-destructive/10 text-destructive text-[10px] font-bold rounded border border-destructive/20 uppercase tracking-tighter">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="px-4 py-2 text-sm font-bold uppercase text-muted-foreground hover:text-foreground"
                    >
                        Cancel
                    </button>
                    <button
                        form="create-task-form"
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isRecurring ? 'Initialize Protocol' : 'Create Task'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
