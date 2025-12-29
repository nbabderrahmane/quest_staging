'use server'

import { getProjects, createProject, deleteProject } from './actions'
import { getUserTeams } from '@/app/teams/actions'
import { getRoleContext } from '@/lib/role-service'
import { cookies } from 'next/headers'
import ProjectsClient from './projects-client'

export default async function ProjectsPage() {
    const teams = await getUserTeams()
    if (teams.length === 0) return <div>No Team Found</div>

    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team')?.value

    const teamId = (selectedTeamId && teams.some(t => t.id === selectedTeamId))
        ? selectedTeamId
        : teams[0].id

    const [projects, roleCtx] = await Promise.all([
        getProjects(teamId),
        getRoleContext(teamId)
    ])

    const canManage = roleCtx ? ['owner', 'admin', 'manager'].includes(roleCtx.role || '') : false

    return (
        <ProjectsClient
            projects={projects}
            teamId={teamId}
            canManage={canManage}
        />
    )
}
