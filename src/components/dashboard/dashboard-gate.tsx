'use client'

import { ContextGate } from './context-gate'
import { Team } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DashboardGateProps {
    teams: Team[]
}

export function DashboardGate({ teams }: DashboardGateProps) {
    const router = useRouter()
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [squads, setSquads] = useState<{ id: string, name: string }[] | undefined>(undefined)

    const handleSelectTeam = async (teamId: string) => {
        // Set cookie
        document.cookie = `selected_team=${teamId}; path=/; max-age=31536000`

        // Fetch squads for this team
        const supabase = createClient()
        const { data } = await supabase
            .from('sub_teams')
            .select('id, name')
            .eq('org_id', teamId)
            .order('name')

        if (data && data.length > 0) {
            setSelectedTeamId(teamId)
            setSquads(data)
        } else {
            // No squads? We are done.
            router.refresh()
        }
    }

    const handleSelectSquad = (squadId: string) => {
        // Set cookie
        document.cookie = `selected_sub_team=${squadId}; path=/; max-age=31536000`
        router.refresh()
    }

    return (
        <ContextGate
            teams={teams}
            onSelectTeam={handleSelectTeam}
            availableSquads={squads}
            onSelectSquad={handleSelectSquad}
        />
    )
}
