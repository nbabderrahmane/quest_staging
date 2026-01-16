import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleContext } from '@/lib/role-service'

export async function GET(req: NextRequest) {
    console.log('📦 Archive API: Request Received')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('❌ Archive API: Unauthenticated')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const teamId = url.searchParams.get('teamId')

    if (!teamId) {
        console.warn('⚠️ Archive API: Missing teamId param')
        return NextResponse.json({ error: 'Missing teamId parameter' }, { status: 400 })
    }

    // Security Check
    const ctx = await getRoleContext(teamId)
    if (!ctx || !['owner', 'admin'].includes(ctx.role || '')) {
        console.error(`❌ Archive API: Access Denied for user ${user.id} on team ${teamId}`)
        return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    console.log(`🔒 Archive API: Access Granted (${ctx.role})`)

    const supabaseAdmin = createAdminClient()

    try {
        // Parallel Fetching for Snapshot
        const [questsRes, tasksRes, profilesRes] = await Promise.all([
            supabaseAdmin.from('quests').select('*').eq('team_id', teamId),
            supabaseAdmin.from('tasks').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(5000),
            supabaseAdmin.from('profiles').select('id, first_name, last_name, email, total_xp').order('total_xp', { ascending: false })
        ])

        if (questsRes.error) throw questsRes.error
        if (tasksRes.error) throw tasksRes.error
        if (profilesRes.error) throw profilesRes.error

        const snapshot = {
            metadata: {
                timestamp: new Date().toISOString(),
                exported_by: user.id,
                team_id: teamId,
                version: '1.0'
            },
            stats: {
                quest_count: questsRes.data?.length || 0,
                task_count: tasksRes.data?.length || 0,
                profile_count: profilesRes.data?.length || 0
            },
            data: {
                quests: questsRes.data,
                tasks: tasksRes.data,
                profiles: profilesRes.data
            }
        }

        console.log('✅ Archive API: Snapshot Generated Successfully')

        return NextResponse.json(snapshot)

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('💥 Archive API: System Failure', errorMessage)
        return NextResponse.json({ error: 'Internal System Error', details: errorMessage }, { status: 500 })
    }
}
