'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SidebarContent } from './sidebar-content'
import { Team } from '@/lib/types'

interface MobileNavProps {
    teams: Team[]
    activeTeam: Team | undefined
    userRole: string
    user: { email?: string }
    profile: { phone?: string | null } | null
}

export function MobileNav(props: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Mobile Header Trigger - Visible only on mobile */}
            <div className="md:hidden flex items-center p-4 border-b border-sidebar-border/50 bg-sidebar/50 backdrop-blur z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 -ml-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <span className="ml-2 font-bold uppercase tracking-widest text-sm text-sidebar-foreground/80">Command Link</span>
            </div>

            {/* Overlay & Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="absolute top-0 left-0 bottom-0 w-[85%] max-w-xs bg-sidebar border-r border-sidebar-border shadow-2xl transform transition-transform duration-300 ease-in-out">
                        <div className="absolute top-2 right-2 z-10">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Reuse Sidebar Content */}
                        <div className="h-full pt-8"> {/* pt-8 to clear X button */}
                            <SidebarContent {...props} />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
