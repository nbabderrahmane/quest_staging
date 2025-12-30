'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Size, Urgency, Status } from "@/lib/types"
import { createTask } from "@/app/(dashboard)/quest-board/actions"
import { useState } from "react"
// import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Create a simple custom button if generic Button doesn't work well with styling
const ActionButton = ({ children, isLoading, ...props }: any) => (
    <button
        {...props}
        disabled={isLoading}
        className="w-full rounded-none bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(var(--primary),0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
    >
        {children}
    </button>
)

interface CreateTaskDialogProps {
    questId: string
    teamId: string
    sizes: Size[]
    urgencies: Urgency[]
    statuses: Status[]
    defaultStatusId?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode // Allow custom trigger
}

export function CreateTaskDialog({ questId, teamId, sizes, urgencies, statuses, defaultStatusId, open: controlledOpen, onOpenChange: setControlledOpen, children }: CreateTaskDialogProps) {
    const [date, setDate] = useState<Date>()
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen
    const [loading, setLoading] = useState(false)

    // Find "Backlog" status for default if not provided
    const backlogStatus = statuses.find(s => s.category === 'backlog')?.id
    const finalDefaultStatus = defaultStatusId || backlogStatus

    // Reset status when dialog opens if we wanted to enforce it, but simplistic is fine

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        formData.append('teamId', teamId)
        formData.append('questId', questId)

        // If no status select implementation in simple form, append default
        const statusId = formData.get('statusId') || backlogStatus
        if (statusId) formData.set('statusId', statusId as string)

        const res = await createTask(null, formData)
        setLoading(false)
        if (!res?.error) {
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <button className="bg-primary text-primary-foreground p-2 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] hover:bg-primary/90 transition-all fixed bottom-8 right-8 z-50 md:static md:rounded-none md:shadow-none md:flex md:items-center md:gap-2 md:px-4 md:py-2 md:w-auto">
                        <Plus className="h-5 w-5" />
                        <span className="hidden md:inline font-bold uppercase text-xs tracking-wider">New Task</span>
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="rounded-none border-border bg-card text-foreground">
                <DialogHeader>
                    <DialogTitle className="uppercase tracking-widest text-primary text-sm font-bold">New Task Protocol</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="project" placeholder="Project" className="rounded-none bg-muted/50 border-border focus:ring-primary" />
                        <Input name="department" placeholder="Department" className="rounded-none bg-muted/50 border-border focus:ring-primary" />
                    </div>

                    <Input name="title" placeholder="Task Directive" required className="rounded-none bg-muted/50 border-border focus:ring-primary" />

                    <div className="grid grid-cols-2 gap-4">
                        <Select name="sizeId" required>
                            <SelectTrigger className="rounded-none bg-muted/50 border-border"><SelectValue placeholder="XP Size" /></SelectTrigger>
                            <SelectContent>
                                {sizes.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.xp_points} XP)</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select name="urgencyId" required>
                            <SelectTrigger className="rounded-none bg-muted/50 border-border"><SelectValue placeholder="Urgency" /></SelectTrigger>
                            <SelectContent>
                                {urgencies.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Select name="statusId" defaultValue={finalDefaultStatus} key={finalDefaultStatus}>
                        <SelectTrigger className="rounded-none bg-muted/50 border-border"><SelectValue placeholder="Initial Status" /></SelectTrigger>
                        <SelectContent>
                            {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <ActionButton isLoading={loading}>Initialize Task</ActionButton>
                </form>
            </DialogContent>
        </Dialog>
    )
}
