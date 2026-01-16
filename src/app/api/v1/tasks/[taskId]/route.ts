import { NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth/api-key'
import { createAdminClient } from '@/lib/supabase/admin'

// GET single task details
export async function GET(request: Request, props: { params: Promise<{ taskId: string }> }) {
    const params = await props.params
    const authResult = await validateApiKey(request)
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status })
    }

    const supabaseAdmin = createAdminClient()
    const taskId = params.taskId
    const userId = authResult.user.id

    // 1. Fetch Task to check Team ID
    const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .select(`
            *,
            status:statuses(id, name, category),
            assignee:profiles!assigned_to(email, first_name, last_name),
            creator:profiles!created_by(email, first_name, last_name)
        `)
        .eq('id', taskId)
        .single()

    if (taskError || !task) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    const taskTeamId = task.team_id as string

    // 2. Verify User Access to Team
    const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('user_id', userId)
        .eq('team_id', taskTeamId)
        .single()

    if (!member) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ success: true, task })
}

// PATCH update task
export async function PATCH(request: Request, props: { params: Promise<{ taskId: string }> }) {
    const params = await props.params
    const authResult = await validateApiKey(request)
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status })
    }

    const supabaseAdmin = createAdminClient()
    const taskId = params.taskId
    const userId = authResult.user.id

    let body: { status?: string; status_id?: string; title?: string; description?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    // 1. Fetch Task to check Team ID
    const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('team_id')
        .eq('id', taskId)
        .single()

    if (!task) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    const taskTeamId = task.team_id as string

    // 2. Verify User Access
    const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('user_id', userId)
        .eq('team_id', taskTeamId)
        .single()

    if (!member) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    // 3. Prepare Updates
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Status Update
    if (body.status) {
        let statusId = body.status_id
        if (!statusId && body.status) {
            // Try to find status by name (case insensitive)
            const { data: statusRecord } = await supabaseAdmin
                .from('statuses')
                .select('id')
                .eq('team_id', taskTeamId)
                .ilike('name', body.status)
                .single()
            if (statusRecord) statusId = statusRecord.id as string
        }

        if (statusId) updates.status_id = statusId
    }

    if (body.title) updates.title = body.title
    if (body.description) updates.description = body.description

    // 4. Update
    const { error } = await supabaseAdmin
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
