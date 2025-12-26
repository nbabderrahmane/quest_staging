'use client'

import { WindowCard } from "@/components/ui/window-card"
import { EmptyState } from "@/components/ui/empty-state"
import { ScrollText } from "lucide-react"

export default function BacklogPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Mission Backlog</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Pending Assignments</p>
                </div>
            </div>

            <WindowCard title="Incoming Transmissions">
                <EmptyState
                    icon={ScrollText}
                    title="Archive Empty"
                    description="No pending missions in the backlog. Check external feeds or manual entry."
                />
            </WindowCard>
        </div>
    )
}
