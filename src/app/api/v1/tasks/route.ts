import { NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth/api-key'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    const authResult = await validateApiKey(request)
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status })
    }

    const supabaseAdmin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const requestTeamId = searchParams.get('team_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = authResult.user.id

    // 1. Resolve Team
    let teamId = requestTeamId

    if (!teamId) {
        // Fetch first team for user
        const { data: member } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId)
            .limit(1)
            .single()

        if (!member) {
            return NextResponse.json({ success: false, error: 'User is not part of any team' }, { status: 400 })
        }
        teamId = member.team_id as string
    } else {
        // Verify membership
        const { data: member } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId)
            .eq('team_id', teamId)
            .single()

        if (!member) {
            return NextResponse.json({ success: false, error: 'Access denied to this team' }, { status: 403 })
        }
    }

    // 2. Query Tasks
    const { data: tasks, error } = await supabaseAdmin
        .from('tasks')
        .select(`
            id, title, description, created_at, 
            status:statuses(id, name, category),
            assignee:profiles!assigned_to(email, first_name, last_name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, team_id: teamId, count: tasks?.length || 0, tasks: tasks || [] })
}

export async function POST(request: Request) {
    const authResult = await validateApiKey(request)
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status })
    }

    const supabaseAdmin = createAdminClient()
    const userId = authResult.user.id

    // Parse Body
    let body: { title?: string; description?: string; team_id?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { title, description, team_id: requestTeamId } = body

    if (!title) {
        return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    // 1. Resolve Team
    let teamId = requestTeamId

    if (!teamId) {
        // Fetch first team for user
        const { data: member } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId)
            .limit(1)
            .single()

        if (!member) {
            return NextResponse.json({ success: false, error: 'User is not part of any team' }, { status: 400 })
        }
        teamId = member.team_id as string
    } else {
        // Verify membership
        const { data: member } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId)
            .eq('team_id', teamId)
            .single()

        if (!member) {
            return NextResponse.json({ success: false, error: 'Access denied to this team' }, { status: 403 })
        }
    }

    // 2. Get Backlog ID
    const { data: backlogStatus } = await supabaseAdmin
        .from('statuses')
        .select('id')
        .eq('team_id', teamId)
        .eq('category', 'backlog')
        .limit(1)
        .single()

    if (!backlogStatus) {
        return NextResponse.json({ success: false, error: 'Team has no backlog status configured' }, { status: 500 })
    }

    // 3. Create Task
    const { data: task, error } = await supabaseAdmin
        .from('tasks')
        .insert({
            team_id: teamId,
            title: title,
            description: description || null,
            status_id: backlogStatus.id as string,
            created_by: userId
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, task })
}
