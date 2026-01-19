'use client'

import { useState, useEffect } from 'react'
import { getClientDashboardData, updateClientPassword, updateProfile } from '../../actions'
import { Loader2, Plus, LogOut, User, Phone, Lock, Settings, Briefcase, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClientTicket } from '../../actions'

export default function PortalDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{ clients: any[], tasks: any[], teams: any[], statuses: any[], profile: any }>({
        clients: [], tasks: [], teams: [], statuses: [], profile: null
    })
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

    // Change Password State
    const [shouldChangePassword, setShouldChangePassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    // New Ticket State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTicketTitle, setNewTicketTitle] = useState('')
    const [newTicketDesc, setNewTicketDesc] = useState('')
    const [isCreatingTicket, setIsCreatingTicket] = useState(false)

    // Profile State
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [profilePhone, setProfilePhone] = useState('')
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
    const [profilePassword, setProfilePassword] = useState('')
    const [isStaff, setIsStaff] = useState(false)

    const router = useRouter()

    useEffect(() => {
        loadDashboard()
    }, [])

    async function loadDashboard() {
        try {
            const result = await getClientDashboardData()
            if (!result.success) throw new Error(result.error.message)
            const dashboardData = result.data

            setData(dashboardData)

            if (dashboardData.shouldChangePassword) {
                setShouldChangePassword(true)
            }

            if (dashboardData.teams.length > 0) {
                const firstTeamId = dashboardData.teams[0].id
                setSelectedTeamId(firstTeamId)

                // Also initialize client if possible to avoid waiting for effect
                const teamClients = dashboardData.clients.filter((c: any) => c.team_id === firstTeamId)
                if (teamClients.length > 0) {
                    setSelectedClientId(teamClients[0].id)
                }
            } else if (dashboardData.clients.length > 0) {
                // Absolute fallback if teams list is somehow weird but clients exist
                setSelectedClientId(dashboardData.clients[0].id)
            }

            if (dashboardData.profile) {
                setProfilePhone(dashboardData.profile.phone || '')
            }

            // isStaff is now included in dashboardData
            if (dashboardData.isStaff) {
                setIsStaff(true)
            }
        } catch (e: any) {
            console.error('Error loading dashboard:', e.message || e)
        } finally {
            setLoading(false)
        }
    }

    // Effect to update selectedClientId when team changes
    useEffect(() => {
        if (selectedTeamId) {
            const teamClients = data.clients.filter(c => c.team_id === selectedTeamId)
            if (teamClients.length > 0) {
                setSelectedClientId(teamClients[0].id)
            } else {
                setSelectedClientId(null)
            }
        }
    }, [selectedTeamId, data.clients])

    // Filtering logic
    const filteredTasks = data.tasks.filter(t => {
        const matchesClient = selectedClientId ? t.client_id === selectedClientId : true
        // If no client selected but team is, match by team
        const matchesTeam = selectedTeamId ? t.team_id === selectedTeamId : true
        return matchesClient && matchesTeam
    })

    const activeTeam = data.teams.find(t => t.id === selectedTeamId)
    const activeClient = data.clients.find(c => c.id === selectedClientId)

    // Kanban Columns Configuration
    const columns = [
        { title: 'Backlog', categories: ['backlog'], color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
        { title: 'In Progress', categories: ['active'], color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
        { title: 'Validation', categories: ['validation'], color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        { title: 'Completed', categories: ['done'], color: 'bg-green-500/10 text-green-500 border-green-500/20' },
        { title: 'Archive', categories: ['archived'], color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
    ]

    async function handleLogout() {
        const supabase = createClient()
        await supabase.auth.signOut()
        // If staff member, head back to main Forge login. If client, stay in Portal world.
        if (isStaff) {
            router.push('/login')
        } else {
            router.push('/portal/login')
        }
    }


    async function handleCreateTicket() {
        // Fallback: if selectedClientId is null but we have clients, pick the first one
        let clientId = selectedClientId
        if (!clientId && data.clients.length > 0) {
            clientId = data.clients[0].id
        }

        if (!clientId || !newTicketTitle.trim()) {
            alert('Mission abort: No client organization selected or title missing.')
            return
        }

        setIsCreatingTicket(true)
        try {
            const res = await createClientTicket(clientId, newTicketTitle, newTicketDesc)
            if (res.success) {
                await loadDashboard()
                setIsCreateOpen(false)
                setNewTicketTitle('')
                setNewTicketDesc('')
            } else {
                // @ts-ignore
                throw new Error(res.error.message)
            }
        } catch (e: any) {
            alert(e.message || 'Failed to create ticket')
        } finally {
            setIsCreatingTicket(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

    if (data.clients.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <h2 className="text-xl font-bold">No Client Access Found</h2>
                <p className="text-muted-foreground mt-2">Your account is not linked to any client organizations. Please verify your invitation or contact support.</p>
                <button onClick={handleLogout} className="mt-6 px-4 py-2 border border-border rounded hover:bg-muted text-sm font-bold uppercase">Sign Out</button>
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-[#020617] text-slate-200">
                {/* Header / Filter Bar */}
                <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Image
                                    src="/quest-logo.png"
                                    alt="Quest"
                                    width={90}
                                    height={28}
                                    className="object-contain drop-shadow-[0_0_8px_rgba(120,40,200,0.2)]"
                                    priority
                                />
                                <div className="h-4 w-px bg-white/10 mx-1" />
                                <h1 className="text-xl font-black tracking-tighter uppercase text-white">Portal</h1>
                                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 uppercase tracking-widest">Live</span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">Mission Status & Operations Center</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Team Filter */}
                            {data.teams.length > 1 && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest px-1">Agency / Team</label>
                                    <select
                                        className="bg-slate-800 border-white/10 rounded px-3 py-1.5 text-xs font-bold text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                        value={selectedTeamId || ''}
                                        onChange={e => setSelectedTeamId(e.target.value)}
                                    >
                                        {data.teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Client Filter (within team) */}
                            {data.clients.filter(c => c.team_id === selectedTeamId).length > 1 && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest px-1">Organization</label>
                                    <select
                                        className="bg-slate-800 border-white/10 rounded px-3 py-1.5 text-xs font-bold text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                        value={selectedClientId || ''}
                                        onChange={e => setSelectedClientId(e.target.value)}
                                    >
                                        {data.clients.filter(c => c.team_id === selectedTeamId).map(c => (
                                            <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 ml-2 h-10 mt-auto">
                                <button
                                    onClick={() => setIsProfileOpen(true)}
                                    className="h-full flex items-center gap-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold uppercase text-[10px] tracking-widest transition-all border border-white/10"
                                >
                                    <Settings className="h-3.5 w-3.5" /> Profile
                                </button>
                                <button
                                    onClick={() => router.push('/portal/inbox')}
                                    className="h-full flex items-center gap-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold uppercase text-[10px] tracking-widest transition-all border border-white/10"
                                >
                                    <Archive className="h-3.5 w-3.5" /> Inbox
                                </button>
                                <button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="h-full flex items-center gap-2 px-4 bg-primary hover:bg-primary/90 text-white rounded font-black uppercase text-xs transition-all shadow-lg shadow-primary/20 border border-primary/50"
                                >
                                    <Plus className="h-3.5 w-3.5" /> New Ticket
                                </button>
                                <button onClick={handleLogout} className="h-full aspect-square flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-white/10 rounded transition-all">
                                    <LogOut className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="max-w-[1600px] mx-auto p-4 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {columns.map(col => {
                            const colTasks = filteredTasks.filter(t =>
                                col.categories.includes(t.status?.category)
                            )

                            return (
                                <div key={col.title} className="flex flex-col h-full min-h-[500px]">
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${col.color.split(' ')[1].replace('text-', 'bg-')}`} />
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white">{col.title}</h3>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-white/5">
                                            {colTasks.length}
                                        </span>
                                    </div>

                                    {/* Task Stack */}
                                    <div className="flex-1 space-y-4 rounded-xl border border-white/[0.03] bg-white/[0.01] p-3">
                                        {colTasks.length === 0 ? (
                                            <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg text-slate-600">
                                                <p className="text-[10px] font-bold uppercase tracking-widest">All Clear</p>
                                            </div>
                                        ) : (
                                            colTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    onClick={() => router.push(`/portal/tickets/${task.id}`)}
                                                    className="group bg-slate-900/80 border border-white/10 rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-slate-900 transition-all shadow-sm hover:shadow-primary/10 relative overflow-hidden"
                                                >
                                                    {/* Card Glow Effect */}
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />

                                                    <div className="relative space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-sm border ${col.color}`}>
                                                                    {task.status?.name}
                                                                </span>
                                                                {task.urgency && (
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${task.urgency.color?.split(' ')[0] || 'bg-slate-400'}`} title={task.urgency.name} />
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                                                                {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>

                                                        <h4 className="text-sm font-bold text-slate-100 leading-tight group-hover:text-primary transition-colors">{task.title}</h4>

                                                        {task.description && (
                                                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic">
                                                                {task.description}
                                                            </p>
                                                        )}

                                                        <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                                                ID: {task.id.split('-')[0]}
                                                            </span>
                                                            <div className="flex -space-x-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">
                                                                    SQ
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Create Ticket Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Ticket</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title / Subject</label>
                            <Input
                                value={newTicketTitle}
                                onChange={e => setNewTicketTitle(e.target.value)}
                                placeholder="e.g. Update Header Logo"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                value={newTicketDesc}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTicketDesc(e.target.value)}
                                placeholder="Describe your request..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button
                            onClick={handleCreateTicket}
                            disabled={!newTicketTitle.trim() || isCreatingTicket}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded font-bold uppercase text-sm disabled:opacity-50 min-w-[140px] flex items-center justify-center"
                        >
                            {isCreatingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Ticket'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Force Change Password Modal */}
            <Dialog open={shouldChangePassword} onOpenChange={() => { }}>
                <DialogContent className="[&>button]:hidden"> {/* Hide Close Button */}
                    <DialogHeader>
                        <DialogTitle>Change Password Required</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-blue-500/10 text-blue-600 p-3 rounded text-sm border border-blue-500/20">
                            Your password was reset by an administrator (or is temporary).
                            You must set a new secure password to continue.
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button
                            disabled={isChangingPassword || newPassword.length < 6}
                            onClick={async () => {
                                setIsChangingPassword(true)
                                const res = await updateClientPassword(newPassword)
                                setIsChangingPassword(false)
                                if (res.success) {
                                    alert('Password changed successfully.')
                                    setShouldChangePassword(false)
                                } else {
                                    // @ts-ignore
                                    alert(res.error.message)
                                }
                            }}
                            className="w-full py-2 text-sm font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin text-center w-full" /> : 'Set New Password'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile & Security Modal */}
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" /> My Profile
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Profile Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                                    <User className="h-3 w-3" /> Full Name
                                </label>
                                <Input
                                    value={data.profile ? `${data.profile.first_name || ''} ${data.profile.last_name || ''}` : '---'}
                                    readOnly
                                    className="bg-white/5 border-white/10 text-slate-400 cursor-not-allowed text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                                    <Phone className="h-3 w-3" /> Phone Number
                                </label>
                                <Input
                                    placeholder="Enter your phone number"
                                    value={profilePhone}
                                    onChange={e => setProfilePhone(e.target.value)}
                                    className="bg-slate-800 border-white/10 focus:border-primary text-sm"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* Security */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Security & Access</h4>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                                    <Lock className="h-3 w-3" /> Update Password
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Enter new password (optional)"
                                    value={profilePassword}
                                    onChange={e => setProfilePassword(e.target.value)}
                                    className="bg-slate-800 border-white/10 focus:border-primary text-sm"
                                />
                                <p className="text-[9px] text-slate-500 italic">Leave empty to keep your current password.</p>
                            </div>
                        </div>

                        {isStaff && (
                            <div className="pt-2">
                                <button
                                    onClick={() => router.push('/select-dashboard')}
                                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-white/5 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Briefcase className="h-3.5 w-3.5 text-primary" /> Switch to Staff Dashboard
                                </button>
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                setIsUpdatingProfile(true)
                                try {
                                    // Update Phone
                                    const profRes = await updateProfile({ phone: profilePhone })
                                    if (!profRes.success) throw new Error(profRes.error.message)

                                    // Update Password if provided
                                    if (profilePassword.trim()) {
                                        const res = await updateClientPassword(profilePassword)
                                        if (!res.success) throw new Error(res.error.message)
                                    }

                                    alert('Profile updated successfully!')
                                    setProfilePassword('')
                                    setIsProfileOpen(false)
                                    loadDashboard()
                                } catch (e: any) {
                                    alert(e.message)
                                } finally {
                                    setIsUpdatingProfile(false)
                                }
                            }}
                            disabled={isUpdatingProfile}
                            className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Profile Settings'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
