'use client'

import Image from 'next/image'
import TeamSwitcher from './team-switcher'
import { BrandSettings } from '@/components/dashboard/brand-settings'
import { UserNav } from './user-nav'
import { SubTeamSwitcher } from './sub-team-switcher'
import { NavItem } from '@/components/ui/nav-item'
import { NavGroup } from '@/components/ui/nav-group'
import { LayoutDashboard, ScrollText, BarChart3, Settings, Flag, List, Briefcase, Building2, Skull, Terminal, Archive, Target, CalendarCheck, Users } from 'lucide-react'
import { Team } from '@/lib/types'

interface SidebarContentProps {
    teams: Team[]
    activeTeam: Team | undefined
    userRole: string
    user: { email?: string }
    profile: { phone?: string | null } | null
    onNavigate?: () => void
    unreadInboxCount?: number
    currentSubTeamId?: string
}

export function SidebarContent({ teams, activeTeam, userRole, user, profile, onNavigate, unreadInboxCount, currentSubTeamId }: SidebarContentProps) {
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

                {/* Organization & Team Section */}
                <div className="flex flex-col gap-2 w-full">
                    <TeamSwitcher teams={teams} userRole={userRole} />
                    {activeTeam && (
                        <>
                            <SubTeamSwitcher orgId={activeTeam.id} currentSubTeamId={currentSubTeamId} />
                            <BrandSettings team={activeTeam} userRole={userRole} />
                        </>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 space-y-4 overflow-y-auto">
                <NavGroup title="My Space" icon={<Target className="h-4 w-4" />}>
                    <NavItem href="/inbox" icon={<Archive className="h-4 w-4" />} badge={unreadInboxCount} onClick={onNavigate}>Inbox</NavItem>
                    <NavItem href="/my-work" icon={<Target className="h-4 w-4" />} onClick={onNavigate}>My Work</NavItem>
                </NavGroup>

                <NavGroup title="Quest Management" icon={<Flag className="h-4 w-4" />}>
                    <NavItem href="/quest-board" icon={<LayoutDashboard className="h-4 w-4" />} onClick={onNavigate}>Quest Board</NavItem>
                    <NavItem href="/admin/quests" icon={<Flag className="h-4 w-4" />} onClick={onNavigate}>Quest Factory</NavItem>
                    <NavItem href="/admin/quest-prep" icon={<CalendarCheck className="h-4 w-4" />} onClick={onNavigate}>Quest Prep</NavItem>
                    <NavItem href="/admin/analytics" icon={<BarChart3 className="h-4 w-4" />} onClick={onNavigate}>Analytics</NavItem>
                    <NavItem href="/admin/reporting" icon={<ScrollText className="h-4 w-4" />} onClick={onNavigate}>Reporting</NavItem>
                </NavGroup>

                <div className="space-y-1">
                    <div className="px-4 pb-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-bold">Execution</p>
                    </div>
                    <NavItem href="/admin/pipeline" icon={<List className="h-4 w-4" />} onClick={onNavigate}>Mission Pipeline</NavItem>
                </div>

                <NavGroup title="Admin" icon={<Settings className="h-4 w-4" />}>
                    <NavItem href="/admin/organization" icon={<Building2 className="h-4 w-4" />} onClick={onNavigate}>Organization Profile</NavItem>
                    <NavItem href="/admin/projects" icon={<Briefcase className="h-4 w-4" />} onClick={onNavigate}>Projects</NavItem>
                    <NavItem href="/admin/departments" icon={<Building2 className="h-4 w-4" />} onClick={onNavigate}>Departments</NavItem>
                    <NavItem href="/admin/clients" icon={<Briefcase className="h-4 w-4" />} onClick={onNavigate}>Clients</NavItem>
                    <NavItem href="/admin" icon={<Settings className="h-4 w-4" />} onClick={onNavigate} exact>Forge</NavItem>
                    {['owner', 'admin'].includes(userRole) && (
                        <NavItem href="/admin/bosses" icon={<Skull className="h-4 w-4" />} onClick={onNavigate}>Nemesis</NavItem>
                    )}
                    <NavItem href="/admin/crew" icon={<Users className="h-4 w-4" />} onClick={onNavigate}>Crew</NavItem>
                </NavGroup>
            </nav>

            {/* User Footer */}
            <UserNav user={{ email: user.email, phone: profile?.phone ?? undefined }} />
        </div>
    )
}
