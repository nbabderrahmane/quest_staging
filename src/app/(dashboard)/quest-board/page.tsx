import { createClient } from "@/lib/supabase/server"
import { getQuests, getTasks } from "./actions"
import { getStatuses, getSizes, getUrgencies } from "@/app/admin/actions"
import { getCrewForAssignment } from "@/app/(dashboard)/admin/pipeline/actions"
import { getUserTeams } from "@/app/teams/actions"
import { getRoleContext } from "@/lib/role-service"
import { cookies } from "next/headers"
import { QuestBoardClient } from "./quest-board-client"

export default async function QuestBoardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get team
    const teams = await getUserTeams()
    if (teams.length === 0) return <div>No Team Found</div>

    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team')?.value

    const teamId = (selectedTeamId && teams.some(t => t.id === selectedTeamId))
        ? selectedTeamId
        : teams[0].id

    const [quests, statuses, sizes, urgencies, roleCtx, crew] = await Promise.all([
        getQuests(teamId),
        getStatuses(teamId),
        getSizes(teamId),
        getUrgencies(teamId),
        getRoleContext(teamId),
        getCrewForAssignment(teamId)
    ])

    const canEdit = roleCtx ? ['owner', 'admin', 'manager'].includes(roleCtx.role || '') : false

    return (
        <QuestBoardClient
            quests={quests || []}
            statuses={statuses}
            sizes={sizes}
            urgencies={urgencies}
            crew={crew}
            teamId={teamId}
            canEdit={canEdit}
            userId={user.id}
            userRole={roleCtx?.role || 'member'}
        />
    )
}
