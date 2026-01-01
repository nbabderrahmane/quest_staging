'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBosses, createBoss, deleteBoss } from './actions'
import { Input } from '@/components/ui/input' // Assuming these exist, otherwise standard input
import { Trash2, Plus, Upload, Skull } from 'lucide-react'
import Image from 'next/image'

interface Boss {
    id: string
    name: string
    description: string | null
    is_system: boolean
    image_healthy: string
    image_bloody: string
    image_dead: string
}

export default function BossesPage() {
    const [bosses, setBosses] = useState<Boss[]>([])
    const [teamId, setTeamId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Create Modal State
    const [createOpen, setCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [imgHealthy, setImgHealthy] = useState<string>('')
    const [imgBloody, setImgBloody] = useState<string>('')
    const [imgDead, setImgDead] = useState<string>('')
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const selectedTeamCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('selected_team='))
                ?.split('=')[1]?.trim()

            // For MVP simplicity, using the cookie. Robust would fetch memberships again.
            if (selectedTeamCookie) {
                setTeamId(selectedTeamCookie)

                // RBAC Check
                const { data: memberships } = await supabase
                    .from('team_members')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('team_id', selectedTeamCookie)
                    .single()

                const role = memberships?.role || ''
                if (!['owner', 'admin'].includes(role)) {
                    setError('ACCESS DENIED: Clearance level insufficient.')
                    setIsLoading(false)
                    return
                }

                const data = await getBosses(selectedTeamCookie)
                if ('error' in data) {
                    setError(data.error)
                } else {
                    setBosses(data)
                }
            }
            setIsLoading(false)
        }
        load()
    }, [createOpen]) // Reload when modal closes/changes

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setImg: (s: string) => void) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 750 * 1024) { // 750KB limit
            setError('FILE TOO LARGE: Boss sprites must be < 750KB.')
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setImg(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()

        const missing = []
        if (!teamId) missing.push('Team ID')
        if (!newName) missing.push('Name')
        if (!imgHealthy) missing.push('Healthy Image')
        if (!imgBloody) missing.push('Bloody Image')
        if (!imgDead) missing.push('Dead Image')

        if (missing.length > 0) {
            setError(`PROTOCOL VIOLATION: All fields and images are required. Missing: ${missing.join(', ')}`)
            return
        }

        setIsCreating(true)
        const result = await createBoss(teamId!, {
            name: newName,
            description: newDesc,
            image_healthy: imgHealthy,
            image_bloody: imgBloody,
            image_dead: imgDead
        })
        setIsCreating(false)

        if (result.success) {
            setSuccess('BOSS REGISTRY UPDATED: New nemesis added.')
            setCreateOpen(false)
            // Reset form
            setNewName('')
            setNewDesc('')
            setImgHealthy('')
            setImgBloody('')
            setImgDead('')
        } else {
            setError(result.error || 'Creation failed')
        }
    }

    const handleDelete = async (bossId: string) => {
        if (!teamId) return
        if (!confirm('CONFIRM DELETION: Remove this custom boss from the registry?')) return

        const result = await deleteBoss(bossId, teamId)
        if (result.success) {
            setBosses(prev => prev.filter(b => b.id !== bossId))
            setSuccess('BOSS REMOVED: Registry updated.')
        } else {
            setError(result.error || 'Deletion failed')
        }
    }

    if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse font-mono">Accessing Archives...</div>

    const systemBosses = bosses.filter(b => b.is_system)
    const customBosses = bosses.filter(b => !b.is_system)

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">Nemesis Registry</h1>
                    <p className="text-muted-foreground font-mono text-xs md:text-sm mt-1">Manage System & Custom Bosses</p>
                </div>
                <button
                    onClick={() => setCreateOpen(!createOpen)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase hover:bg-primary/90 rounded w-full md:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Add Custom Boss
                </button>
            </div>

            {/* Create Form - Inline for simplicity or could be Dialog */}
            {createOpen && (
                <div className="bg-card border border-border p-6 rounded-lg shadow-sm animate-in slide-in-from-top-4">
                    <h3 className="uppercase font-bold text-foreground mb-4 flex items-center gap-2"><Upload className="h-4 w-4" /> New Custom Entry</h3>
                    <form onSubmit={handleCreate} className="space-y-4 max-w-2xl">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-muted-foreground">Name</label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. The Glitch" required className="bg-background border-input" />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-muted-foreground">Description</label>
                                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short bio..." className="bg-background border-input" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="border-2 border-dashed border-border rounded p-4 text-center hover:bg-muted/10 transition-colors">
                                <span className="text-xs font-bold uppercase text-green-500 block mb-2">Healthy State</span>
                                {imgHealthy ? (
                                    <img src={imgHealthy} className="h-16 w-16 mx-auto object-contain" />
                                ) : (
                                    <Input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgHealthy)} className="text-xs" />
                                )}
                            </div>
                            <div className="border-2 border-dashed border-border rounded p-4 text-center hover:bg-muted/10 transition-colors">
                                <span className="text-xs font-bold uppercase text-orange-500 block mb-2">Bloody (&gt;75%)</span>
                                {imgBloody ? (
                                    <img src={imgBloody} className="h-16 w-16 mx-auto object-contain" />
                                ) : (
                                    <Input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgBloody)} className="text-xs" />
                                )}
                            </div>
                            <div className="border-2 border-dashed border-border rounded p-4 text-center hover:bg-muted/10 transition-colors">
                                <span className="text-xs font-bold uppercase text-destructive block mb-2">Dead (100%)</span>
                                {imgDead ? (
                                    <img src={imgDead} className="h-16 w-16 mx-auto object-contain" />
                                ) : (
                                    <Input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgDead)} className="text-xs" />
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setCreateOpen(false)} className="text-xs font-bold uppercase text-muted-foreground hover:text-foreground">Cancel</button>
                            <button disabled={isCreating} type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase rounded hover:bg-primary/90 disabled:opacity-50">
                                {isCreating ? 'Accessing...' : 'Register Boss'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase text-muted-foreground border-b border-border pb-2">System Bosses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemBosses.map(boss => (
                        <div key={boss.id} className="bg-muted border border-border p-4 rounded-lg flex items-center gap-4 opacity-75">
                            <div className="w-16 h-16 relative bg-card rounded border border-border">
                                <Image src={boss.image_healthy} alt={boss.name} fill className="object-contain p-1" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{boss.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono">{boss.description}</p>
                                <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-background text-muted-foreground px-1.5 py-0.5 rounded">System Locked</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase text-primary border-b border-border pb-2 flex justify-between">
                    <span>Custom Bosses</span>
                    <span className="text-xs font-mono">{customBosses.length}/10 Slots</span>
                </h2>
                {customBosses.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No custom bosses registered.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customBosses.map(boss => (
                            <div key={boss.id} className="bg-card border border-border p-4 rounded-lg flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow relative group">
                                <div className="w-16 h-16 relative bg-muted/10 rounded border border-border">
                                    <Image src={boss.image_healthy} alt={boss.name} fill className="object-contain p-1" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-foreground">{boss.name}</h3>
                                    <p className="text-xs text-muted-foreground font-mono truncate">{boss.description}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(boss.id)}
                                    className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive bg-card hover:bg-destructive/10 rounded border border-transparent hover:border-destructive/20 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-10 right-4 z-50 max-w-sm p-4 bg-destructive text-destructive-foreground text-sm rounded-lg shadow-lg border border-destructive/20">
                    <p className="uppercase font-bold mb-1">Error</p>
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="absolute top-2 right-2 text-destructive-foreground/70 hover:text-destructive-foreground">✕</button>
                </div>
            )}
            {/* Success Toast */}
            {success && (
                <div className="fixed bottom-10 right-4 z-50 max-w-sm p-4 bg-green-500 text-white text-sm rounded-lg shadow-lg border border-green-600/20">
                    <p className="uppercase font-bold mb-1">Success</p>
                    <p>{success}</p>
                    <button onClick={() => setSuccess(null)} className="absolute top-2 right-2 text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}
