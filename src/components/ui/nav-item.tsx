'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface NavItemProps {
    href: string
    children: React.ReactNode
    icon?: React.ReactNode
    badge?: number // Unread count
    onClick?: () => void
    exact?: boolean
}

export function NavItem({ href, children, icon, badge, onClick, exact }: NavItemProps) {
    const pathname = usePathname()
    // Exact match for root, or starts with for nested (unless exact is true)
    const isActive = (href === '/' || exact)
        ? pathname === href
        : pathname.startsWith(href)

    return (
        <Link href={href} onClick={onClick} className="block relative group">
            {isActive && (
                <motion.div
                    layoutId="activeNav"
                    className="absolute inset-y-0 left-0 w-1 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
            )}
            <div className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors relative z-10",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}>
                {icon}
                {/* Content */}
                <span className="flex-1 truncate">{children}</span>

                {/* Badge */}
                {badge !== undefined && badge > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}

                {/* Micro-interaction hover highlight */}
                <div className="absolute inset-y-0 right-1 w-0 bg-primary/20 transition-all group-hover:w-1 group-active:w-2 rounded-r-none" />
            </div>
        </Link>
    )
}
