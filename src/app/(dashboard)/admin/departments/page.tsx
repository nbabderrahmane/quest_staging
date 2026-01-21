'use server'

import { getDepartments, createDepartment, deleteDepartment } from './actions'
import { getCrewForAssignment } from '../pipeline/actions'
import { getUserTeams } from '@/app/teams/actions'
import { getRoleContext } from '@/lib/role-service'
import { cookies } from 'next/headers'
import DepartmentsClient from './departments-client'

export default async function DepartmentsPage() {
    const teams = await getUserTeams()
    if (teams.length === 0) return <div>No Team Found</div>

    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team')?.value

    const teamId = (selectedTeamId && teams.some(t => t.id === selectedTeamId))
        ? selectedTeamId
        : teams[0].id

    const [departments, roleCtx, crew] = await Promise.all([
        getDepartments(teamId),
        getRoleContext(teamId),
        getCrewForAssignment(teamId)
    ])

    const canManage = roleCtx ? ['owner', 'admin', 'manager'].includes(roleCtx.role || '') : false

    return (
        <DepartmentsClient
            departments={departments}
            teamId={teamId}
            canManage={canManage}
            crew={crew}
        />
    )
}
