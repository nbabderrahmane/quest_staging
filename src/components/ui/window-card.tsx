'use client'

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface WindowCardProps {
    title: string
    className?: string
    children: React.ReactNode
    action?: React.ReactNode
}

export function WindowCard({ title, className, children, action }: WindowCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "group relative overflow-hidden rounded-none border border-border bg-card text-card-foreground shadow-sm",
                "after:absolute after:inset-0 after:pointer-events-none after:border after:border-white/5 after:rounded-none",
                className
            )}
        >
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-primary/50 rounded-none transform rotate-45" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
                </div>
                {action && <div className="text-xs">{action}</div>}
            </div>
            <div className="p-6">
                {children}
            </div>
        </motion.div>
    )
}
