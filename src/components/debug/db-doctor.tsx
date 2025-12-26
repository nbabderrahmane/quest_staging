import { createClient } from '@/lib/supabase/server'
import { getUserTeams } from '@/app/teams/actions'
import { cookies } from 'next/headers'

export default async function DbDoctor() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const teams = await getUserTeams()

    const cookieStore = await cookies()
    let selectedTeamId = cookieStore.get('selected_team')?.value

    // Fallback: If no cookie but teams exist, use first team
    if (!selectedTeamId && teams.length > 0) {
        selectedTeamId = teams[0].id
    }

    // Find role in selected team if possible
    let currentRole = 'N/A'
    if (user && selectedTeamId) {
        const { data, error } = await supabase
            .from('team_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('team_id', selectedTeamId)
            .single()

        if (data) {
            currentRole = data.role
        } else if (error) {
            currentRole = `ERR: ${error.code}`
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-black/90 text-green-400 border border-green-500/30 rounded shadow-lg font-mono text-xs max-w-sm backdrop-blur-md">
            <h3 className="uppercase font-bold mb-2 border-b border-green-500/30 pb-1 flex justify-between items-center">
                <span>DB Doctor</span>
                <div className="flex gap-1">
                    <div className={`h-2 w-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className={`h-2 w-2 rounded-full ${teams.length > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
            </h3>

            <div className="space-y-1">
                <div className="flex justify-between gap-4">
                    <span className="opacity-50">User:</span>
                    <span className="truncate max-w-[150px]">{user ? user.email : 'NOT AUTHENTICATED'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="opacity-50">UID:</span>
                    <span className="truncate max-w-[150px]">{user ? user.id : '-'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="opacity-50">Teams Fetched:</span>
                    <span>{teams.length}</span>
                </div>
                {teams.length > 0 && (
                    <div className="pl-2 border-l border-green-500/20 my-1 text-[10px] opacity-80">
                        {teams.map(t => (
                            <div key={t.id} className="flex justify-between">
                                <span className="truncate max-w-[100px]">{t.name}</span>
                                <span className="opacity-50 text-[9px]">{t.id.slice(0, 8)}...</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-between gap-4">
                    <span className="opacity-50">Selected Cookie:</span>
                    <span className="truncate max-w-[150px]">{selectedTeamId || 'NONE'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="opacity-50">Role (Sel):</span>
                    <span>{currentRole}</span>
                </div>
            </div>
        </div>
    )
}
