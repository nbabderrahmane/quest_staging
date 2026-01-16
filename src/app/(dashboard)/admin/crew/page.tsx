'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WindowCard } from '@/components/ui/window-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Shield, User, Crown, Briefcase, Eye, Trash2, Edit, KeyRound, UserPlus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getCrewMembers, updateCrewMember, removeCrewMember, resetCrewPassword, inviteCrewMember, toggleCrewActive, updateUserTeams, getUserMemberships } from './actions'
import { getUserTeams } from '@/app/teams/actions'


interface CrewMember {
    team_id: string
    user_id: string
    role: string
    created_at: string
    is_active?: boolean
    profiles?: {
        email: string | null
        first_name: string | null
        last_name: string | null
        telephone?: string | null
    }
}

const ROLE_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    owner: { label: 'Owner', icon: Crown, color: 'text-yellow-500' },
    admin: { label: 'Admin', icon: Shield, color: 'text-purple-500' },
    manager: { label: 'Manager', icon: Briefcase, color: 'text-blue-500' },
    member: { label: 'Member', icon: User, color: 'text-muted-foreground' },
    analyst: { label: 'Analyst', icon: Eye, color: 'text-green-500' },
}

export default function CrewPage() {
    const [crew, setCrew] = useState<CrewMember[]>([])
    const [teamId, setTeamId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('member')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Recruitment Form State
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteFirstName, setInviteFirstName] = useState('')
    const [inviteLastName, setInviteLastName] = useState('')
    const [inviteTelephone, setInviteTelephone] = useState('')
    const [invitePassword, setInvitePassword] = useState('')
    const [inviteRole, setInviteRole] = useState('analyst')
    const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([])
    const [recruitableTeams, setRecruitableTeams] = useState<{ id: string, name: string }[]>([])
    const [isInviting, setIsInviting] = useState(false)

    // Edit Modal State
    const [editOpen, setEditOpen] = useState(false)
    const [editMember, setEditMember] = useState<CrewMember | null>(null)
    const [editRole, setEditRole] = useState('')
    const [editTelephone, setEditTelephone] = useState('')
    const [editTeamIds, setEditTeamIds] = useState<string[]>([])

    // Password Reset Modal State
    const [resetOpen, setResetOpen] = useState(false)
    const [resetUserId, setResetUserId] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')

    const canManage = ['owner', 'admin'].includes(userRole)
    const isOwner = userRole === 'owner'

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            setCurrentUserId(user.id)

            // Get selected team UUID from cookie (clean it)
            const selectedTeamCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('selected_team='))
                ?.split('=')[1]?.trim()

            // Get all memberships to find role
            const { data: memberships } = await supabase
                .from('team_members')
                .select('team_id, role')
                .eq('user_id', user.id)

            if (!memberships || memberships.length === 0) {
                setError('No alliance memberships found.')
                setIsLoading(false)
                return
            }

            // Use UUID from cookie or first membership
            let activeMembership = memberships.find(m => m.team_id === selectedTeamCookie)
            if (!activeMembership) activeMembership = memberships[0]

            const cleanTeamId = activeMembership.team_id.trim()

            setTeamId(cleanTeamId)
            setUserRole(activeMembership.role)
            setInviteTeamIds([cleanTeamId]) // Default to active team

            // Fetch User Teams for Recruitment Dropdown
            // Identify teams where user is Owner or Admin
            const allTeams = await getUserTeams()
            const myManagedTeams = allTeams.filter((t: { id: string }) => {
                const membership = memberships.find(m => m.team_id === t.id)
                return membership && ['owner', 'admin'].includes(membership.role)
            })
            setRecruitableTeams(myManagedTeams)

            // Fetch crew using clean UUID
            const crewRes = await getCrewMembers(cleanTeamId)
            if (!crewRes.success) {
                setError(crewRes.error.message)
            } else {
                setCrew(crewRes.data)
            }
            setIsLoading(false)
        }
        load()
    }, [])

    // Auto-dismiss messages
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [error])

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [success])

    const getDisplayName = (member: CrewMember) => {
        const profile = member.profiles
        if (profile?.first_name || profile?.last_name) {
            return `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        }
        if (profile?.email) return profile.email
        return 'Unknown Operative'
    }

    const handleRemove = async (userId: string) => {
        if (!teamId) return
        if (!confirm('CONFIRM REMOVAL: This action will revoke alliance access for this operative.')) return

        const result = await removeCrewMember(userId, teamId)
        if (result.success) {
            setCrew(prev => prev.filter(m => m.user_id !== userId))
            setSuccess('OPERATIVE REMOVED: Crew member has been discharged from the alliance.')
        } else {
            setError(result.error.message || 'Removal failed')
        }
    }

    const handlePasswordReset = async () => {
        if (!resetUserId || !teamId || !newPassword) return
        const result = await resetCrewPassword(resetUserId, teamId, newPassword)
        if (result.success) {
            setResetOpen(false)
            setNewPassword('')
            setSuccess('PASSWORD RESET: Crew member credentials have been updated.')
        } else {
            setError(result.error.message || 'Password reset failed')
        }
    }

    const handleToggleActive = async (userId: string, currentActive: boolean) => {
        if (!teamId) return
        const result = await toggleCrewActive(userId, teamId, currentActive)
        if (result.success) {
            setCrew(prev => prev.map(m =>
                m.user_id === userId ? { ...m, is_active: !currentActive } : m
            ))
            setSuccess(`OPERATIVE ${!currentActive ? 'ACTIVATED' : 'DEACTIVATED'}: Status updated.`)
        } else {
            setError(result.error.message || 'Toggle failed')
        }
    }

    if (isLoading) {
        return <div className="p-8 text-muted-foreground animate-pulse font-mono">Loading Crew Manifest...</div>
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (inviteTeamIds.length === 0 || !inviteEmail || !invitePassword) return

        setIsInviting(true)

        let successCount = 0
        const errors = []

        for (const tid of inviteTeamIds) {
            const result = await inviteCrewMember(tid, inviteEmail, inviteRole, invitePassword, {
                firstName: inviteFirstName || undefined,
                lastName: inviteLastName || undefined,
                telephone: inviteTelephone || undefined
            })
            if (result.success) successCount++
            else errors.push(result.error.message)
        }

        setIsInviting(false)

        if (successCount > 0) {
            setSuccess(`OPERATIVE INITIATED: Recruited to ${successCount} alliance(s). Password assigned.`)
            setInviteEmail('')
            setInviteFirstName('')
            setInviteLastName('')
            setInviteTelephone('')
            setInvitePassword('')
            setInviteRole('analyst')
            // Refresh crew list
            if (teamId) {
                const crewRes = await getCrewMembers(teamId)
                if (crewRes.success) setCrew(crewRes.data)
            }
        } else {
            setError(errors[0] || 'Recruitment failed')
        }
    }

    const handleEditOpen = async (member: CrewMember) => {
        setEditMember(member)
        setEditRole(member.role)
        setEditTelephone(member.profiles?.telephone || '')
        setEditTeamIds([]) // Reset temporarily
        setEditOpen(true)

        // Fetch user's current memberships
        const result = await getUserMemberships(member.user_id)
        if (result.success && result.data) {
            setEditTeamIds(result.data.map((m: any) => m.team_id))
        }
    }

    const handleEditSave = async () => {
        if (!editMember || !teamId) return

        // Update Teams & Role
        const result = await updateUserTeams(editMember.user_id, editTeamIds, editRole, editTelephone)

        if (result.success) {
            // Update local state if user is still in the CURRENT team
            if (editTeamIds.includes(teamId)) {
                setCrew(prev => prev.map(m => m.user_id === editMember.user_id
                    ? { ...m, role: editRole, profiles: { ...m.profiles, telephone: editTelephone } as any }
                    : m
                ))
            } else {
                // User removed from current team
                setCrew(prev => prev.filter(m => m.user_id !== editMember.user_id))
            }

            setEditOpen(false)
            setSuccess('Member updated successfully.')
        } else {
            setError(result.error.message || 'Update failed')
        }
    }

    // Multi-Select Component (Inline)
    const TeamMultiSelect = ({
        value,
        onChange,
        options
    }: {
        value: string[],
        onChange: (val: string[]) => void,
        options: { id: string, name: string }[]
    }) => {
        return (
            <div className="grid grid-cols-1 gap-2 border border-border rounded p-2 max-h-40 overflow-y-auto bg-muted/10">
                {options.length === 0 && <p className="text-xs text-muted-foreground p-2">No other alliances commandable.</p>}
                {options.map(team => {
                    const isSelected = value.includes(team.id)
                    return (
                        <div
                            key={team.id}
                            onClick={() => {
                                if (isSelected) onChange(value.filter(v => v !== team.id))
                                else onChange([...value, team.id])
                            }}
                            className={`
                                flex items-center justify-between p-2 rounded cursor-pointer text-xs font-mono transition-colors
                                ${isSelected ? 'bg-primary/20 border-primary text-primary' : 'bg-card hover:bg-muted text-muted-foreground'}
                            `}
                        >
                            <span className="font-bold truncate">{team.name}</span>
                            {isSelected && <Briefcase className="h-3 w-3 text-blue-600" />}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-6">
            <div className="flex items-end justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Crew Deck</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Alliance Personnel Management</p>
                </div>
                <div className="text-xs font-mono text-blue-600 uppercase font-bold">
                    {crew.length} Operative{crew.length !== 1 ? 's' : ''}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recruitment Form (Owner/Admin only) */}
                {canManage && (
                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-lg shadow-sm">
                            <div className="px-4 py-3 border-b border-border bg-muted/10">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recruitment Module</h3>
                            </div>
                            <form onSubmit={handleInvite} className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">First Name</label>
                                        <Input
                                            type="text"
                                            value={inviteFirstName}
                                            onChange={(e) => setInviteFirstName(e.target.value)}
                                            placeholder="John"
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Last Name</label>
                                        <Input
                                            type="text"
                                            value={inviteLastName}
                                            onChange={(e) => setInviteLastName(e.target.value)}
                                            placeholder="Doe"
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Target Alliance(s)</label>
                                    <TeamMultiSelect
                                        value={inviteTeamIds}
                                        onChange={setInviteTeamIds}
                                        options={recruitableTeams}
                                    />
                                    {inviteTeamIds.length === 0 && <p className="text-[10px] text-red-400 mt-1">* Select at least one</p>}
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Email *</label>
                                    <Input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="operative@alliance.com"
                                        required
                                        className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Telephone</label>
                                    <Input
                                        type="tel"
                                        value={inviteTelephone}
                                        onChange={(e) => setInviteTelephone(e.target.value)}
                                        placeholder="+212 600 000 000"
                                        className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-muted-foreground font-bold block mb-1">Password *</label>
                                    <Input
                                        type="password"
                                        value={invitePassword}
                                        onChange={(e) => setInvitePassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        required
                                        minLength={6}
                                        className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Assigned Rank</label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger className="bg-background border-input text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="analyst">Analyst</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isInviting || inviteTeamIds.length === 0}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50 rounded"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    {isInviting ? 'Recruiting...' : 'Recruit Operative'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Crew List */}
                <div className={canManage ? "lg:col-span-2" : "lg:col-span-3"}>
                    <div className="bg-card border border-border rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-border bg-muted/10">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Crew ({crew.length})</h3>
                        </div>
                        <div className="p-4 overflow-auto max-h-[600px]">
                            <div className="space-y-3">
                                {crew.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-8">No operatives found in this alliance.</p>
                                ) : (
                                    crew.map(member => {
                                        const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member
                                        const RoleIcon = roleConfig.icon
                                        const isCurrentUser = member.user_id === currentUserId
                                        const isMemberOwner = member.role === 'owner'

                                        return (
                                            <div key={member.user_id} className="flex items-center justify-between p-3 bg-muted/5 border border-border rounded-lg hover:bg-muted/10 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${roleConfig.color}`}>
                                                        <RoleIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground text-sm">
                                                            {getDisplayName(member)}
                                                            {isCurrentUser && <span className="text-primary font-normal ml-2">(You)</span>}
                                                        </p>
                                                        {/* Email and Telephone row */}
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span>{member.profiles?.email || member.user_id.slice(0, 8) + '...'}</span>
                                                            {member.profiles?.telephone && (
                                                                <span>• {member.profiles.telephone}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Joined Date */}
                                                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                                        {new Date(member.created_at).toLocaleDateString()}
                                                    </span>

                                                    {/* Role Badge */}
                                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 bg-muted rounded ${roleConfig.color}`}>
                                                        {roleConfig.label}
                                                    </span>

                                                    {/* Command Buttons (Owner/Admin only) */}
                                                    {canManage && !isMemberOwner && !isCurrentUser && (
                                                        <>
                                                            {/* Toggle Active */}
                                                            <Switch
                                                                checked={member.is_active !== false}
                                                                onCheckedChange={() => handleToggleActive(member.user_id, member.is_active !== false)}
                                                                className="data-[state=checked]:bg-green-600"
                                                            />

                                                            <button
                                                                onClick={() => handleEditOpen(member)}
                                                                className="p-2 text-blue-600/50 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>

                                                            {isOwner && (
                                                                <button
                                                                    onClick={() => { setResetUserId(member.user_id); setResetOpen(true); }}
                                                                    className="p-2 text-yellow-600/50 hover:text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                                                                    title="Reset Password"
                                                                >
                                                                    <KeyRound className="h-4 w-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleRemove(member.user_id)}
                                                                className="p-2 text-red-600/50 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                                                                title="Remove"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Role Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-card border border-border text-foreground shadow-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold text-foreground">Edit Crew Member</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-2">Team Assignment(s)</label>
                            <TeamMultiSelect
                                value={editTeamIds}
                                onChange={setEditTeamIds}
                                options={recruitableTeams}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Rank Assignment</label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="analyst">Analyst</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-2">Telephone</label>
                            <Input
                                type="tel"
                                value={editTelephone}
                                onChange={(e) => setEditTelephone(e.target.value)}
                                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                placeholder="+212 600 000 000"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-bold uppercase text-slate-500 hover:text-slate-700">Cancel</button>
                        <button onClick={handleEditSave} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase rounded hover:bg-blue-700">Save Changes</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Password Reset Dialog */}
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent className="bg-card border border-border text-foreground shadow-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold text-foreground">Reset Crew Password</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-xs uppercase text-slate-600 font-bold block mb-2">New Password</label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 6 characters..."
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <DialogFooter>
                        <button onClick={() => setResetOpen(false)} className="px-4 py-2 text-sm font-bold uppercase text-slate-500 hover:text-slate-700">Cancel</button>
                        <button onClick={handlePasswordReset} className="px-4 py-2 bg-yellow-600 text-white text-sm font-bold uppercase rounded hover:bg-yellow-700">Reset Password</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold text-red-600 mb-1">Error</p>
                            <p>{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {success && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold text-green-600 mb-1">Success</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">✕</button>
                    </div>
                </div>
            )}
        </div>
    )
}
