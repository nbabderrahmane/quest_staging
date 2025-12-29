'use client'

import Link from 'next/link'
import Image from 'next/image'
import TeamSwitcher from './team-switcher'
import { BrandSettings } from '@/components/dashboard/brand-settings'
import { UserNav } from './user-nav'
import { NavItem } from '@/components/ui/nav-item'
import { LayoutDashboard, ScrollText, BarChart3, Settings, Flag, List, Briefcase, Building2 } from 'lucide-react'
import { Team } from '@/lib/types'

interface SidebarContentProps {
    teams: Team[]
    activeTeam: Team | undefined
    userRole: string
    user: { email?: string }
    profile: { phone?: string | null } | null
}

export function SidebarContent({ teams, activeTeam, userRole, user, profile }: SidebarContentProps) {
    return (
        <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
            {/* Brand Area */}
            <div className="p-6 border-b border-sidebar-border/50 flex flex-col gap-4">
                {/* Quest Logo */}
                <div className="relative w-full flex justify-center py-2">
                    <Image
                        src="/quest-logo.png"
                        alt="Quest"
                        width={120}
                        height={36}
                        className="object-contain drop-shadow-[0_0_8px_rgba(120,40,200,0.3)]"
                        priority
                    />
                </div>

                {/* Team Section */}
                <div className="flex flex-col gap-2 w-full">
                    <TeamSwitcher teams={teams} userRole={userRole} />
                    {activeTeam && <BrandSettings team={activeTeam} userRole={userRole} />}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
                <div className="px-4 pb-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-bold">Command</p>
                </div>
                <NavItem href="/quest-board" icon={<LayoutDashboard className="h-4 w-4" />}>Quest Board</NavItem>
                <NavItem href="/admin/quests" icon={<Flag className="h-4 w-4" />}>Quest Factory</NavItem>
                <NavItem href="/admin/pipeline" icon={<List className="h-4 w-4" />}>Mission Pipeline</NavItem>
                <NavItem href="/admin/analytics" icon={<BarChart3 className="h-4 w-4" />}>Analytics</NavItem>
                <NavItem href="/admin/reporting" icon={<ScrollText className="h-4 w-4" />}>Reporting</NavItem>
                <NavItem href="/admin/projects" icon={<Briefcase className="h-4 w-4" />}>Projects</NavItem>
                <NavItem href="/admin/departments" icon={<Building2 className="h-4 w-4" />}>Departments</NavItem>

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
            <UserNav user={{ email: user.email, phone: profile?.phone ?? undefined }} />
        </div>
    )
}
