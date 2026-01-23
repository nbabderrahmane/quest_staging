'use client'

import { useState, useEffect } from 'react'
import { SubTeam, SubTeamService } from '@/services/sub-team-service'
import { Plus, Copy, Check, Users, Settings, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SubTeamListProps {
    teamId: string
    userRole: string
}

export function SubTeamList({ teamId, userRole }: SubTeamListProps) {
    const [squads, setSquads] = useState<SubTeam[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Edit state
    const [editSquad, setEditSquad] = useState<SubTeam | null>(null)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [saving, setSaving] = useState(false)

    const canManage = ['owner', 'admin'].includes(userRole)

    useEffect(() => {
        loadSquads()
    }, [teamId])

    async function loadSquads() {
        setLoading(true)
        const data = await SubTeamService.getSubTeams(teamId)
        setSquads(data)
        setLoading(false)
    }

    const copyToClipboard = (id: string) => {
        navigator.clipboard.writeText(id)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        try {
            const newSquad = await SubTeamService.createSubTeam(teamId, newName)
            setSquads([...squads, newSquad])
            setNewName('')
            setIsCreateOpen(false)
        } catch (err) {
            console.error(err)
            alert('Failed to create squad')
        } finally {
            setCreating(false)
        }
    }

    const openEdit = (squad: SubTeam) => {
        setEditSquad(squad)
        setEditName(squad.name)
        setEditDescription(squad.description || '')
    }

    const handleSave = async () => {
        if (!editSquad || !editName.trim()) return
        setSaving(true)
        try {
            const updated = await SubTeamService.updateSubTeam(editSquad.id, {
                name: editName,
                description: editDescription || null
            })
            setSquads(squads.map(s => s.id === updated.id ? updated : s))
            setEditSquad(null)
        } catch (err) {
            console.error(err)
            alert('Failed to update squad')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!editSquad) return
        if (!confirm(`Delete squad "${editSquad.name}"? This cannot be undone.`)) return
        setSaving(true)
        try {
            await SubTeamService.deleteSubTeam(editSquad.id)
            setSquads(squads.filter(s => s.id !== editSquad.id))
            setEditSquad(null)
        } catch (err) {
            console.error(err)
            alert('Failed to delete squad')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Active Squads</h3>
                    <p className="text-xs text-muted-foreground">Manage sub-teams and their identifiers.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-3 w-3" /> New Squad
                    </button>
                )}
            </div>

            <div className="grid gap-3">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground text-xs animate-pulse">Scanning frequencies...</div>
                ) : squads.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border rounded text-muted-foreground text-xs">
                        No squads established. Operations are centralized.
                    </div>
                ) : (
                    squads.map(squad => (
                        <div key={squad.id} className="bg-card border border-border p-3 rounded flex items-center justify-between group hover:border-sidebar-accent transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-blue-500/10 rounded flex items-center justify-center">
                                    <Users className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-foreground">{squad.name}</p>
                                    {squad.description && <p className="text-xs text-muted-foreground">{squad.description}</p>}
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                            {squad.id}
                                            <button onClick={() => copyToClipboard(squad.id)} className="hover:text-foreground">
                                                {copiedId === squad.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {canManage && (
                                <button onClick={() => openEdit(squad)} className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Settings className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Establish New Squad</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Squad Name</label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Alpha Team, Mobile Unit..."
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground">Cancel</button>
                        <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50">
                            {creating ? 'Creating...' : 'Create Squad'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!editSquad} onOpenChange={(open) => !open && setEditSquad(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Squad Settings</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Squad Name</label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Description</label>
                            <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Optional description..." />
                        </div>
                        <div className="bg-muted p-2 rounded">
                            <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Squad ID</label>
                            <code className="text-xs font-mono">{editSquad?.id}</code>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between">
                        <button onClick={handleDelete} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase text-red-500 hover:text-red-600 flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setEditSquad(null)} className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground">Cancel</button>
                            <button onClick={handleSave} disabled={saving || !editName.trim()} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
