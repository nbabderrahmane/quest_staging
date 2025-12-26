'use client'

import { WindowCard } from "./window-card"

interface MetricCardProps {
    label: string
    value: string | number
    delta?: string
    trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({ label, value, delta, trend }: MetricCardProps) {
    return (
        <WindowCard title={label} className="h-full">
            <div className="flex flex-col gap-1">
                <div className="text-3xl font-black tracking-tight font-mono">{value}</div>
                {delta && (
                    <div className={`text-xs font-medium ${trend === 'up' ? 'text-green-400' :
                            trend === 'down' ? 'text-red-400' :
                                'text-muted-foreground'
                        }`}>
                        {delta}
                    </div>
                )}
            </div>
        </WindowCard>
    )
}
