'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BossDisplayProps {
    bossData?: {
        name: string
        image_healthy: string
        image_bloody: string
        image_dead: string
    }
    currentHealth: number // 0-100
    maxHealth: number // 100
    className?: string
}

export function BossDisplay({ bossData, currentHealth, maxHealth, className }: BossDisplayProps) {
    const healthPercent = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100))

    let state = 'healthy'
    if (healthPercent === 0) {
        state = 'dead'
    } else if (healthPercent <= 25) {
        state = 'bloody'
    }

    // Default to Kong if no data provided
    const defaultBoss = {
        name: 'The Titan Kong',
        image_healthy: '/bosses/kong-healthy.png',
        image_bloody: '/bosses/kong-bloody.png',
        image_dead: '/bosses/kong-dead.png'
    }

    const activeBoss = bossData || defaultBoss

    let imagePath = activeBoss.image_healthy
    if (state === 'bloody') imagePath = activeBoss.image_bloody
    if (state === 'dead') imagePath = activeBoss.image_dead

    return (
        <div className={cn("relative flex flex-col items-center justify-center", className)}>
            <AnimatePresence mode='wait'>
                <motion.div
                    key={`${activeBoss.name}-${state}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        x: state === 'bloody' ? [0, -2, 2, -2, 2, 0] : 0 // Shake if bloody
                    }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                    className="relative w-32 h-32 md:w-48 md:h-48"
                >
                    <Image
                        src={imagePath}
                        alt={`Boss ${state}`}
                        fill
                        className="object-contain drop-shadow-[0_0_10px_rgba(255,0,0,0.3)]"
                        priority
                    />
                </motion.div>
            </AnimatePresence>

            {/* Status Text */}
            <div className="mt-2 text-center">
                <span className={cn(
                    "text-xs font-mono uppercase tracking-widest font-bold",
                    state === 'healthy' ? "text-green-500" : (state === 'bloody' ? "text-destructive animate-pulse" : "text-muted-foreground line-through")
                )}>
                    {state === 'healthy' ? 'Boss Active' : (state === 'bloody' ? 'CRITICAL DAMAGE' : 'DEFEATED')}
                </span>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider opacity-70">
                    {activeBoss.name}
                </div>
            </div>
        </div>
    )
}
