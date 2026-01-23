'use client'

import { SubTeam } from '@/services/sub-team-service'
import { useState, useEffect } from 'react'
import { ChevronsUpDown, Check, Plus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SubTeamSwitcherProps {
    orgId: string
    currentSubTeamId?: string
}

export function SubTeamSwitcher({ orgId, currentSubTeamId }: SubTeamSwitcherProps) {
    const [subTeams, setSubTeams] = useState<SubTeam[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedId, setSelectedId] = useState<string | undefined>(currentSubTeamId)
    const router = useRouter()

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sub_teams')
                .select('*')
                .eq('org_id', orgId)
                .order('name')

            if (error) {
                console.error('SubTeamSwitcher: Failed to load squads', error)
            }

            if (data) {
                console.log(`SubTeamSwitcher: Loaded ${data.length} squads for org ${orgId}`)
                setSubTeams(data)
                // Default logic
                if (!selectedId && data.length > 0) {
                    const defaultId = currentSubTeamId || data[0].id
                    setSelectedId(defaultId)
                }
            }
        }
        load()
    }, [orgId, currentSubTeamId])

    const handleSelect = (id: string) => {
        setSelectedId(id)
        setIsOpen(false)
        // Set cookie or URL param? 
        // For now, let's keep it simple: URL param for filtering or global state?
        // Let's use cookie for persistence like Team Switcher
        document.cookie = `selected_sub_team=${id}; path=/; max-age=31536000`
        router.refresh()
    }

    const activeName = subTeams.find(s => s.id === selectedId)?.name || 'Select Team'

    return (
        <div className="relative w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded bg-sidebar/50 border border-sidebar-border/50 p-2 text-xs hover:bg-sidebar-accent transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate font-medium text-sidebar-foreground">{activeName}</span>
                </div>
                <ChevronsUpDown className="h-3 w-3 text-sidebar-foreground/50" />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-full rounded border border-sidebar-border bg-sidebar p-1 shadow-xl z-50">
                    {subTeams.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground">No teams found</div>
                    )}
                    {subTeams.map(st => (
                        <div
                            key={st.id}
                            onClick={() => handleSelect(st.id)}
                            className={`
                                cursor-pointer rounded p-2 text-xs hover:bg-sidebar-accent flex items-center justify-between
                                ${st.id === selectedId ? 'bg-sidebar-accent/80' : ''}
                            `}
                        >
                            <span className="truncate text-sidebar-foreground">{st.name}</span>
                            {st.id === selectedId && <Check className="h-3 w-3 text-primary" />}
                        </div>
                    ))}
                    <div className="border-t border-sidebar-border mt-1 pt-1">
                        <button className="flex w-full items-center justify-center gap-1 rounded p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
                            <Plus className="h-3 w-3" /> Create Team
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
