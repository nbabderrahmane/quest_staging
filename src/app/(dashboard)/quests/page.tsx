import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getUserTeams } from '@/app/teams/actions'
import { WindowCard } from '@/components/ui/window-card'
import { Quest } from '@/lib/types'
import Link from 'next/link'
import { ChevronRight, Target, CheckCircle2, AlertTriangle, Archive } from 'lucide-react'

export default async function QuestsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const teams = await getUserTeams()
    if (teams.length === 0) return <div>No Team Found</div>

    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team')?.value
    const teamId = (selectedTeamId && teams.some(t => t.id === selectedTeamId))
        ? selectedTeamId
        : teams[0].id

    // Fetch all quests for this team
    const { data: quests, error } = await supabase
        .from('quests')
        .select('*, status:quest_statuses(*)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching quests:', error)
    }

    const questList = (quests || []) as Quest[]

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Mission Logs</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">All Registered Protocols</p>
                </div>
            </div>

            {questList.length === 0 ? (
                <WindowCard title="No Missions">
                    <p className="text-muted-foreground font-mono text-sm">No quests have been initiated. Start one from the Quest Board.</p>
                </WindowCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {questList.map(quest => (
                        <Link key={quest.id} href={`/quest-board?questId=${quest.id}`}>
                            <div className="group relative p-4 bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.15)] rounded">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {quest.is_active ? (
                                            <Target className="h-4 w-4 text-primary animate-pulse" />
                                        ) : quest.status?.category === 'done' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Archive className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                            {quest.status?.name || (quest.is_active ? 'Active' : 'Inactive')}
                                        </span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <h3 className="font-bold text-lg text-foreground mb-1 truncate">{quest.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                                    {quest.description || 'No briefing provided.'}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
