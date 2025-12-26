import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'

import TeamSwitcher from './team-switcher'
import { getUserTeams } from '@/app/teams/actions'
import { NavItem } from '@/components/ui/nav-item'
import { LayoutDashboard, ScrollText, BarChart3, Settings, Flag, List } from 'lucide-react'
import DbDoctor from '@/components/debug/db-doctor'
import { CockpitInitializer } from '@/components/dashboard/cockpit-initializer'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    try {
        const teams = await getUserTeams()

        // If no teams, user needs to create one (handled by TeamSwitcher or redirects ideally)
        // For now, let's assume they have at least one team due to flow.

        // Determine Active Team
        const cookieStore = await cookies()
        const selectedTeamId = cookieStore.get('selected_team')?.value

        let activeTeam = teams.find(t => t.id === selectedTeamId)
        if (!activeTeam && teams.length > 0) {
            activeTeam = teams[0]
        }

        // Sentinel Check: Is this team initialized?
        let isInitialized = false
        let userRole = 'member'

        if (activeTeam) {
            // Check usage of 'statuses' table as a proxy for initialization
            const { count, error: countError } = await supabase
                .from('statuses')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', activeTeam.id)

            if (!countError && count !== null && count > 0) {
                isInitialized = true
            }

            // Get User Role for this specific team to gate the Initializer button
            const { data: memberData } = await supabase
                .from('team_members')
                .select('role')
                .eq('user_id', user.id)
                .eq('team_id', activeTeam.id)
                .single()

            if (memberData) {
                userRole = memberData.role
            }
        }

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
            <div className="flex h-screen bg-background text-foreground overflow-hidden">
                <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
                    {/* Brand Area */}
                    <div className="p-6 border-b border-sidebar-border/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-8 w-8 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] flex items-center justify-center">
                                <div className="h-4 w-4 bg-background transform rotate-45" />
                            </div>
                            <span className="font-bold tracking-wider uppercase text-lg text-sidebar-foreground">Ship Quest</span>
                        </div>
                        <TeamSwitcher teams={teams} />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 space-y-1">
                        <div className="px-4 pb-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-bold">Command</p>
                        </div>
                        <NavItem href="/quest-board" icon={<LayoutDashboard className="h-4 w-4" />}>Quest Board</NavItem>
                        <NavItem href="/admin/quests" icon={<Flag className="h-4 w-4" />}>Quest Factory</NavItem>
                        <NavItem href="/admin/pipeline" icon={<List className="h-4 w-4" />}>Mission Pipeline</NavItem>
                        <NavItem href="/admin/analytics" icon={<BarChart3 className="h-4 w-4" />}>Analytics</NavItem>

                        <div className="my-4 px-4">
                            <div className="h-px bg-sidebar-border/50" />
                        </div>

                        <div className="px-4 pb-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-bold">System</p>
                        </div>
                        <NavItem href="/admin" icon={<Settings className="h-4 w-4" />}>Forge (Admin)</NavItem>
                        <NavItem href="/admin/crew" icon={<Settings className="h-4 w-4" />}>Crew Deck</NavItem>
                    </nav>

                    {/* User Footer */}
                    <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-sidebar-foreground/70 truncate max-w-[120px]">
                                {user.email}
                            </div>
                            <form action="/auth/signout" method="post">
                                <button className="text-[10px] uppercase font-bold text-destructive hover:text-destructive/80 transition-colors">Abort</button>
                            </form>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 overflow-auto relative">
                    {/* Scanline effect overlay (optional, extremely subtle) */}
                    <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] z-50 bg-[length:100%_2px,3px_100%] opacity-20" />

                    <div className="p-8 max-w-7xl mx-auto pb-20">
                        {children}
                    </div>
                    <DbDoctor />
                </main>
            </div>
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
