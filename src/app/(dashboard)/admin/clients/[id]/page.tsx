'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Client, Task } from '@/lib/types'
import { Briefcase, Mail, Phone, Calendar, ArrowLeft, Plus, Loader2, Building, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getTasks, createTask } from '@/app/(dashboard)/admin/pipeline/actions'
import { TaskDetailDrawer } from '@/app/(dashboard)/admin/pipeline/task-detail-drawer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { inviteClientUser, getClientInvitations, deleteClientInvitation, resetClientPassword } from '@/app/(dashboard)/admin/clients/actions'
import { Check, Copy, Link, UserPlus, X, Lock, AlertCircle, Edit2 } from 'lucide-react'

// Reuse interfaces from Pipeline
interface CrewMember {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
}
interface SizeItem { id: string; name: string; xp_points: number }
interface UrgencyItem { id: string; name: string; color: string }

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // React 19: Unwap params with use()
    const { id: clientId } = use(params)

    const [client, setClient] = useState<Client | null>(null)
    const [tasks, setTasks] = useState<any[]>([]) // Using any to match pipeline action return type loosely
    const [isLoading, setIsLoading] = useState(true)
    const [teamId, setTeamId] = useState<string | null>(null)

    // Edit Profile State
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        name: '',
        company_name: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
    })
    const [isSaving, setIsSaving] = useState(false)

    // Task Drawer State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // Create Task State
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
    const [isCreatingTask, setIsCreatingTask] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')

    // Invite User State
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [isInviting, setIsInviting] = useState(false)
    const [invitations, setInvitations] = useState<any[]>([])
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Reset Password State
    const [isResetOpen, setIsResetOpen] = useState(false)
    const [resetPassword, setResetPassword] = useState('')
    const [memberToReset, setMemberToReset] = useState<string | null>(null)
    const [isResetting, setIsResetting] = useState(false)

    // Meta Data for Drawer
    const [crew, setCrew] = useState<CrewMember[]>([])
    const [sizes, setSizes] = useState<SizeItem[]>([])
    const [urgencies, setUrgencies] = useState<UrgencyItem[]>([])
    const [statuses, setStatuses] = useState<any[]>([])
    const [quests, setQuests] = useState<{ id: string; name: string }[]>([])
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

    // Invitation related states
    const [members, setMembers] = useState<any[]>([])
    const [copied, setCopied] = useState(false)

    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [clientId])

    async function loadData() {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get Team ID
            const selectedTeamCookie = document.cookie.split('; ').find(row => row.startsWith('selected_team='))?.split('=')[1]?.trim()
            const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', user.id)
            let activeTeamId = selectedTeamCookie
            if (!activeTeamId || !memberships?.find(m => m.team_id === activeTeamId)) {
                activeTeamId = memberships?.[0]?.team_id
            }
            if (!activeTeamId) return
            setTeamId(activeTeamId)

            // Get Client
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single()

            if (clientError) throw clientError
            setClient(clientData)
            setEditForm({
                name: clientData.name,
                company_name: clientData.company_name || '',
                first_name: clientData.first_name || '',
                last_name: clientData.last_name || '',
                email: clientData.email || '',
                phone: clientData.phone || ''
            })

            // Get Tasks
            const tasksData = await getTasks(activeTeamId!, { clientId })
            if (tasksData && 'error' in tasksData) {
                console.error('Task fetch error:', tasksData.error)
                setError(`Tasks: ${tasksData.error}`)
            } else if (Array.isArray(tasksData)) {
                setTasks(tasksData)
            }

            // Get Meta Data for Drawer interactability
            // Parallel fetch for speed
            const [crewRes, sizesRes, urgenciesRes, statusesRes, questsRes, projectsRes, departmentsRes] = await Promise.all([
                supabase.from('team_members').select('user_id, role').eq('team_id', activeTeamId),
                supabase.from('sizes').select('id, name, xp_points').eq('team_id', activeTeamId).eq('is_active', true),
                supabase.from('urgencies').select('id, name, color').eq('team_id', activeTeamId).eq('is_active', true),
                supabase.from('statuses').select('*').eq('team_id', activeTeamId).eq('is_active', true).order('sort_order'),
                supabase.from('quests').select('id, name').eq('team_id', activeTeamId).eq('is_active', true).order('created_at', { ascending: false }),
                supabase.from('projects').select('id, name').eq('team_id', activeTeamId).eq('is_active', true).order('name'),
                supabase.from('departments').select('id, name').eq('team_id', activeTeamId).eq('is_active', true).order('name')
            ])

            if (statusesRes.data) setStatuses(statusesRes.data)
            if (sizesRes.data) setSizes(sizesRes.data)
            if (urgenciesRes.data) setUrgencies(urgenciesRes.data)
            if (questsRes.data) setQuests(questsRes.data)
            if (projectsRes.data) setProjects(projectsRes.data)
            if (departmentsRes.data) setDepartments(departmentsRes.data)

            // Fetch profiles for crew
            if (crewRes.data) {
                const userIds = crewRes.data.map(m => m.user_id)
                const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name').in('id', userIds)
                setCrew(profiles || [])
            }

            // Fetch Client Invite Data
            const invites = await getClientInvitations(clientId)
            setInvitations(invites)

            // Fetch Client Members
            const { data: memberData, error: memberError } = await supabase
                .from('client_members')
                .select('*, profiles!user_id(email, first_name, last_name)')
                .eq('client_id', clientId)

            if (memberError) {
                console.error('Member fetch error:', memberError)
                setError(`Members: ${memberError.message}`)
            } else {
                setMembers(memberData || [])
            }

        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSaveProfile() {
        if (!client || !teamId) return
        setIsSaving(true)
        try {
            const supabase = createClient()
            // Reconstruct Display Name
            let displayName = ''
            if (editForm.first_name || editForm.last_name) {
                displayName = `${editForm.first_name || ''} ${editForm.last_name || ''}`.trim()
                if (editForm.company_name) {
                    displayName += ` (${editForm.company_name})`
                }
            } else {
                displayName = editForm.company_name
            }

            const { error } = await supabase
                .from('clients')
                .update({
                    name: displayName,
                    company_name: editForm.company_name || null,
                    first_name: editForm.first_name || null,
                    last_name: editForm.last_name || null,
                    email: editForm.email || null,
                    phone: editForm.phone || null
                })
                .eq('id', clientId)

            if (error) throw error
            setClient({ ...client, ...editForm } as Client)
            setIsEditing(false)
            router.refresh()
        } catch (err) {
            console.error('Failed to update client', err)
            alert('Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    async function handleCreateTask(e: React.FormEvent) {
        e.preventDefault()
        if (!teamId || !newTaskTitle.trim()) return
        setIsCreatingTask(true)
        try {
            const res = await createTask(teamId, {
                title: newTaskTitle,
                client_id: clientId,
            })
            if (res.success) {
                setNewTaskTitle('')
                setIsCreateTaskOpen(false)
                loadData() // Refresh tasks
            } else {
                alert(res.error)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsCreatingTask(false)
        }
    }

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
    if (!client) return <div className="p-8">Client not found</div>

    // Group tasks by Status Category (Backlog, Active, Done)
    const backlogTasks = tasks.filter(t => t.status?.category === 'backlog')
    const activeTasks = tasks.filter(t => t.status?.category === 'active')
    const validationTasks = tasks.filter(t => t.status?.category === 'validation')
    const doneTasks = tasks.filter(t => t.status?.category === 'done')
    const archivedTasks = tasks.filter(t => t.status?.category === 'archived')

    return (
        <div className="space-y-8 h-full flex flex-col">
            {/* Header / Profile */}
            <div className="flex flex-col gap-6 bg-card border border-border p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-bold uppercase">
                        <ArrowLeft className="h-4 w-4" /> Back to Clients
                    </button>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-xs font-bold uppercase text-primary hover:underline">Edit Profile</button>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2 text-sm shadow-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 font-mono text-[10px] break-all">{error}</div>
                        <button onClick={() => setError(null)} className="ml-auto text-xs font-bold uppercase opacity-50 hover:opacity-100">Dismiss</button>
                    </div>
                )}

                {isEditing ? (
                    <div className="grid gap-4 max-w-2xl">
                        <div className="grid gap-2">
                            <label className="text-xs uppercase font-bold text-slate-500">Company Name</label>
                            <Input value={editForm.company_name} onChange={e => setEditForm({ ...editForm, company_name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500">First Name</label>
                                <Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500">Last Name</label>
                                <Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500">Email</label>
                                <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500">Phone</label>
                                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                            </div>
                        </div>

                        {/* Security Section within Edit */}
                        <div className="mt-4 pt-4 border-t border-border">
                            <h3 className="text-xs uppercase font-black text-foreground mb-4 bg-primary/5 px-2 py-1 rounded inline-block">Security & Access</h3>
                            <div className="flex flex-wrap gap-3">
                                {members.length > 0 ? (
                                    members.map((member: any) => (
                                        <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => {
                                                setMemberToReset(member.user_id);
                                                setResetPassword('');
                                                setIsResetOpen(true);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded text-xs font-bold uppercase transition-colors border border-amber-500/20"
                                        >
                                            <Lock className="h-3.5 w-3.5" />
                                            Reset Password for {member.profiles?.first_name || 'User'}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-muted-foreground italic">No active portal users to manage for this client.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <button onClick={handleSaveProfile} disabled={isSaving} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-muted text-muted-foreground text-sm font-bold uppercase rounded">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-6">
                        <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                            <Briefcase className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground">{client.name}</h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                {client.company_name && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border">
                                        <Building className="h-3 w-3" />
                                        {client.company_name}
                                    </span>
                                )}
                                {client.email && (
                                    <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border hover:bg-muted hover:text-foreground transition-colors">
                                        <Mail className="h-3 w-3" />
                                        {client.email}
                                    </a>
                                )}
                                {client.phone && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border">
                                        <Phone className="h-3 w-3" />
                                        {client.phone}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border">
                                    <Calendar className="h-3 w-3" />
                                    Since {new Date(client.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsCreateTaskOpen(true)} className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded hover:bg-primary/90 shadow-sm">
                            <Plus className="h-4 w-4" /> New Ticket
                        </button>
                    </div>
                )}
            </div>

            {/* Portal Access Section */}
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Portal Access</h3>
                        <p className="text-sm text-muted-foreground">Manage client users who have access to the portal.</p>
                    </div>
                    <button
                        onClick={() => {
                            if (client?.email) setInviteEmail(client.email)
                            setIsInviteOpen(true)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded text-xs font-bold uppercase transition-colors"
                    >
                        <UserPlus className="h-4 w-4" />
                        Invite User
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Active Members */}
                    {members.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Active Users</h4>
                            <div className="space-y-2">
                                {members.map((member: any) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                {member.profiles?.first_name?.[0] || member.profiles?.email?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">
                                                    {member.profiles?.first_name
                                                        ? `${member.profiles.first_name} ${member.profiles.last_name || ''}`
                                                        : member.profiles?.email}
                                                </p>
                                                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setMemberToReset(member.user_id); setResetPassword(''); setIsResetOpen(true); }}
                                            className="text-xs text-muted-foreground hover:text-primary underline px-2"
                                        >
                                            Reset Password
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Pending Invites</h4>
                            <div className="space-y-2">
                                {invitations.map((invite: any) => (
                                    <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                                                <Mail className="h-4 w-4 text-orange-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate max-w-[200px]" title={invite.email || 'Generic Invite'}>
                                                    {invite.email || 'Generic Invite Link'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Expires: {new Date(invite.expires_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Standard Copy Link */}
                                            <button
                                                onClick={() => {
                                                    const link = `${window.location.origin}/portal/login?invite=${invite.token}`
                                                    navigator.clipboard.writeText(link)
                                                    setCopied(true)
                                                    setTimeout(() => setCopied(false), 2000)
                                                }}
                                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                title="Copy Link"
                                            >
                                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </button>

                                            {/* Reset Password (for existing users stuck in limbo) */}
                                            {invite.email && (
                                                <button
                                                    onClick={() => { setMemberToReset(invite.email); setResetPassword(''); setIsResetOpen(true); }}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                    title="Reset User Password"
                                                >
                                                    <Lock className="h-4 w-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={async () => {
                                                    await deleteClientInvitation(invite.id)
                                                    loadData()
                                                }}
                                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors"
                                                title="Revoke Invite"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {members.length === 0 && invitations.length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4 bg-muted/10 rounded">
                            No users have access to this portal yet.
                        </p>
                    )}
                </div>
            </div>

            {/* Simple Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 flex-1 overflow-hidden min-h-[500px]">
                {/* Backlog */}
                <KanbanColumn title="Backlog" tasks={backlogTasks} color="border-slate-500/50" onTaskClick={(id) => { setSelectedTaskId(id); setIsDrawerOpen(true) }} />
                <KanbanColumn title="Active" tasks={activeTasks} color="border-blue-500/50" onTaskClick={(id) => { setSelectedTaskId(id); setIsDrawerOpen(true) }} />
                <KanbanColumn title="Validation" tasks={validationTasks} color="border-purple-500/50" onTaskClick={(id) => { setSelectedTaskId(id); setIsDrawerOpen(true) }} />
                <KanbanColumn title="Done" tasks={doneTasks} color="border-green-500/50" onTaskClick={(id) => { setSelectedTaskId(id); setIsDrawerOpen(true) }} />
                <KanbanColumn title="Archive" tasks={archivedTasks} color="border-zinc-500/50" onTaskClick={(id) => { setSelectedTaskId(id); setIsDrawerOpen(true) }} />
            </div>

            {/* Task Create Modal */}
            <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Ticket for {client.name}</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                        <Input placeholder="Ticket Title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required />
                        <DialogFooter>
                            <button type="submit" disabled={isCreatingTask} className="px-4 py-2 bg-primary text-primary-foreground rounded font-bold uppercase text-sm">
                                {isCreatingTask ? 'Creating...' : 'Create Ticket'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Invite Modal */}
            <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) setInviteLink(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Client User</DialogTitle>
                    </DialogHeader>

                    {inviteLink ? (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 text-sm flex items-center gap-2">
                                <Check className="h-4 w-4" /> Invitation created successfully!
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-muted-foreground">Invitation Link</label>
                                <div className="flex items-center gap-2">
                                    <Input value={inviteLink} readOnly className="font-mono text-xs" />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteLink)
                                            setCopied(true)
                                            setTimeout(() => setCopied(false), 2000)
                                        }}
                                        className="p-2 bg-muted hover:bg-muted/80 rounded border border-border"
                                    >
                                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">Share this link with the client securely. It expires in 7 days.</p>
                            </div>
                            <DialogFooter>
                                <button onClick={() => { setIsInviteOpen(false); setInviteLink(null); loadData(); }} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-bold">
                                    Done
                                </button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-muted/30 rounded border border-border text-sm text-muted-foreground">
                                <p>Generate a unique invite link. Anyone with this link can create an account and join this client portal.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address (Optional)</label>
                                <Input
                                    type="email"
                                    placeholder="Optional: Track who this invite is for"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    setIsInviting(true)
                                    // Pass undefined if empty string to trigger generic invite
                                    const res = await inviteClientUser(clientId, inviteEmail || undefined)
                                    setIsInviting(false)
                                    if (res.success) {
                                        setInviteLink(`${window.location.origin}/portal/login?invite=${res.token}`)
                                    } else {
                                        alert(res.error)
                                    }
                                }}
                                disabled={isInviting}
                                className="w-full py-3 bg-primary text-primary-foreground text-sm font-bold uppercase rounded hover:bg-primary/90 flex items-center justify-center gap-2"
                            >
                                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <>
                                        <Link className="h-4 w-4" />
                                        Generate Invite Link
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Task Detail Drawer */}
            {
                selectedTaskId && teamId && (
                    <TaskDetailDrawer
                        taskId={selectedTaskId}
                        teamId={teamId}
                        open={isDrawerOpen}
                        onClose={() => { setIsDrawerOpen(false); loadData() }}
                        canEdit={true}
                        crew={crew}
                        sizes={sizes}
                        urgencies={urgencies}
                        quests={quests}
                        projects={projects}
                        departments={departments}
                        clients={client ? [{ id: client.id, name: client.name }] : []}
                    />
                )
            }
            {/* Reset Password Dialog */}
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Client Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-amber-500/10 text-amber-600 p-3 rounded text-sm border border-amber-500/20">
                            <strong>Warning:</strong> This will override the user's current password.
                            The user will be required to change this password upon their next login.
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Temporary Password</label>
                            <Input
                                value={resetPassword}
                                onChange={e => setResetPassword(e.target.value)}
                                placeholder="e.g. Welcome2024!"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button
                            onClick={() => setIsResetOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isResetting || !resetPassword}
                            onClick={async () => {
                                if (!memberToReset) return
                                setIsResetting(true)
                                const res = await resetClientPassword(memberToReset, resetPassword)
                                setIsResetting(false)
                                if (res.success) {
                                    alert('Password reset successfully. Please share the temporary password with the user.')
                                    setIsResetOpen(false)
                                    setResetPassword('')
                                } else {
                                    alert(res.error)
                                }
                            }}
                            className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}

function KanbanColumn({ title, tasks, color, onTaskClick }: { title: string, tasks: any[], color: string, onTaskClick: (id: string) => void }) {
    return (
        <div className="flex flex-col bg-muted/20 border border-border rounded-xl p-4 h-full">
            <h3 className={`font-black uppercase text-sm tracking-wider mb-4 pb-2 border-b-2 ${color} text-foreground/80`}>{title} <span className="text-muted-foreground ml-2">({tasks.length})</span></h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {tasks.map(task => (
                    <div key={task.id} onClick={() => onTaskClick(task.id)} className="bg-card border border-border p-3 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase">{task.status?.name}</span>
                            {task.urgency && <div className={`w-2 h-2 rounded-full ${task.urgency.color.split(' ')[0]}`} />}
                        </div>
                        <h4 className="font-bold text-foreground line-clamp-2 mb-2">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-2">
                            {task.assignee ? (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/30">
                                    {task.assignee.first_name?.[0]}{task.assignee.last_name?.[0]}
                                </div>
                            ) : (
                                <div className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">?</div>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">{new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
