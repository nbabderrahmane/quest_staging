'use server'

import { getQuestPrepData, finalizeQuestPrep } from './actions'
import { getUserTeams } from '@/app/teams/actions'
import { getRoleContext } from '@/lib/role-service'
import { cookies } from 'next/headers'
import QuestPrepClient from './quest-prep-client'

export default async function QuestPrepPage() {
    const teams = await getUserTeams()
    if (teams.length === 0) return <div>No Team Found</div>

    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team')?.value

    const teamId = (selectedTeamId && teams.some(t => t.id === selectedTeamId))
        ? selectedTeamId
        : teams[0].id

    const [prepData, roleCtx] = await Promise.all([
        getQuestPrepData(teamId),
        getRoleContext(teamId)
    ])

    const canManage = roleCtx ? ['owner', 'admin', 'manager'].includes(roleCtx.role || '') : false

    if (!canManage) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
                <p className="text-muted-foreground mt-2">Quest Prep is only available to managers and above.</p>
            </div>
        )
    }

    if (!prepData.success || !prepData.data) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Error Loading Data</h1>
                <p className="text-muted-foreground mt-2">{prepData.error || 'Unknown error'}</p>
            </div>
        )
    }

    return (
        <QuestPrepClient
            initialData={prepData.data}
            teamId={teamId}
        />
    )
}
