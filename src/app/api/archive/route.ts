import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'

export async function GET(req: NextRequest) {
    console.log('📦 Archive API: Request Received')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('❌ Archive API: Unauthenticated')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine Team ID (from Query Param or Cookie fallback is risky in API, prefer Header or strictly Param)
    // For simplicity and alignment with Dashboard, we'll try to extract from cookie manually if not in param
    // However, best practice is explicit query param.
    const url = new URL(req.url)
    let teamId = url.searchParams.get('teamId')

    if (!teamId) {
        // Fallback: This might be fragile in pure API calls without browser context, but works for "Browser-based API testing"
        // Logic to parse cookie string if absolutely needed, but let's enforce Param for 'Pro' robustness.
        console.warn('⚠️ Archive API: Missing teamId param')
        return NextResponse.json({ error: 'Missing teamId parameter' }, { status: 400 })
    }

    // Security Check
    const ctx = await getRoleContext(teamId!)
    if (!ctx || !['owner', 'admin'].includes(ctx.role || '')) {
        console.error(`❌ Archive API: Access Denied for user ${user.id} on team ${teamId}`)
        return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    console.log(`🔒 Archive API: Access Granted (${ctx.role})`)

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    try {
        // Parallel Fetching for Snapshot
        const [questsRes, tasksRes, profilesRes] = await Promise.all([
            supabaseAdmin.from('quests').select('*').eq('team_id', teamId),
            supabaseAdmin.from('tasks').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(5000), // Cap for perf
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
                tasks: tasksRes.data, // Contains history
                profiles: profilesRes.data
            }
        }

        console.log('✅ Archive API: Snapshot Generated Successfully')

        return NextResponse.json(snapshot)

    } catch (err: any) {
        console.error('💥 Archive API: System Failure', err)
        return NextResponse.json({ error: 'Internal System Error', details: err.message }, { status: 500 })
    }
}
