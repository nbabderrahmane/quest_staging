'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Size, Urgency, Status } from "@/lib/types"
import { createTask } from "@/app/(dashboard)/admin/pipeline/actions"
import { useState, useEffect } from "react"
import { Plus, Calendar, Repeat, Target, Loader2 } from "lucide-react"

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
            <DialogContent className="bg-card border border-border text-foreground shadow-lg max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="uppercase tracking-wider font-bold text-foreground flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Create New Task
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div>
                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Task Title *</label>
                        <Input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task objective..."
                            required
                            className="bg-background border-input text-foreground"
                        />
                    </div>

                    <div>
                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional task details..."
                            rows={2}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Project</label>
                            <Select value={selectedProjectId} onValueChange={(val) => { console.log('Project selected:', val); setSelectedProjectId(val) }}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <SelectValue placeholder="Select project..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Department</label>
                            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <SelectValue placeholder="Select department..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Quest (Objective)</label>
                        <Select value={selectedQuestId} onValueChange={setSelectedQuestId}>
                            <SelectTrigger className="bg-background border-input text-foreground">
                                <SelectValue placeholder="Select quest..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">No Quest</SelectItem>
                                {questOptions.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Size (XP)</label>
                            <Select value={selectedSizeId} onValueChange={setSelectedSizeId}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <SelectValue placeholder="Select size..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sizes.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.xp_points || 0} XP)</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Urgency</label>
                            <Select value={selectedUrgencyId} onValueChange={setSelectedUrgencyId}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <SelectValue placeholder="Select urgency..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {urgencies.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Assign To</label>
                        <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                            <SelectTrigger className="bg-background border-input text-foreground">
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

                    <div>
                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Deadline (Optional)</label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={deadlineAt}
                                onChange={(e) => setDeadlineAt(e.target.value)}
                                className="bg-background border-input text-foreground pl-10"
                            />
                            <Calendar className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Recurrence Section */}
                    <div className="border border-border p-3 bg-muted/10 rounded space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Repeat className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Recurrence</span>
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
                                        <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">Frequency</label>
                                        <Select value={frequency} onValueChange={setFrequency}>
                                            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">Interval (Every X)</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={recurrenceInterval}
                                            onChange={e => setRecurrenceInterval(e.target.value)}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                </div>

                                {frequency === 'weekly' && (
                                    <div>
                                        <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">On Days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeek.map(day => (
                                                <div
                                                    key={day.id}
                                                    onClick={() => handleDayToggle(day.id)}
                                                    className={`
                                                        w-8 h-8 flex items-center justify-center border text-xs font-bold cursor-pointer transition-colors rounded
                                                        ${recurrenceDays.includes(day.id)
                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                            : 'bg-background text-muted-foreground border-border hover:bg-muted'}
                                                    `}
                                                >
                                                    {day.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">Start Date</label>
                                        <div className="relative">
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="h-8 text-xs bg-background pl-8"
                                                required={isRecurring}
                                            />
                                            <Calendar className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-muted-foreground mb-1 block font-bold">End Date (Opt)</label>
                                        <div className="relative">
                                            <Input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="h-8 text-xs bg-background pl-8"
                                            />
                                            <Calendar className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-destuctive/10 text-destructive text-sm rounded border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 text-sm font-bold uppercase text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isRecurring ? 'Initialize Protocol' : 'Create Task'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
