'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavGroupProps {
    title: string
    icon?: React.ReactNode
    children: React.ReactNode
}

export function NavGroup({ title, icon, children }: NavGroupProps) {
    const pathname = usePathname()

    // Check if any child NavItem is active to auto-expand
    const hasActiveChild = (children: React.ReactNode): boolean => {
        let active = false
        // This is a bit simplified, ideally NavItem would register its presence
        // but for now we look at the children structure if possible
        const childrenArray = Array.isArray(children) ? children : [children]
        childrenArray.forEach((child: any) => {
            const href = child?.props?.href
            const exact = child?.props?.exact
            if (href) {
                const isActive = (href === '/' || exact)
                    ? pathname === href
                    : pathname.startsWith(href)
                if (isActive) active = true
            }
        })
        return active
    }

    const [isOpen, setIsOpen] = useState(false)

    // Auto-open if active child found
    useEffect(() => {
        if (hasActiveChild(children)) {
            setIsOpen(true)
        }
    }, [pathname, children])

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors hover:text-foreground",
                    isOpen ? "text-sidebar-foreground/80" : "text-sidebar-foreground/40"
                )}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="h-3 w-3" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden border-l border-sidebar-border/30 ml-4 pl-1"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
