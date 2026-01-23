'use client'

import { Team } from '@/lib/types'
import { createTeam } from '@/app/teams/actions'
import { useState, useEffect } from 'react'
import { PlusCircle, ChevronsUpDown, Check } from 'lucide-react'

// Helper to get cookie value on client
function getTeamFromCookie(): string | null {
    if (typeof document === 'undefined') return null
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('selected_team='))
        ?.split('=')[1]
    return cookieValue || null
}

// Helper to set cookie
function setTeamCookie(teamId: string) {
    document.cookie = `selected_team=${teamId}; path=/; max-age=31536000`
}

export default function TeamSwitcher({ teams = [], userRole = 'member' }: { teams: Team[], userRole?: string }) {
    const [isOpen, setIsOpen] = useState(false)

    // Compute initial team ID
    // Safe for SSR: default to first team if available, otherwise null
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
        if (teams.length > 0) return teams[0].id
        return null
    })

    // Hydrate from cookie on client side only
    useEffect(() => {
        const cookieValue = getTeamFromCookie()
        if (cookieValue && teams.some(t => t.id === cookieValue)) {
            if (selectedTeamId !== cookieValue) {
                setSelectedTeamId(cookieValue)
            }
        } else if (teams.length > 0) {
            // Ensure cookie is set to the default if missing
            const firstTeamId = teams[0].id
            setTeamCookie(firstTeamId)

            if (selectedTeamId !== firstTeamId) {
                setSelectedTeamId(firstTeamId)
            }
        }
    }, [teams, selectedTeamId])

    const handleSelectTeam = (teamId: string) => {
        setSelectedTeamId(teamId)
        setTeamCookie(teamId)
        setIsOpen(false)
        // Reload to apply new team context
        window.location.reload()
    }

    const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0]
    const canCreateTeam = !userRole || ['owner', 'admin'].includes(userRole)

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded bg-sidebar-accent/50 border border-sidebar-border p-2 text-sm hover:bg-sidebar-accent transition-colors"
            >
                <span className="truncate font-mono text-sidebar-foreground">{selectedTeam?.name || 'Select Team'}</span>
                <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50" />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-12 w-full rounded border border-sidebar-border bg-sidebar p-1 shadow-xl z-50">
                    {teams.map(team => (
                        <div
                            key={team.id}
                            onClick={() => handleSelectTeam(team.id)}
                            className={`cursor-pointer rounded p-2 text-sm hover:bg-sidebar-accent flex items-center justify-between ${team.id === selectedTeamId ? 'bg-sidebar-accent' : ''
                                }`}
                        >
                            <span className="truncate text-sidebar-foreground">{team.name}</span>
                            {team.id === selectedTeamId && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    ))}
                    {canCreateTeam && (
                        <div className="border-t border-sidebar-border mt-1 pt-1">
                            <form action={createTeam}>
                                <input
                                    name="name"
                                    placeholder="New Team Name"
                                    className="mb-1 w-full rounded bg-black/50 border border-sidebar-border p-2 text-xs text-white font-mono"
                                    required
                                />
                                <button className="flex w-full items-center justify-center gap-1 rounded bg-primary p-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/80 transition-colors">
                                    <PlusCircle className="h-3 w-3" /> Create Alliance
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
