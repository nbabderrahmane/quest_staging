'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDemoContext, TOUR_STEPS } from '@/contexts/demo-context'
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TourOverlay() {
    const router = useRouter()
    const {
        tourActive,
        currentStep,
        tourCompleted,
        nextStep,
        prevStep,
        skipTour,
        restartTour,
        getCurrentTourStep,
    } = useDemoContext()



    const step = getCurrentTourStep()

    // Calculate position from rect - extracted to avoid setState in effect
    const calculatePosition = useCallback((rect: DOMRect, position: string) => {
        let top = 0
        let left = 0

        switch (position) {
            case 'bottom':
                top = rect.bottom + 16
                left = rect.left + rect.width / 2
                break
            case 'top':
                top = rect.top - 16
                left = rect.left + rect.width / 2
                break
            case 'left':
                top = rect.top + rect.height / 2
                left = rect.left - 16
                break
            case 'right':
                top = rect.top + rect.height / 2
                left = rect.right + 16
                break
        }
        return { top, left }
    }, [])

    // Compute measurements synchronously during render
    // This avoids setState in effects while still being reactive to step changes
    const measurements = (() => {
        if (typeof window === 'undefined' || !step) return null
        const targetEl = document.querySelector(step.target)
        if (!targetEl) return null
        const rect = targetEl.getBoundingClientRect()
        return {
            targetRect: rect,
            tooltipPosition: calculatePosition(rect, step.position)
        }
    })()

    // Separate effect for scrolling (side effect only)
    useEffect(() => {
        if (!step) return
        const targetEl = document.querySelector(step.target)
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [step])

    // Tour completed state
    if (tourCompleted) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-card border border-border rounded-2xl p-8 max-w-md text-center shadow-2xl"
                >
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold mb-2">Tour Complete!</h2>
                    <p className="text-muted-foreground mb-6">
                        You&apos;ve seen the basics. Ready to supercharge your team?
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={restartTour}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Restart Tour
                        </button>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
                        >
                            Get Started →
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    if (!tourActive || !step) return null

    return (
        <>
            {/* Backdrop with hole for target */}
            <div className="fixed inset-0 z-[90] pointer-events-none">
                {measurements?.targetRect && (
                    <div
                        className="absolute border-2 border-primary rounded-lg animate-pulse"
                        style={{
                            top: measurements.targetRect.top - 4,
                            left: measurements.targetRect.left - 4,
                            width: measurements.targetRect.width + 8,
                            height: measurements.targetRect.height + 8,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                        }}
                    />
                )}
            </div>

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: step.position === 'bottom' ? -10 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="fixed z-[100] w-80"
                    style={{
                        top: measurements?.tooltipPosition.top || 0,
                        left: measurements?.tooltipPosition.left || 0,
                        transform: step.position === 'top'
                            ? 'translate(-50%, -100%)'
                            : step.position === 'left'
                                ? 'translate(-100%, -50%)'
                                : step.position === 'right'
                                    ? 'translate(0, -50%)'
                                    : 'translate(-50%, 0)',
                    }}
                >
                    <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
                            <span className="text-sm font-mono text-muted-foreground">
                                Step {currentStep + 1} of {TOUR_STEPS.length}
                            </span>
                            <button
                                onClick={skipTour}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                            <p className="text-muted-foreground text-sm">{step.description}</p>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border">
                            <button
                                onClick={prevStep}
                                disabled={currentStep === 0}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div
                        className={`absolute w-3 h-3 bg-card border border-border rotate-45 ${step.position === 'bottom'
                            ? '-top-1.5 left-1/2 -translate-x-1/2 border-r-0 border-b-0'
                            : step.position === 'top'
                                ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-l-0 border-t-0'
                                : step.position === 'left'
                                    ? '-right-1.5 top-1/2 -translate-y-1/2 border-l-0 border-b-0'
                                    : '-left-1.5 top-1/2 -translate-y-1/2 border-r-0 border-t-0'
                            }`}
                    />
                </motion.div>
            </AnimatePresence>
        </>
    )
}

// Demo Banner shown at the top
export function DemoBanner() {
    const router = useRouter()
    const { restartTour } = useDemoContext()

    return (
        <div className="fixed top-0 left-0 right-0 z-[80] bg-gradient-to-r from-primary/90 to-purple-600/90 backdrop-blur-sm text-white py-2 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase">Demo Mode</span>
                    <span className="text-sm opacity-90">Explore Ship Quest with sample data</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={restartTour}
                        className="text-xs flex items-center gap-1 hover:underline opacity-80 hover:opacity-100"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Restart Tour
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className="bg-white text-primary px-3 py-1 rounded-lg text-xs font-bold hover:bg-white/90 transition-colors"
                    >
                        Login →
                    </button>
                </div>
            </div>
        </div>
    )
}
