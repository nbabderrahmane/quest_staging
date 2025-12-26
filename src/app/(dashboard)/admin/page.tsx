'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/admin/data-table"
import { createStatus, getStatuses, createSize, getSizes, createUrgency, getUrgencies, getQuestStatuses, createQuestStatus, toggleItemActive, updateItem } from "@/app/admin/actions"
import { useEffect, useState } from "react"
import { Status, Size, Urgency, QuestStatus } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { WindowCard } from "@/components/ui/window-card"
import { EditItemDialog } from "@/components/admin/edit-item-dialog"

// Using native button for now if Button component not present, or standard styling
const ActionButton = ({ children, ...props }: any) => (
    <button
        {...props}
        className="w-full rounded-none bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(var(--primary),0.3)] disabled:opacity-50"
    >
        {children}
    </button>
)

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState("statuses")

    // Read tab from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab')
        if (tabParam && ['statuses', 'sizes', 'urgencies', 'questProtocols'].includes(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [])

    // Data State
    const [statuses, setStatuses] = useState<Status[]>([])
    const [sizes, setSizes] = useState<Size[]>([])
    const [urgencies, setUrgencies] = useState<Urgency[]>([])
    const [questStatuses, setQuestStatuses] = useState<QuestStatus[]>([])
    const [teamId, setTeamId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('member')

    // Error Feedback State
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Generic form submit handler with error feedback
    const handleFormSubmit = async (action: (prev: any, fd: FormData) => Promise<any>, formData: FormData) => {
        setErrorMessage(null)

        // Client-side duplicate check (optional prevention)
        const name = formData.get('name') as string
        if (name && activeTab === 'statuses' && statuses.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            setErrorMessage('DUPLICATE DETECTED: This parameter already exists in your Forge protocols.')
            return
        }
        if (name && activeTab === 'sizes' && sizes.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            setErrorMessage('DUPLICATE DETECTED: This parameter already exists in your Forge protocols.')
            return
        }
        if (name && activeTab === 'urgencies' && urgencies.some(u => u.name.toLowerCase() === name.toLowerCase())) {
            setErrorMessage('DUPLICATE DETECTED: This parameter already exists in your Forge protocols.')
            return
        }

        setIsSubmitting(true)
        formData.append('teamId', teamId!)
        const result = await action(null, formData)
        setIsSubmitting(false)

        if (result.success) {
            // Preserve active tab via URL param
            window.location.href = `/admin?tab=${activeTab}`
        } else {
            setErrorMessage(result.error || 'PROTOCOL ERROR: UNKNOWN FAILURE')
        }
    }

    // Auto-dismiss error toast after 4 seconds
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [errorMessage])

    // Edit Modal State
    const [editItem, setEditItem] = useState<Status | Size | Urgency | null>(null)
    const [editType, setEditType] = useState<'status' | 'size' | 'urgency'>('status')
    const [editOpen, setEditOpen] = useState(false)

    // Toggle is_active handler
    const handleToggle = async (table: 'statuses' | 'sizes' | 'urgencies', id: string, currentValue: boolean) => {
        if (!teamId) return
        setErrorMessage(null)
        const result = await toggleItemActive(table, id, teamId, currentValue)
        if (result.success) {
            window.location.reload()
        } else {
            setErrorMessage(result.error || 'Toggle failed')
        }
    }

    // Edit handler - open modal
    const handleEdit = (type: 'status' | 'size' | 'urgency', item: any) => {
        setEditType(type)
        setEditItem(item)
        setEditOpen(true)
    }

    // Save edit handler
    const handleSaveEdit = async (data: any) => {
        if (!teamId || !editItem) return
        const tableMap = { status: 'statuses', size: 'sizes', urgency: 'urgencies' } as const
        const result = await updateItem(tableMap[editType], editItem.id, teamId, data)
        if (result.success) {
            window.location.reload()
        } else {
            setErrorMessage(result.error || 'Update failed')
        }
    }

    // Fetch Data - Dynamic Team Detection
    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get all memberships for potential fallback
            const { data: memberships } = await supabase
                .from('team_members')
                .select('team_id, role')
                .eq('user_id', user.id)

            if (!memberships || memberships.length === 0) return

            // Try to get selected team from cookie (client-side accessible)
            const selectedTeamCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('selected_team='))
                ?.split('=')[1]

            // Find membership for selected team, or use first
            let activeMembership = memberships.find(m => m.team_id === selectedTeamCookie)
            if (!activeMembership) {
                activeMembership = memberships[0]
            }

            setTeamId(activeMembership.team_id)
            setUserRole(activeMembership.role)

            const [s, z, u, qs] = await Promise.all([
                getStatuses(activeMembership.team_id),
                getSizes(activeMembership.team_id),
                getUrgencies(activeMembership.team_id),
                getQuestStatuses(activeMembership.team_id)
            ])
            setStatuses(s)
            setSizes(z)
            setUrgencies(u)
            setQuestStatuses(qs as QuestStatus[])
        }
        load()
    }, [])

    if (!teamId) return <div className="p-8 text-muted-foreground animate-pulse font-mono">Initializing Forge Protocols...</div>

    // Role Gating
    const canEdit = ['owner', 'admin'].includes(userRole)

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">The Forge</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">System Configuration // Guild Admin</p>
                </div>
                {!canEdit && (
                    <div className="text-xs font-mono text-yellow-500 uppercase px-2 py-1 border border-yellow-500/30 bg-yellow-500/10 rounded">
                        Read Only Mode
                    </div>
                )}
            </div>

            <Tabs defaultValue="statuses" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-transparent p-0 border-b border-border w-full justify-start rounded-none h-auto gap-6">
                    <RetroTabTrigger value="statuses">Statuses</RetroTabTrigger>
                    <RetroTabTrigger value="sizes">Sizes (XP)</RetroTabTrigger>
                    <RetroTabTrigger value="urgencies">Urgencies</RetroTabTrigger>
                    <RetroTabTrigger value="questProtocols">Quest Protocols</RetroTabTrigger>
                </TabsList>

                <TabsContent value="statuses" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {canEdit && (
                            <div className="lg:col-span-1">
                                <WindowCard title="New Status Parameter">
                                    <form action={(formData) => handleFormSubmit(createStatus, formData)} className="space-y-4">
                                        <Input name="name" placeholder="Status Name" required className="bg-muted/5 border-border rounded-none focus:ring-primary" />
                                        <Select name="category" required>
                                            <SelectTrigger className="w-full bg-muted/5 border-border rounded-none"><SelectValue placeholder="Category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="backlog">Backlog</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="done">Done</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <ActionButton>Construct Status</ActionButton>
                                    </form>
                                </WindowCard>
                            </div>
                        )}
                        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
                            <WindowCard title="Existing Protocols">
                                <DataTable
                                    data={statuses}
                                    columns={[
                                        { key: 'name', label: 'Name' },
                                        { key: 'category', label: 'Category' },
                                        { key: 'sort_order', label: 'Order' }
                                    ]}
                                    onToggleActive={canEdit ? (id, current) => handleToggle('statuses', id, current) : undefined}
                                    onEdit={canEdit ? (item) => handleEdit('status', item) : undefined}
                                />
                            </WindowCard>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="sizes" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {canEdit && (
                            <div className="lg:col-span-1">
                                <WindowCard title="New XP Size">
                                    <form action={(formData) => handleFormSubmit(createSize, formData)} className="space-y-4">
                                        <Input name="name" placeholder="Size Name (e.g. XS, M, L)" required className="bg-muted/5 border-border rounded-none" />
                                        <Input name="xp" type="number" placeholder="XP Points" required className="bg-muted/5 border-border rounded-none" />
                                        <ActionButton>Construct Size</ActionButton>
                                    </form>
                                </WindowCard>
                            </div>
                        )}
                        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
                            <WindowCard title="XP Definitions">
                                <DataTable
                                    data={sizes}
                                    columns={[
                                        { key: 'name', label: 'Name' },
                                        { key: 'xp_points', label: 'XP' }
                                    ]}
                                    onToggleActive={canEdit ? (id, current) => handleToggle('sizes', id, current) : undefined}
                                    onEdit={canEdit ? (item) => handleEdit('size', item) : undefined}
                                />
                            </WindowCard>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="urgencies" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {canEdit && (
                            <div className="lg:col-span-1">
                                <WindowCard title="New Urgency Level">
                                    <form action={(formData) => handleFormSubmit(createUrgency, formData)} className="space-y-4">
                                        <Input name="name" placeholder="Urgency Name" required className="bg-muted/5 border-border rounded-none" />
                                        <Input name="weight" type="number" placeholder="Weight" required className="bg-muted/5 border-border rounded-none" />
                                        <Input name="color" placeholder="Color Code" required className="bg-muted/5 border-border rounded-none" />
                                        <ActionButton>Construct Urgency</ActionButton>
                                    </form>
                                </WindowCard>
                            </div>
                        )}
                        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
                            <WindowCard title="Priority Matrix">
                                <DataTable
                                    data={urgencies}
                                    columns={[
                                        { key: 'name', label: 'Name' },
                                        { key: 'weight', label: 'Weight' },
                                        { key: 'color', label: 'Color' }
                                    ]}
                                    onToggleActive={canEdit ? (id, current) => handleToggle('urgencies', id, current) : undefined}
                                    onEdit={canEdit ? (item) => handleEdit('urgency', item) : undefined}
                                />
                            </WindowCard>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="questProtocols" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {canEdit && (
                            <div className="lg:col-span-1">
                                <WindowCard title="New Quest Status">
                                    <form action={(formData) => handleFormSubmit(createQuestStatus, formData)} className="space-y-4">
                                        <Input name="name" placeholder="Status Name" required className="bg-muted/5 border-border rounded-none" />
                                        <Select name="category" required>
                                            <SelectTrigger className="w-full bg-muted/5 border-border rounded-none"><SelectValue placeholder="Category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending (Not Started)</SelectItem>
                                                <SelectItem value="active">Active (In Progress)</SelectItem>
                                                <SelectItem value="completed">Completed (Achieved)</SelectItem>
                                                <SelectItem value="cancelled">Cancelled (Abandoned)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <ActionButton>Construct Quest Status</ActionButton>
                                    </form>
                                </WindowCard>
                            </div>
                        )}
                        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
                            <WindowCard title="Quest Status Matrix">
                                <DataTable
                                    data={questStatuses}
                                    columns={[
                                        { key: 'name', label: 'Name' },
                                        { key: 'color', label: 'Color' },
                                        { key: 'sort_order', label: 'Order' }
                                    ]}
                                />
                            </WindowCard>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Error Toast */}
            {errorMessage && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-red-900/90 border border-red-500/50 text-red-200 font-mono text-xs rounded shadow-lg backdrop-blur-md">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold text-red-400 mb-1">Protocol Error</p>
                            <p>{errorMessage}</p>
                        </div>
                        <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-300">✕</button>
                    </div>
                </div>
            )}

            {/* Edit Item Dialog */}
            <EditItemDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                item={editItem}
                type={editType}
                onSave={handleSaveEdit}
            />
        </div>
    )
}

function RetroTabTrigger({ value, children }: { value: string, children: React.ReactNode }) {
    return (
        <TabsTrigger
            value={value}
            className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent transition-all uppercase tracking-wider font-bold text-sm"
        >
            {children}
        </TabsTrigger>
    )
}
