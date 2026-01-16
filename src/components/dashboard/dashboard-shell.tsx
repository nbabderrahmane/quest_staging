'use client'

import { useState } from 'react'
import { SidebarContent } from './sidebar-content'
import { MobileNav } from './mobile-nav'
import { QuestBossBar } from '@/components/dashboard/quest-boss-bar'
import { ThemeToggle } from '@/components/theme-toggle'
import { Team } from '@/lib/types'
import { PanelLeftClose, PanelLeft, EyeOff, LayoutTemplate } from 'lucide-react'

interface DashboardShellProps {
    children: React.ReactNode
    teams: Team[]
    activeTeam: Team | undefined
    userRole: string
    user: { email?: string }
    profile: { phone?: string | null } | null
}

export function DashboardShell({ children, teams, activeTeam, userRole, user, profile }: DashboardShellProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isHeroBarVisible, setIsHeroBarVisible] = useState(true)

    const sidebarProps = { teams, activeTeam, userRole, user, profile }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <aside
                className={`
                    hidden md:flex flex-col border-r border-sidebar-border bg-sidebar z-20 shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out
                    ${isSidebarCollapsed ? 'w-0 border-r-0 overflow-hidden' : 'w-64'}
                `}
            >
                <div className="h-full w-64"> {/* Fixed width wrapper to prevent content squishing during transition */}
                    <SidebarContent {...sidebarProps} />
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Navigation Header */}
                <MobileNav {...sidebarProps} />

                {/* Desktop Toggle Controls (Floating Top Left) */}
                <div className="absolute top-4 left-4 z-[70] hidden md:flex gap-2">
                    {/* Sidebar Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`
                            p-2 rounded-lg bg-sidebar border border-sidebar-border text-sidebar-foreground shadow-lg hover:bg-sidebar-accent transition-opacity
                            ${isSidebarCollapsed ? 'opacity-100' : 'opacity-0 hover:opacity-100'} 
                        `}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    </button>

                    {/* Hero Bar Toggle (Only visible if we want to restore it) */}
                    {!isHeroBarVisible && activeTeam && (
                        <button
                            onClick={() => setIsHeroBarVisible(true)}
                            className="p-2 rounded-lg bg-sidebar border border-sidebar-border text-sidebar-foreground shadow-lg hover:bg-sidebar-accent"
                            title="Show Boss Bar"
                        >
                            <LayoutTemplate className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Theme Toggle (Floating Top Right) */}
                <div className="absolute top-4 right-4 z-[70] hidden md:block">
                    <ThemeToggle />
                </div>

                {/* Scanline effect overlay */}
                <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] z-40 bg-[length:100%_2px,3px_100%] opacity-20" />

                {/* Boss Bar with Close Button */}
                {activeTeam && isHeroBarVisible && (
                    <div className="relative group">
                        <QuestBossBar teamId={activeTeam.id} />
                        <button
                            onClick={() => setIsHeroBarVisible(false)}
                            className="absolute top-2 right-2 z-[70] p-1 rounded bg-black/50 text-white/50 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hide Boss Bar"
                        >
                            <EyeOff className="h-3 w-3" />
                        </button>
                    </div>
                )}

                <main className="flex-1 overflow-auto w-full relative">
                    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
