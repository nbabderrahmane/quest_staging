import { NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth/api-key'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, props: { params: Promise<{ taskId: string }> }) {
    const params = await props.params
    const authResult = await validateApiKey(request)
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status })
    }

    const taskId = params.taskId
    const userId = authResult.user.id

    let body: { content?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    if (!body.content) {
        return NextResponse.json({ success: false, error: 'Content required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

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

    // 3. Create Comment
    const { data: comment, error } = await supabaseAdmin
        .from('task_comments')
        .insert({
            task_id: taskId,
            team_id: taskTeamId,
            author_id: userId,
            content: body.content
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, comment })
}
