'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Boss {
    id: string
    name: string
    is_system: boolean
    image_healthy: string
}

interface BossSelectorProps {
    value: string
    onChange: (value: string) => void
    bosses: Boss[]
}

export function BossSelector({ value, onChange, bosses }: BossSelectorProps) {
    return (
        <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
            {bosses.map((boss) => {
                const isSelected = value === boss.id
                // All bosses passed here are available

                return (
                    <button
                        key={boss.id}
                        type="button"
                        onClick={() => onChange(boss.id)}
                        className={cn(
                            "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all text-left group",
                            isSelected
                                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                                : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5 z-10">
                                <Check className="h-3 w-3" />
                            </div>
                        )}

                        <div className="relative w-16 h-16 mb-2">
                            <Image
                                src={boss.image_healthy}
                                alt={boss.name}
                                fill
                                className="object-contain"
                            />
                        </div>

                        <div className="text-center w-full">
                            <h4 className={cn("text-xs font-bold uppercase truncate w-full", isSelected ? "text-blue-700" : "text-slate-700")}>
                                {boss.name}
                            </h4>
                            {boss.is_system && (
                                <span className="text-[9px] text-slate-400 font-mono uppercase">System</span>
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
