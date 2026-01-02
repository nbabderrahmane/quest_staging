'use client'

import { DemoProvider, DEMO_QUESTS, DEMO_STATUSES, DEMO_SIZES, DEMO_URGENCIES, DEMO_CREW, DEMO_BOSSES, DEMO_CLIENTS } from '@/contexts/demo-context'
import { TourOverlay, DemoBanner } from '@/components/demo/tour-overlay'
import { DemoQuestBoard } from './demo-quest-board'

export default function DemoPage() {
    return (
        <DemoProvider>
            <div className="min-h-screen bg-background pt-10">
                <DemoBanner />
                <DemoQuestBoard
                    quests={DEMO_QUESTS}
                    statuses={DEMO_STATUSES}
                    sizes={DEMO_SIZES}
                    urgencies={DEMO_URGENCIES}
                    crew={DEMO_CREW}
                    bosses={DEMO_BOSSES}
                    clients={DEMO_CLIENTS}
                />
                <TourOverlay />
            </div>
        </DemoProvider>
    )
}
