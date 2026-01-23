import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { getUserTeams } from '@/app/teams/actions'
import { getUnreadCount } from '@/app/(dashboard)/inbox/actions'
import { CockpitInitializer } from '@/components/dashboard/cockpit-initializer'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    try {
        const teams = await getUserTeams()

        // Determine Context
        const cookieStore = await cookies()
        const selectedTeamId = cookieStore.get('selected_team')?.value
        const selectedSubTeamId = cookieStore.get('selected_sub_team')?.value

        // Context Gate logic: if multiple teams and none selected, or if team has squads and none selected
        if (teams.length > 0) {
            const hasMultipleTeams = teams.length > 1
            const activeTeam = teams.find(t => t.id === selectedTeamId)

            // If No Active Team and multiple teams, show gate
            if (!activeTeam && hasMultipleTeams) {
                const { DashboardGate } = await import('@/components/dashboard/dashboard-gate')
                return <DashboardGate teams={teams} />
            }

            // If selected team exists, check for squads
            const targetTeam = activeTeam || teams[0]
            if (targetTeam && !selectedSubTeamId) {
                const { data: squads } = await supabase
                    .from('sub_teams')
                    .select('id, name')
                    .eq('org_id', targetTeam.id)

                if (squads && squads.length > 0) {
                    const { DashboardGate } = await import('@/components/dashboard/dashboard-gate')
                    return <DashboardGate teams={teams} />
                }
            }
        }

        let activeTeam = teams.find(t => t.id === selectedTeamId)
        if (!activeTeam && teams.length > 0) {
            activeTeam = teams[0]
        }

        // Sentinel Check: Is this team initialized?
        let isInitialized = false
        let userRole = 'member'
        let unreadCount = 0

        if (activeTeam) {
            // Check usage of 'statuses' table as a proxy for initialization
            const { count, error: countError } = await supabase
                .from('statuses')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', activeTeam.id)

            if (!countError && count !== null && count > 0) {
                isInitialized = true
            }

            // Get User Role
            const { data: memberData } = await supabase
                .from('team_members')
                .select('role')
                .eq('user_id', user.id)
                .eq('team_id', activeTeam.id)
                .single()

            if (memberData) {
                userRole = memberData.role
            }

            // Fetch unread notifications
            unreadCount = await getUnreadCount(activeTeam.id)
        }

        // Fetch User Profile for Phone
        const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single()

        if (activeTeam && !isInitialized) {
            return (
                <CockpitInitializer
                    teamId={activeTeam.id}
                    teamName={activeTeam.name}
                    userRole={userRole}
                />
            )
        }

        return (
            <DashboardShell
                teams={teams}
                activeTeam={activeTeam}
                userRole={userRole}
                user={{ id: user.id, email: user.email }}
                profile={profile}
                unreadInboxCount={unreadCount}
                currentSubTeamId={selectedSubTeamId}
            >
                {children}
            </DashboardShell>
        )
    } catch (err) {
        console.error('Dashboard Error:', err)
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-red-500 font-mono flex-col gap-4">
                <h1 className="text-2xl font-bold uppercase">System Failure</h1>
                <p className="text-sm border border-red-500/50 p-4 rounded bg-red-900/10">
                    Unable to establish command link.
                </p>
                <form action="/auth/signout" method="post">
                    <button className="underline text-xs hover:text-red-400">Force Abort (Sign Out)</button>
                </form>
            </div>
        )
    }
}
