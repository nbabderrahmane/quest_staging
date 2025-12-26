'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export interface LeaderboardEntry {
    team_id: string
    user_id: string
    first_name: string | null
    last_name: string | null
    role: string
    tasks_completed: number
    total_xp: number
    rank?: string
    rankColor?: string
}

export async function getLeaderboard(teamId: string) {
    const supabase = await createClient()
    noStore()

    // Query the view
    const { data, error } = await supabase
        .from('alliance_leaderboard')
        .select('*')
        .eq('team_id', teamId)
        .order('total_xp', { ascending: false })

    if (error) {
        console.error('getLeaderboard Error:', error)
        return { error: error.message }
    }

    return data as LeaderboardEntry[]
}
