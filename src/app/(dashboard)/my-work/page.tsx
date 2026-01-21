'use server'

import { getActiveTeamId } from '@/lib/role-service'
import { getMyWorkTasks } from './actions'
import { WIP_LIMIT } from './constants'
import { MyWorkClient } from './my-work-client'

export default async function MyWorkPage() {
    const teamId = await getActiveTeamId()
    if (!teamId) return <div>Team not found</div>

    const { now, next, waiting, wip } = await getMyWorkTasks(teamId)

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-border pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Captain&apos;s Deck</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Strategic Mission Control & Decision Matrix</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 transition-all ${wip >= WIP_LIMIT ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-green-500/10 border-green-500/50 text-green-500'}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">WIP Load</div>
                        <div className="text-2xl font-black leading-none">{wip}<span className="text-sm opacity-50 ml-1">/ {WIP_LIMIT}</span></div>
                    </div>
                </div>
            </div>

            <MyWorkClient
                initialNow={now}
                initialNext={next}
                initialWaiting={waiting}
                teamId={teamId}
                wipCount={wip}
                wipLimit={WIP_LIMIT}
            />
        </div>
    )
}
